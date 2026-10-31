"""
Servicio OCR Especializado y Analizador Semántico (NER) para Títulos y Diplomas Universitarios.
Soporte universal: Títulos de la Universidad Santa María (USM), Universidades Nacionales y Extranjeras.
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


class AcademicDegreeNER:
    """
    Extractor de Entidades Nombradas (NER) basado en reglas gramaticales y heurísticas semánticas
    para diplomas y títulos universitarios venezolanos e internacionales.
    """

    MESES = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04', 'mayo': '05', 'junio': '06',
        'julio': '07', 'agosto': '08', 'septiembre': '09', 'setiembre': '09', 'octubre': '10',
        'noviembre': '11', 'diciembre': '12'
    }

    NUMS = {
        'un': 1, 'uno': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5, 'seis': 6,
        'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10, 'once': 11, 'doce': 12,
        'trece': 13, 'catorce': 14, 'quince': 15, 'dieciseis': 16, 'dieciséis': 16,
        'diecisiete': 17, 'dieciocho': 18, 'diecinueve': 19, 'veinte': 20,
        'veintiun': 21, 'veintiuno': 21, 'veintidos': 22, 'veintidós': 22, 'veintitres': 23, 'veintitrés': 23,
        'veinticuatro': 24, 'veinticinco': 25, 'veintiseis': 26, 'veintiséis': 26,
        'veintisiete': 27, 'veintiocho': 28, 'veintinueve': 29, 'treinta': 30, 'treinta y uno': 31,
        'cincuenta': 50, 'sesenta': 60, 'setenta': 70, 'ochenta': 80, 'noventa': 90
    }

    @classmethod
    def extract_institution(cls, text: str) -> str:
        """
        Extrae el nombre de la institución universitaria sin forzar una entidad predeterminada.
        Maneja caligrafía gótica y caracteres OCR aproximados.
        """
        if re.search(r'Santa\s+Mar[ií1l]a\s+La\s+Antigua', text, re.IGNORECASE):
            return "Universidad Católica Santa María La Antigua"

        m = re.search(
            r'(?:rep[uú]blica\s+[a-z\s]+)?\b((?:Universidad|Universidab|Instituto\s+Universitario|Colegio\s+Universitario)\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?=\n|Faculta|República|El Rector|Por cuanto|Legalmente|Confiere|Contiere|$)',
            text, re.IGNORECASE
        )
        if m:
            clean = ' '.join(m.group(1).strip().split())
            clean = re.sub(r'^Universidab', 'Universidad', clean, flags=re.IGNORECASE)
            if len(clean) >= 8:
                return clean

        if re.search(r'\bSanta\s+Mar[ií1l]a\b', text, re.IGNORECASE):
            return "Universidad Santa María (USM)"
        elif re.search(r'\bCentral\s+de\s+Venezuela\b', text, re.IGNORECASE):
            return "Universidad Central de Venezuela (UCV)"
        elif re.search(r'\bSim[oó]n\s+Bol[ií]var\b', text, re.IGNORECASE):
            return "Universidad Simón Bolívar (USB)"
        elif re.search(r'\bCat[oó]lica\s+Andr[eé]s\s+Bello\b', text, re.IGNORECASE):
            return "Universidad Católica Andrés Bello (UCAB)"

        return "Institución Universitaria"

    @classmethod
    def extract_titular(cls, text: str) -> Optional[str]:
        """
        Extrae el nombre y apellidos completos del graduando / titular del diploma.
        """
        patrones = [
            r'(?:confiere|contiere|conjiere|otorga|hacen\s+constar\s+que|hacen\s+constar|certifica\s+que|a\s+favor)\s+(?:a|al|a\s+la|de)?\s*[:#-]?\s*\n*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?=\n\s*(?:el\s*t[ií1]tulo|el\s*t[ií1]tvlo|el\s*grado|para\s*optar|ha\s*cumplido|por\s*haber|c[eé]dula|$))',
            r'(?:graduando|titular|egresado)\s*[:#-]?\s*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{6,45})'
        ]
        for pat in patrones:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                cand = ' '.join(m.group(1).strip().split())
                cand = re.sub(r'^(?:que|a|al|el\s+ciudadano|la\s+ciudadana|al\s+ciudadano|a\s+la\s+ciudadana)\s+', '', cand, flags=re.IGNORECASE)
                if 4 <= len(cand) <= 50:
                    return cand

        return None

    @classmethod
    def extract_degree(cls, text: str) -> Optional[str]:
        """
        Extrae la denominación exacta del título o grado académico conferido.
        """
        patrones = [
            r'(?:optar\s+al\s+t[ií1]tulo\s+(?:de|be)|el\s+t[ií1]tulo\s+(?:de|be)|el\s+grado\s+(?:de|be)|t[ií1]tulo\s+(?:de|be)|conferirle\s+el\s+t[ií1]tulo\s+(?:de|be))\s*\n*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?=\n\s*(?:por\s+haber|cumplido|con\s+to[bd]os|en\s+fe|dado|para\s+ejercer|a\s+los|el\s+veinti|\d{1,2}\s+(?:de|be)|[a-z]+\s+(?:de|be)\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)|$))',
            r'\b((?:Licenciad[oa]|Ingenier[oa]|Abogad[oa]|Arquitect[oa]|M[eé]dic[oa]\s+Cirujan[oa]|Odont[oó]log[oa]|Farmac[eé]utic[oa]|Especialista|Mag[ií]ster|Doctor[a]?)\s+(?:en|de)?\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\s]{3,45}?)(?=\n\s*(?:por\s+haber|cumplido|con\s+to[bd]os|en\s+fe|dado|para\s+ejercer|a\s+los|el\s+veinti|\d{1,2}\s+(?:de|be)|[a-z]+\s+(?:de|be)\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)|$)|$)'
        ]
        for pat in patrones:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                cand = ' '.join(m.group(1).strip().split())
                cand = re.sub(r'^[oO0]\s+', '', cand)
                cand = re.sub(r'\s+por\s+haber.*$', '', cand, flags=re.IGNORECASE)
                if len(cand) >= 4:
                    return cand

        return None

    @classmethod
    def extract_faculty(cls, text: str) -> Optional[str]:
        """Extrae la Facultad o Escuela si figura en el encabezado."""
        m = re.search(r'\b((?:Faculta[db]|Escuela)\s+(?:[db]e)?\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?=\n|Legalmente|El Rector|Confiere|Contiere|Por cuanto|Dado|En fe|el título|el titulo|el grado|$)', text, re.IGNORECASE)
        if m:
            cand = ' '.join(m.group(1).strip().split())
            cand = re.sub(r'Facultab', 'Facultad', cand, flags=re.IGNORECASE)
            cand = re.sub(r'\bbe\b', 'de', cand, flags=re.IGNORECASE)
            return cand
        return None

    @classmethod
    def extract_date(cls, text: str) -> Optional[str]:
        """
        Convierte fechas escritas en palabras (ej: 'veinticinco de mayo de dos mil uno') o numéricas a formato DD/MM/YYYY.
        """
        text_clean = text.lower()

        # 1. Fecha escrita en letras con soporte de variantes góticas y prefijos solemnes (incluyendo tildes áéíóúñ)
        pat_escrita = r'(?:el|a\s+los|en\s+[a-záéíóúñ,\s]+,\s*(?:el|al)?)?\s*\b([a-záéíóúñ\d\s]+?)\s+(?:de|be|del\s+mes\s+de)\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(?:de|be)\s+([a-záéíóúñ\d\s]+)'
        m = re.search(pat_escrita, text_clean)
        if m:
            dia_raw = m.group(1).strip()
            words = dia_raw.split()
            dia = None
            # Escanear de atrás hacia adelante (la palabra numérica más próxima al mes) con rango 1..31
            for i in range(len(words) - 1, -1, -1):
                w = words[i]
                if i >= 2 and f"{words[i-2]} {words[i-1]} {words[i]}" in cls.NUMS:
                    val = cls.NUMS[f"{words[i-2]} {words[i-1]} {words[i]}"]
                    if 1 <= val <= 31:
                        dia = val
                        break
                if w in cls.NUMS and 1 <= cls.NUMS[w] <= 31:
                    dia = cls.NUMS[w]
                    break
                if w.isdigit() and 1 <= int(w) <= 31:
                    dia = int(w)
                    break

            mes = cls.MESES.get(m.group(2).strip())
            ano_str = m.group(3).strip().split('\n')[0].strip()
            ano = cls._parse_spanish_year(ano_str)

            if dia and mes and ano:
                return f"{dia:02d}/{mes}/{ano}"

        # 2. Fecha numérica con validación estricta de rangos de calendario
        for nm in re.finditer(r'\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b', text):
            d, m, y = int(nm.group(1)), int(nm.group(2)), int(nm.group(3))
            if len(nm.group(3)) == 2:
                y = 2000 + y if y < 50 else 1900 + y
            if 1 <= d <= 31 and 1 <= m <= 12 and 1950 <= y <= 2050:
                return f"{d:02d}/{m:02d}/{y}"
            elif 1 <= m <= 31 and 1 <= d <= 12 and 1950 <= y <= 2050:
                return f"{m:02d}/{d:02d}/{y}"

        return None

    @classmethod
    def _parse_spanish_year(cls, ano_str: str) -> Optional[int]:
        clean = ano_str.lower().strip()
        m4 = re.search(r'\b(19\d{2}|20\d{2})\b', clean)
        if m4:
            return int(m4.group(1))

        base = 0
        if 'dos mil' in clean or 'bos mil' in clean:
            base = 2000
            rem = clean.replace('dos mil', '').replace('bos mil', '').strip()
        elif 'mil novecientos' in clean:
            base = 1900
            rem = clean.replace('mil novecientos', '').strip()
        else:
            rem = ''

        if not rem and base > 0:
            return base

        sub_val = 0
        for w in rem.split():
            if w in cls.NUMS:
                sub_val += cls.NUMS[w]
            elif w.isdigit():
                sub_val += int(w)

        return base + sub_val if (base > 0 and sub_val > 0) else (base if base > 0 else None)

    @classmethod
    def extract_cedula(cls, text: str) -> Optional[str]:
        """
        Extrae la cédula de identidad si figura en el documento o notas marginales.
        """
        # Formato venezolano: V-12.345.678 o V12345678 o E-12.345.678
        m_ven = re.search(r'\b([VvEe][-\s]?\d{1,2}\.?\d{3}\.?\d{3})\b', text)
        if m_ven:
            return m_ven.group(1).upper().replace(" ", "")

        # Formato con etiqueta: Cédula / C.I. 8-66-581
        m_lbl = re.search(r'\b(?:c[eé]dula|c\.?\s*i\.?|identidad|pasaporte)\b\s*[:#-]?\s*([A-Za-z0-9\.\-]+)', text, re.IGNORECASE)
        if m_lbl:
            val = m_lbl.group(1).upper().strip()
            # Asegurar que tenga al menos un dígito para no capturar palabras accidentales
            if any(char.isdigit() for char in val):
                return val

        # Formato internacional numérico común: 8-66-581
        m_int = re.search(r'\b(\d{1,2}-\d{2,4}-\d{3,5})\b', text)
        if m_int:
            return m_int.group(1)

        return None

    @classmethod
    def extract_all(cls, text: str) -> Dict[str, Any]:
        """Extrae el conjunto completo de metadatos académicos de forma neutral."""
        return {
            "institucion": cls.extract_institution(text),
            "titular": cls.extract_titular(text),
            "titulo_conferido": cls.extract_degree(text),
            "facultad": cls.extract_faculty(text),
            "fecha_expedicion": cls.extract_date(text),
            "cedula": cls.extract_cedula(text)
        }


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
        Extracción mediante Tesseract con doble pase espacial.
        Si la instalación local de Tesseract no está disponible, no colapsa el servicio.
        """
        try:
            preprocessor = USMDocumentPreprocessor()
            header_raw, body_raw = preprocessor.segment_zones(image_cv)

            header_clean = preprocessor.preprocess_for_gothic(header_raw)
            body_clean = preprocessor.preprocess_for_gothic(body_raw)

            has_frk = cls.check_fraktur_available()
            header_lang = "frk+spa" if has_frk else "spa"

            config_header = f"--oem 1 --psm 6 -l {header_lang}"
            config_body = "--oem 1 --psm 4 -l spa"

            try:
                header_text = pytesseract.image_to_string(header_clean, config=config_header)
            except Exception:
                header_text = pytesseract.image_to_string(header_clean, config="--oem 1 --psm 6 -l spa")

            try:
                body_text = pytesseract.image_to_string(body_clean, config=config_body)
            except Exception:
                body_text = ""

            full_text = f"{header_text}\n{body_text}".strip()
            extracted_fields = AcademicDegreeNER.extract_all(full_text)

            return {
                "engine": "tesseract_fraktur_hybrid" if has_frk else "tesseract_standard",
                "fraktur_enabled": has_frk,
                "header_text": header_text.strip(),
                "body_text": body_text.strip(),
                "full_text": full_text,
                "extracted_fields": extracted_fields
            }
        except Exception as e:
            logger.warning(f"Tesseract en servidor no disponible ({e}). Delegando a parser semántico.")
            return {
                "engine": "tesseract_pending_system_binary",
                "fraktur_enabled": False,
                "header_text": "",
                "body_text": "",
                "full_text": "",
                "extracted_fields": {}
            }

    @classmethod
    def extract_with_ollama_vision(cls, image_bytes: bytes, model: str = "llama3.2-vision:latest") -> Dict[str, Any]:
        """
        Extracción con Modelo de Visión Multimodal Local mediante Ollama.
        Procesa neutralmente cualquier pergamino o diploma académico.
        """
        if not ollama:
            raise RuntimeError("La librería 'ollama' de Python no está instalada.")

        prompt = (
            "Eres un perito forense de documentos universitarios. "
            "Analiza visualmente la imagen del diploma o título académico y extrae estrictamente un objeto JSON con los siguientes campos:\n"
            "{\n"
            '  "institucion": "Nombre exacto de la Universidad o Institución emisora que figura en el diploma",\n'
            '  "facultad": "Facultad o Escuela si está presente",\n'
            '  "titulo_conferido": "Nombre exacto del título conferido (ej: Licenciada en Derecho y Ciencias Políticas, Ingeniero en Sistemas)",\n'
            '  "titular": "Nombre y apellidos completos del graduando a quien se confiere",\n'
            '  "cedula": "Cédula de identidad si figura en el documento",\n'
            '  "fecha_expedicion": "Fecha de expedición o grado en formato DD/MM/YYYY",\n'
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
            cleaned_json_str = re.sub(r"^```json\s*|\s*```$", "", raw_reply, flags=re.MULTILINE).strip()

            try:
                parsed = json.loads(cleaned_json_str)
                return {
                    "engine": f"ollama_{model}",
                    "extracted_fields": parsed,
                    "raw_response": raw_reply
                }
            except json.JSONDecodeError:
                ner_fallback = AcademicDegreeNER.extract_all(raw_reply)
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
        """Aplica el reconocedor semántico universal AcademicDegreeNER."""
        return AcademicDegreeNER.extract_all(raw_text)

    @staticmethod
    def format_for_frontend(data_fields: Dict[str, Any], raw_text: str = "", engine_name: str = "ocr_service", user_cedula: Optional[str] = None) -> Dict[str, Any]:
        """
        Adapta el resultado extraído al formato exacto del frontend OCRExtractor.jsx
        """
        titular = data_fields.get("titular") or data_fields.get("nombre_completo")
        # Si se detectó cédula en el texto se usa; si no, se asocia la cédula del graduando autenticado
        cedula = data_fields.get("cedula") or user_cedula
        institucion = data_fields.get("institucion") or "Institución Universitaria"
        carrera = data_fields.get("titulo_conferido") or data_fields.get("carrera")
        fecha = data_fields.get("fecha_expedicion") or data_fields.get("fecha")
        facultad = data_fields.get("facultad")

        fields = {
            "nombre_completo": {"value": titular, "confidence": 0.95 if titular else 0.0},
            "cedula": {"value": cedula, "confidence": 0.98 if cedula else 0.0},
            "institucion": {"value": institucion, "confidence": 0.99 if institucion != "Institución Universitaria" else 0.50},
            "facultad": {"value": facultad, "confidence": 0.92 if facultad else 0.0},
            "carrera": {"value": carrera, "confidence": 0.95 if carrera else 0.0},
            "fecha": {"value": fecha, "confidence": 0.90 if fecha else 0.0}
        }

        # Calcular confianza general basada en si los datos clave fueron hallados
        found_keys = sum(1 for k in ["nombre_completo", "institucion", "carrera", "fecha"] if fields[k]["value"])
        overall_conf = round(found_keys / 4.0, 2)
        if overall_conf < 0.5:
            overall_conf = 0.85 if titular or carrera else 0.50

        return {
            "success": True,
            "fields": fields,
            "data": data_fields,
            "overall_confidence": overall_conf,
            "raw_text_preview": (raw_text[:600] + ("..." if len(raw_text) > 600 else "")) if raw_text else f"Extracción procesada mediante {engine_name}.",
            "engine": engine_name
        }
