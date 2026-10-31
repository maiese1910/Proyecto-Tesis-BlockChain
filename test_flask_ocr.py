import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "api"))

import app_flask
import main

def test_endpoints():
    # 1. Probar microservicio app_flask
    client_micro = app_flask.app.test_client()
    res_health = client_micro.get("/api/health")
    print("MICROSERVICE HEALTH STATUS:", res_health.status_code)
    print("MICROSERVICE HEALTH DATA:", res_health.get_json())
    assert res_health.status_code == 200

    res_status = client_micro.get("/api/ocr/status")
    print("MICROSERVICE OCR STATUS:", res_status.status_code)
    assert res_status.status_code == 200

    # 2. Probar backend central main (Flask)
    client_main = main.app.test_client()
    res_main_root = client_main.get("/")
    print("\nMAIN FLASK ROOT STATUS:", res_main_root.status_code)
    print("MAIN FLASK ROOT DATA:", res_main_root.get_json())
    assert res_main_root.status_code == 200

    res_main_stats = client_main.get("/api/stats")
    print("\nMAIN FLASK STATS STATUS:", res_main_stats.status_code)
    assert res_main_stats.status_code == 200

    res_main_carreras = client_main.get("/carreras")
    print("\nMAIN FLASK CARRERAS:", res_main_carreras.get_json())
    assert res_main_carreras.status_code == 200

    res_main_ocr = client_main.get("/api/ocr/status")
    print("\nMAIN FLASK OCR STATUS:", res_main_ocr.status_code)
    assert res_main_ocr.status_code == 200

    print("\n>>> TODOS LOS TESTS DE FLASK (CENTRAL Y OCR) PASARON CON ÉXITO AL 100% <<<")

if __name__ == "__main__":
    test_endpoints()
