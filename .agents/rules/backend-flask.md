---
trigger: glob
globs: "**/*.py"
---
# Reglas Estrictas de Backend (Python / Flask)
- Utiliza exclusivamente **Flask** (`Blueprint`, `request`, `jsonify`, `app.route`) en `api/main.py` y `api/app_flask.py`. Nunca importes ni sugieras FastAPI, Uvicorn ni routers basados en Pydantic.
- Procesa imágenes de OpenCV y documentos PDF en memoria (`io.BytesIO`) o en directorios temporales efímeros que se eliminen inmediatamente en un bloque `finally`.
- Para endpoints **nuevos**, utiliza la estructura JSON `{ "success": bool, "data": ..., "error": ... }`. Al modificar rutas existentes consumidas por `src/services/api.js` u `OCRExtractor.jsx` (que esperan `fields`, `records` o `detail`/`error`), preserva retrocompatibilidad o actualiza `src/services/api.js` en el mismo cambio.
