"""
Módulo de Visión Multimodal con Mistral API (Pixtral 12B / Pixtral Large)
Especializado en digitalización y extracción forense de títulos universitarios,
caligrafía gótica (Old English Text MT / Diploma) y pergaminos históricos.
"""

import os
import re
import json
import base64
import logging
from typing import Dict, Any, Tuple, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("MistralVisionService")

try:
    from mistralai import Mistral
except ImportError:
    try:
        from mistralai.client import Mistral
    except ImportError:
        Mistral = None

MISTRAL_PROMPT_SYSTEM = """Eres un perito forense y especialista en visión artificial de documentos académicos y diplomas universitarios.
Analiza con rigor la imagen del título universitario adjunto y extrae con máxima fidelidad la información institucional y académica.

INSTRUCCIONES DE EXTRACCIÓN Y ROBUSTEZ:
1. FUENTES GÓTICAS Y ORNAMENTALES: El diploma utiliza tipografías de estilo gótico medieval (Old English Text MT / Diploma / Cancilleresca), caligrafía en tinta roja y mayúsculas ornamentadas en el encabezado, nombre y denominación del título. Debes transcribir los caracteres originales sin omitir partes por su complejidad visual.
2. SUPRESIÓN DE RUIDO Y SELLOS: Ignora por completo sellos redondos de registro, timbres fiscales (SAREN), firmas rectorales, sellos de agua o notas marginales que no correspondan a los 5 campos canónicos solicitados.
3. NORMALIZACIÓN DE CAMPOS:
   - "nombre_completo": Nombre y apellidos completos del graduando titular. Limpia prefijos como "Que:", "a favor de", "al ciudadano" o fórmulas de concesión.
   - "cedula": Cédula de identidad con su prefijo y formato original (ej: "V-23.916.908", "V-28.315.101" o "8-66-581").
   - "institucion_educativa": Nombre institucional canónico de la Universidad emisora (ej: "Universidad Central de Venezuela", "Universidad Santa María", "Universidad Católica Santa María La Antigua").
   - "mencion_carrera": Denominación exacta del título o grado conferido (ej: "Médico Cirujano", "Ingeniero en Sistemas", "Licenciada en Derecho y Ciencias Políticas"). Elimina prefijos como "el título de:" y leyendas reglamentarias posteriores como "Tómese Razón de este Diploma...".
   - "fecha_emision": Fecha oficial de expedición o grado en formato estricto DD/MM/YYYY. Transpila fechas redactadas en letras (ej: "a los cuatro días del mes de diciembre del año dos mil dieciocho" -> "04/12/2018", "veinticinco de mayo de dos mil uno" -> "25/05/2001").

FORMATO DE SALIDA REQUERIDO:
Debes responder ÚNICAMENTE con un objeto JSON válido, sin bloques de código markdown adicionados, sin explicaciones ni saludos, conteniendo exactamente estas 5 claves:
{
  "nombre_completo": "string",
  "cedula": "string",
  "institucion_educativa": "string",
  "mencion_carrera": "string",
  "fecha_emision": "string"
}"""


class MistralVisionExtractor:
    @staticmethod
    def get_client() -> Optional[Any]:
        api_key = os.getenv("MISTRAL_API_KEY")
        if not api_key:
            return None
        if not Mistral:
            raise RuntimeError("El paquete 'mistralai' no está instalado en el entorno.")
        return Mistral(api_key=api_key)

    @classmethod
    def extract_from_base64(cls, image_b64: str, mime_type: str = "image/jpeg") -> Tuple[bool, Dict[str, Any], Optional[str]]:
        """
        Envía la imagen codificada en base64 al modelo multimodal de Mistral.
        Retorna (éxito, diccionario_campos, error_mensaje).
        """
        client = cls.get_client()
        if not client:
            return False, {}, "MISTRAL_API_KEY no configurada en las variables de entorno (.env)."

        model = os.getenv("MISTRAL_VISION_MODEL", "pixtral-12b-2409")

        # Asegurar formato limpio de base64
        if "," in image_b64:
            header, image_b64 = image_b64.split(",", 1)
            if "png" in header:
                mime_type = "image/png"
            elif "webp" in header:
                mime_type = "image/webp"

        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": MISTRAL_PROMPT_SYSTEM
                    },
                    {
                        "type": "image_url",
                        "image_url": f"data:{mime_type};base64,{image_b64}"
                    }
                ]
            }
        ]

        try:
            chat_response = client.chat.complete(
                model=model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.0
            )

            raw_text = chat_response.choices[0].message.content.strip()
            # Eliminar posibles bloques de markdown si el LLM los incluye
            clean_json_str = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text, flags=re.MULTILINE).strip()
            parsed = json.loads(clean_json_str)

            # Estructurar con las 5 claves exactas
            result = {
                "nombre_completo": parsed.get("nombre_completo", "").strip(),
                "cedula": parsed.get("cedula", "").strip(),
                "institucion_educativa": parsed.get("institucion_educativa", "").strip(),
                "mencion_carrera": parsed.get("mencion_carrera", "").strip(),
                "fecha_emision": parsed.get("fecha_emision", "").strip()
            }

            return True, result, None

        except json.JSONDecodeError as jde:
            logger.error(f"Falla decodificando respuesta JSON de Mistral: {jde}")
            return False, {}, f"Respuesta de Mistral no es JSON válido: {str(jde)}"
        except Exception as e:
            logger.error(f"Error invocando Mistral Vision API: {e}", exc_info=True)
            return False, {}, f"Error en Mistral Vision API: {str(e)}"
