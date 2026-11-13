---
trigger: glob
globs: "**/*.py"
---
# Reglas Estrictas de Backend (Python / Flask)
- Utiliza exclusivamente **Flask** (`Blueprint`, `request`, `jsonify`). Nunca importes ni sugieras FastAPI, Uvicorn ni routers basados en Pydantic.
- Procesa imágenes de OpenCV y documentos PDF en memoria (`io.BytesIO`) o en directorios temporales efímeros que se eliminen inmediatamente en un bloque `finally`.
- Todas las respuestas de endpoints deben seguir la estructura JSON `{ "success": bool, "data": ..., "error": ... }`.

