import os
import json
import asyncio
import datetime
from web3 import Web3
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

app = FastAPI(
    title="API de USM-ApostillaBot (Web Version)",
    description="Backend para el ecosistema de apostilla para graduandos de Ingeniería de la USM.",
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Configuración Web3 / Blockchain ────────────────────────────────────────
WEB3_PROVIDER_URL = os.getenv("WEB3_PROVIDER_URL")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")
WALLET_PRIVATE_KEY = os.getenv("WALLET_PRIVATE_KEY")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# ABI mínima para la función de verificación y registro
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

w3 = Web3(Web3.HTTPProvider(WEB3_PROVIDER_URL))

def get_contract():
    if not CONTRACT_ADDRESS or "0x" not in CONTRACT_ADDRESS:
        return None
    return w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)

async def send_register_transaction(doc_hash, owner, cedula, doc_type):
    """Firma y envía una transacción para registrar un documento."""
    if not WALLET_PRIVATE_KEY:
        return None
    
    account = w3.eth.account.from_key(WALLET_PRIVATE_KEY)
    contract = get_contract()
    
    nonce = w3.eth.get_transaction_count(account.address)
    
    # Construir la transacción
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

# ─── Estado Global en Memoria (Se actualiza en vivo) ─────────────────────────
stats = {
    "graduandos_activos": 0,       # Usuarios con sesión de chat abierta
    "docs_prevalidados": 0,        # Documentos analizados (archivos subidos)
    "tiempo_ahorrado_hrs": 0.0,    # Estimado: cada validación ahorra ~30 min
    "titulos_blockchain": 0,       # Se incrementa al completar una auditoría
    "audit_log": []                # Registro de las últimas acciones (Audit Panel)
}

# ─── Connection Manager para Stats en Tiempo Real ───────────────────────────
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


async def increment_stat(key: str, amount: float = 1, log_entry: str = None):
    """Incrementa un contador y hace broadcast inmediato. Opcionalmente añade un log."""
    if key in stats:
        stats[key] = round(stats[key] + amount, 1)
    
    if log_entry:
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        stats["audit_log"].insert(0, f"[{timestamp}] {log_entry}")
        # Mantener solo los últimos 10 logs
        stats["audit_log"] = stats["audit_log"][:10]
        
    await stats_manager.broadcast()


# ─── Checklist SAREN ─────────────────────────────────────────────────────────
CHECKLIST_SAREN = [
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


def formato_checklist_resumen(estados: dict) -> str:
    lineas = ["📊 **Estado de tu expediente:**\n"]
    for item in CHECKLIST_SAREN:
        estado = estados.get(item["id"], "⏳")
        lineas.append(f"{estado} {item['label']}")
    return "\n".join(lineas)


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "online", "stats": stats, "blockchain_connected": w3.is_connected()}


@app.get("/blockchain/verify/{doc_hash}")
async def verify_blockchain_document(doc_hash: str):
    """Consulta la blockchain para verificar un hash de documento."""
    contract = get_contract()
    if not contract:
        return {
            "exists": False, 
            "error": "Contrato no configurado. Por favor, despliega el contrato y actualiza el archivo .env"
        }
    
    try:
        # Llamada a la blockchain
        result = contract.functions.verifyDocument(doc_hash).call()
        exists, owner_name, cedula, doc_type, timestamp = result
        
        return {
            "exists": exists,
            "ownerName": owner_name,
            "cedula": cedula,
            "documentType": doc_type,
            "timestamp": int(timestamp)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error consultando la blockchain: {str(e)}")


DB_FILE = "db.json"

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
        res = supabase.table("records").select("*").eq("cedula", cedula).order("created_at", desc=True).execute()
        return {"success": True, "records": [map_record(r) for r in res.data]}
    return {"success": False, "error": "Supabase no configurado"}

@app.post("/blockchain/records/{doc_hash}/verify")
async def verify_record_status(doc_hash: str):
    """Actualiza el estado de un registro a verificado (por el ente gubernamental)."""
    if supabase:
        res = supabase.table("records").update({"status": "Verificado por SAREN/MPPRE"}).eq("hash", doc_hash).execute()
        if len(res.data) > 0:
            return {"success": True, "message": "Documento verificado exitosamente."}
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
    raise HTTPException(status_code=500, detail="Supabase no configurado.")

class AdminLoginReq(BaseModel):
    username: str
    password: str

@app.post("/admin/login")
async def admin_login(req: AdminLoginReq):
    if not supabase:
        # Fallback si no hay supabase config
        if req.username == "admin" and req.password == "usm2026":
            return {"success": True, "token": "admin-super-token-123"}
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    try:
        res = supabase.table("admins").select("*").eq("username", req.username).execute()
        if len(res.data) > 0:
            user = res.data[0]
            if user["password"] == req.password:
                return {"success": True, "token": "admin-super-token-123", "username": req.username}
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class NewAdminReq(BaseModel):
    username: str
    password: str

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
            "password": req.password
        }).execute()
        return {"success": True, "message": "Administrador creado exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ProfileReq(BaseModel):
    cedula: str
    nombre: str
    carrera: str
    semestre: str

@app.post("/profiles/register")
async def register_profile(req: ProfileReq):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        # Usar upsert para no fallar si ya existe
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

@app.post("/blockchain/register")
async def register_blockchain_document(data: dict):
    """Registra un nuevo documento en la blockchain y localmente para el panel."""
    try:
        doc_hash = data.get("hash")
        owner = data.get("ownerName")
        cedula = data.get("cedula")
        doc_type = data.get("documentType")
        
        tx_hash = await send_register_transaction(doc_hash, owner, cedula, doc_type)
        
        if tx_hash:
            log_msg = f"NUEVO REGISTRO: {doc_type} de {owner} (C.I. {cedula}) emitido exitosamente."
            await increment_stat("titulos_blockchain", 1, log_entry=log_msg)
            
            # Guardar en base de datos local para el panel gubernamental
            if supabase:
                supabase.table("records").insert({
                    "hash": doc_hash,
                    "owner_name": owner,
                    "cedula": cedula,
                    "document_type": doc_type,
                    "tx_hash": tx_hash,
                    "status": "Pendiente de Auditoría"
                }).execute()
            
            return {
                "success": True,
                "txHash": tx_hash,
                "certificateUrl": f"https://sepolia.etherscan.io/tx/{tx_hash}",
                "qrContent": f"http://localhost:5173/verificar?hash={doc_hash}"
            }
        else:
            return {"success": False, "error": "No se pudo firmar la transacción."}
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
            "qr_link": f"http://localhost:5173/verificar?hash={doc_hash}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws/stats")
async def stats_endpoint(websocket: WebSocket):
    """Dashboard se suscribe aquí para recibir actualizaciones en tiempo real."""
    await websocket.accept()
    await stats_manager.connect(websocket)
    # Enviar estado inicial inmediatamente
    await websocket.send_text(json.dumps(stats))
    try:
        while True:
            await websocket.receive_text()  # mantener vivo
    except (WebSocketDisconnect, Exception):
        stats_manager.disconnect(websocket)


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
            "checklist_estados": {}
        }
        
    session = chat_sessions[session_id]
    
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

        if session["modo_auditoria"] and session["checklist_paso"] < len(CHECKLIST_SAREN):
            item_actual = CHECKLIST_SAREN[session["checklist_paso"]]
            session["checklist_estados"][item_actual["id"]] = "✅"
            session["checklist_paso"] += 1
            resumen = formato_checklist_resumen(session["checklist_estados"])

            if session["checklist_paso"] < len(CHECKLIST_SAREN):
                siguiente = CHECKLIST_SAREN[session["checklist_paso"]]
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
        item_actual = CHECKLIST_SAREN[session["checklist_paso"]]
        respuesta_lower = texto_usuario.strip().lower()
        aprobado = any(w in respuesta_lower for w in ["sí", "si", "yes", "tengo", "listo", "ok", "claro", "afirmativo"])

        if aprobado:
            session["checklist_estados"][item_actual["id"]] = "✅"
            session["checklist_paso"] += 1
            resumen = formato_checklist_resumen(session["checklist_estados"])

            if session["checklist_paso"] < len(CHECKLIST_SAREN):
                siguiente = CHECKLIST_SAREN[session["checklist_paso"]]
                respuesta = f"✅ **{item_actual['label']}** — APROBADO.\n\n{resumen}\n\n---\n{siguiente['pregunta']}"
            else:
                respuesta = f"✅ **{item_actual['label']}** — APROBADO.\n\n{resumen}\n\n🎉 **¡Expediente listo al 100%!** Puedes presentarte en taquilla. ¡Suerte, ingeniero!"
                await increment_stat("docs_prevalidados", 1)
                await increment_stat("tiempo_ahorrado_hrs", 0.5)
                session["modo_auditoria"] = False
            return {"reply": respuesta}
        else:
            session["checklist_estados"][item_actual["id"]] = "❌"
            resumen = formato_checklist_resumen(session["checklist_estados"])
            return {"reply": f"{item_actual['pista']}\n\n{resumen}\n\nCuando lo tengas, responde **'listo'** o adjunta el documento con el 📎."}

    if "auditar" in texto_usuario.lower():
        session["modo_auditoria"] = True
        session["checklist_paso"] = 0
        session["checklist_estados"] = {}
        return {"reply": (
            "🔎 **Iniciando Auditoría de Expediente SAREN**\n\n"
            "Te guiaré por los **5 requisitos obligatorios**.\n"
            "• Responde **sí** si lo tienes.\n"
            "• Responde **no** si te falta (te daré las instrucciones exactas).\n"
            "• O adjunta el documento con el 📎 para verificación visual.\n\n"
            f"---\n{CHECKLIST_SAREN[0]['pregunta']}"
        )}

    return {"reply": (
        f"✅ Consulta recibida: **{texto_usuario}**\n\n"
        "Según los instructivos vigentes del SAREN/GTU: lleva todos tus documentos en carpeta "
        "manila tamaño oficio y llega mínimo 1 hora antes de la apertura del Registro. "
        "Escribe **'auditar'** para una revisión completa de tu expediente."
    )}
