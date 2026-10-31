import subprocess
import os
import sys
import time

# Forzar codificación UTF-8 en terminales de Windows
if sys.platform == "win32":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

def run_command(command, cwd=None, name="Process"):
    print(f"🚀 Iniciando {name}...")
    return subprocess.Popen(
        command,
        cwd=cwd,
        shell=True
    )

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = root_dir
    frontend_dir = root_dir

    print("🏛️  SISTEMA DE APOSTILLA USM - INICIO GLOBAL")
    print("==========================================")

    python_exe = os.path.join(root_dir, "venv", "Scripts", "python.exe")
    if not os.path.exists(python_exe):
        python_exe = "python"

    # 1. Iniciar Microservicio OCR Flask (Puerto 5000)
    flask_cmd = f'"{python_exe}" api/app_flask.py'
    flask_proc = run_command(flask_cmd, backend_dir, "Microservicio OCR & Vision (Flask - Puerto 5000)")

    # 2. Iniciar Backend Central Flask (Puerto 8000)
    backend_cmd = f'"{python_exe}" api/main.py'
    backend_proc = run_command(backend_cmd, backend_dir, "Backend API Central (Flask - Puerto 8000)")

    # 3. Iniciar Frontend Web (Puerto 5173)
    frontend_cmd = "npm run dev"
    frontend_proc = run_command(frontend_cmd, frontend_dir, "Frontend Web (Vite - Puerto 5173)")

    print("\n✅ ¡Servicios en marcha con éxito! Accede a:")
    print("🔗 Frontend Web:        http://localhost:5173")
    print("🔗 Backend API:          http://localhost:8000")
    print("🔗 Microservicio Flask:  http://localhost:5000/api/health\n")
    print("Presiona CTRL+C en esta consola para detener todos los servicios.\n")

    try:
        while True:
            if backend_proc.poll() is not None:
                print("❌ El proceso del Backend API se detuvo.")
                break
            if frontend_proc.poll() is not None:
                print("❌ El proceso del Frontend se detuvo.")
                break
            if flask_proc.poll() is not None:
                print("❌ El microservicio Flask OCR se detuvo.")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Deteniendo servicios...")
        backend_proc.terminate()
        frontend_proc.terminate()
        flask_proc.terminate()
        print("👋 ¡Hasta luego, ingeniero!")

if __name__ == "__main__":
    main()
