import subprocess
import os
import sys
import time
import signal

def run_command(command, cwd=None, name="Process"):
    print(f"🚀 Iniciando {name}...")
    return subprocess.Popen(
        command,
        cwd=cwd,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True
    )

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = root_dir
    frontend_dir = os.path.join(root_dir, "frontend")

    print("🏛️  SISTEMA DE APOSTILLA USM - INICIO GLOBAL")
    print("==========================================")

    # 1. Verificar dependencias
    print("📦 Verificando dependencias...")
    subprocess.run([os.path.join("venv", "Scripts", "python.exe"), "-m", "pip", "install", "-r", "requirements.txt"], cwd=backend_dir)
    
    # 2. Iniciar Backend
    backend_cmd = f"{os.path.join('venv', 'Scripts', 'python.exe')} -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"
    backend_proc = run_command(backend_cmd, backend_dir, "Backend (FastAPI)")

    # 3. Iniciar Frontend
    frontend_cmd = "npm run dev"
    frontend_proc = run_command(frontend_cmd, frontend_dir, "Frontend (Vite/React)")

    print("\n✅ ¡Todo en marcha! Accede a:")
    print("🔗 Frontend: http://localhost:5173")
    print("🔗 Backend API: http://localhost:8000\n")
    print("Presiona CTRL+C para detener ambos servicios.\n")

    try:
        while True:
            # Leer logs del backend de forma no bloqueante (opcional, para ver errores)
            line = backend_proc.stdout.readline()
            if line:
                print(f"[Backend] {line.strip()}")
            
            # Si alguno muere, salir
            if backend_proc.poll() is not None:
                print("❌ El proceso del Backend se detuvo.")
                break
            if frontend_proc.poll() is not None:
                print("❌ El proceso del Frontend se detuvo.")
                break
            
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("\n🛑 Deteniendo servicios...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("👋 ¡Hasta luego, ingeniero!")

if __name__ == "__main__":
    main()
