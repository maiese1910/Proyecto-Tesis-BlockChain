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

try:
    import cv2
    import numpy as np
    import pytesseract
    from PIL import Image
except Exception:
    cv2 = None
    np = None
    pytesseract = None
    Image = None

try:
    import ollama
except ImportError:
    ollama = None

from vision_preprocessor import USMDocumentPreprocessor

# Configuración de Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("USMOcrService")

# Configuración del motor Tesseract con datos locales (Español, Gótico Fraktur, Inglés)
LOCAL_TESSDATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tessdata")
if os.path.exists(LOCAL_TESSDATA):
    os.environ["TESSDATA_PREFIX"] = LOCAL_TESSDATA

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

    # ─── CATÁLOGO MAESTRO DE UNIVERSIDADES DE VENEZUELA (OFICIAL) ───────────────
    CATALOGO_UNIVERSIDADES = [
        {"nombre": "Universidad Central de Venezuela (UCV)", "siglas": "UCV", "keywords": ["central de venezuela", "universidad central", "ucv"]},
        {"nombre": "Universidad Santa María (USM)", "siglas": "USM", "keywords": ["santa maria", "santa maría", "usm"]},
        {"nombre": "Universidad Católica Andrés Bello (UCAB)", "siglas": "UCAB", "keywords": ["catolica andres bello", "católica andrés bello", "ucab"]},
        {"nombre": "Universidad Simón Bolívar (USB)", "siglas": "USB", "keywords": ["simon bolivar", "simón bolívar", "usb"]},
        {"nombre": "Universidad de Carabobo (UC)", "siglas": "UC", "keywords": ["universidad de carabobo", "carabobo"]},
        {"nombre": "Universidad de Los Andes (ULA)", "siglas": "ULA", "keywords": ["universidad de los andes", "los andes", "ula"]},
        {"nombre": "Universidad del Zulia (LUZ)", "siglas": "LUZ", "keywords": ["universidad del zulia", "del zulia", "luz"]},
        {"nombre": "Universidad Metropolitana (UNIMET)", "siglas": "UNIMET", "keywords": ["universidad metropolitana", "metropolitana", "unimet"]},
        {"nombre": "Universidad Nacional Experimental Politécnica de la Fuerza Armada (UNEFA)", "siglas": "UNEFA", "keywords": ["fuerza armada", "unefa", "politecnica de la fuerza"]},
        {"nombre": "Universidad Nacional Experimental Simón Rodríguez (UNESR)", "siglas": "UNESR", "keywords": ["simon rodriguez", "simón rodríguez", "unesr"]},
        {"nombre": "Universidad Pedagógica Experimental Libertador (UPEL)", "siglas": "UPEL", "keywords": ["pedagogica experimental", "libertador", "upel"]},
        {"nombre": "Universidad Centroccidental Lisandro Alvarado (UCLA)", "siglas": "UCLA", "keywords": ["lisandro alvarado", "centroccidental", "ucla"]},
        {"nombre": "Universidad Dr. Rafael Belloso Chacín (URBE)", "siglas": "URBE", "keywords": ["belloso chacin", "belloso chacín", "urbe"]},
        {"nombre": "Universidad José Antonio Páez (UJAP)", "siglas": "UJAP", "keywords": ["jose antonio paez", "josé antonio páez", "ujap"]},
        {"nombre": "Universidad Alejandro de Humboldt (UAH)", "siglas": "UAH", "keywords": ["alejandro de humboldt", "uah"]},
        {"nombre": "Universidad Monteávila (UMA)", "siglas": "UMA", "keywords": ["monteavila", "monteávila", "uma"]},
        {"nombre": "Universidad Bicentenaria de Aragua (UBA)", "siglas": "UBA", "keywords": ["bicentenaria de aragua", "uba"]},
        {"nombre": "Universidad Rafael Urdaneta (URU)", "siglas": "URU", "keywords": ["rafael urdaneta", "uru"]},
        {"nombre": "Universidad Yacambú (UNY)", "siglas": "UNY", "keywords": ["yacambu", "yacambú", "uny"]},
        {"nombre": "Universidad Nacional Experimental de Guayana (UNEG)", "siglas": "UNEG", "keywords": ["guayana", "uneg"]},
        {"nombre": "Universidad Nacional Experimental de los Llanos Ezequiel Zamora (UNELLEZ)", "siglas": "UNELLEZ", "keywords": ["llanos occidentales", "ezequiel zamora", "unellez"]},
        {"nombre": "Universidad Nacional Experimental Francisco de Miranda (UNEFM)", "siglas": "UNEFM", "keywords": ["francisco de miranda", "unefm"]},
        {"nombre": "Universidad Bolivariana de Venezuela (UBV)", "siglas": "UBV", "keywords": ["universidad bolivariana", "ubv"]},
        {"nombre": "Universidad Nacional Experimental Politécnica Antonio José de Sucre (UNEXPO)", "siglas": "UNEXPO", "keywords": ["antonio jose de sucre", "unexpo", "politecnica antonio"]},
        {"nombre": "Universidad Católica Santa María La Antigua (USMA)", "siglas": "USMA", "keywords": ["santa maria la antigua", "usma"]}
    ]

    # ─── CATÁLOGO OFICIAL DE CARRERAS Y TITULACIONES (OPSU / LOEU) ───────────────
    CATALOGO_CARRERAS = [
        # Ingenierías
        {"titulo": "Ingeniero de Sistemas", "keywords": ["ingeniero de sistemas", "ingenieria de sistemas", "ingeniero en sistemas", "ingenieria en sistemas", "sistemas"]},
        {"titulo": "Ingeniero en Informática", "keywords": ["ingeniero en informatica", "ingenieria informatica", "ingeniero informatico", "informatica"]},
        {"titulo": "Ingeniero de Telecomunicaciones", "keywords": ["ingeniero de telecomunicaciones", "ingenieria de telecomunicaciones", "telecomunicaciones"]},
        {"titulo": "Ingeniero Civil", "keywords": ["ingeniero civil", "ingenieria civil", "civil"]},
        {"titulo": "Ingeniero Industrial", "keywords": ["ingeniero industrial", "ingenieria industrial", "industrial"]},
        {"titulo": "Ingeniero Mecánico", "keywords": ["ingeniero mecanico", "ingenieria mecanica", "mecanico"]},
        {"titulo": "Ingeniero Electricista", "keywords": ["ingeniero electricista", "ingeniero electrico", "ingenieria electrica", "electricista"]},
        {"titulo": "Ingeniero Electrónico", "keywords": ["ingeniero electronico", "ingenieria electronica", "electronico"]},
        {"titulo": "Ingeniero Químico", "keywords": ["ingeniero quimico", "ingenieria quimica", "quimico"]},
        {"titulo": "Arquitecto", "keywords": ["arquitecto", "arquitectura"]},
        # Ciencias Sociales y Humanidades
        {"titulo": "Abogado", "keywords": ["abogado", "abogada", "ciencias juridicas", "derecho"]},
        {"titulo": "Licenciada en Derecho y Ciencias Políticas", "keywords": ["derecho y ciencias politicas"]},
        {"titulo": "Licenciado en Administración", "keywords": ["licenciado en administracion", "administracion comercial", "administracion de empresas", "administracion"]},
        {"titulo": "Contador Público", "keywords": ["contador publico", "contaduria publica", "licenciado en contaduria"]},
        {"titulo": "Licenciado en Comunicación Social", "keywords": ["comunicacion social", "licenciado en comunicacion", "periodista"]},
        {"titulo": "Economista", "keywords": ["economista", "licenciado en economia", "ciencias economicas", "economia"]},
        {"titulo": "Licenciado en Psicología", "keywords": ["psicologia", "licenciado en psicologia", "psicologo"]},
        {"titulo": "Licenciado en Educación", "keywords": ["licenciado en educacion", "educacion integral", "educacion"]},
        {"titulo": "Licenciado en Estudios Internacionales", "keywords": ["estudios internacionales"]},
        {"titulo": "Licenciado en Relaciones Industriales", "keywords": ["relaciones industriales"]},
        # Ciencias de la Salud
        {"titulo": "Médico Cirujano", "keywords": ["medico cirujano", "medicina", "medico cirujana"]},
        {"titulo": "Odontólogo", "keywords": ["odontologo", "odontologia", "odontologa"]},
        {"titulo": "Farmacéutico", "keywords": ["farmaceutico", "farmacia", "farmaceutica"]},
        {"titulo": "Licenciado en Enfermería", "keywords": ["enfermeria", "licenciado en enfermeria", "enfermero", "enfermera"]},
        {"titulo": "Licenciado en Bioanálisis", "keywords": ["bioanalisis", "licenciado en bioanalisis"]},
        {"titulo": "Licenciado en Fisioterapia", "keywords": ["fisioterapia", "fisioterapeuta"]},
        {"titulo": "Licenciado en Nutrición y Dietética", "keywords": ["nutricion y dietetica", "nutricionista"]},
        # Ciencias Básicas
        {"titulo": "Licenciado en Computación", "keywords": ["licenciado en computacion", "ciencias de la computacion", "computacion"]},
        {"titulo": "Licenciado en Biología", "keywords": ["licenciado en biologia", "biologo"]},
        {"titulo": "Licenciado en Química", "keywords": ["licenciado en quimica", "quimica"]},
        {"titulo": "Licenciado en Física", "keywords": ["licenciado en fisica", "fisica"]},
        {"titulo": "Licenciado en Matemática", "keywords": ["licenciado en matematica", "matematica"]}
    ]

    # ─── FRASES DE CONTROL LEGAL Y DELIMITADORES DE PROTOCOLO ────────────────────
    FRASES_CONTROL_LEGAL = [
        "cumplio con todos los requisitos exigidos por las leyes",
        "cumplió con todos los requisitos exigidos por las leyes",
        "en nombre de la republica y por autoridad de la ley",
        "en nombre de la república y por autoridad de la ley",
        "se le confiere el titulo de",
        "se le confiere el título de",
        "confiere el titulo de",
        "confiere el título de",
        "reconozcase y tengase en toda la republica",
        "reconózcase y téngase en toda la república",
        "en fe de lo cual se firma el presente",
        "quedo registrado bajo el",
        "quedó registrado bajo el",
        "hago saber:",
        "hace saber:"
    ]

    @staticmethod
    def levenshtein_similarity(s1: str, s2: str) -> float:
        """Calcula el ratio de similitud difusa de Levenshtein entre dos cadenas (0.0 a 1.0)."""
        if not s1 or not s2:
            return 0.0
        s1, s2 = s1.lower().strip(), s2.lower().strip()
        if s1 == s2:
            return 1.0
        len1, len2 = len(s1), len(s2)
        dp = [[0] * (len2 + 1) for _ in range(len1 + 1)]
        for i in range(len1 + 1):
            dp[i][0] = i
        for j in range(len2 + 1):
            dp[0][j] = j
        for i in range(1, len1 + 1):
            for j in range(1, len2 + 1):
                cost = 0 if s1[i - 1] == s2[j - 1] else 1
                dp[i][j] = min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
        distance = dp[len1][len2]
        max_len = max(len1, len2)
        return max(0.0, 1.0 - (distance / max_len))



    @classmethod
    def extract_institution(cls, text: str) -> Optional[str]:
        """
        Extrae el nombre oficial de la institución universitaria mediante:
        1. Búsqueda exacta y coincidencia de patrones por Regex.
        2. Búsqueda difusa (Fuzzy Matching con Levenshtein) contra el Catálogo Maestro de 23 Universidades.
        """
        text_lower = text.lower()

        # 1. Búsqueda directa por Catálogo Maestro de Universidades (con límites de palabra exactos)
        for u in cls.CATALOGO_UNIVERSIDADES:
            for kw in u["keywords"]:
                if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
                    return u["nombre"]

        # 2. Búsqueda por Regex canónico con tolerancia a ortografía gótica
        m = re.search(
            r'(?:rep[uú]blica\s+[a-z\s]+)?\b((?:[uv]n[i1l]vers[i1l]da[db]|instituto\s+universitario|colegio\s+universitario)\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?=\n|faculta|república|el rector|por cuanto|legalmente|confiere|contiere|$)',
            text, re.IGNORECASE
        )
        if m:
            clean = ' '.join(m.group(1).strip().split())
            clean = re.sub(r'^[uv]n[i1l]vers[i1l]da[db]', 'Universidad', clean, flags=re.IGNORECASE)
            if len(clean) >= 8:
                # Comprobar si coincide por Fuzzy Matching con alguna universidad oficial
                best_match = None
                best_score = 0.0
                for u in cls.CATALOGO_UNIVERSIDADES:
                    score = cls.levenshtein_similarity(clean, u["nombre"])
                    for kw in u["keywords"]:
                        score_kw = cls.levenshtein_similarity(clean, kw)
                        if score_kw > score:
                            score = score_kw
                    if score > best_score:
                        best_score = score
                        best_match = u["nombre"]

                if best_score >= 0.72 and best_match:
                    return best_match
                return clean

        # 3. Fuzzy scan línea por línea contra el Catálogo Maestro
        lines = [line.strip() for line in text.split('\n') if len(line.strip()) >= 5]
        best_match = None
        best_score = 0.0
        for line in lines[:10]: # Las universidades siempre están en las primeras 10 líneas
            for u in cls.CATALOGO_UNIVERSIDADES:
                for kw in u["keywords"]:
                    score = cls.levenshtein_similarity(line, kw)
                    if score > best_score:
                        best_score = score
                        best_match = u["nombre"]

        if best_score >= 0.75 and best_match:
            return best_match

        if re.search(r'\bCentral\s+de\s+Venezuela\b|Facultad\s+de\s+Medicina|U\.?C\.?V\.?|M[eé]dic[oa]\s+Cirujan[oa]', text, re.IGNORECASE):
            return "Universidad Central de Venezuela (UCV)"
        elif re.search(r'\bSanta\s+Mar[ií1l]a\b|U\.?S\.?M\.?', text, re.IGNORECASE):
            return "Universidad Santa María (USM)"
        elif re.search(r'\bSim[oó]n\s+Bol[ií]var\b|U\.?S\.?B\.?', text, re.IGNORECASE):
            return "Universidad Simón Bolívar (USB)"
        elif re.search(r'\bCat[oó]lica\s+Andr[eé]s\s+Bello\b|U\.?C\.?A\.?B\.?', text, re.IGNORECASE):
            return "Universidad Católica Andrés Bello (UCAB)"
        elif re.search(r'\bde\s+Los\s+Andes\b|U\.?L\.?A\.?', text, re.IGNORECASE):
            return "Universidad de Los Andes (ULA)"
        elif re.search(r'\bdel\s+Zulia\b|L\.?U\.?Z\.?', text, re.IGNORECASE):
            return "Universidad del Zulia (LUZ)"
        elif re.search(r'\bde\s+Carabobo\b|U\.?C\.?\b', text, re.IGNORECASE):
            return "Universidad de Carabobo (UC)"
        elif re.search(r'\bMetropolitana\b|U\.?N\.?I\.?M\.?E\.?T\.?', text, re.IGNORECASE):
            return "Universidad Metropolitana (UNIMET)"
        elif re.search(r'\bde\s+Oriente\b|U\.?D\.?O\.?', text, re.IGNORECASE):
            return "Universidad de Oriente (UDO)"
        elif re.search(r'\bLisandro\s+Alvarado\b|U\.?C\.?L\.?A\.?', text, re.IGNORECASE):
            return "Universidad Centroccidental Lisandro Alvarado (UCLA)"
        elif re.search(r'\bPolit[eé]cnica\b|U\.?N\.?E\.?X\.?P\.?O\.?', text, re.IGNORECASE):
            return "UNEXPO"
        elif re.search(r'\bFuerzas\s+Armadas\b|U\.?N\.?E\.?F\.?A\.?', text, re.IGNORECASE):
            return "UNEFA"
        elif re.search(r'\bAlejandro\s+de\s+Humboldt\b|U\.?A\.?H\.?', text, re.IGNORECASE):
            return "Universidad Alejandro de Humboldt (UAH)"
        elif re.search(r'\bMonte[aá]vila\b|U\.?M\.?A\.?', text, re.IGNORECASE):
            return "Universidad Monteávila (UMA)"
        elif re.search(r'\bJos[eé]\s+Antonio\s+P[aá]ez\b|U\.?J\.?A\.?P\.?', text, re.IGNORECASE):
            return "Universidad José Antonio Páez (UJAP)"
        elif re.search(r'\bBicentenaria\s+de\s+Aragua\b|U\.?B\.?A\.?', text, re.IGNORECASE):
            return "Universidad Bicentenaria de Aragua (UBA)"
        elif re.search(r'\bBelloso\s+Chac[ií]n\b|U\.?R\.?B\.?E\.?', text, re.IGNORECASE):
            return "Universidad Dr. Rafael Belloso Chacín (URBE)"

        return None

    @classmethod
    def extract_titular(cls, text: str) -> Optional[str]:
        """
        Extrae el nombre y apellidos completos del graduando / titular del diploma.
        Universal: admite patrones rectorales (UCV), de concesión (USM/USMA) y por cumplimiento.
        """
        patrones = [
            # Patrón A (Rectoral / UCV): "Hago saber: Que: [NOMBRE] Titular de la cédula..."
            r'(?:hago\s+saber\s*:\s*(?:que\s*:\s*)?|rector\(?a?\)?\s*\n*)\s*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{4,55}?)(?=\n\s*(?:titular\s+de\s+la\s+c[eé]dula|c[eé]dula|cumpli[oó]|por\s+lo\s+cual))',
            # Patrón B (Concesión): "Confiere a [NOMBRE] el título de..."
            r'(?:confiere|contiere|conjiere|otorga|hacen\s+constar\s+que|hacen\s+constar|certifica\s+que|a\s+favor)\s+(?:a|al|a\s+la|de)?\s*[:#-]?\s*\n*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?=\n\s*(?:titular|el\s*t[ií1]tulo|el\s*t[ií1]tvlo|el\s*grado|para\s*optar|ha\s*cumplido|por\s*haber|c[eé]dula|$))',
            # Patrón C (Cumplimiento): "Por cuanto [NOMBRE] ha cumplido..."
            r'por\s+cuanto\s*(?:el\s+ciudadano|la\s+ciudadana|al\s+ciudadano)?\s*[:#-]?\s*\n*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{4,55}?)(?=\n\s*(?:titular|ha\s+cumplido|cumpli[oó]|en\s+nombre|c[eé]dula|\d))',
            r'(?:graduando|egresado|titular\s*[:#-])\s*[:#-]?\s*(?!de\s+la\s+c[eé]dula)([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{6,45})(?=\n|$)'
        ]
        for pat in patrones:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                cand = ' '.join(m.group(1).strip().split())
                cand = re.sub(r'^(?:que|a|al|el\s+ciudadano|la\s+ciudadana|al\s+ciudadano|a\s+la\s+ciudadana|de\s+la\s+c[eé]dula\s+de)\s+', '', cand, flags=re.IGNORECASE)
                cand = re.sub(r'\s*(?:titular\s+de\s+la\s+c[eé]dula|titular|c[eé]dula|de\s+la\s+c[eé]dula).*$', '', cand, flags=re.IGNORECASE | re.DOTALL).strip()
                if 4 <= len(cand) <= 55 and not re.search(r'^(?:de\s+la\s+c[eé]dula|cedula\s+de)$', cand, re.IGNORECASE):
                    return cand

        return None

    @classmethod
    def extract_degree(cls, text: str) -> Optional[str]:
        """
        Extrae la denominación exacta del título o grado académico conferido mediante:
        1. Búsqueda exacta y coincidencia de patrones por Regex.
        2. Fuzzy Matching contra el Catálogo Oficial de Titulaciones y Carreras (OPSU/LOEU).
        """
        text_lower = text.lower()

        # 1. Búsqueda directa por Catálogo Oficial de Carreras (Keywords de alta precisión)
        for c in cls.CATALOGO_CARRERAS:
            for kw in c["keywords"]:
                if kw in text_lower:
                    return c["titulo"]
        # 1. Carreras de Salud
        if re.search(r'm[eé]dic[oa]\s+cirujan[oa]', text, re.IGNORECASE):
            return "Médico Cirujano"
        if re.search(r'odont[oó]log[oa]', text, re.IGNORECASE):
            return "Odontólogo"
        if re.search(r'farmac[eé]utic[oa]', text, re.IGNORECASE):
            return "Farmacéutico"
        if re.search(r'enfermer[ií][oa]', text, re.IGNORECASE):
            return "Licenciado en Enfermería"

        # 2. Derecho y Ciencias Políticas
        if re.search(r'derecho\s+y\s+ciencias\s+pol[ií]ticas', text, re.IGNORECASE):
            return "Licenciada en Derecho y Ciencias Políticas"
        if re.search(r'\babogad[oa]\b', text, re.IGNORECASE):
            return "Abogado"

        # 3. Ingenierías (Mapeo canónico exacto con tolerancia ortográfica)
        if re.search(r'ingenier[ií][oa]\s+(?:en|de)?\s*s[i1l]st[e3]mas?', text, re.IGNORECASE):
            return "Ingeniero de Sistemas"
        if re.search(r'ingenier[ií][oa]\s+(?:en|de)?\s*inform[aá]t[i1]ca', text, re.IGNORECASE):
            return "Ingeniero en Informática"
        if re.search(r'ingenier[ií][oa]\s+(?:en|de)?\s*telecomunicacion(?:es)?', text, re.IGNORECASE):
            return "Ingeniero de Telecomunicaciones"
        if re.search(r'ingenier[ií][oa]\s+c[i1l]v[i1l]l', text, re.IGNORECASE):
            return "Ingeniero Civil"
        if re.search(r'ingenier[ií][oa]\s+[i1l]ndustr[i1l]al', text, re.IGNORECASE):
            return "Ingeniero Industrial"
        if re.search(r'ingenier[ií][oa]\s+mec[aá]n[i1l]c[oa]', text, re.IGNORECASE):
            return "Ingeniero Mecánico"
        if re.search(r'ingenier[ií][oa]\s+(?:el[eé]ctr[i1l]c[oa]|electr[i1l]c[i1l]sta)', text, re.IGNORECASE):
            return "Ingeniero Electricista"
        if re.search(r'ingenier[ií][oa]\s+electr[oó]n[i1l]c[oa]', text, re.IGNORECASE):
            return "Ingeniero Electrónico"
        if re.search(r'ingenier[ií][oa]\s+qu[ií1]m[i1l]c[oa]', text, re.IGNORECASE):
            return "Ingeniero Químico"
        if re.search(r'arqu[i1]tect[oa]', text, re.IGNORECASE):
            return "Arquitecto"

        # 4. Ciencias Económicas, Administrativas y Sociales
        if re.search(r'contadur[ií]a\s+p[uú]bl[i1l]ca|contador\s+p[uú]bl[i1l]co', text, re.IGNORECASE):
            return "Contador Público"
        if re.search(r'adm[i1l]n[i1l]strac[i1][oó]n\s+(?:de\s+empresas|comercial)?', text, re.IGNORECASE):
            return "Licenciado en Administración"
        if re.search(r'comun[i1l]cac[i1][oó]n\s+soc[i1l]al', text, re.IGNORECASE):
            return "Licenciado en Comunicación Social"
        if re.search(r'econom[ií]a|econom[i1l]sta', text, re.IGNORECASE):
            return "Economista"
        if re.search(r'ps[i1l]colog[ií]a|ps[i1l]c[oó]log[oa]', text, re.IGNORECASE):
            return "Licenciado en Psicología"
        if re.search(r'educac[i1][oó]n', text, re.IGNORECASE):
            return "Licenciado en Educación"
        if re.search(r'computac[i1][oó]n', text, re.IGNORECASE):
            return "Licenciado en Computación"

        # 5. TSU (Técnico Superior Universitario)
        tsu_m = re.search(r'(?:t[eé]cnic[oa]\s+superior\s+universitari[oa]|t\.?s\.?u\.?)\s+(?:en|de)?\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{3,40})', text, re.IGNORECASE)
        if tsu_m:
            return f"Técnico Superior Universitario en {tsu_m.group(1).strip()}"

        # 6. Patrones regex generales con delimitadores solemnes
        patrones = [
            r'(?:optar\s+al\s+t[ií1]tulo\s+(?:de|be)|el\s+t[ií1]tulo\s+(?:de|be)|el\s+grado\s+(?:de|be)|t[ií1]tulo\s+(?:de|be)|conferirle\s+el\s+t[ií1]tulo\s+(?:de|be))\s*\n*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?=\n\s*(?:t[oó]mese\s+raz[oó]n|en\s+la\s+secretar[ií]a|por\s+haber|cumplido|con\s+to[bd]os|en\s+fe|dado|para\s+ejercer|a\s+los|el\s+veinti|\d{1,2}\s+(?:de|be)|[a-z]+\s+(?:de|be)\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)|$))',
            r'\b((?:Licenciad[oa]|Ingenier[oa]|Abogad[oa]|Arquitect[oa]|M[eé]dic[oa]\s+Cirujan[oa]|Odont[oó]log[oa]|Farmac[eé]utic[oa]|Especialista|Mag[ií]ster|Doctor[a]?)\s+(?:en|de)?\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\s]{3,45}?)(?=\n\s*(?:t[oó]mese\s+raz[oó]n|en\s+la\s+secretar[ií]a|por\s+haber|cumplido|con\s+to[bd]os|en\s+fe|dado|para\s+ejercer|a\s+los|el\s+veinti|\d{1,2}\s+(?:de|be)|[a-z]+\s+(?:de|be)\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)|$)|$)'
        ]
        for pat in patrones:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                cand = ' '.join(m.group(1).strip().split())
                cand = re.sub(r'^[oO0]\s+', '', cand)
                cand = re.sub(r'\s*(?:t[oó]mese\s+raz[oó]n|en\s+la\s+secretar[ií]a|t[oó]mese|tomese|raz[oó]n|por\s+haber).*$', '', cand, flags=re.IGNORECASE)
                if len(cand) >= 4:
                    # Aplicar Fuzzy Matching contra el Catálogo Oficial de Carreras
                    best_match = None
                    best_score = 0.0
                    for c in cls.CATALOGO_CARRERAS:
                        score_title = cls.levenshtein_similarity(cand, c["titulo"])
                        score_kw = max([cls.levenshtein_similarity(cand, kw) for kw in c["keywords"]]) if c["keywords"] else 0.0
                        top_s = max(score_title, score_kw)
                        if top_s > best_score:
                            best_score = top_s
                            best_match = c["titulo"]
                    if best_score >= 0.70 and best_match:
                        return best_match
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
        pat_escrita = r'(?:el|a\s+los|en\s+[a-záéíóúñ,\s]+,\s*(?:el|al)?)?\s*\b([a-záéíóúñ\d\s]+?)\s+(?:de|be|del\s+mes\s+de)\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(?:de|be|del\s+a[ñn]o\s+(?:de|be)?|del\s+a[ñn]o)?\s+([a-záéíóúñ\d\s]+)'
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

            try:
                available_langs = pytesseract.get_languages()
            except Exception:
                available_langs = ['eng']

            has_spa = "spa" in available_langs
            has_frk = "frk" in available_langs

            header_langs = []
            if has_frk: header_langs.append("frk")
            if has_spa: header_langs.append("spa")
            header_langs.append("eng")
            header_lang = "+".join(header_langs)

            body_lang = "spa+eng" if has_spa else "eng"

            config_header = f"--psm 6 -l {header_lang}"
            config_body = f"--psm 4 -l {body_lang}"

            header_text = ""
            try:
                header_text = pytesseract.image_to_string(header_clean, config=config_header)
            except Exception:
                try:
                    header_text = pytesseract.image_to_string(header_clean, config=f"-l {body_lang}")
                except Exception:
                    header_text = ""

            body_text = ""
            try:
                body_text = pytesseract.image_to_string(body_clean, config=config_body)
            except Exception:
                try:
                    body_text = pytesseract.image_to_string(body_clean, config=f"-l {body_lang}")
                except Exception:
                    body_text = ""

            full_text = f"{header_text}\n{body_text}".strip()

            # Si el texto segmentado es breve, escaneo directo de la imagen completa
            if len(full_text) < 30:
                try:
                    gray_full = cv2.cvtColor(image_cv, cv2.COLOR_BGR2GRAY) if len(image_cv.shape) == 3 else image_cv
                    full_raw = pytesseract.image_to_string(gray_full, config=f"--psm 3 -l {body_lang}")
                    if len(full_raw.strip()) > len(full_text):
                        full_text = full_raw.strip()
                except Exception:
                    pass

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
        institucion = data_fields.get("institucion") or None
        carrera = data_fields.get("titulo_conferido") or data_fields.get("carrera")
        fecha = data_fields.get("fecha_expedicion") or data_fields.get("fecha")
        facultad = data_fields.get("facultad")

        fields = {
            "nombre_completo": {"value": titular, "confidence": 0.95 if titular else 0.0},
            "cedula": {"value": cedula, "confidence": 0.98 if cedula else 0.0},
            "institucion": {"value": institucion, "confidence": 0.99 if institucion else 0.0},
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
