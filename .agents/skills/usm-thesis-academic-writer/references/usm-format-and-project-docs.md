# Referencia Metodológica USM y Documentos del Proyecto

## 1. Correspondencia de Fuentes Reales del Repositorio
Al redactar secciones técnicas o metodológicas de la tesis, verificar la coherencia con los documentos y módulos reales del sistema:
- **Documentación Técnica Integral:** `DOCUMENTACION.md` (nota: corregir al citar cualquier mención heredada a FastAPI o Vue.js; el prototipo ejecutado utiliza **Python Flask** y **React 19 + Vite**).
- **Alcance e Hitos Implementados:** `HOJA_DE_RUTA_MODULOS_PENDIENTES.md` y `SISTEMA_USM_APOSTILLABOT.md`.
- **Manuscrito Base:** `CAPITULO/capitulo 1,2,3.pdf`.
- **Contrato y Backend Reales:** `blockchain/USMDocumentRegistry.sol`, `api/main.py`, `api/app_flask.py`, `api/ocr_service.py`, `api/gemini_service.py`.

## 2. Reglas de Consistencia Académica (Manual USM)
- **Persona gramatical:** Tercera persona del singular (*"el investigador"*, *"el prototipo"*, *"se determinó"*).
- **Verbos de objetivos específicos:** Un verbo en infinitivo por objetivo con correspondencia exacta frente a las interrogantes y capítulos de resultados.
- **Alineación Tecnológica Real:** Referir la arquitectura como híbrida descentralizada: procesamiento óptico en servidor Flask + Gemini/OpenCV/PyMuPDF, interfaz web React 19 con Tailwind CSS, persistencia relacional/Storage en Supabase con contingencia local, y registro criptográfico en EVM (Sepolia).
