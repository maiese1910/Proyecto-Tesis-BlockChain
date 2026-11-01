import os
import sys
import traceback

# Asegurar que el directorio de la API está en el PYTHONPATH de Vercel
api_dir = os.path.dirname(os.path.abspath(__file__))
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

try:
    from main import app
except Exception as e:
    err_tb = traceback.format_exc()
    from flask import Flask, jsonify
    from flask_cors import CORS
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "*"}})

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    def catch_all(path=""):
        return jsonify({
            "error": "Startup Exception in api/main.py",
            "detail": str(e),
            "traceback": err_tb
        }), 500

__all__ = ["app"]
