"""
Servidor Backend en Flask - USM-ApostillaBot
Plataforma Descentralizada con IA para la Digitalización, Validación y Apostilla de Títulos Universitarios
Universidad Santa María (USM) - MPPEU - MPPRE
"""

import os
import base64
import logging
import cv2
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

from vision_preprocessor import USMDocumentPreprocessor
from ocr_service import USMOcrService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("USM_Flask_API")

app = Flask(__name__)
# CORS habilitado para conectar con frontend en Vue.js / Tailwind CSS
CORS(app, resources={r"/api/*": {"origins": "*"}})


@app.route("/health", methods=["GET"])
@app.route("/api/health", methods=["GET"])
def health_check():
    """Chequeo de salud del servicio y verificación de motores locales."""
    has_frk = USMOcrService.check_fraktur_available()
    return jsonify({
        "status": "online",
        "backend": "Flask (Python 3.12)",
        "service": "USM-ApostillaBot Core OCR & AI",
        "tesseract_fraktur_installed": has_frk,
        "ollama_vision_supported": True,
        "supported_institutions": ["Universidad Santa María (USM)"],
        "typography_support": ["Old English Text MT", "Diploma", "Times New Roman"]
    }), 200


@app.route("/ocr/status", methods=["GET"])
@app.route("/api/ocr/status", methods=["GET"])
def ocr_engine_status():
    """Diagnóstico detallado del motor de reconocimiento óptico y paquetes lingüísticos."""
    has_frk = USMOcrService.check_fraktur_available()
    return jsonify({
        "success": True,
        "engines": {
            "tesseract": {
                "available": True,
                "fraktur_gothic_installed": has_frk,
                "notes": "Pesos 'frk.traineddata' requeridos para lectura de encabezados góticos" if not has_frk else "Modelo 'frk' listo para producción"
            },
            "ollama_vision": {
                "available": True,
                "recommended_model": "llama3.2-vision:latest",
                "notes": "Motor multimodal de alta precisión para caligrafía compleja ejecutado localmente"
            }
        }
    }), 200


@app.route("/ocr/extract", methods=["POST"])
@app.route("/api/ocr/extract", methods=["POST"])
def extract_document():
    """
    Endpoint principal para la digitalización y extracción de pergaminos universitarios.
    Acepta:
    1. Archivo subido mediante multipart/form-data ('file')
    2. Carga en JSON con 'image_base64' y opcionalmente 'raw_text'
    Parámetros opcionales:
    - 'mode': 'vision_ai' (Ollama) | 'hybrid' (OpenCV + Tesseract Fraktur) | 'auto' (Inteligente)
    """
    image_bytes = None
    mode = "auto"
    raw_text_client = None

    # Caso 1: Archivo subido en formulario multipart
    if "file" in request.files:
        uploaded_file = request.files["file"]
        if uploaded_file.filename != "":
            image_bytes = uploaded_file.read()
            mode = request.form.get("mode", "auto")

    # Caso 2: Payload JSON con base64 o raw_text
    elif request.is_json:
        data = request.get_json()
        mode = data.get("mode", "auto")
        raw_text_client = data.get("raw_text")
        b64_str = data.get("image_base64")
        if b64_str:
            if "," in b64_str:
                b64_str = b64_str.split(",")[1]
            try:
                image_bytes = base64.b64decode(b64_str)
            except Exception as e:
                return jsonify({"success": False, "error": f"Base64 inválido: {str(e)}"}), 400

    # Si sólo se envió texto crudo del cliente (WASM fallback)
    if not image_bytes and raw_text_client:
        ner_fields = USMOcrService.rule_based_ner(raw_text_client)
        resp = USMOcrService.format_for_frontend(ner_fields, raw_text_client, "Client OCR + Flask NER")
        return jsonify(resp), 200

    if not image_bytes:
        return jsonify({
            "success": False,
            "error": "Debe proporcionar una imagen mediante 'file' (multipart) o 'image_base64' (JSON)."
        }), 400

    try:
        # 1. Modo Forzado Ollama Vision
        if mode == "vision_ai":
            try:
                res = USMOcrService.extract_with_ollama_vision(image_bytes)
                resp = USMOcrService.format_for_frontend(res["extracted_fields"], res.get("raw_response", ""), res["engine"])
                return jsonify(resp), 200
            except Exception as e:
                logger.warning(f"Ollama local no disponible, activando fallback híbrido: {e}")
                mode = "hybrid"

        # Decodificación para OpenCV
        nparr = np.frombuffer(image_bytes, np.uint8)
        image_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image_cv is None:
            return jsonify({"success": False, "error": "No se pudo decodificar el formato de la imagen."}), 400

        # 2. Modo Híbrido (OpenCV Morfología + Tesseract frk+spa)
        if mode == "hybrid":
            tess_result = USMOcrService.extract_with_tesseract(image_cv)
            resp = USMOcrService.format_for_frontend(tess_result["extracted_fields"], tess_result["full_text"], tess_result["engine"])
            resp["fraktur_enabled"] = tess_result["fraktur_enabled"]
            return jsonify(resp), 200

        # 3. Modo 'auto': Intenta Visión Local primero; si no está activo, ejecuta OpenCV + Tesseract
        try:
            res = USMOcrService.extract_with_ollama_vision(image_bytes)
            resp = USMOcrService.format_for_frontend(res["extracted_fields"], res.get("raw_response", ""), res["engine"])
            return jsonify(resp), 200
        except Exception:
            logger.info("Ollama no activo, ejecutando motor Tesseract Fraktur por defecto.")
            tess_result = USMOcrService.extract_with_tesseract(image_cv)
            resp = USMOcrService.format_for_frontend(tess_result["extracted_fields"], tess_result["full_text"], tess_result["engine"])
            resp["fraktur_enabled"] = tess_result["fraktur_enabled"]
            return jsonify(resp), 200

    except Exception as e:
        logger.error(f"Error procesando OCR: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": f"Falla en el pipeline de digitalización OCR: {str(e)}"
        }), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info(f"Iniciando USM-ApostillaBot Flask API en http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)

