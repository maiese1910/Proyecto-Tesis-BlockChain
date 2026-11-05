# Especificación Técnica para OCR y Validación de Títulos Universitarios en Venezuela

Este documento define la estructura de datos pre-cargados (Universidades, Carreras y Frases de Control) así como la arquitectura recomendada para optimizar el procesamiento de OCR y extracción estructurada sobre títulos universitarios venezolanos.

---

## 1. Catálogo Maestro de Universidades de Venezuela

Listado representativo de las casas de estudio venezolanas más comunes en títulos académicos (públicas autonómicas, experimentales y privadas) para validación mediante *Fuzzy Matching* (distancia de Levenshtein):

*   **Universidad Central de Venezuela** (UCV)
*   **Universidad Santa María** (USM)
*   **Universidad Católica Andrés Bello** (UCAB)
*   **Universidad Simón Bolívar** (USB)
*   **Universidad de Carabobo** (UC)
*   **Universidad de Los Andes** (ULA)
*   **Universidad del Zulia** (LUZ)
*   **Universidad Metropolitana** (UNIMET)
*   **Universidad Nacional Experimental Politécnica de la Fuerza Armada Nacional** (UNEFA)
*   **Universidad Nacional Experimental Simón Rodríguez** (UNESR)
*   **Universidad Pedagógica Experimental Libertador** (UPEL)
*   **Universidad Centro Occidental Lisandro Alvarado** (UCLA)
*   **Universidad Dr. Rafael Belloso Chacín** (URBE)
*   **Universidad José Antonio Páez** (UJAP)
*   **Universidad Alejandro de Humboldt** (UAH)
*   **Universidad Monteávila** (UMA)
*   **Universidad Bicentenaria de Aragua** (UBA)
*   **Universidad Rafael Urdaneta** (URU)
*   **Universidad Yacambú** (UNY)
*   **Universidad Nacional Experimental de Guayana** (UNEG)
*   **Universidad Nacional Experimental de los Llanos Occidentales Ezequiel Zamora** (UNELLEZ)
*   **Universidad Nacional Experimental Francisco de Miranda** (UNEFM)
*   **Universidad Bolivariana de Venezuela** (UBV)

---

## 2. Catálogo Oficial de Titulaciones y Carreras (OPSU/LOEU)

Formatos comunes de títulos y menciones académicas otorgadas en Venezuela:

### Títulos Profesionales / Pregrado
*   `Licenciado en [Área]` / `Licenciada en [Área]`
*   `Ingeniero [Especialidad]` / `Ingeniera [Especialidad]`
*   `Abogado` / `Abogada`
*   `Médico Cirujano` / `Médico Cirujana`
*   `Odontólogo`
*   `Farmacéutico`
*   `Arquitecto` / `Arquitecta`
*   `Técnico Superior Universitario en [Especialidad]` (TSU)

### Áreas y Carreras Principales
*   **Ciencias Sociales y Humanidades:** Administración Comercial, Contaduría Pública, Estudios Internacionales, Comunicación Social, Derecho, Psicología, Educación (Menciones: Integral, Idiomas, Ciencias), Economía, Relaciones Industriales, Ciencias Fiscales, Ciencias Políticas.
*   **Ingeniería y Tecnología:** Ingeniería de Sistemas, Ingeniería Informática, Ingeniería Civil, Ingeniería Mecánica, Ingeniería Industrial, Ingeniería Eléctrica, Ingeniería Electrónica, Ingeniería Química, Ingeniería Telecomunicaciones.
*   **Ciencias de la Salud:** Medicina, Enfermería, Bioanálisis, Odontología, Farmacia, Fisioterapia, Nutrición y Dietética.
*   **Ciencias Básicas:** Biología, Química, Física, Matemática, Computación.

---

## 3. Diccionario de Términos Legales y Estructura Fija

Términos recurrentes en la plantilla jurídica de títulos universitarios venezolanos para delimitación de regiones y filtrado de ruido OCR:

### Entidades y Cargos Subyacentes
*   `República Bolivariana de Venezuela`
*   `Ministerio del Poder Popular para la Educación Universitaria`
*   `Rector` / `La Rectora`
*   `Secretario General` / `El Secretario`
*   `Decano` / `El Decano`
*   `Registrador Principal`

### Conectores y Formórmulas Legales
*   `Hago saber:` / `Hace saber:`
*   `Titular de la Cédula de Identidad Nº` / `V-` / `E-`
*   `cumplió con todos los requisitos exigidos por las Leyes`
*   `en nombre de la República y por autoridad de la Ley`
*   `se le confiere el Título de`
*   `Reconózcase y téngase en toda la República`
*   `En fe de lo cual se firma el presente Título`
*   `Quedó registrado bajo el` / `Nº` / `Folio` / `Tomo`

---

## 4. Propuesta de Arquitectura para el Pipeline de OCR Optimizada

Para maximizar la precisión al procesar títulos con mezcla de fuentes (Gótica + Serif) y marcas de agua, se recomienda un esquema híbrido en lugar de aplicar un OCR directo de texto plano:

```
[ Título Escaneado / PDF ]
          │
          ▼
1. Preprocesamiento Visual
   ├── Binarización Adaptativa (Filtro de marcas de agua / Sellos)
   ├── Corrección de Inclinación (Deskew)
   └── Escala a >= 300 DPI
          │
          ▼
2. Segmentación de Zonas de Interés (ROI - Region of Interest)
   ├── ROI 1: Cabecera Ornamental Gótica -> Descartar / Clasificación por Template Matching
   ├── ROI 2: Bloque Central (Nombre, Cédula, Titulación) -> Motor OCR
   └── ROI 3: Pie de Página / Registro Legal -> Motor OCR
          │
          ▼
3. Extracción OCR (Tesseract / Cloud Vision API)
   └── Generación de Raw Text con bounding boxes y confianzas
          │
          ▼
4. Capa de Validación y Post-Procesamiento (Fuzzy Matching + RegEx)
   ├── Algoritmo RegEx: Extracción de Cédula (V-\d{7,8}) y Fechas.
   ├── RapidFuzz / Levenshtein vs Catálogo 1 (Universidades): Corrección del nombre de la Institución.
   └── RapidFuzz / Levenshtein vs Catálogo 2 (Carreras): Normalización de la Titulación extraída.
          │
          ▼
5. Salida JSON Estructurada y Validada
```

### Matriz de Decisión para el Agente de IA

*   **¿Mantener la estructura actual?** Recomendado **solo si** la arquitectura actual ya procesa segmentación por regiones (ROI) y cuenta con un paso de limpieza o *fuzzy matching* posterior a la lectura OCR.
*   **¿Actualizar la arquitectura?** Recomendado **si** el sistema actual intenta hacer OCR directo sobre la cabecera gótica o procesar la imagen completa en un solo bloque, lo que genera bajas tasas de acierto en los campos de Institución y Mención.