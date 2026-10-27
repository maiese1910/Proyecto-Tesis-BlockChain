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

    # 1. Iniciar Backend (observando únicamente el directorio api)
    python_exe = os.path.join(root_dir, "venv", "Scripts", "python.exe")
    if not os.path.exists(python_exe):
        python_exe = "python"

    backend_cmd = f'"{python_exe}" -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir api'
    backend_proc = run_command(backend_cmd, backend_dir, "Backend (FastAPI)")

    # 2. Iniciar Frontend
    frontend_cmd = "npm run dev"
    frontend_proc = run_command(frontend_cmd, frontend_dir, "Frontend (Vite/React)")

    print("\n✅ ¡Todo en marcha! Accede a:")
    print("🔗 Frontend: http://localhost:5173")
    print("🔗 Backend API: http://localhost:8000\n")
    print("Presiona CTRL+C para detener ambos servicios.\n")

    try:
        while True:
            if backend_proc.poll() is not None:
                print("❌ El proceso del Backend se detuvo.")
                break
            if frontend_proc.poll() is not None:
                print("❌ El proceso del Frontend se detuvo.")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Deteniendo servicios...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("👋 ¡Hasta luego, ingeniero!")

if __name__ == "__main__":
    main()
