import re

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

class EnhancedNER:
    @classmethod
    def extract_institution(cls, text):
        if re.search(r'Santa\s+Mar[ií1l]a\s+La\s+Antigua', text, re.I):
            return 'Universidad Católica Santa María La Antigua'
        m = re.search(r'(?:rep[uú]blica\s+[a-z\s]+)?\b((?:Universidad|Universidab|Instituto\s+Universitario|Colegio\s+Universitario)\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?=\n|Faculta|República|El Rector|Por cuanto|Legalmente|Confiere|Contiere|$)', text, re.I)
        if m:
            clean = ' '.join(m.group(1).strip().split())
            clean = re.sub(r'^Universidab', 'Universidad', clean, flags=re.I)
            if len(clean) >= 8:
                return clean
        if re.search(r'\bSanta\s+Mar[ií1l]a\b', text, re.I):
            return 'Universidad Santa María (USM)'
        elif re.search(r'\bCentral\s+de\s+Venezuela\b', text, re.I):
            return 'Universidad Central de Venezuela (UCV)'
        elif re.search(r'\bSim[oó]n\s+Bol[ií]var\b', text, re.I):
            return 'Universidad Simón Bolívar (USB)'
        return 'Institución Universitaria'

    @classmethod
    def extract_titular(cls, text):
        patrones = [
            r'(?:confiere|contiere|conjiere|otorga|hacen\s+constar\s+que|hacen\s+constar|certifica\s+que|a\s+favor)\s+(?:a|al|a\s+la|de)?\s*[:#-]?\s*\n*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?=\n\s*(?:el\s*t[ií1]tulo|el\s*t[ií1]tvlo|el\s*grado|para\s*optar|ha\s*cumplido|por\s*haber|c[eé]dula|$))',
            r'(?:graduando|titular|egresado)\s*[:#-]?\s*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{6,45})'
        ]
        for pat in patrones:
            m = re.search(pat, text, re.I)
            if m:
                cand = ' '.join(m.group(1).strip().split())
                cand = re.sub(r'^(?:que|a|al|el\s+ciudadano|la\s+ciudadana|al\s+ciudadano|a\s+la\s+ciudadana)\s+', '', cand, flags=re.I)
                if 4 <= len(cand) <= 50:
                    return cand
        return None

    @classmethod
    def extract_degree(cls, text):
        patrones = [
            r'(?:optar\s+al\s+t[ií1]tulo\s+(?:de|be)|el\s+t[ií1]tulo\s+(?:de|be)|el\s+grado\s+(?:de|be)|t[ií1]tulo\s+(?:de|be)|conferirle\s+el\s+t[ií1]tulo\s+(?:de|be))\s*\n*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?=\n\s*(?:por\s+haber|cumplido|con\s+to[bd]os|en\s+fe|dado|para\s+ejercer|a\s+los|el\s+veinti|\d{1,2}\s+(?:de|be)|[a-z]+\s+(?:de|be)\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)|$))',
            r'\b((?:Licenciad[oa]|Ingenier[oa]|Abogad[oa]|Arquitect[oa]|M[eé]dic[oa]\s+Cirujan[oa]|Odont[oó]log[oa]|Farmac[eé]utic[oa]|Especialista|Mag[ií]ster|Doctor[a]?)\s+(?:en|de)?\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\s]{3,45}?)(?=\n\s*(?:por\s+haber|cumplido|con\s+to[bd]os|en\s+fe|dado|para\s+ejercer|a\s+los|el\s+veinti|\d{1,2}\s+(?:de|be)|[a-z]+\s+(?:de|be)\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)|$)|$)'
        ]
        for pat in patrones:
            m = re.search(pat, text, re.I)
            if m:
                cand = ' '.join(m.group(1).strip().split())
                cand = re.sub(r'^[oO0]\s+', '', cand)
                cand = re.sub(r'\s+por\s+haber.*$', '', cand, flags=re.I)
                if len(cand) >= 4:
                    return cand
        return None

    @classmethod
    def extract_faculty(cls, text):
        m = re.search(r'\b((?:Faculta[db]|Escuela)\s+(?:[db]e)?\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?=\n|Legalmente|El Rector|Confiere|Contiere|Por cuanto|Dado|En fe|el título|el titulo|el grado|$)', text, re.I)
        if m:
            cand = ' '.join(m.group(1).strip().split())
            cand = re.sub(r'Facultab', 'Facultad', cand, flags=re.I)
            cand = re.sub(r'\bbe\b', 'de', cand, flags=re.I)
            return cand
        return None

    @classmethod
    def extract_date(cls, text):
        text_clean = text.lower()
        pat_escrita = r'(?:el|a\s+los|en\s+[a-z,\s]+,\s*(?:el|al)?)?\s*\b([a-z\d\s]+?)\s+(?:de|be|del\s+mes\s+de)\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(?:de|be)\s+([a-z\d\s]+)'
        m = re.search(pat_escrita, text_clean)
        if m:
            dia_raw = m.group(1).strip()
            dia_str = re.sub(r'^(?:el|a\s+los|al|a\s+las|d[íi]as)+\s*', '', dia_raw).strip()
            dia_str = re.sub(r'\s+d[íi]as$', '', dia_str).strip()
            mes_str = m.group(2).strip()
            ano_str = m.group(3).strip().split('\n')[0].strip()
            dia = NUMS.get(dia_str) or (int(dia_str) if dia_str.isdigit() else None)
            mes = MESES.get(mes_str)
            ano = None
            if ano_str.isdigit() and len(ano_str) == 4:
                ano = int(ano_str)
            else:
                base = 0
                if 'dos mil' in ano_str or 'bos mil' in ano_str:
                    base = 2000
                    rem = ano_str.replace('dos mil', '').replace('bos mil', '').strip()
                    ano = base + (NUMS.get(rem) or (int(rem) if rem.isdigit() else 0))
                elif 'mil novecientos' in ano_str:
                    base = 1900
                    rem = ano_str.replace('mil novecientos', '').strip()
                    ano = base + (NUMS.get(rem) or (int(rem) if rem.isdigit() else 0))
            if dia and mes and ano:
                return f'{dia:02d}/{mes}/{ano}'
        
        for nm in re.finditer(r'\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b', text):
            d, m, y = int(nm.group(1)), int(nm.group(2)), int(nm.group(3))
            if len(nm.group(3)) == 2:
                y = 2000 + y if y < 50 else 1900 + y
            if 1 <= d <= 31 and 1 <= m <= 12 and 1950 <= y <= 2050:
                return f'{d:02d}/{m:02d}/{y}'
            elif 1 <= m <= 31 and 1 <= d <= 12 and 1950 <= y <= 2050:
                return f'{m:02d}/{d:02d}/{y}'
        return None

    @classmethod
    def extract_cedula(cls, text):
        m_ven = re.search(r'\b([VvEe][-\s]?\d{1,2}\.?\d{3}\.?\d{3})\b', text)
        if m_ven:
            return m_ven.group(1).upper().replace(' ', '')
        m_lbl = re.search(r'\b(?:c[eé]dula|c\.?\s*i\.?|identidad|pasaporte)\b\s*[:#-]?\s*([A-Za-z0-9\.\-]+)', text, re.I)
        if m_lbl and any(c.isdigit() for c in m_lbl.group(1)):
            return m_lbl.group(1).strip().upper()
        m_int = re.search(r'\b(\d{1,2}-\d{2,4}-\d{3,5})\b', text)
        if m_int:
            return m_int.group(1)
        return None

if __name__ == '__main__':
    corrupted_text = '''
    SNS EN 7 AMOJSUO 30 OMTEIONA E E
    Universidab Catolica Santa Maria La Antigua
    Facultab be Derecho y Ciencias Politicas
    Legalmente autorizaba
    Contiere a
    Tatiana Maria Quesada Vargas
    el titulo be
    Licenciada en Derecho y Ciencias Politicas
    Por haber cumplido los requisitos establecidos
    Con tobos los berechos, honores y privilegios be este Grabo Academico
    En fe be lo cual se expibe el presente biploma en
    Panama, Republica be Panama, el veinticinco be mayo be bos mil uno
    C.I. 8-66-581
    '''

    print('Institucion:', EnhancedNER.extract_institution(corrupted_text))
    print('Titular:', EnhancedNER.extract_titular(corrupted_text))
    print('Carrera:', EnhancedNER.extract_degree(corrupted_text))
    print('Facultad:', EnhancedNER.extract_faculty(corrupted_text))
    print('Fecha:', EnhancedNER.extract_date(corrupted_text))
    print('Cedula:', EnhancedNER.extract_cedula(corrupted_text))
