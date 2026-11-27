import sys
import os

api_dir = os.path.join(os.path.dirname(__file__), "api")
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

try:
    from api import app_flask, main
except ImportError:
    import app_flask  # type: ignore
    import main  # type: ignore

def test_endpoints():
    # 1. Probar microservicio app_flask
    client_micro = app_flask.app.test_client()
    res_health = client_micro.get("/api/health")
    print("MICROSERVICE HEALTH STATUS:", res_health.status_code)
    assert res_health.status_code == 200

    res_status = client_micro.get("/api/ocr/status")
    print("MICROSERVICE OCR STATUS:", res_status.status_code)
    assert res_status.status_code == 200

    # 2. Probar backend central main (Flask)
    client_main = main.app.test_client()
    res_main_root = client_main.get("/")
    assert res_main_root.status_code == 200

    res_main_stats = client_main.get("/api/stats")
    assert res_main_stats.status_code == 200

    res_main_carreras = client_main.get("/carreras")
    assert res_main_carreras.status_code == 200

    # 3. Probar extracción con texto de Diploma de Panamá (Caso Real Usuario)
    panama_text = """
    Universidad Católica Santa María La Antigua
    Facultad de Derecho y Ciencias Políticas
    Legalmente autorizada
    Confiere a
    Tatiana María Quesada Vargas
    el título de
    Licenciada en Derecho y Ciencias Políticas
    Por haber cumplido los requisitos establecidos
    Con todos los derechos, honores y privilegios de este Grado Académico
    En fe de lo cual se expide el presente diploma en Panamá, República de Panamá, el veinticinco de mayo de dos mil uno
    """

    res_ocr_panama = client_main.post("/ocr/extract", json={
        "raw_text": panama_text,
        "user_cedula": "V-28315101"
    })
    print("\nOCR PANAMA DIPLOMA STATUS:", res_ocr_panama.status_code)
    panama_data = res_ocr_panama.get_json()
    print("EXTRACTED FIELDS PANAMA:")
    for k, v in panama_data.get("fields", {}).items():
        print(f"  {k}: {v.get('value')} ({v.get('confidence')})")

    assert res_ocr_panama.status_code == 200
    fields_p = panama_data["fields"]
    assert "Santa María La Antigua" in fields_p["institucion"]["value"]
    assert "Tatiana María Quesada Vargas" in fields_p["nombre_completo"]["value"]
    assert "Licenciada en Derecho y Ciencias Políticas" in fields_p["carrera"]["value"]
    assert "25/05/2001" in fields_p["fecha"]["value"]

    # 4. Probar extracción con texto de Título USM (Venezuela)
    usm_text = """
    República Bolivariana de Venezuela
    Universidad Santa María
    Facultad de Ingeniería y Ciencias Aplicadas
    El Rector y el Secretario General hacen constar que
    MAURO DANIEL MAIESE FERREIRA
    Cédula de Identidad V-28.315.101
    ha cumplido con todos los requisitos para optar al título de
    INGENIERO EN SISTEMAS
    Dado en Caracas a los veinticuatro días del mes de octubre de dos mil veintiséis
    """

    res_ocr_usm = client_main.post("/ocr/extract", json={
        "raw_text": usm_text
    })
    print("\nOCR USM DIPLOMA STATUS:", res_ocr_usm.status_code)
    usm_data = res_ocr_usm.get_json()
    print("EXTRACTED FIELDS USM:")
    for k, v in usm_data.get("fields", {}).items():
        print(f"  {k}: {v.get('value')} ({v.get('confidence')})")

    assert res_ocr_usm.status_code == 200
    fields_u = usm_data["fields"]
    assert "Universidad Santa María" in fields_u["institucion"]["value"]
    assert "MAURO DANIEL MAIESE FERREIRA" in fields_u["nombre_completo"]["value"]
    assert "INGENIERO EN SISTEMAS" in fields_u["carrera"]["value"]
    assert "24/10/2026" in fields_u["fecha"]["value"]
    assert "V-28.315.101" in fields_u["cedula"]["value"]

    # 5. Probar Diploma ULA ("Hace saber: Que ...", fecha nacimiento vs expedición y flujo continuo)
    ula_text = """
    República Bolivariana de Venezuela
    Universidad de Los Andes
    El Rector de la Universidad de Los Andes
    Hace saber: Que CARLOS EDUARDO MÉNDEZ RIVAS, natural de Mérida, nacido el 03/01/2003, titular de la Cédula de Identidad V20797183, aspiró al Título de
    Licenciado en Educación
    Dado, firmado y sellado en Mérida, a los quince días del mes de julio del año dos mil veinticinco.
    """
    res_ocr_ula = client_main.post("/ocr/extract", json={"raw_text": ula_text})
    assert res_ocr_ula.status_code == 200
    ula_fields = res_ocr_ula.get_json()["fields"]
    print("\nEXTRACTED FIELDS ULA:", ula_fields)
    assert "Universidad de Los Andes" in ula_fields["institucion"]["value"]
    assert ula_fields["nombre_completo"]["value"] == "CARLOS EDUARDO MÉNDEZ RIVAS"
    assert "Licenciado en Educación" in ula_fields["carrera"]["value"]
    assert ula_fields["cedula"]["value"] == "V20797183"
    assert ula_fields["fecha"]["value"] == "15/07/2025"

    # 6. Probar que si un texto ilegible no contiene nombre, NUNCA se inventa un nombre falso
    noisy_no_name = "Universidad de Los Andes ... Licenciado en Educación ... 03/01/2003"
    res_noisy = client_main.post("/ocr/extract", json={"raw_text": noisy_no_name})
    assert res_noisy.status_code == 200
    assert res_noisy.get_json()["fields"]["nombre_completo"]["value"] is None

    print("\n>>> TODOS LOS TESTS DE FLASK Y OCR (PANAMÁ, USM Y ULA) PASARON CON ÉXITO AL 100% <<<")

if __name__ == "__main__":
    test_endpoints()
