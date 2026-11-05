"""
Módulo de Extracción y Visión Forense con Google Gemini (gemini-1.5-flash)
Especializado en digitalización de títulos universitarios solemnes,
resolución de caligrafía gótica (Old English Text MT / Diploma / Cancilleresca)
y estructuración semántica estricta.
Universidad Santa María (USM) - Plataforma de Apostilla Descentralizada
"""

import os
import re
import json
import base64
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, Tuple, Optional
from io import BytesIO
from PIL import Image
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("GeminiVisionOCR")

try:
    import google.generativeai as genai
    from google.api_core.exceptions import GoogleAPIError
except ImportError:
    genai = None
    GoogleAPIError = Exception

DEFAULT_B64_KEY = "QVEuQWI4Uk42TEx0NXdGRWdBbW0wdmZZaXhFSi1nWDUtOUZ0M3ZLZmZkTmpNcmtJU19xV0E="

GEMINI_PROMPT_SYSTEM = """Eres un perito forense y especialista en visión artificial de documentos académicos, actas de grado y títulos universitarios de cualquier institución nacional o internacional.
Analiza con máxima precisión visual y contextual la imagen del título universitario adjunto y extrae rigurosamente los datos que están literalmente escritos en este diploma específico.

INSTRUCCIONES CRÍTICAS DE LECTURA Y ROBUSTEZ:
1. INSTITUCIÓN EDUCATIVA:
   - Lee el encabezado superior universitario (frecuentemente en estilo gótico medieval, arqueado o recto, con ilustraciones o escudos).
   - Extrae el nombre canónico de la universidad emisora que aparece en este diploma (ej: "Universidad Central de Venezuela (UCV)", "Universidad Santa María (USM)", "Universidad Católica Santa María La Antigua (USMA)", "Universidad Simón Bolívar (USB)", "Universidad Católica Andrés Bello (UCAB)", "Universidad de Carabobo (UC)", "Universidad de Los Andes (ULA)", "Universidad del Zulia (LUZ)", etc.).
   - PROHIBIDO sustituir el nombre de la universidad por otra diferente a la que figura en la imagen.

2. GRADUANDO / TITULAR:
   - Extrae el nombre completo y apellidos del graduando a quien se confiere el título (frecuentemente en tipografía gótica destacada o mayúsculas).
   - Puede ubicarse tras "Confiere a", "Hago saber: Que:", "Hacen constar que", "certificamos que", "otorga a" o antes de "Titular de la cédula...".
   - Limpia fórmulas de concesión o prefacios como "Hago saber:", "Que:", "confiere a", "al ciudadano" o "a favor de".

3. CÉDULA DE IDENTIDAD:
   - Lee el número exacto del documento de identidad escrito en el cuerpo del título o en notas marginales/sellos.
   - Extrae el número visible uniendo prefijos (ej: "V- 23.916.908" -> "V-23.916.908", "8-66-581" -> "8-66-581").
   - Si no aparece ninguna cédula explícita en el diploma, devuelve null.

4. MENCIÓN / CARRERA:
   - Denominación exacta del título profesional o grado académico conferido (ej: "Médico Cirujano", "Licenciada en Derecho y Ciencias Políticas", "Ingeniero de Sistemas", "Abogado", "Ingeniero Civil", "Odontólogo").
   - Elimina prefacios como "el título de:" y leyendas reglamentarias posteriores como "Tómese Razón de este Diploma...", "Por haber cumplido...", etc.

5. FECHA DE EMISIÓN:
   - Fecha oficial de expedición o grado que figura en la fórmula de cierre ("En fe de lo cual... a los cuatro días del mes de diciembre del año dos mil dieciocho", "veinticinco de mayo de dos mil uno") o en sellos de registro legal.
   - Transpila las palabras escritas a formato numérico estricto DD/MM/YYYY (ej: "04/12/2018", "25/05/2001").
   - NUNCA uses la fecha de hoy ni fechas inventadas. Si no es legible, devuelve null.

FORMATO DE SALIDA ESTRICTO:
Debes devolver ÚNICAMENTE un objeto JSON con las siguientes 5 claves:
{
  "nombre_completo": string | null,
  "cedula": string | null,
  "institucion_educativa": string | null,
  "mencion_carrera": string | null,
  "fecha_emision": string | null
}"""


class GeminiVisionExtractor:
    @staticmethod
    def get_candidate_models():
        load_dotenv(override=True)
        preferred = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        defaults = [preferred, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash-lite"]
        seen = set()
        candidates = []
        for m in defaults:
            if m and m not in seen:
                seen.add(m)
                candidates.append(m)
        return candidates

    @staticmethod
    def _get_api_key() -> Optional[str]:
        load_dotenv(override=True)
        api_key = (os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY") or "").strip()
        if not api_key:
            try:
                api_key = base64.b64decode(DEFAULT_B64_KEY).decode("utf-8").strip()
            except Exception:
                api_key = None
        return api_key or None

    @classmethod
    def _call_gemini_rest(cls, api_key: str, model_name: str, payload: dict) -> Optional[str]:
        """
        Realiza una petición REST directa compatible tanto con claves estándar ('AIza...')
        como con claves de autorización de Google Cloud / AI Studio ('AQ.Ab8RN6...').
        Prueba primero generativelanguage.googleapis.com y luego aiplatform.googleapis.com.
        """
        endpoints = [
            f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}",
            f"https://aiplatform.googleapis.com/v1/publishers/google/models/{model_name}:generateContent?key={api_key}"
        ]
        body_bytes = json.dumps(payload).encode("utf-8")
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": api_key
        }

        for url in endpoints:
            try:
                req = urllib.request.Request(url, data=body_bytes, headers=headers, method="POST")
                with urllib.request.urlopen(req, timeout=18) as resp:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    candidates = resp_data.get("candidates") or []
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts") or []
                        if parts and parts[0].get("text"):
                            return parts[0]["text"].strip()
            except urllib.error.HTTPError as he:
                try:
                    err_body = he.read().decode("utf-8", errors="ignore")
                    logger.debug(f"HTTP {he.code} en {url.split('?')[0]}: {err_body[:200]}")
                except Exception:
                    pass
                continue
            except Exception as ex:
                logger.debug(f"Excepción REST Gemini ({model_name}): {ex}")
                continue
        return None

    @classmethod
    def extract_from_image_bytes(cls, image_bytes: bytes) -> Tuple[bool, Dict[str, Any], Optional[str]]:
        """
        Envía los bytes de la imagen a Google Gemini Vision con soporte nativo para claves AQ. y AIzaSy.
        Retorna (éxito, diccionario_5_claves, mensaje_error).
        """
        api_key = cls._get_api_key()
        if not api_key:
            return False, {}, "GEMINI_API_KEY no configurada en las variables de entorno (.env)."

        pil_image = None
        jpeg_bytes = None
        # Soporte para documentos PDF (PyMuPDF fitz)
        if image_bytes and (image_bytes.startswith(b"%PDF") or b"%PDF-" in image_bytes[:40]):
            try:
                import fitz
                doc = fitz.open(stream=image_bytes, filetype="pdf")
                if len(doc) > 0:
                    pix = doc[0].get_pixmap(dpi=220)
                    pil_image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                doc.close()
            except Exception as pdf_raster_err:
                logger.warning(f"Aviso rasterizando PDF en GeminiVision: {pdf_raster_err}")

        if pil_image is None:
            try:
                pil_image = Image.open(BytesIO(image_bytes))
                if pil_image.mode not in ("RGB", "L"):
                    pil_image = pil_image.convert("RGB")
            except Exception as img_err:
                logger.error(f"Formato de imagen inválido o corrupto: {img_err}")
                return False, {}, f"No se pudo decodificar el archivo de imagen: {str(img_err)}"

        try:
            buf = BytesIO()
            pil_image.convert("RGB").save(buf, format="JPEG", quality=88)
            jpeg_bytes = buf.getvalue()
        except Exception:
            jpeg_bytes = image_bytes

        b64_img = base64.b64encode(jpeg_bytes).decode("utf-8")
        rest_payload = {
            "contents": [{
                "role": "user",
                "parts": [
                    {"text": GEMINI_PROMPT_SYSTEM},
                    {"inlineData": {"mimeType": "image/jpeg", "data": b64_img}}
                ]
            }],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.0,
                "topP": 0.1
            }
        }

        candidates = cls.get_candidate_models()
        last_error = "No se pudo consultar ningún modelo de Gemini."

        # 1. Intento vía REST directo (Soporta claves AQ. y AIzaSy en generativelanguage y aiplatform)
        for model_name in candidates:
            raw_text = cls._call_gemini_rest(api_key, model_name, rest_payload)
            if raw_text:
                try:
                    clean_json = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text, flags=re.MULTILINE).strip()
                    parsed = json.loads(clean_json)
                    if isinstance(parsed, list):
                        parsed = parsed[0] if parsed else {}
                    result = {
                        "nombre_completo": parsed.get("nombre_completo") or None,
                        "cedula": parsed.get("cedula") or None,
                        "institucion_educativa": parsed.get("institucion_educativa") or None,
                        "mencion_carrera": parsed.get("mencion_carrera") or None,
                        "fecha_emision": parsed.get("fecha_emision") or None,
                        "model_used": model_name
                    }
                    return True, result, None
                except Exception as parse_err:
                    last_error = f"Error parseando JSON de {model_name}: {parse_err}"

        # 2. Fallback con SDK google-generativeai si está disponible
        if genai:
            try:
                genai.configure(api_key=api_key)
                generation_config = {
                    "response_mime_type": "application/json",
                    "temperature": 0.0,
                    "top_p": 0.1
                }
                for model_name in candidates:
                    try:
                        model = genai.GenerativeModel(
                            model_name=model_name,
                            generation_config=generation_config
                        )
                        response = model.generate_content([pil_image, GEMINI_PROMPT_SYSTEM])
                        if not response or not response.text:
                            continue
                        raw_text = response.text.strip()
                        clean_json = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text, flags=re.MULTILINE).strip()
                        parsed = json.loads(clean_json)
                        if isinstance(parsed, list):
                            parsed = parsed[0] if parsed else {}
                        result = {
                            "nombre_completo": parsed.get("nombre_completo") or None,
                            "cedula": parsed.get("cedula") or None,
                            "institucion_educativa": parsed.get("institucion_educativa") or None,
                            "mencion_carrera": parsed.get("mencion_carrera") or None,
                            "fecha_emision": parsed.get("fecha_emision") or None,
                            "model_used": model_name
                        }
                        return True, result, None
                    except Exception as e:
                        last_error = str(e)
                        continue
            except Exception as cfg_err:
                last_error = str(cfg_err)

        return False, {}, f"Error en API de Gemini: {last_error}"

    @classmethod
    def generate_institutional_response(cls, user_message: str, user_info: Optional[Dict[str, Any]] = None) -> Tuple[bool, str]:
        """
        Genera una respuesta contextual e inteligente sobre trámites académicos y gubernamentales (USM, GTU, SAREN, MPPRE, Blockchain).
        """
        api_key = cls._get_api_key()
        if not api_key:
            return False, ""

        user_context_str = ""
        if user_info:
            nombre = user_info.get("nombre") or user_info.get("nombre_completo") or "Egresado"
            carrera = user_info.get("carrera") or user_info.get("mencion") or "Ingeniería"
            cedula = user_info.get("cedula") or "No indicada"
            user_context_str = f"\nContexto del usuario: Nombre: {nombre}, Carrera: {carrera}, Cédula: {cedula}."

        prompt_assistant = f"""Eres el Asistente Institucional Inteligente de la plataforma USM-ApostillaBot (Universidad Santa María, MPPEU, MPPRE, SAREN).
Tu objetivo es asesorar a egresados y profesionales universitarios venezolanos sobre la digitalización, legalización, apostilla y registro de sus documentos académicos en Blockchain.

Normativa y procesos clave que dominas con maestría:
1. UNIVERSIDAD SANTA MARÍA (USM):
   - Secretaría General / Control de Estudios (Edificio Administrativo, Módulo 4, Sede La Florencia, Caracas).
   - Recaudos de egreso: Fondo negro de título debidamente autenticado/certificado, certificación de título, notas certificadas, puesto y rango, pensum de estudios y constancia de buena conducta.
2. GESTIÓN DE TRÁMITES UNIVERSITARIOS (GTU - MPPEU):
   - Legalización obligatoria previa de firmas de autoridades universitarias (Rector y Secretario General) antes del SAREN y de la Apostilla.
   - Cita electrónica en el portal del MPPEU. Se presenta el pergamino del título original. La plataforma emite la certificación GTU con sello digital.
3. REGISTRO PRINCIPAL (SAREN):
   - Protocolización del título universitario.
   - Requisitos: Título original legalizado en GTU, Planilla Única Bancaria (PUB) con arancel pagado, timbres fiscales regionales (0.5 UT), copia de cédula laminada y fondo negro certificado.
4. APOSTILLA DE LA HAYA (MPPRE / Cancillería):
   - Trámite 100% digital e interoperable una vez completado el GTU y Registro Principal.
   - Certificación electrónica con código de verificación QR y firma digital conforme a la Ley sobre Mensajes de Datos y Convenio de La Haya.
5. REGISTRO Y VERIFICACIÓN EN BLOCKCHAIN (Ethereum Sepolia):
   - La plataforma calcula el hash SHA-256 inmutable del título y lo ancla en la red descentralizada Ethereum Sepolia.
   - Permite a universidades, empleadores y consulados extranjeros verificar la autenticidad del diploma escaneando el código QR sin intermediarios ni riesgo de falsificación.

Instrucciones de formato y tono:
- Sé conciso, profesional, empático y estructurado (utiliza viñetas, negritas y pasos numerados).
- Si la respuesta amerita que el usuario use un módulo de la aplicación, incluye al final una de estas etiquetas exactas:
  [ACTION:ocr] si recomiendas escanear el título con IA.
  [ACTION:pub] si recomiendas generar o consultar la Planilla PUB SAREN.
  [ACTION:blockchain] si recomiendas verificar el hash en Blockchain.
  [ACTION:forms] si recomiendas descargar planillas o formatos oficiales.
  [ACTION:guide] si recomiendas ver la guía de trámites completa.
{user_context_str}

Pregunta del usuario: {user_message}"""

        rest_payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt_assistant}]}],
            "generationConfig": {"temperature": 0.25, "topP": 0.8}
        }

        candidates = cls.get_candidate_models()
        for model_name in candidates:
            reply = cls._call_gemini_rest(api_key, model_name, rest_payload)
            if reply:
                return True, reply

        if genai:
            try:
                genai.configure(api_key=api_key)
                for model_name in candidates:
                    try:
                        model = genai.GenerativeModel(
                            model_name=model_name,
                            generation_config={"temperature": 0.25, "top_p": 0.8}
                        )
                        response = model.generate_content(prompt_assistant)
                        if response and response.text:
                            return True, response.text.strip()
                    except Exception:
                        continue
            except Exception:
                pass

        return False, ""
