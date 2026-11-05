import os
import sys
import getpass
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configurar ruta para importar funciones del backend si es necesario
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from supabase import create_client
except ImportError:
    print("❌ Error: la librería 'supabase' no está instalada en el entorno actual.")
    print("Asegúrate de activar el entorno virtual con: .\\venv\\Scripts\\activate")
    sys.exit(1)

try:
    import bcrypt
    def hash_pwd(pwd):
        return bcrypt.hashpw(pwd.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
except ImportError:
    import hashlib
    import secrets
    def hash_pwd(pwd):
        salt = secrets.token_hex(16)
        key = hashlib.pbkdf2_hmac('sha256', pwd.encode('utf-8'), salt.encode('utf-8'), 100000)
        return f"pbkdf2:{salt}:{key.hex()}"

def main():
    print("=" * 65)
    print("🏛️  USM-ApostillaBot — Creador de Credenciales Administrativas")
    print("=" * 65)
    print("Este script permite registrar nuevos auditores y administradores")
    print("en la tabla 'admins' de Supabase (local o en la nube).\n")

    supabase_url = os.getenv("SUPABASE_URL", "http://127.0.0.1:54321")
    supabase_key = os.getenv("SUPABASE_KEY")

    if not supabase_key:
        print("❌ Error: Variable SUPABASE_KEY no encontrada en el archivo .env")
        sys.exit(1)

    try:
        supabase = create_client(supabase_url, supabase_key)
    except Exception as e:
        print(f"❌ Error al conectar con Supabase ({supabase_url}): {e}")
        sys.exit(1)

    username = input("👤 Nombre de usuario institucional (ej. mppeu_auditor_1): ").strip()
    if not username:
        print("❌ El nombre de usuario no puede estar vacío.")
        sys.exit(1)

    # Verificar si el usuario ya existe
    try:
        check = supabase.table("admins").select("username").eq("username", username).execute()
        if check.data and len(check.data) > 0:
            print(f"⚠️ El usuario '{username}' ya existe en la base de datos.")
            sobrescribir = input("¿Deseas actualizar su contraseña y datos? (s/n): ").strip().lower()
            if sobrescribir != 's':
                print("Operación cancelada.")
                sys.exit(0)
            is_update = True
        else:
            is_update = False
    except Exception as e:
        print(f"❌ Error al consultar la tabla 'admins': {e}")
        print("💡 Asegúrate de que Supabase esté iniciado con: npx supabase start")
        sys.exit(1)

    print("\n🏢 Selecciona el Ente Gubernamental / Institución:")
    print("  1. MPPEU (Ministerio de Educación Universitaria / GTU)")
    print("  2. SAREN (Servicio Autónomo de Registros y Notarías)")
    print("  3. MPPRE (Ministerio de Relaciones Exteriores / Cancillería - Apostilla)")
    print("  4. USM   (Universidad Santa María - Secretaría General / Auditoría)")
    ente_opc = input("Opción (1-4) [1]: ").strip() or "1"

    entes_map = {
        "1": ("MPPEU", "Analista Revisor de Taquilla GTU"),
        "2": ("SAREN", "Registrador Principal / Protocolización"),
        "3": ("MPPRE", "Oficial Consular de Legalización y Apostilla"),
        "4": ("USM",   "Administrador Central del Sistema")
    }

    ente_default, cargo_default = entes_map.get(ente_opc, ("MPPEU", "Analista Revisor GTU"))
    
    cargo = input(f"💼 Cargo o Función [{cargo_default}]: ").strip() or cargo_default
    ente = input(f"🏛️  Siglas del Ente [{ente_default}]: ").strip().upper() or ente_default

    password = getpass.getpass("🔑 Contraseña para el usuario: ").strip()
    if not password:
        print("❌ La contraseña no puede estar vacía.")
        sys.exit(1)

    confirm_password = getpass.getpass("🔑 Confirma la contraseña: ").strip()
    if password != confirm_password:
        print("❌ Las contraseñas no coinciden.")
        sys.exit(1)

    hashed_password = hash_pwd(password)

    try:
        if is_update:
            res = supabase.table("admins").update({
                "password": hashed_password,
                "cargo": cargo,
                "ente": ente
            }).eq("username", username).execute()
            print(f"\n✅ ¡Usuario administrativo '{username}' actualizado con éxito!")
        else:
            res = supabase.table("admins").insert({
                "username": username,
                "password": hashed_password,
                "cargo": cargo,
                "ente": ente
            }).execute()
            print(f"\n✅ ¡Usuario administrativo '{username}' creado exitosamente en Supabase!")

        print("\n📋 Ficha de Credenciales Creadas:")
        print(f"   • Usuario:  {username}")
        print(f"   • Ente:     {ente}")
        print(f"   • Cargo:    {cargo}")
        print(f"   • Hash:     {hashed_password[:20]}...")
        print(f"\n🚀 Para iniciar sesión:")
        print(f"   1. Abre en tu navegador: http://localhost:5173/admin (o /gobierno)")
        print(f"   2. Selecciona la pestaña correspondiente a '{ente}'")
        print(f"   3. Ingresa tu usuario y contraseña recién creados.")
    except Exception as e:
        print(f"❌ Error al guardar en Supabase: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

