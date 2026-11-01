from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/ping", methods=["GET"])
@app.route("/api/ping", methods=["GET"])
def ping():
    return jsonify({"ping": "pong", "status": "ok"}), 200
