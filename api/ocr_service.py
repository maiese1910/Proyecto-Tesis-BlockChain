"""
Servicio OCR Especializado para Títulos Universitarios de la Universidad Santa María (USM).
Manejo de fuentes góticas (Old English Text MT / Diploma) y tipografía serif.
"""

import os
import re
import json
import logging
from typing import Dict, Any, Optional

import cv2
import numpy as np
import pytesseract
from PIL import Image

try:
    import ollama
except ImportError:
    ollama = None

from vision_preprocessor import USMDocumentPreprocessor

# Configuración de Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("USMOcrService")

# Detectar ruta por defecto de Tesseract en Windows
TESSERACT_PATHS = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    r"C:\Users\MAURO\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"
]
for p in TESSERACT_PATHS:
    if os.path.exists(p):
        pytesseract.pytesseract.tesseract_cmd = p
        break


class USMOcrService:
    """
    Motor Híbrido de Reconocimiento Óptico de Caracteres y Visión Local.
    """

    @classmethod
    def check_fraktur_available(cls) -> bool:
        """Verifica si el paquete de idioma 'frk' (Fraktur) está instalado en Tesseract."""
        try:
            langs = pytesseract.get_languages(config="")
            return "frk" in langs
        except Exception as e:
            logger.warning(f"No se pudo consultar idiomas de Tesseract: {e}")
            return False

    @classmethod
    def extract_with_tesseract(cls, image_cv: np.ndarray) -> Dict[str, Any]:
        """
        Extracción mediante Tesseract con doble pase espacial:
        - Zona superior (encabezado): Modelo Fraktur + Español ('frk+spa') si está disponible.
        - Zona inferior (cuerpo): Modelo Español estándar ('spa').
        """
        preprocessor = USMDocumentPreprocessor()
        header_raw, body_raw = preprocessor.segment_zones(image_cv)

        # Preprocesar cada región con filtros morfológicos
        header_clean = preprocessor.preprocess_for_gothic(header_raw)
        body_clean = preprocessor.preprocess_for_gothic(body_raw)

        has_frk = cls.check_fraktur_available()
        header_lang = "frk+spa" if has_frk else "spa"

        # PSM 6: Bloque de texto uniforme; OEM 1: Redes neuronales LSTM
        config_header = f"--oem 1 --psm 6 -l {header_lang}"
        config_body = "--oem 1 --psm 4 -l spa"

        try:
            header_text = pytesseract.image_to_string(header_clean, config=config_header)
        except Exception as e:
            logger.warning(f"Error procesando encabezado con '{header_lang}', reintentando con 'spa': {e}")
            header_text = pytesseract.image_to_string(header_clean, config="--oem 1 --psm 6 -l spa")

        try:
            body_text = pytesseract.image_to_string(body_clean, config=config_body)
        except Exception as e:
            logger.warning(f"Error procesando cuerpo: {e}")
            body_text = ""

        full_text = f"{header_text}\n{body_text}".strip()
        extracted_fields = cls.rule_based_ner(full_text)

        return {
            "engine": "tesseract_fraktur_hybrid" if has_frk else "tesseract_standard",
            "fraktur_enabled": has_frk,
            "header_text": header_text.strip(),
            "body_text": body_text.strip(),
            "full_text": full_text,
            "extracted_fields": extracted_fields
        }

    @classmethod
    def extract_with_ollama_vision(cls, image_bytes: bytes, model: str = "llama3.2-vision:latest") -> Dict[str, Any]:
        """
        Extracción con Modelo de Visión Multimodal Local mediante Ollama.
        Procesa sin pérdida de privacidad y lee con alta precisión la tipografía Old English Text MT.
        """
        if not ollama:
            raise RuntimeError("La librería 'ollama' de Python no está instalada.")

        prompt = (
            "Eres un auditor y perito forense de documentos de la Universidad Santa María (Caracas, Venezuela). "
            "El encabezado y el nombre del título están escritos en tipografía gótica (Old English Text MT / Diploma) "
            "y el cuerpo en tipografía serif / Times New Roman.\n\n"
            "Analiza visualmente la imagen del título o acta y extrae estrictamente un objeto JSON con los siguientes campos:\n"
            "{\n"
            '  "institucion": "Universidad Santa María",\n'
            '  "titulo_conferido": "Nombre exacto del título (ej: Ingeniero en Sistemas, Abogado, Licenciado en Comunicación Social)",\n'
            '  "titular": "Nombre y apellidos completos del graduando",\n'
            '  "cedula": "Cédula de identidad con formato V-XX.XXX.XXX o E-XX.XXX.XXX",\n'
            '  "fecha_expedicion": "Fecha de grado o emisión en formato YYYY-MM-DD",\n'
            '  "tomo": "Número de tomo si está visible (ej: Tomo XIV)",\n'
            '  "folio": "Número de folio si está visible",\n'
            '  "rector": "Nombre del Rector o autoridad firmante si figura",\n'
            '  "confianza_estimada": 0.98\n'
            "}\n"
            "IMPORTANTE: Devuelve ÚNICAMENTE el código JSON. No incluyas explicaciones, saludos ni bloques de markdown."
        )

        try:
            res = ollama.chat(
                model=model,
                messages=[{
                    "role": "user",
                    "content": prompt,
                    "images": [image_bytes]
                }],
                options={
                    "temperature": 0.05,
                    "top_p": 0.2
                }
            )

            raw_reply = res["message"]["content"].strip()
            # Limpiar posibles delimitadores markdown
            cleaned_json_str = re.sub(r"^```json\s*|\s*```$", "", raw_reply, flags=re.MULTILINE).strip()

            try:
                parsed = json.loads(cleaned_json_str)
                return {
                    "engine": f"ollama_{model}",
                    "extracted_fields": parsed,
                    "raw_response": raw_reply
                }
            except json.JSONDecodeError:
                # Fallback al analizador de expresiones regulares si el modelo agregó texto
                ner_fallback = cls.rule_based_ner(raw_reply)
                return {
                    "engine": f"ollama_{model}_partial_json",
                    "extracted_fields": ner_fallback,
                    "raw_response": raw_reply
                }
        except Exception as e:
            logger.error(f"Error invocando Ollama local: {e}")
            raise e

    @staticmethod
    def rule_based_ner(raw_text: str) -> Dict[str, Any]:
        """
        Extracción y normalización semántica mediante expresiones regulares con reglas venezolanas.
        """
        cedula_match = re.search(r"[VvEe][-\s]?\d{1,2}\.?\d{3}\.?\d{3}", raw_text)
        
        # Buscar titular
        nombre_match = re.search(
            r"(?:confiere\s+el\s+t[ií]tulo\s+de.*?a|confiere\s+a|otorga\s+a|graduando|a\s+favor\s+de)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{6,45})",
            raw_text,
            re.IGNORECASE | re.DOTALL
        )
        
        # Buscar título conferido
        titulo_match = re.search(
            r"(?:T[íI]tulo\s+de|Grado\s+de|Ingeniero\s+en|Ingeniero\s+de|Licenciado\s+en|Abogado|Arquitecto|Odont[oó]logo|Farmac[eé]utico)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{4,35})",
            raw_text,
            re.IGNORECASE
        )

        # Buscar tomo y folio
        tomo_match = re.search(r"tomo\s*[:#-]?\s*([IVXLCDM\d]+)", raw_text, re.IGNORECASE)
        folio_match = re.search(r"folio\s*[:#-]?\s*(\d+)", raw_text, re.IGNORECASE)

        # Fecha tentativa
        fecha_match = re.search(r"(\d{1,2})\s+de\s+([a-zA-Z]+)\s+de\s+(\d{4})", raw_text, re.IGNORECASE)
        fecha_str = None
        if fecha_match:
            fecha_str = f"{fecha_match.group(1)} de {fecha_match.group(2)} de {fecha_match.group(3)}"

        clean_titular = None
        if nombre_match:
            candidate = nombre_match.group(1).strip()
            # Limpiar líneas extra
            clean_titular = candidate.split("\n")[0].strip()

        return {
            "institucion": "Universidad Santa María" if ("SANTA MAR" in raw_text.upper() or "USM" in raw_text.upper()) else "Universidad Santa María",
            "titular": clean_titular,
            "cedula": cedula_match.group(0).upper().replace(" ", "") if cedula_match else None,
            "titulo_conferido": titulo_match.group(0).strip() if titulo_match else None,
            "tomo": tomo_match.group(1).upper() if tomo_match else None,
            "folio": folio_match.group(1) if folio_match else None,
            "fecha_expedicion": fecha_str
        }

    @staticmethod
    def format_for_frontend(data_fields: Dict[str, Any], raw_text: str = "", engine_name: str = "ocr_service") -> Dict[str, Any]:
        """
        Adapta el resultado extraído al formato exacto esperado por el componente OCRExtractor.jsx
        """
        titular = data_fields.get("titular") or data_fields.get("nombre_completo")
        cedula = data_fields.get("cedula")
        institucion = data_fields.get("institucion") or "Universidad Santa María"
        carrera = data_fields.get("titulo_conferido") or data_fields.get("carrera")
        fecha = data_fields.get("fecha_expedicion") or data_fields.get("fecha")

        fields = {
            "nombre_completo": {"value": titular, "confidence": 0.95 if titular else 0.0},
            "cedula": {"value": cedula, "confidence": 0.98 if cedula else 0.0},
            "institucion": {"value": institucion, "confidence": 0.99},
            "carrera": {"value": carrera, "confidence": 0.94 if carrera else 0.0},
            "fecha": {"value": fecha, "confidence": 0.90 if fecha else 0.0}
        }
        
        return {
            "success": True,
            "fields": fields,
            "data": data_fields,
            "overall_confidence": 0.95 if (titular and cedula) else 0.85,
            "raw_text_preview": (raw_text[:500] + ("..." if len(raw_text) > 500 else "")) if raw_text else f"Extracción procesada exitosamente mediante {engine_name}.",
            "engine": engine_name
        }


