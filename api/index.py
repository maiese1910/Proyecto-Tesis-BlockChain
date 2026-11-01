import os
import sys
import traceback

# Asegurar que el directorio api está en el sys.path
api_dir = os.path.dirname(os.path.abspath(__file__))
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

# También agregar el directorio raíz
root_dir = os.path.dirname(api_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

try:
    from _main import app
except BaseException as e:
    err_tb = traceback.format_exc()
    from flask import Flask, jsonify
    from flask_cors import CORS

    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "*"}})

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    def catch_all(path=""):
        return jsonify({
            "status": "error_startup",
            "error": str(e),
            "traceback": err_tb
        }), 200

__all__ = ["app"]
