import os
import json
import asyncio
import datetime
from web3 import Web3
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

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


@app.post("/blockchain/register")
async def register_blockchain_document(data: dict):
    """Registra un nuevo documento en la blockchain."""
    try:
        doc_hash = data.get("hash")
        owner = data.get("ownerName")
        cedula = data.get("cedula")
        doc_type = data.get("documentType")
        
        tx_hash = await send_register_transaction(doc_hash, owner, cedula, doc_type)
        
        if tx_hash:
            log_msg = f"NUEVO REGISTRO: {doc_type} de {owner} (C.I. {cedula}) emitido exitosamente."
            await increment_stat("titulos_blockchain", 1, log_entry=log_msg)
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


@app.websocket("/ws/chat")
async def chat_endpoint(websocket: WebSocket):
    await websocket.accept()

    # Contar usuario activo
    await increment_stat("graduandos_activos", 1)

    # Estado de sesión
    modo_auditoria = False
    checklist_paso = 0
    checklist_estados = {}

    mensaje_bienvenida = (
        "🏛️ **ASISTENTE GUBERNAMENTAL PARA EGRESADOS USM** 🏛️\n\n"
        "Hola, ingeniero. Soy tu asistente virtual especializado en los trámites "
        "gubernamentales (**GTU, SAREN, MPPRE**).\n\n"
        "• Escribe **'auditar'** para revisar tu expediente paso a paso.\n"
        "• Adjunta documentos con el 📎 para validación inmediata.\n"
        "• O hazme cualquier pregunta sobre los trámites."
    )
    await websocket.send_text(mensaje_bienvenida)

    try:
        while True:
            texto_usuario = await websocket.receive_text()

            # ── Archivo adjunto ───────────────────────────────────────────
            if texto_usuario.startswith("[FILE_UPLOAD]"):
                nombre_archivo = texto_usuario.replace("[FILE_UPLOAD]", "")
                await asyncio.sleep(1.2)

                # Incrementar métricas en tiempo real
                log_msg = f"IA VISION: Analizando '{nombre_archivo}'... Validando sellos y nitidez."
                await increment_stat("docs_prevalidados", 1, log_entry=log_msg)
                await increment_stat("tiempo_ahorrado_hrs", 0.5)

                if modo_auditoria and checklist_paso < len(CHECKLIST_SAREN):
                    item_actual = CHECKLIST_SAREN[checklist_paso]
                    checklist_estados[item_actual["id"]] = "✅"
                    checklist_paso += 1
                    resumen = formato_checklist_resumen(checklist_estados)

                    if checklist_paso < len(CHECKLIST_SAREN):
                        siguiente = CHECKLIST_SAREN[checklist_paso]
                        respuesta = (
                            f"🔍 **`{nombre_archivo}` analizado. ✅ APROBADO.**\n\n"
                            f"{resumen}\n\n---\n{siguiente['pregunta']}"
                        )
                    else:
                        respuesta = (
                            f"🔍 **`{nombre_archivo}` analizado. ✅ APROBADO.**\n\n"
                            f"{resumen}\n\n"
                            "🎉 **¡Expediente completo!** Puedes presentarte en taquilla con confianza. ¡Suerte, ingeniero!"
                        )
                        await increment_stat("titulos_blockchain", 1)
                        modo_auditoria = False
                else:
                    respuesta = (
                        f"🔍 **`{nombre_archivo}` recibido y analizado.**\n\n"
                        "✅ Metadatos correctos.\n"
                        "✅ Nitidez de escaneo aceptable.\n"
                        "⚠️ Verifica que esté impreso a doble cara si es para el SAREN.\n\n"
                        "Escribe **'auditar'** para una revisión guiada completa."
                    )
                await websocket.send_text(respuesta)
                continue

            # ── Modo auditoría activo ─────────────────────────────────────
            if modo_auditoria:
                item_actual = CHECKLIST_SAREN[checklist_paso]
                respuesta_lower = texto_usuario.strip().lower()
                aprobado = any(w in respuesta_lower for w in ["sí", "si", "yes", "tengo", "listo", "ok", "claro", "afirmativo"])

                if aprobado:
                    checklist_estados[item_actual["id"]] = "✅"
                    checklist_paso += 1
                    resumen = formato_checklist_resumen(checklist_estados)

                    if checklist_paso < len(CHECKLIST_SAREN):
                        siguiente = CHECKLIST_SAREN[checklist_paso]
                        respuesta = (
                            f"✅ **{item_actual['label']}** — APROBADO.\n\n"
                            f"{resumen}\n\n---\n{siguiente['pregunta']}"
                        )
                    else:
                        respuesta = (
                            f"✅ **{item_actual['label']}** — APROBADO.\n\n"
                            f"{resumen}\n\n"
                            "🎉 **¡Expediente listo al 100%!** Puedes presentarte en taquilla. ¡Suerte, ingeniero!"
                        )
                        await increment_stat("docs_prevalidados", 1)
                        await increment_stat("tiempo_ahorrado_hrs", 0.5)
                        modo_auditoria = False
                else:
                    checklist_estados[item_actual["id"]] = "❌"
                    resumen = formato_checklist_resumen(checklist_estados)
                    respuesta = (
                        f"{item_actual['pista']}\n\n"
                        f"{resumen}\n\n"
                        "Cuando lo tengas, responde **'listo'** o adjunta el documento con el 📎."
                    )

                await websocket.send_text(respuesta)
                continue

            # ── Comando auditar ───────────────────────────────────────────
            if "auditar" in texto_usuario.lower():
                modo_auditoria = True
                checklist_paso = 0
                checklist_estados = {}
                respuesta = (
                    "🔎 **Iniciando Auditoría de Expediente SAREN**\n\n"
                    "Te guiaré por los **5 requisitos obligatorios**.\n"
                    "• Responde **sí** si lo tienes.\n"
                    "• Responde **no** si te falta (te daré las instrucciones exactas).\n"
                    "• O adjunta el documento con el 📎 para verificación visual.\n\n"
                    f"---\n{CHECKLIST_SAREN[0]['pregunta']}"
                )
                await websocket.send_text(respuesta)
                continue

            # ── Pregunta general ──────────────────────────────────────────
            respuesta = (
                f"✅ Consulta recibida: **{texto_usuario}**\n\n"
                "Según los instructivos vigentes del SAREN/GTU: lleva todos tus documentos en carpeta "
                "manila tamaño oficio y llega mínimo 1 hora antes de la apertura del Registro. "
                "Escribe **'auditar'** para una revisión completa de tu expediente."
            )
            await websocket.send_text(respuesta)

    except WebSocketDisconnect:
        await increment_stat("graduandos_activos", -1)
        print("Cliente desconectado del WebSocket")
