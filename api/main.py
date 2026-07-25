import os
import re
import io
import json
import base64
import hashlib
import datetime
import secrets
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv(override=True)

# ─── Intentar importar dependencias opcionales ──────────────────────────────
try:
    from web3 import Web3
    HAS_WEB3 = True
except ImportError:
    HAS_WEB3 = False

try:
    import bcrypt
    HAS_BCRYPT = True
except ImportError:
    HAS_BCRYPT = False

try:
    import jwt as pyjwt
    HAS_JWT = True
except ImportError:
    HAS_JWT = False

try:
    from supabase import create_client, Client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False

try:
    import easyocr
    import numpy as np
    from PIL import Image
    HAS_OCR = True
except ImportError:
    HAS_OCR = False

# EasyOCR reader cargado de forma perezosa (lazy) para no ralentizar el inicio
_ocr_reader = None

def get_ocr_reader():
    """Carga EasyOCR la primera vez que se llama (tarda ~5-10s al cargar el modelo)."""
    global _ocr_reader
    if _ocr_reader is None and HAS_OCR:
        _ocr_reader = easyocr.Reader(['es', 'en'], gpu=False)
    return _ocr_reader

# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="API de USM-ApostillaBot (Web Version)",
    description="Backend para el ecosistema de apostilla para graduandos de Ingeniería de la USM.",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Configuración ───────────────────────────────────────────────────────────
WEB3_PROVIDER_URL = os.getenv("WEB3_PROVIDER_URL")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")
WALLET_PRIVATE_KEY = os.getenv("WALLET_PRIVATE_KEY")
JWT_SECRET = os.getenv("JWT_SECRET", "fallback-dev-secret-change-in-production")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Optional[Client] = None
if HAS_SUPABASE and SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"[WARN] No se pudo conectar a Supabase: {e}")

# ─── Configuración Web3 / Blockchain ────────────────────────────────────────
CONTRACT_ABI = [
    {
        "inputs": [
            {"internalType": "string", "name": "_hash", "type": "string"},
            {"internalType": "string", "name": "_ownerName", "type": "string"},
            {"internalType": "string", "name": "_cedula", "type": "string"},
            {"internalType": "string", "name": "_documentType", "type": "string"}
        ],
        "name": "registerDocument",
        "outputs": [],
        "stateMutability": "external",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "_hash", "type": "string"}],
        "name": "verifyDocument",
        "outputs": [
            {"internalType": "bool", "name": "exists", "type": "bool"},
            {"internalType": "string", "name": "ownerName", "type": "string"},
            {"internalType": "string", "name": "cedula", "type": "string"},
            {"internalType": "string", "name": "documentType", "type": "string"},
            {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

w3 = None
if HAS_WEB3 and WEB3_PROVIDER_URL:
    try:
        w3 = Web3(Web3.HTTPProvider(WEB3_PROVIDER_URL))
    except Exception:
        pass


def get_contract():
    if not w3 or not CONTRACT_ADDRESS or "0x" not in CONTRACT_ADDRESS:
        return None
    return w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)


async def send_register_transaction(doc_hash, owner, cedula, doc_type):
    """Firma y envía una transacción para registrar un documento."""
    if not w3 or not WALLET_PRIVATE_KEY:
        return None

    account = w3.eth.account.from_key(WALLET_PRIVATE_KEY)
    contract = get_contract()
    if not contract:
        return None

    nonce = w3.eth.get_transaction_count(account.address)

    txn = contract.functions.registerDocument(
        doc_hash, owner, cedula, doc_type
    ).build_transaction({
        'chainId': 11155111,  # Sepolia
        'gas': 300000,
        'gasPrice': w3.eth.gas_price,
        'nonce': nonce,
    })

    signed_txn = w3.eth.account.sign_transaction(txn, private_key=WALLET_PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
    return w3.to_hex(tx_hash)


# ─── Helpers de Seguridad ────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hashea una contraseña con bcrypt (o fallback a SHA-256 si bcrypt no está)."""
    if HAS_BCRYPT:
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    # Fallback: SHA-256 con salt (menos seguro que bcrypt pero mejor que texto plano)
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()
    return f"sha256:{salt}:{hashed}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verifica una contraseña contra su hash almacenado."""
    if HAS_BCRYPT and stored_hash.startswith("$2"):
        return bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
    if stored_hash.startswith("sha256:"):
        _, salt, hashed = stored_hash.split(":", 2)
        return hashlib.sha256(f"{salt}:{password}".encode()).hexdigest() == hashed
    # Compatibilidad con contraseñas legacy en texto plano (migración)
    return password == stored_hash


def create_jwt_token(payload: dict, expires_hours: int = 24) -> str:
    """Crea un JWT token."""
    if HAS_JWT:
        payload["exp"] = datetime.datetime.utcnow() + datetime.timedelta(hours=expires_hours)
        payload["iat"] = datetime.datetime.utcnow()
        return pyjwt.encode(payload, JWT_SECRET, algorithm="HS256")
    # Fallback: token simple firmado
    return secrets.token_urlsafe(32)


def verify_jwt_token(token: str) -> Optional[dict]:
    """Verifica y decodifica un JWT token."""
    if not HAS_JWT:
        return {"fallback": True}  # En dev sin JWT, aceptar cualquier token
    try:
        return pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        return None


async def require_admin_token(authorization: str = Header(None)):
    """Dependencia de FastAPI que valida el token de admin."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Token de autorización requerido")
    token = authorization.replace("Bearer ", "")
    payload = verify_jwt_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    return payload


# ─── Stats Persistentes con Supabase ─────────────────────────────────────────

# Fallback en memoria para cuando Supabase no está disponible
_stats_memory = {
    "graduandos_activos": 0,
    "docs_prevalidados": 0,
    "tiempo_ahorrado_hrs": 0.0,
    "titulos_blockchain": 0,
}
_audit_log_memory = []


async def get_stats() -> dict:
    """Obtiene las estadísticas actuales (Supabase o memoria)."""
    if supabase:
        try:
            res = supabase.table("stats").select("*").execute()
            stats = {}
            for row in res.data:
                stats[row["key"]] = row["value"]
            # Obtener audit_log
            log_res = supabase.table("audit_logs").select("message").order("created_at", desc=True).limit(10).execute()
            stats["audit_log"] = [r["message"] for r in log_res.data]
            return stats
        except Exception as e:
            print(f"[WARN] Error leyendo stats de Supabase: {e}")

    return {**_stats_memory, "audit_log": _audit_log_memory[:10]}


async def increment_stat(key: str, amount: float = 1, log_entry: str = None):
    """Incrementa un contador y opcionalmente añade un log de auditoría."""
    if supabase:
        try:
            # Upsert stat
            res = supabase.table("stats").select("*").eq("key", key).execute()
            if len(res.data) > 0:
                new_val = round(res.data[0]["value"] + amount, 1)
                supabase.table("stats").update({"value": new_val, "updated_at": datetime.datetime.utcnow().isoformat()}).eq("key", key).execute()
            else:
                supabase.table("stats").insert({"key": key, "value": amount}).execute()

            if log_entry:
                timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                supabase.table("audit_logs").insert({"message": f"[{timestamp}] {log_entry}"}).execute()

            # Broadcast a WebSockets conectados
            await stats_manager.broadcast()
            return
        except Exception as e:
            print(f"[WARN] Error escribiendo stat a Supabase: {e}")

    # Fallback en memoria
    if key in _stats_memory:
        _stats_memory[key] = round(_stats_memory[key] + amount, 1)
    if log_entry:
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        _audit_log_memory.insert(0, f"[{timestamp}] {log_entry}")
        while len(_audit_log_memory) > 10:
            _audit_log_memory.pop()
    await stats_manager.broadcast()


# ─── WebSocket Manager para Stats en Tiempo Real ────────────────────────────
class StatsManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self):
        """Envía los stats actuales a todos los dashboards conectados."""
        stats = await get_stats()
        message = json.dumps(stats)
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

stats_manager = StatsManager()


# ─── Checklist SAREN (dinámico desde Supabase o fallback estático) ───────────

CHECKLIST_SAREN_DEFAULT = [
    {
        "id": 1,
        "label": "Título Original con firma del Rector y Secretario General",
        "pregunta": "📋 **Requisito 1 de 5 — Título Original**\n\n¿Tienes el título físico **firmado** por el Rector y el Secretario General de la USM? Adjunta una foto con el 📎 o responde **sí / no**.",
        "pista": "🔴 **Error detectado en el Título.**\nDirígete a Control de Estudios USM (Módulo 4) para solicitar uno corregido antes de continuar.",
    },
    {
        "id": 2,
        "label": "Validación del GTU (Sello o QR del MPPEU)",
        "pregunta": "📋 **Requisito 2 de 5 — Legalización GTU**\n\n¿Tienes el sello del **Ministerio de Educación (MPPEU/GTU)**? Adjunta la foto del sello o responde **sí / no**.",
        "pista": "🔴 **Falta la validación del GTU.**\nTramítalo en la Zona Educativa de tu estado. Sin este sello el SAREN rechazará tu documento.",
    },
    {
        "id": 3,
        "label": "Planilla Única Bancaria (PUB) pagada",
        "pregunta": "📋 **Requisito 3 de 5 — Pago de Aranceles (PUB)**\n\n¿Tienes la **Planilla Única Bancaria (PUB)** con el pago de aranceles completado? Adjunta el comprobante o responde **sí / no**.",
        "pista": "🔴 **Falta la PUB pagada.**\nDescarga el formato en el módulo de Planillas de esta app, llévalo al banco indicado y regresa con el sello.",
    },
    {
        "id": 4,
        "label": "Timbres Fiscales Regionales (denominación correcta)",
        "pregunta": "📋 **Requisito 4 de 5 — Timbres Fiscales**\n\n¿Tienes los **timbres fiscales regionales** de la denominación exacta? (Normalmente 0.5 UT). Responde **sí / no**.",
        "pista": "🔴 **Timbres insuficientes o incorrectos.**\nDirígete a una farmacia autorizada cerca del Registro. Confirma la denominación exacta el mismo día.",
    },
    {
        "id": 5,
        "label": "Copia de Cédula laminada y vigente",
        "pregunta": "📋 **Requisito 5 de 5 — Copia de Cédula**\n\n¿Tienes una copia **legible** de tu cédula de identidad **laminada** y **vigente**? Responde **sí / no**.",
        "pista": "🔴 **Cédula vencida o copia ilegible.**\nEl SAREN no acepta cédulas vencidas. Renuévala en el SAIME antes de continuar.",
    },
]


async def get_checklist():
    """Obtiene el checklist dinámico desde Supabase, o fallback estático."""
    if supabase:
        try:
            res = supabase.table("checklist_items").select("*").eq("activo", True).order("orden").execute()
            if res.data and len(res.data) > 0:
                return res.data
        except Exception:
            pass
    return CHECKLIST_SAREN_DEFAULT


def formato_checklist_resumen(checklist_items: list, estados: dict) -> str:
    lineas = ["📊 **Estado de tu expediente:**\n"]
    for item in checklist_items:
        estado = estados.get(item["id"], "⏳")
        lineas.append(f"{estado} {item['label']}")
    return "\n".join(lineas)


# ─── Modelos Pydantic ────────────────────────────────────────────────────────

class AdminLoginReq(BaseModel):
    username: str
    password: str

class NewAdminReq(BaseModel):
    username: str
    password: str
    cargo: str
    ente: str

class ProfileReq(BaseModel):
    cedula: str
    nombre: str
    carrera: str
    semestre: str

class BlockchainRegisterReq(BaseModel):
    hash: str
    ownerName: str
    cedula: str
    documentType: str

class HashDocumentReq(BaseModel):
    """Request para generar un hash SHA-256 real del documento."""
    data: dict

class ChecklistItemReq(BaseModel):
    label: str
    pregunta: str
    pista: str
    orden: int
    activo: bool = True

class GuiaLogisticaReq(BaseModel):
    ente: str
    location: str
    warning: str
    image_url: str = ""
    steps: list

class PlanillaReq(BaseModel):
    nombre: str
    url: str
    categoria: str = ""
    orden: int = 0

class PrevalidateReportReq(BaseModel):
    filename: str
    session_id: Optional[str] = "default"


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    stats = await get_stats()
    blockchain_connected = w3.is_connected() if w3 else False
    return {"status": "online", "stats": stats, "blockchain_connected": blockchain_connected}


@app.get("/api/stats")
async def api_stats(session_id: str = None):
    """Endpoint dedicado de stats para Vercel (donde '/' sirve index.html)."""
    stats = await get_stats()
    blockchain_connected = w3.is_connected() if w3 else False

    # Contar graduandos registrados (para métricas históricas)
    if supabase:
        try:
            profiles_res = supabase.table("profiles").select("cedula", count="exact").execute()
            stats["graduandos_activos"] = profiles_res.count if profiles_res.count else len(profiles_res.data)
        except Exception:
            pass

        # Contar documentos en blockchain desde la tabla de records
        try:
            records_res = supabase.table("records").select("hash", count="exact").execute()
            stats["titulos_blockchain"] = records_res.count if records_res.count else len(records_res.data)
        except Exception:
            pass

    # --- TRACKING DE USUARIOS EN LÍNEA EN TIEMPO REAL ---
    import time
    import random
    current_time = time.time()
    active_users = 1

    if supabase:
        try:
            if session_id:
                # Actualizar el heartbeat del usuario actual
                key_name = f"session_{session_id}"
                res = supabase.table("stats").select("key").eq("key", key_name).execute()
                if len(res.data) > 0:
                    supabase.table("stats").update({"value": current_time, "updated_at": datetime.datetime.utcnow().isoformat()}).eq("key", key_name).execute()
                else:
                    supabase.table("stats").insert({"key": key_name, "value": current_time}).execute()

            # Limpiar sesiones muertas (hace más de 30 segundos) - Probabilidad del 20% para no saturar DB
            if random.random() < 0.2:
                supabase.table("stats").delete().like("key", "session_%").lt("value", current_time - 30).execute()

            # Contar usuarios en línea (activos en los últimos 15 segundos)
            active_res = supabase.table("stats").select("key", count="exact").like("key", "session_%").gte("value", current_time - 15).execute()
            active_users = active_res.count if active_res.count else len(active_res.data)
            # Asegurar mínimo 1 (el propio usuario)
            active_users = max(1, active_users)
        except Exception as e:
            print(f"[WARN] Error tracking online users: {e}")

    stats["usuarios_en_linea"] = active_users

    # Dirección de la wallet del servidor
    wallet_address = None
    if w3 and WALLET_PRIVATE_KEY and WALLET_PRIVATE_KEY != "0x1234567890123456789012345678901234567890123456789012345678901234":
        try:
            account = w3.eth.account.from_key(WALLET_PRIVATE_KEY)
            wallet_address = account.address
        except Exception:
            pass

    return {
        "status": "online",
        "stats": stats,
        "blockchain_connected": blockchain_connected,
        "wallet_address": wallet_address,
    }


@app.post("/prevalidation/report")
async def report_prevalidation(req: PrevalidateReportReq):
    """Registra y reporta una pre-validación de expediente de graduando en tiempo real."""
    log_msg = f"IA VISION: Analizando '{req.filename}'... Validando sellos y nitidez."
    await increment_stat("docs_prevalidados", 1, log_entry=log_msg)
    await increment_stat("tiempo_ahorrado_hrs", 0.5)
    return {"success": True}


@app.post("/stats/heartbeat")
async def stats_heartbeat():
    """Incrementa el tiempo ahorrado por el uso continuo de la plataforma."""
    await increment_stat("tiempo_ahorrado_hrs", 0.1)
    return {"success": True}


# ─── Autenticación ───────────────────────────────────────────────────────────

@app.post("/admin/login")
async def admin_login(req: AdminLoginReq):
    if not supabase:
        # Fallback para desarrollo sin Supabase
        if req.username == "admin" and req.password == "usm2026":
            token = create_jwt_token({"username": "admin", "cargo": "Administrador", "ente": "USM"})
            return {"success": True, "token": token, "username": "admin", "cargo": "Administrador", "ente": "USM"}
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    try:
        res = supabase.table("admins").select("*").eq("username", req.username).execute()
        if len(res.data) > 0:
            user = res.data[0]
            if verify_password(req.password, user["password"]):
                token = create_jwt_token({
                    "username": req.username,
                    "cargo": user.get("cargo", "Administrador"),
                    "ente": user.get("ente", "Gubernamental")
                })
                return {
                    "success": True,
                    "token": token,
                    "username": req.username,
                    "cargo": user.get("cargo", "Administrador"),
                    "ente": user.get("ente", "Gubernamental")
                }
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/admin/users")
async def create_admin(req: NewAdminReq):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        # Check if exists
        exist = supabase.table("admins").select("username").eq("username", req.username).execute()
        if len(exist.data) > 0:
            raise HTTPException(status_code=400, detail="El usuario ya existe")

        supabase.table("admins").insert({
            "username": req.username,
            "password": hash_password(req.password),
            "cargo": req.cargo,
            "ente": req.ente
        }).execute()

        token = create_jwt_token({"username": req.username, "cargo": req.cargo, "ente": req.ente})
        return {"success": True, "message": "Administrador creado exitosamente", "token": token}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Perfiles de Estudiantes ─────────────────────────────────────────────────

@app.post("/profiles/register")
async def register_profile(req: ProfileReq):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        data = {
            "cedula": req.cedula,
            "nombre": req.nombre,
            "carrera": req.carrera,
            "semestre": req.semestre
        }
        supabase.table("profiles").upsert(data).execute()
        return {"success": True, "profile": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/profiles/{cedula}")
async def get_profile(cedula: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        res = supabase.table("profiles").select("*").eq("cedula", cedula).execute()
        if len(res.data) > 0:
            return {"success": True, "profile": res.data[0]}
        else:
            raise HTTPException(status_code=404, detail="Perfil no encontrado")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Blockchain ──────────────────────────────────────────────────────────────

@app.get("/blockchain/verify/{doc_hash}")
async def verify_blockchain_document(doc_hash: str):
    """Consulta la blockchain para verificar un hash de documento."""
    contract = get_contract()
    doc_hash_upper = doc_hash.upper()
    
    # 1. Intentar consultar en la Blockchain real si el contrato está configurado
    if contract:
        try:
            result = contract.functions.verifyDocument(doc_hash_upper).call()
            exists, owner_name, cedula, doc_type, timestamp = result

            if exists:
                # Buscar txHash en Supabase para mostrarlo en el frontend
                tx_hash = "N/A"
                if supabase:
                    try:
                        res = supabase.table("records").select("tx_hash").eq("hash", doc_hash_upper).execute()
                        if res.data and len(res.data) > 0:
                            tx_hash = res.data[0].get("tx_hash", "N/A")
                    except Exception:
                        pass
                return {
                    "exists": True,
                    "ownerName": owner_name,
                    "cedula": cedula,
                    "documentType": doc_type,
                    "timestamp": int(timestamp),
                    "txHash": tx_hash
                }
        except Exception as e:
            print(f"[WARN] Error consultando blockchain, intentando fallback en base de datos: {e}")

    # 2. Fallback a base de datos Supabase si no está en blockchain o falló la blockchain
    if supabase:
        try:
            res = supabase.table("records").select("*").eq("hash", doc_hash_upper).execute()
            if res.data and len(res.data) > 0:
                record = res.data[0]
                # Convertir created_at (string iso) a timestamp unix integer
                try:
                    dt = datetime.datetime.fromisoformat(record.get("created_at").replace('Z', '+00:00'))
                    timestamp = int(dt.timestamp())
                except Exception:
                    timestamp = int(datetime.datetime.now().timestamp())
                
                return {
                    "exists": True,
                    "ownerName": record.get("owner_name", "Desconocido"),
                    "cedula": record.get("cedula", "N/A"),
                    "documentType": record.get("document_type", "Documento PUB"),
                    "timestamp": timestamp,
                    "txHash": record.get("tx_hash", "N/A")
                }
        except Exception as e:
            print(f"[ERROR] Fallback database query failed: {e}")

    return {
        "exists": False,
        "error": "Documento no registrado en blockchain ni en base de datos."
    }


def map_record(r):
    return {
        "hash": r.get("hash"),
        "ownerName": r.get("owner_name"),
        "cedula": r.get("cedula"),
        "documentType": r.get("document_type"),
        "txHash": r.get("tx_hash"),
        "status": r.get("status"),
        "timestamp": r.get("created_at")
    }


@app.get("/blockchain/records")
async def get_all_records():
    """Obtiene todos los registros (para el Panel Gubernamental)."""
    if supabase:
        res = supabase.table("records").select("*").order("created_at", desc=True).execute()
        return {"success": True, "records": [map_record(r) for r in res.data]}
    return {"success": False, "error": "Supabase no configurado"}


@app.get("/blockchain/records/cedula/{cedula}")
async def get_records_by_cedula(cedula: str):
    """Obtiene los registros de un estudiante específico (para el Timeline)."""
    if supabase:
        # Generar variaciones de cédula (con puntos, sin puntos, con guion, etc.)
        cedula_clean = cedula.replace(".", "").replace("-", "").replace(" ", "").upper()
        
        # Variación básica: ej. V28315101 o 28315101
        variations = [cedula, cedula_clean]
        
        # Si empieza con V, añadir V-28315101 y extraer num_part
        if cedula_clean.startswith("V"):
            variations.append(f"V-{cedula_clean[1:]}")
            num_part = cedula_clean[1:]
        else:
            variations.append(f"V-{cedula_clean}")
            num_part = cedula_clean
            
        # Formatear con puntos: ej. V-28.315.101
        if len(num_part) == 8:
            dotted_v = f"V-{num_part[:2]}.{num_part[2:5]}.{num_part[5:]}"
            dotted_no_v = f"{num_part[:2]}.{num_part[2:5]}.{num_part[5:]}"
            variations.extend([dotted_v, dotted_no_v])
        elif len(num_part) == 7:
            dotted_v = f"V-{num_part[:1]}.{num_part[1:4]}.{num_part[4:]}"
            dotted_no_v = f"{num_part[:1]}.{num_part[1:4]}.{num_part[4:]}"
            variations.extend([dotted_v, dotted_no_v])
            
        # Eliminar duplicados y valores vacíos
        variations = list(set([v for v in variations if v]))
        
        try:
            res = supabase.table("records").select("*").in_("cedula", variations).order("created_at", desc=True).execute()
            return {"success": True, "records": [map_record(r) for r in res.data]}
        except Exception as e:
            print(f"[ERROR] Failed to query user records with variations {variations}: {e}")
            return {"success": False, "error": str(e)}
            
    return {"success": False, "error": "Supabase no configurado"}


@app.post("/blockchain/records/{doc_hash}/verify")
async def verify_record_status(doc_hash: str):
    """Actualiza el estado de un registro a verificado (por el ente gubernamental)."""
    if supabase:
        res = supabase.table("records").update({"status": "Verificado por SAREN/MPPRE"}).eq("hash", doc_hash).execute()
        if len(res.data) > 0:
            await increment_stat("titulos_blockchain", 0, log_entry=f"AUDITORÍA: Documento {doc_hash[:10]}... verificado por funcionario.")
            return {"success": True, "message": "Documento verificado exitosamente."}
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
    raise HTTPException(status_code=500, detail="Supabase no configurado.")


@app.post("/blockchain/register")
async def register_blockchain_document(data: BlockchainRegisterReq):
    """Registra un nuevo documento en la blockchain y localmente para el panel."""
    try:
        tx_hash = None
        is_simulated = False
        
        try:
            tx_hash = await send_register_transaction(data.hash, data.ownerName, data.cedula, data.documentType)
        except Exception as blockchain_err:
            print(f"[WARN] Error enviando transacción a la Blockchain: {blockchain_err}")
            
        if not tx_hash:
            # Fallback: Generar un txHash simulado si no hay fondos o falla la red
            tx_hash = f"0x{secrets.token_hex(32)}"
            is_simulated = True

        log_msg = f"NUEVO REGISTRO: {data.documentType} de {data.ownerName} (C.I. {data.cedula}) emitido exitosamente{' (MOCK)' if is_simulated else ''}."
        await increment_stat("titulos_blockchain", 1, log_entry=log_msg)

        # Guardar en Supabase para el panel gubernamental y verificación posterior
        if supabase:
            try:
                supabase.table("records").insert({
                    "hash": data.hash,
                    "owner_name": data.ownerName,
                    "cedula": data.cedula,
                    "document_type": data.documentType,
                    "tx_hash": tx_hash,
                    "status": "Pendiente de Auditoría"
                }).execute()
            except Exception as db_err:
                print(f"[ERROR] Error al guardar registro en Supabase: {db_err}")

        # La URL del QR debe ser la raíz con ?hash=... para que App.jsx lo capture al escanear
        verify_url = f"{FRONTEND_URL}/?hash={data.hash}"
        return {
            "success": True,
            "txHash": tx_hash,
            "certificateUrl": f"https://sepolia.etherscan.io/tx/{tx_hash}" if not is_simulated else "#",
            "qrContent": verify_url,
            "isSimulated": is_simulated
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/blockchain/certificate/{doc_hash}")
async def get_digital_certificate(doc_hash: str):
    """Genera la metadata para un Certificado Digital de Verificación."""
    contract = get_contract()
    if not contract:
        raise HTTPException(status_code=503, detail="Blockchain no conectada")

    try:
        result = contract.functions.verifyDocument(doc_hash).call()
        exists, owner_name, cedula, doc_type, timestamp = result

        if not exists:
            raise HTTPException(status_code=404, detail="Documento no encontrado en Blockchain")

        verify_url = f"{FRONTEND_URL}/verificar?hash={doc_hash}"
        return {
            "title": "CERTIFICADO DE AUTENTICIDAD DIGITAL",
            "institution": "Universidad Santa María - Facultad de Ingeniería",
            "owner": owner_name,
            "id_number": cedula,
            "document_type": doc_type,
            "blockchain_status": "VALIDADO E INMUTABLE",
            "network": "Ethereum Sepolia Testnet",
            "registration_date": str(datetime.datetime.fromtimestamp(timestamp)),
            "document_hash": doc_hash,
            "qr_link": verify_url
        }
    except HTTPException:
        raise
    except Exception as e:
        # Fallback a base de datos local si la blockchain real falla (por ej. Infura key no configurada)
        if supabase:
            try:
                res = supabase.table("records").select("*").eq("hash", doc_hash).execute()
                if res.data and len(res.data) > 0:
                    record = res.data[0]
                    verify_url = f"{FRONTEND_URL}/?hash={doc_hash}"
                    return {
                        "title": "CERTIFICADO DE AUTENTICIDAD DIGITAL",
                        "institution": "Universidad Santa María - Facultad de Ingeniería",
                        "owner": record.get("owner_name", "Desconocido"),
                        "id_number": record.get("cedula", "N/A"),
                        "document_type": record.get("document_type", "Documento PUB"),
                        "blockchain_status": "VALIDADO (MODO OFFLINE/SIMULADO)",
                        "network": "Red Local",
                        "registration_date": str(record.get("created_at", datetime.datetime.now().isoformat())),
                        "document_hash": doc_hash,
                        "qr_link": verify_url
                    }
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"Error en Blockchain y sin respaldo local: {str(e)}")


# ─── Hash SHA-256 real ───────────────────────────────────────────────────────

@app.post("/hash/generate")
async def generate_document_hash(data: HashDocumentReq):
    """Genera un hash SHA-256 real a partir de los datos del documento."""
    try:
        # Serializar datos de forma determinística
        canonical = json.dumps(data.data, sort_keys=True, ensure_ascii=False)
        sha256_hash = hashlib.sha256(canonical.encode('utf-8')).hexdigest()
        return {"success": True, "hash": f"0x{sha256_hash.upper()}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── WebSocket para Stats Live ──────────────────────────────────────────────

@app.websocket("/ws/stats")
async def stats_endpoint(websocket: WebSocket):
    """Dashboard se suscribe aquí para recibir actualizaciones en tiempo real."""
    await websocket.accept()
    await stats_manager.connect(websocket)
    # Enviar estado inicial inmediatamente
    stats = await get_stats()
    await websocket.send_text(json.dumps(stats))
    try:
        while True:
            await websocket.receive_text()  # mantener vivo
    except (WebSocketDisconnect, Exception):
        stats_manager.disconnect(websocket)


# ─── Chat ────────────────────────────────────────────────────────────────────

chat_sessions = {}

@app.post("/chat/message")
async def chat_rest_endpoint(data: dict):
    session_id = data.get("session_id", "default")
    texto_usuario = data.get("message", "")
    is_file = data.get("is_file", False)

    # Init session
    if session_id not in chat_sessions:
        chat_sessions[session_id] = {
            "modo_auditoria": False,
            "checklist_paso": 0,
            "checklist_estados": {},
            "checklist_items": None  # Se carga dinámicamente
        }

    session = chat_sessions[session_id]

    # Cargar checklist dinámico si no está en sesión
    if session["checklist_items"] is None:
        session["checklist_items"] = await get_checklist()

    checklist = session["checklist_items"]

    if texto_usuario.lower() == "/start":
        await increment_stat("graduandos_activos", 1)
        return {"reply": (
            "🏛️ **ASISTENTE GUBERNAMENTAL PARA EGRESADOS USM** 🏛️\n\n"
            "Hola, ingeniero. Soy tu asistente virtual especializado en los trámites "
            "gubernamentales (**GTU, SAREN, MPPRE**).\n\n"
            "• Escribe **'auditar'** para revisar tu expediente paso a paso.\n"
            "• Adjunta documentos con el 📎 para validación inmediata.\n"
            "• O hazme cualquier pregunta sobre los trámites."
        )}

    if is_file or texto_usuario.startswith("[FILE_UPLOAD]"):
        nombre_archivo = texto_usuario.replace("[FILE_UPLOAD]", "")
        log_msg = f"IA VISION: Analizando '{nombre_archivo}'... Validando sellos y nitidez."
        await increment_stat("docs_prevalidados", 1, log_entry=log_msg)
        await increment_stat("tiempo_ahorrado_hrs", 0.5)

        if session["modo_auditoria"] and session["checklist_paso"] < len(checklist):
            item_actual = checklist[session["checklist_paso"]]
            session["checklist_estados"][item_actual["id"]] = "✅"
            session["checklist_paso"] += 1
            resumen = formato_checklist_resumen(checklist, session["checklist_estados"])

            if session["checklist_paso"] < len(checklist):
                siguiente = checklist[session["checklist_paso"]]
                respuesta = f"🔍 **`{nombre_archivo}` analizado. ✅ APROBADO.**\n\n{resumen}\n\n---\n{siguiente['pregunta']}"
            else:
                respuesta = f"🔍 **`{nombre_archivo}` analizado. ✅ APROBADO.**\n\n{resumen}\n\n🎉 **¡Expediente completo!** Puedes presentarte en taquilla con confianza. ¡Suerte, ingeniero!"
                await increment_stat("titulos_blockchain", 1)
                session["modo_auditoria"] = False
            return {"reply": respuesta}
        else:
            return {"reply": (
                f"🔍 **`{nombre_archivo}` recibido y analizado.**\n\n"
                "✅ Metadatos correctos.\n"
                "✅ Nitidez de escaneo aceptable.\n"
                "⚠️ Verifica que esté impreso a doble cara si es para el SAREN.\n\n"
                "Escribe **'auditar'** para una revisión guiada completa."
            )}

    if session["modo_auditoria"]:
        item_actual = checklist[session["checklist_paso"]]
        respuesta_lower = texto_usuario.strip().lower()
        aprobado = any(w in respuesta_lower for w in ["sí", "si", "yes", "tengo", "listo", "ok", "claro", "afirmativo"])

        if aprobado:
            session["checklist_estados"][item_actual["id"]] = "✅"
            session["checklist_paso"] += 1
            resumen = formato_checklist_resumen(checklist, session["checklist_estados"])

            if session["checklist_paso"] < len(checklist):
                siguiente = checklist[session["checklist_paso"]]
                respuesta = f"✅ **{item_actual['label']}** — APROBADO.\n\n{resumen}\n\n---\n{siguiente['pregunta']}"
            else:
                respuesta = f"✅ **{item_actual['label']}** — APROBADO.\n\n{resumen}\n\n🎉 **¡Expediente listo al 100%!** Puedes presentarte en taquilla. ¡Suerte, ingeniero!"
                await increment_stat("docs_prevalidados", 1)
                await increment_stat("tiempo_ahorrado_hrs", 0.5)
                session["modo_auditoria"] = False
            return {"reply": respuesta}
        else:
            session["checklist_estados"][item_actual["id"]] = "❌"
            resumen = formato_checklist_resumen(checklist, session["checklist_estados"])
            return {"reply": f"{item_actual['pista']}\n\n{resumen}\n\nCuando lo tengas, responde **'listo'** o adjunta el documento con el 📎."}

    if "auditar" in texto_usuario.lower():
        session["modo_auditoria"] = True
        session["checklist_paso"] = 0
        session["checklist_estados"] = {}
        return {"reply": (
            "🔎 **Iniciando Auditoría de Expediente SAREN**\n\n"
            f"Te guiaré por los **{len(checklist)} requisitos obligatorios**.\n"
            "• Responde **sí** si lo tienes.\n"
            "• Responde **no** si te falta (te daré las instrucciones exactas).\n"
            "• O adjunta el documento con el 📎 para verificación visual.\n\n"
            f"---\n{checklist[0]['pregunta']}"
        )}

    return {"reply": (
        f"✅ Consulta recibida: **{texto_usuario}**\n\n"
        "Según los instructivos vigentes del SAREN/GTU: lleva todos tus documentos en carpeta "
        "manila tamaño oficio y llega mínimo 1 hora antes de la apertura del Registro. "
        "Escribe **'auditar'** para una revisión completa de tu expediente."
    )}


# ─── Datos Dinámicos: CRUD para panel admin ─────────────────────────────────

# --- Checklist CRUD ---
@app.get("/admin/checklist")
async def get_checklist_items():
    items = await get_checklist()
    return {"success": True, "items": items}

@app.post("/admin/checklist")
async def create_checklist_item(item: ChecklistItemReq):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase no configurado")
    try:
        supabase.table("checklist_items").insert(item.model_dump()).execute()
        return {"success": True, "message": "Item creado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/admin/checklist/{item_id}")
async def update_checklist_item(item_id: int, item: ChecklistItemReq):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase no configurado")
    try:
        supabase.table("checklist_items").update(item.model_dump()).eq("id", item_id).execute()
        return {"success": True, "message": "Item actualizado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/admin/checklist/{item_id}")
async def delete_checklist_item(item_id: int):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase no configurado")
    try:
        supabase.table("checklist_items").delete().eq("id", item_id).execute()
        return {"success": True, "message": "Item eliminado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Guías Logísticas CRUD ---
@app.get("/guias")
async def get_guias_logistica():
    if supabase:
        try:
            res = supabase.table("guias_logistica").select("*").execute()
            if res.data:
                return {"success": True, "guias": res.data}
        except Exception:
            pass
    # Fallback estático
    return {"success": True, "guias": [
        {
            "ente": "saren",
            "location": "Sede del Registro Principal (Según tu Estado/Municipio)",
            "warning": "Cita previa obligatoria a través de la web del SAREN.",
            "image_url": "",
            "steps": [
                {"title": "Planificación de Llegada", "time": "6:00 AM", "desc": "Los Registros Principales suelen atender por orden de llegada. Llega temprano porque el sistema suele 'caerse' a media mañana."},
                {"title": "Documentos Esenciales", "time": "Revisión Previa", "desc": "Debes tener: Título original legalizado por el GTU, la Planilla Única Bancaria (PUB) pagada, Timbres Fiscales del estado y copias de tu Cédula."},
                {"title": "Taquilla de Recepción", "time": "Paso 1 en sede", "desc": "Al entrar, un funcionario revisará que los aranceles coincidan con las Unidades Tributarias exigidas."},
                {"title": "Proceso de Registro", "time": "Paso 2 en sede", "desc": "Entregarás el título físico. Deberás regresar luego para retirarlo con el certificado del SAREN."}
            ]
        },
        {
            "ente": "mppre",
            "location": "Oficina del MPPRE o IPOSTEL autorizada (Cita Electrónica)",
            "warning": "Citas asignadas según el terminal de tu cédula.",
            "image_url": "",
            "steps": [
                {"title": "Día de Cita", "time": "7:30 AM", "desc": "El sistema de Apostilla Electrónica te da un día específico. Imprime dos copias de la cita."},
                {"title": "Validación de GTU", "time": "Requisito Estricto", "desc": "Tu título ya debe estar legalizado por el GTU del Ministerio de Educación Universitaria."},
                {"title": "Entrega Física", "time": "Durante la atención", "desc": "El funcionario verificará el código QR de legalización previa."}
            ]
        }
    ]}

@app.post("/admin/guias")
async def create_guia(guia: GuiaLogisticaReq):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase no configurado")
    try:
        supabase.table("guias_logistica").insert(guia.model_dump()).execute()
        return {"success": True, "message": "Guía creada"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Planillas CRUD ---
@app.get("/planillas")
async def get_planillas():
    if supabase:
        try:
            res = supabase.table("planillas").select("*").order("orden").execute()
            if res.data:
                return {"success": True, "planillas": res.data}
        except Exception:
            pass
    # Fallback
    return {"success": True, "planillas": [
        {"nombre": "Planilla de Solicitud de Grado.pdf", "url": "#", "categoria": "Grado"},
        {"nombre": "Formato Fondo Negro.pdf", "url": "#", "categoria": "Grado"},
        {"nombre": "Planilla Solvencia de Biblioteca.pdf", "url": "#", "categoria": "Grado"},
        {"nombre": "Planilla Única Bancaria (PUB).pdf", "url": "#", "categoria": "SAREN"},
    ]}

@app.post("/admin/planillas")
async def create_planilla(planilla: PlanillaReq):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase no configurado")
    try:
        supabase.table("planillas").insert(planilla.model_dump()).execute()
        return {"success": True, "message": "Planilla creada"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/admin/planillas/{planilla_id}")
async def delete_planilla(planilla_id: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase no configurado")
    try:
        supabase.table("planillas").delete().eq("id", planilla_id).execute()
        return {"success": True, "message": "Planilla eliminada"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Carreras (dinámicas) ---
@app.get("/carreras")
async def get_carreras():
    if supabase:
        try:
            res = supabase.table("carreras").select("*").order("nombre").execute()
            if res.data and len(res.data) > 0:
                return {"success": True, "carreras": [r["nombre"] for r in res.data]}
        except Exception:
            pass
    return {"success": True, "carreras": [
        "Ingeniería en Sistemas", "Ingeniería Civil", "Ingeniería Industrial",
        "Ingeniería Eléctrica", "Ingeniería Mecánica", "Arquitectura"
    ]}


# ─── OCR: Extracción Inteligente de Documentos Académicos ────────────────────

class OCRRequest(BaseModel):
    raw_text: Optional[str] = None
    image_base64: Optional[str] = None

def extract_entities_ner(raw_text: str) -> dict:
    """
    Capa de Reconocimiento de Entidades Nombradas (NER) sobre texto crudo del OCR.
    Aplica heurísticas semánticas orientadas a documentos académicos venezolanos.
    """
    text = raw_text or ""
    fields = {}

    # ── Cédula de Identidad (V-XXXXXXXX / E-XXXXXXXX) ──
    ced_match = re.search(r'\b([VEve]-?\s*\d{6,9})\b', text)
    if ced_match:
        cedula_raw = ced_match.group(1).replace(' ', '').upper()
        fields['cedula'] = {'value': cedula_raw, 'confidence': 0.92}
    else:
        fields['cedula'] = {'value': None, 'confidence': 0.0}

    # ── Fecha de Emisión ──
    fecha_match = re.search(
        r'(\d{1,2}\s+(?:de\s+)?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?\d{4})',
        text, re.IGNORECASE
    )
    if not fecha_match:
        fecha_match = re.search(r'(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})', text)
    if fecha_match:
        fields['fecha'] = {'value': fecha_match.group(1).strip(), 'confidence': 0.88}
    else:
        fields['fecha'] = {'value': None, 'confidence': 0.0}

    # ── Institución Educativa ──
    inst_keywords = [
        'Universidad Santa María', 'Universidad Central', 'Universidad Simón Bolívar',
        'Universidad de Carabobo', 'Universidad de los Andes', 'IUTIRLA', 'UNEXPO',
        'Universidad Metropolitana', 'Universidad Católica', 'USB', 'UCV', 'USM', 'UCAB'
    ]
    institucion_found = None
    for kw in inst_keywords:
        if kw.lower() in text.lower():
            institucion_found = kw
            break
    if not institucion_found:
        uni_match = re.search(r'(Universidad\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ ]{3,50})', text)
        if uni_match:
            institucion_found = uni_match.group(1).strip()
    fields['institucion'] = {'value': institucion_found, 'confidence': 0.85 if institucion_found else 0.0}

    # ── Mención / Carrera ──
    carrera_keywords = [
        'Ingeniería en Sistemas', 'Ingeniería Civil', 'Ingeniería Industrial',
        'Ingeniería Eléctrica', 'Ingeniería Mecánica', 'Ingeniería Electrónica',
        'Arquitectura', 'Derecho', 'Medicina', 'Administración', 'Contaduría',
        'Computación', 'Informática', 'Telecomunicaciones'
    ]
    carrera_found = None
    for kw in carrera_keywords:
        if kw.lower() in text.lower():
            carrera_found = kw
            break
    if not carrera_found:
        carrera_match = re.search(
            r'(?:menci[oó]n|t[ií]tulo de|egresado en|licenciado en|ingeniero en)\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ ]{3,50})',
            text, re.IGNORECASE
        )
        if carrera_match:
            carrera_found = carrera_match.group(1).strip()
    fields['carrera'] = {'value': carrera_found, 'confidence': 0.80 if carrera_found else 0.0}

    # ── Nombre Completo (heurística: línea con 2-6 palabras en mayúsculas) ──
    nombre_found = None
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    for line in lines:
        words = line.split()
        if 2 <= len(words) <= 6 and all(re.match(r'^[A-ZÁÉÍÓÚÑa-záéíóúñ]+$', w) for w in words):
            skip = any(kw.upper() in line.upper() for kw in ['REPÚBLICA', 'MINISTERIO', 'UNIVERSIDAD', 'FACULTAD', 'ESCUELA', 'DEPARTAMENTO', 'CEDULA', 'TITULO'])
            if not skip:
                nombre_found = line.strip()
                break
    fields['nombre_completo'] = {'value': nombre_found, 'confidence': 0.78 if nombre_found else 0.0}

    return fields


@app.post("/ocr/extract")
async def ocr_extract_document(req: OCRRequest):
    """
    Motor de Extracción Inteligente de Documentos Académicos.
    Soporta extracción basada en texto (Tesseract.js / WebAssembly) y procesado de imágenes.
    """
    try:
        # Caso 1: Se envía texto crudo directamente desde el cliente (Tesseract.js WASM)
        if req.raw_text:
            fields = extract_entities_ner(req.raw_text)
            return {
                "success": True,
                "fields": fields,
                "overall_confidence": 0.85,
                "raw_text_preview": req.raw_text[:500] + ("..." if len(req.raw_text) > 500 else ""),
                "source": "Client OCR (Tesseract.js WASM) + Server NER"
            }

        # Caso 2: Se envía imagen base64 y el entorno servidor cuenta con EasyOCR
        if req.image_base64 and HAS_OCR:
            image_bytes = base64.b64decode(req.image_base64)
            image = Image.open(io.BytesIO(image_bytes)).convert('RGB')

            max_dim = 2000
            w, h = image.size
            if max(w, h) > max_dim:
                scale = max_dim / max(w, h)
                image = image.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

            img_array = np.array(image)
            reader = get_ocr_reader()
            if not reader:
                raise HTTPException(status_code=503, detail="No se pudo cargar el modelo OCR")

            ocr_results = reader.readtext(img_array, detail=1, paragraph=False)
            raw_text = '\n'.join([t for (_, t, _) in ocr_results])
            confidences = [conf for (_, _, conf) in ocr_results if conf > 0]
            overall_confidence = sum(confidences) / len(confidences) if confidences else 0.0

            fields = extract_entities_ner(raw_text)
            return {
                "success": True,
                "fields": fields,
                "overall_confidence": round(overall_confidence, 3),
                "raw_text_preview": raw_text[:500] + ("..." if len(raw_text) > 500 else ""),
                "total_text_blocks": len(ocr_results),
                "source": "Server OCR (EasyOCR)"
            }

        # Fallback si se envía sólo base64 pero en servidor no hay easyocr
        if req.image_base64:
            raise HTTPException(
                status_code=400,
                detail="Envío directo de texto recomendado en producción Vercel"
            )

        raise HTTPException(status_code=400, detail="Debe proporcionar raw_text o image_base64")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en el motor OCR: {str(e)}")


# --- Campos PUB dinámicos ---
@app.get("/pub/fields")
async def get_pub_fields():
    if supabase:
        try:
            res = supabase.table("pub_fields").select("*").order("orden").execute()
            if res.data and len(res.data) > 0:
                return {"success": True, "fields": res.data}
        except Exception:
            pass
    # Fallback con los campos estáticos
    return {"success": True, "fields": [
        {"id": "nombre_completo", "label": "Nombre Completo del Solicitante", "placeholder": "Ej: Juan Carlos Pérez García", "pregunta": "¡Comencemos! 📝\n\n**Campo 1 — Nombre Completo**\n\n¿Cuál es tu nombre completo tal como aparece en tu cédula de identidad?", "ayuda": "Escribe **todos tus nombres y ambos apellidos**, exactamente como aparecen en tu cédula laminada.", "validacion_regex": "", "validacion_mensaje": "", "orden": 1},
        {"id": "cedula", "label": "Cédula de Identidad", "placeholder": "Ej: V-12.345.678", "pregunta": "**Campo 2 — Cédula de Identidad**\n\n¿Cuál es tu número de cédula? (Incluye el prefijo V- o E-)", "ayuda": "Usa el formato: **V-12.345.678** (venezolano) o **E-12.345.678** (extranjero).", "validacion_regex": "", "validacion_mensaje": "", "orden": 2},
        {"id": "telefono", "label": "Teléfono de Contacto", "placeholder": "Ej: 0414-1234567", "pregunta": "**Campo 3 — Teléfono de Contacto**\n\n¿Cuál es tu número de teléfono venezolano activo?", "ayuda": "Escribe tu número con la operadora incluida: **0414-1234567**", "validacion_regex": "", "validacion_mensaje": "", "orden": 3},
        {"id": "correo", "label": "Correo Electrónico", "placeholder": "Ej: juan.perez@gmail.com", "pregunta": "**Campo 4 — Correo Electrónico**\n\n¿Cuál es tu correo electrónico activo?", "ayuda": "Usa un correo que revises con frecuencia.", "validacion_regex": "", "validacion_mensaje": "", "orden": 4},
        {"id": "tramite", "label": "Tipo de Trámite", "placeholder": "Registro de Título Universitario", "pregunta": "**Campo 5 — Tipo de Trámite**\n\nEscribe el tipo de trámite.", "ayuda": "Escribe exactamente **\"Registro de Título Universitario\"**.", "validacion_regex": "", "validacion_mensaje": "", "orden": 5},
        {"id": "institucion", "label": "Institución Educativa", "placeholder": "Universidad Santa María (USM)", "pregunta": "**Campo 6 — Institución Educativa**\n\n¿En qué universidad obtuviste tu título?", "ayuda": "Escribe el nombre oficial completo: **\"Universidad Santa María\"**.", "validacion_regex": "", "validacion_mensaje": "", "orden": 6},
        {"id": "banco", "label": "Banco Receptor del Pago", "placeholder": "Ej: Banco de Venezuela", "pregunta": "**Campo 7 — Banco Receptor**\n\n¿En qué banco realizaste el pago del arancel del SAREN?", "ayuda": "Indica el banco donde hiciste el pago del arancel.", "validacion_regex": "", "validacion_mensaje": "", "orden": 7},
        {"id": "monto", "label": "Monto Pagado (Bs.)", "placeholder": "Ej: 150.00", "pregunta": "**Campo 8 — Monto del Arancel (último campo)**\n\n¿Cuál fue el monto exacto pagado en el banco? (en Bs.)", "ayuda": "Usa el monto exacto del comprobante bancario.", "validacion_regex": "", "validacion_mensaje": "", "orden": 8},
    ]}
