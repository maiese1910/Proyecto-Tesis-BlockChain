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

GEMINI_PROMPT_SYSTEM = """Eres un perito forense y especialista en visión artificial de documentos académicos, actas solemnes y títulos universitarios.
Analiza con máxima precisión visual y contextual la imagen del título universitario adjunto y extrae los datos canónicos institucionales y del graduando.

INSTRUCCIONES CRÍTICAS DE LECTURA Y ROBUSTEZ:
1. FUENTES GÓTICAS Y ORNAMENTALES:
   - El pergamino emplea tipografías de estilo gótico medieval (Old English Text MT, Diploma, Textura, Cancilleresca) en el encabezado universitario, el nombre del egresado y la denominación del título.
   - Puede incluir caligrafía bicoloreada (letras capitulares e inscripciones solemnes en tinta roja y negra).
   - Descifra rigurosamente el texto original sin omitir caracteres ni confundir ligaduras clásicas.

2. SUPRESIÓN DE RUIDO Y SELLOS ADMINISTRATIVOS:
   - Ignora completamente ilustraciones arquitectónicas de fondo (fachadas de rectorados, escudos), sellos circulares húmedos, timbres fiscales (SAREN), firmas rectorales o decanales.
   - Ignora notas marginales de registro público o leyendas reglamentarias posteriores como "Tómese Razón de este Diploma en la Secretaría...".

3. NORMALIZACIÓN DE CAMPOS:
   - "nombre_completo": Nombre y apellidos completos del graduando titular. Limpia fórmulas de concesión o prefacios como "Hago saber:", "Que:", "confiere a", "al ciudadano" o "a favor de".
   - "cedula": Cédula de identidad oficial con su prefijo y numeración original (ej: "V-23.916.908", "V-28.315.101" o "8-66-581").
   - "institucion_educativa": Nombre institucional canónico de la Universidad emisora (ej: "Universidad Santa María", "Universidad Central de Venezuela", "Universidad Católica Santa María La Antigua").
   - "mencion_carrera": Denominación exacta del título o grado conferido (ej: "Médico Cirujano", "Ingeniero en Sistemas", "Licenciada en Derecho y Ciencias Políticas"). Elimina prefacios como "el título de:" y frases reglamentarias siguientes.
   - "fecha_emision": Fecha oficial de expedición o grado en formato estricto DD/MM/YYYY. Transpila fechas en letras (ej: "a los cuatro días del mes de diciembre del año dos mil dieciocho" -> "04/12/2018", "veinticinco de mayo de dos mil uno" -> "25/05/2001", "veinticuatro de octubre de dos mil veintiséis" -> "24/10/2026").

FORMATO DE SALIDA ESTRICTO:
Debes devolver ÚNICAMENTE un objeto JSON con las siguientes 5 claves exactas:
{
  "nombre_completo": "string",
  "cedula": "string",
  "institucion_educativa": "string",
  "mencion_carrera": "string",
  "fecha_emision": "string"
}"""


class GeminiVisionExtractor:
    @staticmethod
    def get_configured_model():
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return None, "GEMINI_API_KEY no configurada en las variables de entorno (.env)."
        if not genai:
            return None, "La librería 'google-generativeai' no está instalada en el entorno."

        try:
            genai.configure(api_key=api_key)
            model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
            
            # Configuración de generación forzando respuesta en JSON puro
            generation_config = {
                "response_mime_type": "application/json",
                "temperature": 0.0,
                "top_p": 0.2
            }
            
            model = genai.GenerativeModel(
                model_name=model_name,
                generation_config=generation_config
            )
            return model, None
        except Exception as e:
            return None, f"Error inicializando cliente de Gemini: {str(e)}"

    @classmethod
    def extract_from_image_bytes(cls, image_bytes: bytes) -> Tuple[bool, Dict[str, Any], Optional[str]]:
        """
        Envía los bytes de la imagen a Google Gemini 1.5 Flash.
        Retorna (éxito, diccionario_5_claves, mensaje_error).
        """
        model, err_init = cls.get_configured_model()
        if not model:
            return False, {}, err_init

        try:
            pil_image = Image.open(BytesIO(image_bytes))
            # Convertir a RGB si viene en RGBA o escala de grises
            if pil_image.mode not in ("RGB", "L"):
                pil_image = pil_image.convert("RGB")
        except Exception as img_err:
            logger.error(f"Formato de imagen inválido o corrupto: {img_err}")
            return False, {}, f"No se pudo decodificar el archivo de imagen: {str(img_err)}"

        try:
            # Llamada síncrona a Gemini 1.5 Flash con la imagen y el system prompt
            response = model.generate_content([pil_image, GEMINI_PROMPT_SYSTEM])
            
            if not response or not response.text:
                return False, {}, "El modelo Gemini no retornó contenido en la respuesta."

            raw_text = response.text.strip()
            # Limpieza defensiva en caso de fences markdown
            clean_json = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text, flags=re.MULTILINE).strip()
            parsed = json.loads(clean_json)

            # Estructurar estrictamente con las 5 claves canónicas
            result = {
                "nombre_completo": parsed.get("nombre_completo", "").strip(),
                "cedula": parsed.get("cedula", "").strip(),
                "institucion_educativa": parsed.get("institucion_educativa", "").strip(),
                "mencion_carrera": parsed.get("mencion_carrera", "").strip(),
                "fecha_emision": parsed.get("fecha_emision", "").strip()
            }

            return True, result, None

        except json.JSONDecodeError as jde:
            logger.error(f"Falla de parsing JSON desde Gemini: {jde} - Texto crudo: {response.text}")
            return False, {}, f"La respuesta de Gemini no es un JSON válido: {str(jde)}"
        except GoogleAPIError as gerr:
            logger.error(f"Google API Error: {gerr}")
            return False, {}, f"Error de comunicación con Google Gemini API: {str(gerr)}"
        except Exception as e:
            logger.error(f"Excepción general en Gemini Vision: {e}", exc_info=True)
            return False, {}, f"Falla en el pipeline de visión con Gemini: {str(e)}"
