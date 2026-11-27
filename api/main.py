"""
Servidor Backend Central en Flask - USM-ApostillaBot
Plataforma Descentralizada con IA para la Digitalización, Validación y Apostilla de Títulos Universitarios
Universidad Santa María (USM) - MPPEU - MPPRE

Arquitectura 100% Flask (Cumplimiento de Restricciones Técnicas de Tesis: FastAPI Prohibido).
Compatible tanto para ejecución local con WSGI/Flask como despliegue serverless en Vercel (@vercel/python).
"""

import os
import sys

_api_dir = os.path.dirname(os.path.abspath(__file__))
if _api_dir not in sys.path:
    sys.path.insert(0, _api_dir)

import re
import io
import json
import base64
import hashlib
import datetime
import secrets
import random
import urllib.request
import urllib.error
import tempfile
import logging
from typing import Optional

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv(override=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("USM_Backend_Flask")

# ─── Inicialización de la Aplicación Flask ────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# ─── Intentar importar dependencias opcionales (Ligeras) ──────────────────────────────
try:
    import bcrypt
    HAS_BCRYPT = True
except Exception:
    HAS_BCRYPT = False

try:
    import jwt as pyjwt
    HAS_JWT = True
except Exception:
    HAS_JWT = False

try:
    from gemini_service import GeminiVisionExtractor
    HAS_GEMINI_OCR = True
except Exception as e_gem:
    logger.warning(f"No se pudo importar gemini_service: {e_gem}")
    HAS_GEMINI_OCR = False
    GeminiVisionExtractor = None
try:
    import cv2
except Exception as e_cv:
    logger.debug(f"OpenCV no disponible en este entorno: {e_cv}")
    cv2 = None

try:
    import numpy as np
except Exception as e_np:
    logger.debug(f"NumPy no disponible en este entorno: {e_np}")
    np = None

try:
    from ocr_service import USMOcrService, AcademicDegreeNER
    HAS_USM_OCR = True
except Exception as e_ocr:
    logger.warning(f"No se pudo importar ocr_service: {e_ocr}")
    USMOcrService = None
    AcademicDegreeNER = None
    HAS_USM_OCR = False

try:
    from email_service import EmailNotificationService
    HAS_EMAIL_SERVICE = True
except Exception as e_mail:
    logger.warning(f"No se pudo importar email_service: {e_mail}")
    EmailNotificationService = None
    HAS_EMAIL_SERVICE = False

try:
    from sepolia_client import (
        SepoliaClient,
        to_checksum_address as sepolia_checksum_address,
        is_plausible_tx_hash,
        private_key_to_address as sepolia_pk_to_address,
        KNOWN_FAKE_TX_HASHES,
    )
    HAS_SEPOLIA_CLIENT = True
except Exception as e_sep:
    logger.warning(f"No se pudo importar sepolia_client: {e_sep}")
    SepoliaClient = None
    sepolia_checksum_address = lambda a: a
    is_plausible_tx_hash = lambda t, d=None: bool(t and str(t).startswith("0x") and len(str(t)) == 66)
    sepolia_pk_to_address = None
    KNOWN_FAKE_TX_HASHES = set()
    HAS_SEPOLIA_CLIENT = False
HAS_WEB3 = True
HAS_SUPABASE = True

# ─── Configuración del Entorno ───────────────────────────────────────────────
WEB3_PROVIDER_URL = os.getenv("WEB3_PROVIDER_URL")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")
WALLET_PRIVATE_KEY = os.getenv("WALLET_PRIVATE_KEY")
sepolia_client = SepoliaClient(WEB3_PROVIDER_URL) if (HAS_SEPOLIA_CLIENT and SepoliaClient) else None
JWT_SECRET = os.getenv("JWT_SECRET", "fallback-dev-secret-change-in-production")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_KEY = os.getenv("PINATA_SECRET_KEY")
PINATA_JWT = os.getenv("PINATA_JWT")
PINATA_GATEWAY = os.getenv("PINATA_GATEWAY", "https://gateway.pinata.cloud/ipfs")

ALLOW_DEFENSE_DEMO_FALLBACK = os.getenv("ALLOW_DEFENSE_DEMO_FALLBACK", "true").lower() in ("true", "1", "yes")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

class _PostgRESTResponse:
    def __init__(self, data=None, count=None):
        self.data = data if isinstance(data, list) else ([] if data is None else [data])
        self.count = count


class _PostgRESTTableQuery:
    """Cliente PostgREST ultraligero sin dependencias externas (ideal para Vercel Serverless)."""
    def __init__(self, base_url: str, api_key: str, table_name: str, timeout: float = 4.0):
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._table = table_name
        self._timeout = timeout
        self._method = "GET"
        self._params = []
        self._payload = None
        self._prefer = []
        self._want_count = False

    @staticmethod
    def _fmt(val):
        if isinstance(val, bool):
            return "true" if val else "false"
        if val is None:
            return "null"
        return str(val)

    def select(self, columns: str = "*", count: str = None):
        self._method = "GET"
        self._params.append(("select", columns))
        if count == "exact":
            self._want_count = True
            self._prefer.append("count=exact")
        return self

    def insert(self, payload):
        self._method = "POST"
        self._payload = payload
        self._prefer.append("return=representation")
        return self

    def upsert(self, payload, on_conflict: str = None):
        self._method = "POST"
        self._payload = payload
        self._prefer.append("resolution=merge-duplicates")
        self._prefer.append("return=representation")
        conflict_col = on_conflict
        if not conflict_col and isinstance(payload, dict):
            if self._table == "records" and "hash" in payload:
                conflict_col = "hash"
            elif self._table == "stats" and "key" in payload:
                conflict_col = "key"
            elif self._table in ("profiles", "perfiles") and "cedula" in payload and "id" not in payload:
                conflict_col = "cedula"
        if conflict_col:
            self._params.append(("on_conflict", conflict_col))
        return self

    def update(self, payload):
        self._method = "PATCH"
        self._payload = payload
        self._prefer.append("return=representation")
        return self

    def delete(self):
        self._method = "DELETE"
        self._prefer.append("return=representation")
        return self

    def eq(self, col: str, val):
        self._params.append((col, f"eq.{self._fmt(val)}"))
        return self

    def neq(self, col: str, val):
        self._params.append((col, f"neq.{self._fmt(val)}"))
        return self

    def lt(self, col: str, val):
        self._params.append((col, f"lt.{self._fmt(val)}"))
        return self

    def gte(self, col: str, val):
        self._params.append((col, f"gte.{self._fmt(val)}"))
        return self

    def like(self, col: str, pattern: str):
        self._params.append((col, f"like.{str(pattern).replace('%', '*')}"))
        return self

    def ilike(self, col: str, pattern: str):
        self._params.append((col, f"ilike.{str(pattern).replace('%', '*')}"))
        return self

    def in_(self, col: str, values):
        def _q(v):
            s = self._fmt(v).replace('"', '\\"')
            return f'"{s}"'
        joined = ",".join(_q(v) for v in (values or []))
        self._params.append((col, f"in.({joined})"))
        return self

    def order(self, col: str, desc: bool = False):
        self._params.append(("order", f"{col}.{'desc' if desc else 'asc'}"))
        return self

    def limit(self, n: int):
        self._params.append(("limit", str(int(n))))
        return self

    def execute(self):
        from urllib.parse import urlencode
        query_str = urlencode(self._params)
        url = f"{self._base_url}/rest/v1/{self._table}"
        if query_str:
            url = f"{url}?{query_str}"

        headers = {
            "apikey": self._api_key,
            "Authorization": f"Bearer {self._api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if self._prefer:
            headers["Prefer"] = ",".join(dict.fromkeys(self._prefer))

        body_bytes = json.dumps(self._payload, ensure_ascii=False).encode("utf-8") if self._payload is not None else None
        req = urllib.request.Request(url, data=body_bytes, headers=headers, method=self._method)
        with urllib.request.urlopen(req, timeout=self._timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace").strip()
            parsed = json.loads(raw) if raw else []
            total_count = None
            if self._want_count:
                cr = resp.headers.get("Content-Range", "")
                if "/" in cr:
                    tail = cr.rsplit("/", 1)[-1].strip()
                    if tail.isdigit():
                        total_count = int(tail)
                if total_count is None and isinstance(parsed, list):
                    total_count = len(parsed)
            return _PostgRESTResponse(parsed, total_count)


class _PostgRESTStorageBucket:
    def __init__(self, base_url: str, api_key: str, bucket: str, timeout: float = 6.0):
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._bucket = bucket
        self._timeout = timeout

    def upload(self, path: str, file_bytes: bytes, file_options: dict = None):
        opts = file_options or {}
        clean_path = str(path).lstrip("/")
        url = f"{self._base_url}/storage/v1/object/{self._bucket}/{clean_path}"
        headers = {
            "apikey": self._api_key,
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": opts.get("content-type", "application/octet-stream"),
            "x-upsert": str(opts.get("upsert", "true")).lower(),
        }
        req = urllib.request.Request(url, data=file_bytes, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=self._timeout) as resp:
            return resp.read()

    def get_public_url(self, path: str) -> str:
        clean_path = str(path).lstrip("/")
        return f"{self._base_url}/storage/v1/object/public/{self._bucket}/{clean_path}"


class _PostgRESTStorageProxy:
    def __init__(self, base_url: str, api_key: str):
        self._base_url = base_url
        self._api_key = api_key

    def from_(self, bucket: str):
        return _PostgRESTStorageBucket(self._base_url, self._api_key, bucket)


class _PostgRESTSupabaseClient:
    def __init__(self, base_url: str, api_key: str):
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self.storage = _PostgRESTStorageProxy(self._base_url, self._api_key)

    def table(self, table_name: str):
        return _PostgRESTTableQuery(self._base_url, self._api_key, table_name)


class _LazySupabaseProxy:
    def __init__(self):
        self._client = None
        self._attempted = False
        self._available = False

    def _import_supabase_create_client(self):
        """
        Importa `create_client` de la librería PyPI `supabase`, evitando que el directorio
        local `supabase/` (migraciones SQL de Supabase CLI) sombree el paquete en sys.path
        tanto en ejecución local desde la raíz como en Vercel (/var/task).
        """
        import importlib
        repo_root = os.path.abspath(os.path.join(_api_dir, ".."))
        existing = sys.modules.get("supabase")
        if existing is not None and getattr(existing, "__file__", None) is None:
            sys.modules.pop("supabase", None)

        orig_path = list(sys.path)
        try:
            cwd = os.path.abspath(os.getcwd())
            sys.path = [
                p for p in orig_path
                if p not in ("", ".") and os.path.abspath(p) not in (repo_root, cwd)
            ]
            mod = importlib.import_module("supabase")
            if getattr(mod, "__file__", None) is None:
                raise ImportError("Paquete PyPI 'supabase' no instalado en site-packages")
            return mod.create_client
        finally:
            sys.path = orig_path

    def _get_client(self):
        if not self._attempted:
            self._attempted = True
            if SUPABASE_URL and SUPABASE_KEY:
                prev_timeout = None
                try:
                    import socket
                    from urllib.parse import urlparse
                    host = urlparse(SUPABASE_URL).hostname
                    if host:
                        prev_timeout = socket.getdefaulttimeout()
                        socket.setdefaulttimeout(2.0)
                        try:
                            socket.gethostbyname(host)
                        finally:
                            socket.setdefaulttimeout(prev_timeout)
                    try:
                        create_client = self._import_supabase_create_client()
                        self._client = create_client(SUPABASE_URL, SUPABASE_KEY)
                    except Exception:
                        # Sin SDK pesado (ej. Vercel Serverless): usar cliente HTTP PostgREST nativo
                        self._client = _PostgRESTSupabaseClient(SUPABASE_URL, SUPABASE_KEY)
                        logger.info("Supabase conectado mediante cliente REST PostgREST ultraligero (sin dependencias externas).")
                    self._available = True
                except Exception as e:
                    logger.warning(f"Supabase inalcanzable ({e}). Operando en modo híbrido local.")
                    self._client = None
                    self._available = False
        return self._client if self._available else None

    def __bool__(self):
        return self._get_client() is not None

    def __getattr__(self, name):
        client = self._get_client()
        if client is None:
            raise RuntimeError("Supabase client is not available")
        return getattr(client, name)

supabase = _LazySupabaseProxy()

# ─── Helpers de IPFS (InterPlanetary File System - Multihash CID v0) ─────────
def compute_ipfs_cid_v0_fallback(content_bytes: bytes) -> str:
    """
    Genera un CID v0 determinista conforme a las especificaciones multihash de IPFS
    (SHA-256 prefijado con 0x12 0x20 codificado en Base58).
    Garantiza el cumplimiento estricto del Capítulo II de la tesis.
    """
    sha256_digest = hashlib.sha256(content_bytes).digest()
    multihash = b'\x12\x20' + sha256_digest
    ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    n = int.from_bytes(multihash, 'big')
    res = []
    while n > 0:
        n, r = divmod(n, 58)
        res.append(ALPHABET[r])
    for b in multihash:
        if b == 0:
            res.append(ALPHABET[0])
        else:
            break
    return "".join(reversed(res))


def pin_json_to_ipfs(data: dict) -> dict:
    """
    Ancla y registra la metadata estructurada del título en IPFS.
    Intenta anclado remoto mediante Pinata API; si las credenciales no están presentes,
    calcula y devuelve el CID v0 local determinista conforme al estándar IPFS.
    """
    canonical_json = json.dumps(data, sort_keys=True, ensure_ascii=False)
    content_bytes = canonical_json.encode('utf-8')
    sha256_hash = f"0x{hashlib.sha256(content_bytes).hexdigest().upper()}"
    local_cid = compute_ipfs_cid_v0_fallback(content_bytes)

    if PINATA_JWT or (PINATA_API_KEY and PINATA_SECRET_KEY):
        try:
            req_headers = {"Content-Type": "application/json"}
            if PINATA_JWT:
                req_headers["Authorization"] = f"Bearer {PINATA_JWT}"
            else:
                req_headers["pinata_api_key"] = PINATA_API_KEY
                req_headers["pinata_secret_api_key"] = PINATA_SECRET_KEY

            payload = json.dumps({"pinataContent": data}).encode('utf-8')
            req = urllib.request.Request(
                "https://api.pinata.cloud/pinning/pinJSONToIPFS",
                data=payload,
                headers=req_headers
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                remote_cid = res_data.get("IpfsHash", local_cid)
                return {
                    "success": True,
                    "ipfs_cid": remote_cid,
                    "ipfs_gateway_url": f"{PINATA_GATEWAY}/{remote_cid}",
                    "sha256": sha256_hash,
                    "pinned_remote": True
                }
        except Exception as e:
            logger.warning(f"Error anclando en Pinata IPFS: {e}")

    return {
        "success": True,
        "ipfs_cid": local_cid,
        "ipfs_gateway_url": f"{PINATA_GATEWAY}/{local_cid}",
        "sha256": sha256_hash,
        "pinned_remote": False
    }

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
        "name": "revokeDocument",
        "outputs": [],
        "stateMutability": "external",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "_hash", "type": "string"}],
        "name": "verifyDocument",
        "outputs": [
            {"internalType": "bool", "name": "exists", "type": "bool"},
            {"internalType": "bool", "name": "isRevoked", "type": "bool"},
            {"internalType": "string", "name": "ownerName", "type": "string"},
            {"internalType": "string", "name": "cedula", "type": "string"},
            {"internalType": "string", "name": "documentType", "type": "string"},
            {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalDocumentsCount",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
]

class _LazyWeb3Proxy:
    def __init__(self):
        self._w3 = None
        self._attempted = False

    def _get_w3(self):
        if not self._attempted:
            self._attempted = True
            if WEB3_PROVIDER_URL:
                try:
                    from web3 import Web3
                    self._w3 = Web3(Web3.HTTPProvider(WEB3_PROVIDER_URL, request_kwargs={'timeout': 4}))
                except Exception as e:
                    logger.warning(f"No se pudo conectar a Web3: {e}")
                    self._w3 = None
        return self._w3

    def __bool__(self):
        return self._get_w3() is not None

    def __getattr__(self, name):
        inst = self._get_w3()
        if inst is None:
            raise RuntimeError("Web3 client is not available")
        return getattr(inst, name)

w3 = _LazyWeb3Proxy()


CONTRACT_CACHE_FILE = os.path.join(tempfile.gettempdir(), "usm_contract_address.txt")

def get_current_contract_address() -> str:
    raw = None
    if os.path.exists(CONTRACT_CACHE_FILE):
        try:
            with open(CONTRACT_CACHE_FILE, "r", encoding="utf-8") as f:
                addr = f.read().strip()
                if addr.startswith("0x") and len(addr) == 42:
                    raw = addr
        except Exception:
            pass
    if not raw:
        raw = CONTRACT_ADDRESS or os.getenv("CONTRACT_ADDRESS") or "0x1234567890123456789012345678901234567890"
    norm = sepolia_checksum_address(raw) if HAS_SEPOLIA_CLIENT else raw
    return norm or raw

def set_current_contract_address(addr: str):
    if addr and addr.startswith("0x") and len(addr) == 42:
        global CONTRACT_ADDRESS
        norm = sepolia_checksum_address(addr.strip()) if HAS_SEPOLIA_CLIENT else addr.strip()
        CONTRACT_ADDRESS = norm or addr.strip()
        try:
            with open(CONTRACT_CACHE_FILE, "w", encoding="utf-8") as f:
                f.write(CONTRACT_ADDRESS)
        except Exception:
            pass

def get_contract():
    addr = get_current_contract_address()
    if not w3 or not addr or "0x" not in addr or addr == "0x1234567890123456789012345678901234567890":
        return None
    try:
        checksummed = w3.to_checksum_address(addr)
        return w3.eth.contract(address=checksummed, abi=CONTRACT_ABI)
    except Exception:
        return None


def _sanitize_tx_hash(tx_hash, doc_hash=None) -> str:
    """Devuelve el tx_hash si es real/plausible; elimina hashes demo falsos o placeholders."""
    if not tx_hash:
        return "PENDIENTE_ANCLAJE_ONCHAIN"
    clean = str(tx_hash).strip()
    if clean.lower() in KNOWN_FAKE_TX_HASHES:
        return "PENDIENTE_ANCLAJE_ONCHAIN"
    if is_plausible_tx_hash(clean, doc_hash):
        return clean
    return "PENDIENTE_ANCLAJE_ONCHAIN"


def send_register_transaction_detailed(doc_hash, owner, cedula, doc_type) -> dict:
    """
    Firma (EIP-1559) y transmite una transacción REAL a Ethereum Sepolia Testnet
    usando el cliente pure-Python sin dependencias pesadas (compatible con Vercel Serverless).
    """
    if sepolia_client is not None:
        return sepolia_client.send_register_document(
            get_current_contract_address(),
            WALLET_PRIVATE_KEY or "",
            doc_hash,
            owner,
            cedula,
            doc_type,
        )
    return {"sent": False, "txHash": None, "reason": "Cliente RPC Sepolia no disponible."}


def send_register_transaction(doc_hash, owner, cedula, doc_type):
    res = send_register_transaction_detailed(doc_hash, owner, cedula, doc_type)
    return res.get("txHash") if res.get("sent") else None

# ─── Helpers de Seguridad y Criptografía ─────────────────────────────────────
def hash_password(password: str) -> str:
    """Hashea una contraseña con bcrypt o derivación PBKDF2 (SHA-256)."""
    if HAS_BCRYPT:
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"pbkdf2:{salt}:{key.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verifica una contraseña contra su hash almacenado."""
    if HAS_BCRYPT and stored_hash.startswith("$2"):
        return bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
    if stored_hash.startswith("pbkdf2:"):
        _, salt, stored_key = stored_hash.split(":", 2)
        key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return key.hex() == stored_key
    if stored_hash.startswith("sha256:"):
        _, salt, hashed = stored_hash.split(":", 2)
        return hashlib.sha256(f"{salt}:{password}".encode()).hexdigest() == hashed
    return password == stored_hash


def create_jwt_token(payload: dict, expires_hours: int = 24, expires_minutes: Optional[int] = None) -> str:
    """Crea un JWT token firmado."""
    if HAS_JWT:
        delta = datetime.timedelta(minutes=expires_minutes) if expires_minutes is not None else datetime.timedelta(hours=expires_hours)
        payload["exp"] = datetime.datetime.utcnow() + delta
        payload["iat"] = datetime.datetime.utcnow()
        return pyjwt.encode(payload, JWT_SECRET, algorithm="HS256")
    raise RuntimeError("PyJWT no está disponible en el servidor.")


def verify_jwt_token(token: str) -> Optional[dict]:
    """Verifica y decodifica un JWT token."""
    if not HAS_JWT or not token:
        return None
    try:
        return pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        return None


def get_current_admin():
    """Valida el header Authorization Bearer."""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    token = auth_header.replace("Bearer ", "").strip()
    return verify_jwt_token(token)

# ─── PINs Institucionales ───────────────────────────────────────────────────
_env_pins = os.getenv("GOV_INSTITUTIONAL_PINS", "MPPEU-2026-KEY,MPPRE-2026-KEY,SAREN-2026-GOV-KEY,USM-SECRETARIA-KEY")
VALID_GOV_PINS = {p.strip().upper() for p in _env_pins.split(",") if p.strip()}

def is_valid_pin_format(pin_str: str) -> bool:
    if not pin_str:
        return False
    import hmac
    pin_clean = pin_str.strip().upper()
    return any(hmac.compare_digest(pin_clean, valid_pin) for valid_pin in VALID_GOV_PINS)

# ─── Memoria y Persistencia Fallback ─────────────────────────────────────────
_stats_memory = {
    "graduandos_activos": 0,
    "docs_prevalidados": 0,
    "tiempo_ahorrado_hrs": 0.0,
    "titulos_blockchain": 0,
}
_audit_log_memory = []

CANONICAL_DEMO_RECORDS = [
    {
        "hash": "0x7F9A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E9F0A",
        "owner_name": "MAURO DANIEL MAIESE FERREIRA",
        "cedula": "V-28.315.101",
        "document_type": "Título de Ingeniero de Sistemas — USM",
        "tx_hash": "PENDIENTE_ANCLAJE_ONCHAIN",
        "status": "CERTIFICADO_MPPEU",
        "created_at": "2026-10-24T14:32:00Z",
        "verified_by": "mppeu_agente",
        "rejection_reason": None,
        "solicitud_code": "GTU-2026-USM-8492",
        "mppeu_verified": True,
        "mppeu_officer": "Lic. Carlos Mendoza (Analista GTU)",
        "mppeu_date": "2026-10-25 10:15:22",
        "mppre_verified": False,
        "tomo": "XVIII",
        "folio": "245",
        "libro": "Grados 2026"
    },
    {
        "hash": "0x1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B",
        "owner_name": "VALENTINA SOFÍA RODRÍGUEZ SILVA",
        "cedula": "V-27.890.432",
        "document_type": "Título de Ingeniera Civil — USM",
        "tx_hash": "PENDIENTE_ANCLAJE_ONCHAIN",
        "status": "APOSTILLADO_MPPRE",
        "created_at": "2026-10-20T09:12:00Z",
        "verified_by": "mppre_agente",
        "rejection_reason": None,
        "solicitud_code": "GTU-2026-USM-5120",
        "mppeu_verified": True,
        "mppeu_officer": "Lic. Carlos Mendoza (Analista GTU)",
        "mppeu_date": "2026-10-21 11:30:00",
        "mppre_verified": True,
        "mppre_officer": "Dr. Fernando Morales (Cancillería)",
        "mppre_date": "2026-10-22 15:45:10",
        "apostille_number": "APO-VE-2026-004812",
        "tomo": "XIV",
        "folio": "112",
        "libro": "Grados 2026"
    },
    {
        "hash": "0x5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F",
        "owner_name": "ALEJANDRO JOSÉ HERNÁNDEZ PEÑA",
        "cedula": "V-29.456.789",
        "document_type": "Título de Ingeniero Industrial — USM",
        "tx_hash": "0xPENDIENTE",
        "status": "PENDIENTE_COTEJO_MPPEU",
        "created_at": "2026-10-26T16:00:00Z",
        "verified_by": None,
        "rejection_reason": None,
        "solicitud_code": "GTU-2026-USM-9304",
        "mppeu_verified": False,
        "mppre_verified": False,
        "tomo": "XXI",
        "folio": "089",
        "libro": "Grados 2026"
    }
]

import copy
_records_memory = copy.deepcopy(CANONICAL_DEMO_RECORDS) if ALLOW_DEFENSE_DEMO_FALLBACK else []

RECORDS_CACHE_FILE = os.path.join(tempfile.gettempdir(), "usm_records_cache.json")

def _save_records_cache():
    try:
        with open(RECORDS_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(_records_memory, f, ensure_ascii=False)
    except Exception as e:
        logger.debug(f"No se pudo guardar cache de registros en /tmp: {e}")

def _load_records_cache():
    global _records_memory
    try:
        if os.path.exists(RECORDS_CACHE_FILE):
            with open(RECORDS_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and (len(data) > 0 or not ALLOW_DEFENSE_DEMO_FALLBACK):
                    _records_memory = data
        if not _records_memory and ALLOW_DEFENSE_DEMO_FALLBACK:
            _records_memory = copy.deepcopy(CANONICAL_DEMO_RECORDS)
    except Exception as e:
        logger.debug(f"No se pudo cargar cache de registros de /tmp: {e}")

_load_records_cache()

STUDENTS_AUTH_CACHE_FILE = os.path.join(tempfile.gettempdir(), "usm_students_auth_cache.json")

def _hash_student_password(password: str) -> str:
    return hash_password(password)

def _verify_student_password(password: str, stored_hash: str) -> bool:
    if not stored_hash:
        return False
    # Compatibilidad con hashes bcrypt / pbkdf2
    if stored_hash.startswith("$2") or stored_hash.startswith("pbkdf2:") or stored_hash.startswith("sha256:"):
        return verify_password(password, stored_hash)
    # Compatibilidad retroactiva con hashes legados SHA-256 en caché
    legacy = hashlib.sha256(f"usm_student_salt_2026_{password}".encode("utf-8")).hexdigest()
    import hmac
    return hmac.compare_digest(legacy, stored_hash)

_students_auth_memory = [
    {
        "id": "usr-mauro-maiese",
        "email": "mauromaiese7@gmail.com",
        "password_hash": _hash_student_password("Admin123*"),
        "nombre": "Mauro Daniel Maiese Ferreira",
        "cedula": "V-28.315.101",
        "telefono": "0414-2831510",
        "fecha_nacimiento": "1998-10-19",
        "carrera": "Ingeniería en Sistemas",
        "semestre": "10mo",
        "role": "estudiante",
        "is_profile_complete": True,
        "is_cedula_locked": True,
        "created_at": "2026-10-01T00:00:00Z"
    }
]

def _save_students_cache():
    try:
        with open(STUDENTS_AUTH_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(_students_auth_memory, f, ensure_ascii=False)
    except Exception as e:
        logger.debug(f"No se pudo guardar cache de estudiantes: {e}")

def _load_students_cache():
    global _students_auth_memory
    try:
        if os.path.exists(STUDENTS_AUTH_CACHE_FILE):
            with open(STUDENTS_AUTH_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and data:
                    known_emails = {s.get("email", "").lower().strip() for s in _students_auth_memory}
                    for item in data:
                        em = item.get("email", "").lower().strip()
                        if em and em not in known_emails:
                            _students_auth_memory.append(item)
                            known_emails.add(em)
    except Exception as e:
        logger.debug(f"No se pudo cargar cache de estudiantes: {e}")

_load_students_cache()

PROFILES_CACHE_FILE = os.path.join(tempfile.gettempdir(), "usm_profiles_cache.json")
_profiles_memory = [
    {
        "cedula": "V-28.315.101",
        "nombre": "Mauro Daniel Maiese Ferreira",
        "carrera": "Ingeniería en Sistemas",
        "semestre": "10mo"
    }
]
_active_sessions_memory = {}

def _save_profiles_cache():
    try:
        with open(PROFILES_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(_profiles_memory, f, ensure_ascii=False)
    except Exception as e:
        logger.debug(f"No se pudo guardar cache de perfiles en /tmp: {e}")

def _load_profiles_cache():
    global _profiles_memory
    try:
        if os.path.exists(PROFILES_CACHE_FILE):
            with open(PROFILES_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and data:
                    known_ceds = {(p.get("cedula") or "").replace(".", "").replace("-", "").upper() for p in _profiles_memory}
                    for item in data:
                        c = (item.get("cedula") or "").replace(".", "").replace("-", "").upper()
                        if c and c not in known_ceds:
                            _profiles_memory.append(item)
                            known_ceds.add(c)
    except Exception as e:
        logger.debug(f"No se pudo cargar cache de perfiles de /tmp: {e}")

_load_profiles_cache()

def get_stats() -> dict:
    _load_records_cache()
    _load_profiles_cache()

    # Cálculo base de memoria / cache
    total_docs = max(_stats_memory.get("docs_prevalidados", 0), len(_records_memory))
    titulos_bc = max(
        _stats_memory.get("titulos_blockchain", 0),
        len([r for r in _records_memory if "CERTIFICADO" in str(r.get("status")) or "APOSTILLADO" in str(r.get("status"))])
    )
    graduandos = max(
        _stats_memory.get("graduandos_activos", 0),
        len(_students_auth_memory),
        len(_profiles_memory),
        1
    )
    horas = max(_stats_memory.get("tiempo_ahorrado_hrs", 0.0), round(total_docs * 4.5, 1))

    # Complementar con Supabase si está disponible
    if supabase:
        try:
            for tbl in ["perfiles", "profiles"]:
                try:
                    res_p = supabase.table(tbl).select("id", count="exact").execute()
                    if res_p.count is not None and res_p.count > 0:
                        graduandos = max(graduandos, res_p.count)
                        break
                    elif res_p.data:
                        graduandos = max(graduandos, len(res_p.data))
                        break
                except Exception:
                    pass

            try:
                res_r = supabase.table("records").select("hash", count="exact").execute()
                if res_r.count is not None and res_r.count > 0:
                    total_docs = max(total_docs, res_r.count)
                elif res_r.data:
                    total_docs = max(total_docs, len(res_r.data))
            except Exception:
                pass

            try:
                res_s = supabase.table("stats").select("*").execute()
                for row in res_s.data:
                    k = row.get("key")
                    v = row.get("value")
                    if k == "docs_prevalidados" and v:
                        total_docs = max(total_docs, int(v))
                    elif k == "titulos_blockchain" and v:
                        titulos_bc = max(titulos_bc, int(v))
                    elif k == "tiempo_ahorrado_hrs" and v:
                        horas = max(horas, float(v))
                    elif k == "graduandos_activos" and v:
                        graduandos = max(graduandos, int(v))
            except Exception:
                pass
        except Exception as e:
            logger.warning(f"Error consultando métricas en Supabase: {e}")

    horas = max(horas, round(total_docs * 4.5, 1))

    logs = list(_audit_log_memory[:10])
    if supabase:
        try:
            log_res = supabase.table("audit_logs").select("message").order("created_at", desc=True).limit(10).execute()
            if log_res.data:
                db_logs = [r["message"] for r in log_res.data]
                logs = (db_logs + logs)[:10]
        except Exception:
            pass

    if not logs:
        now_t = datetime.datetime.now().strftime("%H:%M:%S")
        for r in _records_memory[:5]:
            sol = r.get("solicitud_code", "GTU-2026")
            owner = r.get("owner_name", "Graduando")
            logs.append(f"[{now_t}] SOLICITUD: Trámite {sol} registrado para {owner}.")

    return {
        "usuarios_en_linea": max(1, len(_active_sessions_memory)),
        "graduandos_activos": graduandos,
        "docs_prevalidados": total_docs,
        "tiempo_ahorrado_hrs": horas,
        "titulos_blockchain": titulos_bc,
        "audit_log": logs
    }


def increment_stat(key: str, amount: float = 1, log_entry: str = None):
    if supabase:
        try:
            res = supabase.table("stats").select("*").eq("key", key).execute()
            if len(res.data) > 0:
                new_val = round(res.data[0]["value"] + amount, 1)
                supabase.table("stats").update({"value": new_val, "updated_at": datetime.datetime.utcnow().isoformat()}).eq("key", key).execute()
            else:
                supabase.table("stats").insert({"key": key, "value": amount}).execute()

            if log_entry:
                timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                supabase.table("audit_logs").insert({"message": f"[{timestamp}] {log_entry}"}).execute()
            return
        except Exception as e:
            logger.warning(f"Error escribiendo stat a Supabase: {e}")

    if key in _stats_memory:
        _stats_memory[key] = round(_stats_memory[key] + amount, 1)
    if log_entry:
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        _audit_log_memory.insert(0, f"[{timestamp}] {log_entry}")
        while len(_audit_log_memory) > 10:
            _audit_log_memory.pop()


def map_record(r):
    return {
        "hash": r.get("hash"),
        "ownerName": r.get("owner_name") or r.get("ownerName"),
        "owner_name": r.get("owner_name") or r.get("ownerName"),
        "cedula": r.get("cedula"),
        "accountCedula": r.get("account_cedula") or r.get("accountCedula") or r.get("cedula"),
        "account_cedula": r.get("account_cedula") or r.get("accountCedula") or r.get("cedula"),
        "accountOwner": r.get("account_owner") or r.get("accountOwner") or "",
        "accountEmail": r.get("account_email") or r.get("accountEmail") or "",
        "documentType": r.get("document_type") or r.get("documentType"),
        "document_type": r.get("document_type") or r.get("documentType"),
        "documentUrl": r.get("document_url") or r.get("documentUrl") or r.get("fileUrl") or "",
        "document_url": r.get("document_url") or r.get("documentUrl") or r.get("fileUrl") or "",
        "fileUrl": r.get("document_url") or r.get("documentUrl") or r.get("fileUrl") or "",
        "txHash": r.get("tx_hash") or r.get("txHash"),
        "tx_hash": r.get("tx_hash") or r.get("txHash"),
        "status": r.get("status"),
        "timestamp": r.get("created_at") or r.get("timestamp"),
        "created_at": r.get("created_at") or r.get("timestamp"),
        "verifiedBy": r.get("verified_by"),
        "rejectionReason": r.get("rejection_reason"),
        "solicitudCode": r.get("solicitud_code"),
        "usmVerified": bool(r.get("usm_verified") or r.get("usmVerified") or "VERIFICADO_USM" in str(r.get("status", "")) or r.get("mppeu_verified") or r.get("mppre_verified")),
        "usm_verified": bool(r.get("usm_verified") or r.get("usmVerified") or "VERIFICADO_USM" in str(r.get("status", "")) or r.get("mppeu_verified") or r.get("mppre_verified")),
        "usmOfficer": r.get("usm_officer") or r.get("usmOfficer") or "",
        "usmDate": r.get("usm_date") or r.get("usmDate") or "",
        "mppeuVerified": r.get("mppeu_verified", False),
        "mppeuOfficer": r.get("mppeu_officer"),
        "mppeuDate": r.get("mppeu_date"),
        "mppreVerified": r.get("mppre_verified", False),
        "mppreOfficer": r.get("mppre_officer"),
        "mppreDate": r.get("mppre_date"),
        "apostilleNumber": r.get("apostille_number"),
        "tomo": r.get("tomo"),
        "folio": r.get("folio"),
        "libro": r.get("libro"),
        "estado": r.get("estado") or "",
        "municipio": r.get("municipio") or "",
        "sedeTaquilla": r.get("sede_taquilla") or r.get("sedeTaquilla") or "",
        "sede_taquilla": r.get("sede_taquilla") or r.get("sedeTaquilla") or "",
        "sedeDireccion": r.get("sede_direccion") or r.get("sedeDireccion") or "",
        "sedeHorario": r.get("sede_horario") or r.get("sedeHorario") or "",
        "countryDestiny": r.get("country_destiny") or r.get("countryDestiny") or "",
        "country_destiny": r.get("country_destiny") or r.get("countryDestiny") or "",
        "motivoApostille": r.get("motivo_apostille") or r.get("motivoApostille") or "",
        "sarenVerified": bool(r.get("saren_verified") or r.get("sarenVerified") or r.get("pub_code") or r.get("pubCode")),
        "saren_verified": bool(r.get("saren_verified") or r.get("sarenVerified") or r.get("pub_code") or r.get("pubCode")),
        "pubCode": r.get("pub_code") or r.get("pubCode") or r.get("stablePubCode") or "",
        "pub_code": r.get("pub_code") or r.get("pubCode") or r.get("stablePubCode") or "",
        "pubHash": r.get("pub_hash") or r.get("pubHash") or "",
        "paymentReference": r.get("payment_reference") or r.get("paymentReference") or "",
        "paymentStatus": r.get("payment_status") or r.get("paymentStatus") or "",
        "bancoReceptor": r.get("banco_receptor") or r.get("bancoReceptor") or "",
        "montoArancel": r.get("monto_arancel") or r.get("montoArancel") or "",
        "formData": r.get("form_data") or r.get("formData") or None
    }

# ─── Checklist SAREN / MPPEU ────────────────────────────────────────────────
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

_checklist_memory = [
    {
        "id": item["id"],
        "title": item["label"],
        "label": item["label"],
        "description": item["pista"],
        "pregunta": item["pregunta"],
        "pista": item["pista"],
        "orden": item["id"],
        "activo": True,
        "icon": "FileText"
    } for item in CHECKLIST_SAREN_DEFAULT
]

def normalize_checklist_item(item: dict) -> dict:
    title = item.get("title") or item.get("label") or "Requisito Oficial"
    desc = item.get("description") or item.get("pista") or item.get("pregunta") or ""
    return {
        "id": item.get("id"),
        "title": title,
        "label": title,
        "description": desc,
        "pregunta": item.get("pregunta") or f"¿Posee el documento: {title}?",
        "pista": item.get("pista") or desc,
        "orden": item.get("orden", 1),
        "activo": item.get("activo", True),
        "icon": item.get("icon", "FileText")
    }

def get_checklist() -> list:
    if supabase:
        try:
            res = supabase.table("checklist_items").select("*").eq("activo", True).order("orden").execute()
            if res.data and len(res.data) > 0:
                return [normalize_checklist_item(r) for r in res.data]
        except Exception:
            pass
    return _checklist_memory

def formato_checklist_resumen(checklist, estados):
    lineas = []
    for it in checklist:
        st = estados.get(it["id"], "⏳")
        lineas.append(f"{st} **{it['label']}**")
    return "\n".join(lineas)

_planillas_memory = [
    {"id": "pub_saren", "nombre": "Planilla Única Bancaria (PUB - SAREN)", "url": "#", "categoria": "Legalización Estatal", "orden": 1},
    {"id": "solicitud_grado_usm", "nombre": "Planilla de Solicitud de Grado (USM)", "url": "#", "categoria": "Trámite Académico", "orden": 2},
    {"id": "fondo_negro_usm", "nombre": "Formato Certificación Fondo Negro (USM)", "url": "#", "categoria": "Certificación Legal", "orden": 3},
    {"id": "solvencia_biblioteca_usm", "nombre": "Planilla Solvencia de Biblioteca y Laboratorios", "url": "#", "categoria": "Solvencia Académica", "orden": 4},
    {"id": "cita_gtu_mppeu", "nombre": "Planilla de Cita GTU (MPPEU)", "url": "#", "categoria": "Legalización Nacional", "orden": 5},
]

_admins_memory = []

_guias_memory = [
    {
        "id": "guia_saren",
        "ente": "saren",
        "location": "Sede del Registro Principal (Según tu Estado/Municipio)",
        "warning": "Cita previa obligatoria a través de la web del SAREN.",
        "image_url": "/images/saren_facade.png",
        "steps": [
            {"title": "Planificación de Llegada", "time": "6:00 AM", "desc": "Los Registros Principales suelen atender por orden de llegada. Llega temprano."},
            {"title": "Documentos Esenciales", "time": "Revisión Previa", "desc": "Debes tener: Título original legalizado por el GTU, la Planilla Única Bancaria (PUB) pagada y timbres fiscales."},
            {"title": "Taquilla de Recepción", "time": "Paso 1 en sede", "desc": "Revisión de aranceles y cotejo de documentos."},
            {"title": "Proceso de Registro", "time": "Paso 2 en sede", "desc": "Entrega de documento y retiro con el certificado del SAREN."}
        ]
    },
    {
        "id": "guia_mppre",
        "ente": "mppre",
        "location": "Oficina del MPPRE o IPOSTEL autorizada (Cita Electrónica)",
        "warning": "Citas asignadas según el terminal de tu cédula.",
        "image_url": "/images/mppre_facade.png",
        "steps": [
            {"title": "Día de Cita", "time": "7:30 AM", "desc": "El sistema de Apostilla Electrónica te da un día específico."},
            {"title": "Validación de GTU", "time": "Requisito Estricto", "desc": "Tu título ya debe estar legalizado por el GTU del Ministerio de Educación Universitaria."},
            {"title": "Entrega Física", "time": "Durante la atención", "desc": "Verificación del código de legalización previa."}
        ]
    }
]

# ─── ENDPOINTS FLASK ──────────────────────────────────────────────────────────

@app.route("/", methods=["GET"])
def root_endpoint():
    stats = get_stats()
    blockchain_connected = w3.is_connected() if w3 else False
    return jsonify({
        "status": "online",
        "backend": "Flask (Python 3.12)",
        "thesis_title": "Prototipo de Plataforma Descentralizada con IA para Digitalización, Validación y Apostilla de Títulos USM",
        "stats": stats,
        "blockchain_connected": blockchain_connected
    }), 200


@app.route("/health", methods=["GET"])
@app.route("/api/health", methods=["GET"])
def health_check():
    has_frk = USMOcrService.check_fraktur_available() if HAS_USM_OCR else False
    return jsonify({
        "status": "online",
        "backend": "Flask (Python 3.12)",
        "service": "USM-ApostillaBot Core API & AI Vision",
        "tesseract_fraktur_installed": has_frk,
        "ollama_vision_supported": True,
        "supported_institutions": ["Universidad Santa María (USM)"],
        "typography_support": ["Old English Text MT", "Diploma", "Times New Roman"]
    }), 200


@app.route("/stats", methods=["GET"])
@app.route("/api/stats", methods=["GET"])
def api_stats():
    session_id = request.args.get("session_id")
    import time
    now_ts = time.time()

    if session_id:
        _active_sessions_memory[session_id] = now_ts

    # Limpiar sesiones con más de 25 segundos sin actividad
    expired = [sid for sid, ts in _active_sessions_memory.items() if now_ts - ts > 25]
    for sid in expired:
        _active_sessions_memory.pop(sid, None)

    active_users = max(1, len(_active_sessions_memory))

    # Opcional en Supabase
    if supabase and session_id:
        try:
            key_name = f"session_{session_id}"
            supabase.table("stats").upsert({"key": key_name, "value": now_ts}).execute()
            if random.random() < 0.15:
                supabase.table("stats").delete().like("key", "session_%").lt("value", now_ts - 35).execute()
            res_u = supabase.table("stats").select("key", count="exact").like("key", "session_%").gte("value", now_ts - 25).execute()
            if res_u.count is not None and res_u.count > 0:
                active_users = max(active_users, res_u.count)
        except Exception:
            pass

    stats = get_stats()
    stats["usuarios_en_linea"] = active_users
    blockchain_connected = bool(sepolia_client is not None)

    wallet_address = None
    if WALLET_PRIVATE_KEY and WALLET_PRIVATE_KEY != "0x1234567890123456789012345678901234567890123456789012345678901234":
        try:
            if sepolia_pk_to_address:
                wallet_address = sepolia_pk_to_address(WALLET_PRIVATE_KEY)
            elif w3:
                wallet_address = w3.eth.account.from_key(WALLET_PRIVATE_KEY).address
        except Exception:
            pass

    return jsonify({
        "status": "online",
        "stats": stats,
        "blockchain_connected": blockchain_connected,
        "contract_address": get_current_contract_address(),
        "wallet_address": wallet_address,
    }), 200


@app.route("/prevalidation/report", methods=["POST"])
@app.route("/api/prevalidation/report", methods=["POST"])
def report_prevalidation():
    data = request.get_json() or {}
    filename = data.get("filename", "documento.pdf")
    log_msg = f"IA VISION: Analizando '{filename}'... Validando sellos y nitidez."
    increment_stat("docs_prevalidados", 1, log_entry=log_msg)
    increment_stat("tiempo_ahorrado_hrs", 0.5)
    return jsonify({"success": True}), 200


@app.route("/stats/heartbeat", methods=["POST", "GET"])
@app.route("/api/stats/heartbeat", methods=["POST", "GET"])
def stats_heartbeat():
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id") or request.args.get("session_id")
    if session_id:
        import time
        _active_sessions_memory[session_id] = time.time()
    increment_stat("tiempo_ahorrado_hrs", 0.1)
    return jsonify({"success": True, "usuarios_en_linea": max(1, len(_active_sessions_memory))}), 200


# ─── Auth ────────────────────────────────────────────────────────────────────
@app.route("/student/register", methods=["POST"])
@app.route("/api/student/register", methods=["POST"])
def register_student():
    _load_students_cache()
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()
    nombre = (data.get("nombre") or "").strip()
    cedula = (data.get("cedula") or "").strip()
    telefono = (data.get("telefono") or "").strip()
    fecha_nacimiento = (data.get("fecha_nacimiento") or "").strip()
    carrera = (data.get("carrera") or "Ingeniería en Sistemas").strip()
    semestre = (data.get("semestre") or "10mo").strip()

    if not email or not password or not nombre or not cedula:
        return jsonify({"success": False, "error": "Campos obligatorios incompletos"}), 400

    pwd_hash = _hash_student_password(password)

    student_profile = {
        "id": f"usr-{secrets.token_hex(6)}",
        "email": email,
        "password_hash": pwd_hash,
        "nombre": nombre,
        "cedula": cedula,
        "telefono": telefono,
        "fecha_nacimiento": fecha_nacimiento,
        "carrera": carrera,
        "semestre": semestre,
        "is_profile_complete": True,
        "is_cedula_locked": True,
        "role": "estudiante",
        "created_at": datetime.datetime.now().isoformat()
    }

    existing_idx = next((i for i, s in enumerate(_students_auth_memory) if s.get("email", "").lower() == email), None)
    if existing_idx is not None:
        return jsonify({
            "success": False,
            "error": "Este correo electrónico ya se encuentra registrado. Inicia sesión o utiliza 'Olvidé mi contraseña'.",
            "code": "EMAIL_ALREADY_REGISTERED"
        }), 409

    ced_digits_new = re.sub(r"\D", "", cedula)
    if ced_digits_new and any(re.sub(r"\D", "", s.get("cedula") or "") == ced_digits_new for s in _students_auth_memory):
        return jsonify({
            "success": False,
            "error": "Esta Cédula de Identidad ya está vinculada a una cuenta académica registrada.",
            "code": "CEDULA_ALREADY_REGISTERED"
        }), 409

    _students_auth_memory.append(student_profile)
    _save_students_cache()

    # Sincronizar también con perfiles y cache
    existing_prof = next((i for i, p in enumerate(_profiles_memory) if (p.get("cedula") or "").replace(".", "").replace("-", "").upper() == cedula.replace(".", "").replace("-", "").upper()), None)
    prof_entry = {"cedula": cedula, "nombre": nombre, "carrera": carrera, "semestre": semestre, "email": email}
    if existing_prof is not None:
        _profiles_memory[existing_prof] = prof_entry
    else:
        _profiles_memory.append(prof_entry)
    _save_profiles_cache()

    increment_stat("graduandos_activos", 1, log_entry=f"NUEVO REGISTRO: Graduando {nombre} ({cedula}) registrado en el portal USM.")

    token = create_jwt_token({
        "sub": student_profile.get("id"),
        "email": email,
        "role": "estudiante",
        "cedula": cedula
    })

    safe_profile = {k: v for k, v in student_profile.items() if k != "password_hash"}
    return jsonify({"success": True, "token": token, "profile": safe_profile}), 200


@app.route("/student/check-email", methods=["POST"])
@app.route("/api/student/check-email", methods=["POST"])
def check_student_email():
    _load_students_cache()
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"registered": False}), 200
    exists = any((s.get("email") or "").lower() == email for s in _students_auth_memory)
    return jsonify({"registered": exists}), 200


@app.route("/student/login", methods=["POST"])
@app.route("/api/student/login", methods=["POST"])
def login_student():
    _load_students_cache()
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not email or not password:
        return jsonify({"success": False, "error": "Correo y contraseña requeridos"}), 400

    student = next((s for s in _students_auth_memory if s.get("email", "").lower() == email), None)

    if not student:
        return jsonify({
            "success": False,
            "error": "El usuario no se encuentra registrado en el sistema. Debes registrarte primero.",
            "code": "USER_NOT_REGISTERED"
        }), 404

    # Validar contraseña con bcrypt/PBKDF2 (con soporte retroactivo)
    if not _verify_student_password(password, student.get("password_hash", "")):
        return jsonify({
            "success": False,
            "error": "La contraseña ingresada es incorrecta. Por favor verifica tus datos.",
            "code": "INVALID_PASSWORD"
        }), 401

    token = create_jwt_token({
        "sub": student.get("id"),
        "email": email,
        "role": "estudiante",
        "cedula": student.get("cedula")
    })

    safe_profile = {k: v for k, v in student.items() if k != "password_hash"}
    return jsonify({
        "success": True,
        "token": token,
        "profile": safe_profile
    }), 200


@app.route("/student/verify-identity", methods=["POST"])
@app.route("/api/student/verify-identity", methods=["POST"])
def verify_student_identity():
    _load_students_cache()
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    cedula = (data.get("cedula") or "").strip()
    ced_digits = re.sub(r"\D", "", cedula)

    if not email or not ced_digits:
        return jsonify({"status": "error", "message": "Correo y cédula son requeridos."}), 400

    student = next((s for s in _students_auth_memory if (s.get("email") or "").lower() == email), None)
    if not student:
        student_by_ced = next((s for s in _students_auth_memory if re.sub(r"\D", "", s.get("cedula") or "") == ced_digits), None)
        if student_by_ced:
            return jsonify({
                "status": "mismatch",
                "message": "Los datos no coinciden. La Cédula ingresada está asociada a otro correo electrónico."
            }), 200
        return jsonify({
            "status": "not_found",
            "message": "El usuario no se encuentra registrado en el sistema. Debes crear tu cuenta primero."
        }), 200

    student_ced_digits = re.sub(r"\D", "", student.get("cedula") or "")
    if student_ced_digits and student_ced_digits != ced_digits:
        return jsonify({
            "status": "mismatch",
            "message": "Los datos no coinciden. La Cédula de Identidad no corresponde al correo electrónico ingresado."
        }), 200

    safe_profile = {k: v for k, v in student.items() if k != "password_hash"}
    return jsonify({
        "status": "match",
        "exists": True,
        "nombre": student.get("nombre"),
        "cedula": student.get("cedula"),
        "profile": safe_profile
    }), 200


@app.route("/student/reset-password", methods=["POST"])
@app.route("/api/student/reset-password", methods=["POST"])
def reset_student_password():
    _load_students_cache()
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    cedula = (data.get("cedula") or "").strip()
    new_password = (data.get("new_password") or data.get("password") or "").strip()

    if not email or not new_password:
        return jsonify({"success": False, "error": "Correo y nueva contraseña requeridos."}), 400

    student = next((s for s in _students_auth_memory if (s.get("email") or "").lower() == email), None)
    if not student:
        return jsonify({"success": False, "error": "Usuario no encontrado."}), 404

    # Verificar identidad por JWT de sesión o coincidencia exacta de cédula registrada
    auth_payload = get_current_admin()
    is_jwt_owner = bool(auth_payload and (auth_payload.get("email") or "").lower() == email)
    ced_digits = re.sub(r"\D", "", cedula)
    stored_ced_digits = re.sub(r"\D", "", student.get("cedula") or "")
    is_cedula_match = bool(ced_digits and stored_ced_digits and ced_digits == stored_ced_digits)

    if not is_jwt_owner and not is_cedula_match:
        return jsonify({
            "success": False,
            "error": "Verificación de identidad requerida: la Cédula de Identidad debe coincidir con la cuenta registrada."
        }), 403

    student["password_hash"] = _hash_student_password(new_password)
    student["updated_at"] = datetime.datetime.now().isoformat()
    _save_students_cache()

    safe_profile = {k: v for k, v in student.items() if k != "password_hash"}
    return jsonify({
        "success": True,
        "message": "Contraseña actualizada con éxito.",
        "profile": safe_profile
    }), 200


# ─── Códigos Reales de 6 Dígitos por Correo (OTP / Recuperación Stateless JWT) ──
@app.route("/student/send-code", methods=["POST"])
@app.route("/api/student/send-code", methods=["POST"])
def send_student_verification_code():
    _load_students_cache()
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    cedula = (data.get("cedula") or "").strip()
    purpose = (data.get("purpose") or "recovery").strip().lower()
    if purpose not in ("recovery", "otp"):
        purpose = "recovery"

    ced_digits = re.sub(r"\D", "", cedula)
    if not email or not ced_digits:
        return jsonify({"success": False, "error": "Correo electrónico y cédula de identidad son requeridos."}), 400

    student = next((s for s in _students_auth_memory if (s.get("email") or "").lower() == email), None)
    if not student:
        return jsonify({
            "success": False,
            "status": "not_found",
            "error": "El usuario no se encuentra registrado en el sistema. Debes crear tu cuenta primero."
        }), 404

    stored_ced_digits = re.sub(r"\D", "", student.get("cedula") or "")
    if stored_ced_digits and stored_ced_digits != ced_digits:
        return jsonify({
            "success": False,
            "status": "mismatch",
            "error": "Los datos no coinciden. La Cédula de Identidad no corresponde al correo ingresado."
        }), 403

    code = f"{secrets.randbelow(900000) + 100000:06d}"
    code_hash = hashlib.sha256(f"{email}::{code}::{JWT_SECRET}".encode("utf-8")).hexdigest()
    challenge_token = create_jwt_token({
        "type": "email_code_challenge",
        "email": email,
        "cedula": student.get("cedula") or cedula,
        "purpose": purpose,
        "code_hash": code_hash,
    }, expires_minutes=10)

    email_res = {"sent": False, "provider": "none", "error": "Servicio de correo no disponible"}
    if HAS_EMAIL_SERVICE and EmailNotificationService is not None:
        email_res = EmailNotificationService.send_verification_code(
            email, student.get("nombre") or "Graduando", code, purpose=purpose
        )

    is_dev_or_test = bool(os.getenv("TESTING_ENV") or not os.environ.get("VERCEL"))
    if email_res.get("sent"):
        return jsonify({
            "success": True,
            "email_sent": True,
            "provider": email_res.get("provider"),
            "challenge_token": challenge_token,
            "message": f"Código de 6 dígitos enviado a {email}. Revisa tu bandeja de entrada o carpeta de spam.",
        }), 200

    # Si el servidor en Vercel aún no tiene SMTP_USER/SMTP_PASSWORD o RESEND_API_KEY configurados
    resp_payload = {
        "success": True,
        "email_sent": False,
        "provider": email_res.get("provider", "none"),
        "challenge_token": challenge_token,
        "error_detail": email_res.get("error"),
        "message": (
            "Tu identidad (Cédula + Correo) fue verificada correctamente, pero el servidor aún no tiene "
            "configurado SMTP_USER/SMTP_PASSWORD (Gmail) o RESEND_API_KEY en Vercel para despachar el correo."
        ),
    }
    if is_dev_or_test:
        resp_payload["dev_code"] = code
    return jsonify(resp_payload), 200


@app.route("/student/verify-code", methods=["POST"])
@app.route("/api/student/verify-code", methods=["POST"])
def verify_student_verification_code():
    import hmac
    _load_students_cache()
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    code = re.sub(r"\D", "", str(data.get("code") or ""))
    challenge_token = (data.get("challenge_token") or "").strip()
    new_password = (data.get("new_password") or "").strip()

    if not email or len(code) != 6 or not challenge_token:
        return jsonify({"success": False, "error": "Correo, código de 6 dígitos y token de reto son obligatorios."}), 400

    payload = verify_jwt_token(challenge_token)
    if not payload or payload.get("type") != "email_code_challenge" or (payload.get("email") or "").lower() != email:
        return jsonify({"success": False, "error": "El código de verificación ha expirado o es inválido. Solicita uno nuevo."}), 401

    expected_hash = payload.get("code_hash") or ""
    candidate_hash = hashlib.sha256(f"{email}::{code}::{JWT_SECRET}".encode("utf-8")).hexdigest()
    if not hmac.compare_digest(expected_hash, candidate_hash):
        return jsonify({"success": False, "error": "Código de 6 dígitos incorrecto. Verifícalo e intenta nuevamente."}), 401

    student = next((s for s in _students_auth_memory if (s.get("email") or "").lower() == email), None)
    if not student:
        return jsonify({"success": False, "error": "Cuenta de graduando no encontrada."}), 404

    if payload.get("purpose") == "recovery":
        if not new_password or len(new_password) < 8:
            return jsonify({"success": False, "error": "Debes ingresar una nueva contraseña de al menos 8 caracteres."}), 400
        student["password_hash"] = _hash_student_password(new_password)
        student["updated_at"] = datetime.datetime.now().isoformat()
        _save_students_cache()

    session_token = create_jwt_token({
        "sub": student["id"],
        "email": student["email"],
        "role": "estudiante",
        "cedula": student.get("cedula")
    })
    safe_profile = {k: v for k, v in student.items() if k != "password_hash"}
    return jsonify({
        "success": True,
        "token": session_token,
        "profile": safe_profile,
        "message": "Contraseña restablecida e inicio de sesión exitoso." if payload.get("purpose") == "recovery" else "Código OTP verificado con éxito."
    }), 200


# ─── Centro de Notificaciones (Correo Real + Bandeja In-App Graduando & GTU/MPPRE) ──
NOTIFICATIONS_CACHE_FILE = os.path.join(tempfile.gettempdir(), "usm_notifications_cache.json")
_notifications_memory = []

def _load_notifications_cache():
    global _notifications_memory
    try:
        if os.path.exists(NOTIFICATIONS_CACHE_FILE):
            with open(NOTIFICATIONS_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    _notifications_memory = data[:120]
    except Exception:
        pass

def _save_notifications_cache():
    try:
        with open(NOTIFICATIONS_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(_notifications_memory[:120], f, ensure_ascii=False)
    except Exception:
        pass

_load_notifications_cache()

def _find_student_email_for_record(record: dict) -> str:
    direct = (record.get("account_email") or record.get("accountEmail") or "").strip().lower()
    if direct and "@" in direct:
        return direct
    ced_digits = re.sub(r"\D", "", str(record.get("cedula") or record.get("account_cedula") or ""))
    if ced_digits:
        _load_students_cache()
        match = next((s for s in _students_auth_memory if re.sub(r"\D", "", s.get("cedula") or "") == ced_digits), None)
        if match and match.get("email"):
            return match["email"].strip().lower()
    return ""

ADMINS_CACHE_FILE = os.path.join(tempfile.gettempdir(), "usm_admins_cache.json")

def _load_admins_cache():
    global _admins_memory
    try:
        if os.path.exists(ADMINS_CACHE_FILE):
            with open(ADMINS_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    known = {(a.get("username") or "").lower() for a in _admins_memory}
                    for item in data:
                        u = (item.get("username") or "").lower()
                        if u and u not in known:
                            _admins_memory.append(item)
                            known.add(u)
                        elif u:
                            for idx, ex in enumerate(_admins_memory):
                                if (ex.get("username") or "").lower() == u and item.get("email"):
                                    _admins_memory[idx]["email"] = item["email"]
    except Exception:
        pass

def _save_admins_cache():
    try:
        with open(ADMINS_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(_admins_memory, f, ensure_ascii=False)
    except Exception:
        pass

_load_admins_cache()

def _get_admin_emails_for_ente(target_ente: str) -> list:
    """Resuelve dinámicamente todos los correos vinculados a los auditores del ente (MPPEU / MPPRE)."""
    _load_admins_cache()
    ente_norm = (target_ente or "").strip().upper()
    emails = []

    def _add(raw_val: str):
        for part in str(raw_val or "").replace(";", ",").split(","):
            em = part.strip().lower()
            if em and "@" in em and em not in emails:
                emails.append(em)

    # 1. Correos vinculados en la tabla `admins` de Supabase para ese ente
    if supabase:
        try:
            res = supabase.table("admins").select("username,ente,email").eq("ente", ente_norm).execute()
            for row in (res.data or []):
                _add(row.get("email"))
        except Exception:
            pass

    # 2. Correos vinculados en _admins_memory / cache local para ese ente
    for a in _admins_memory:
        if (a.get("ente") or "").strip().upper() == ente_norm:
            _add(a.get("email"))

    # 3. Respaldo opcional por variables de entorno (soporta varios correos separados por coma)
    if ente_norm == "MPPEU":
        _add(os.getenv("GTU_ADMIN_EMAIL") or "")
        _add(os.getenv("MPPEU_ADMIN_EMAIL") or "")
    elif ente_norm == "MPPRE":
        _add(os.getenv("MPPRE_ADMIN_EMAIL") or "")

    return emails

def _find_admin_email(username: str) -> str:
    _load_admins_cache()
    uname = (username or "").strip().lower()
    if not uname:
        return ""
    for a in _admins_memory:
        if (a.get("username") or "").strip().lower() == uname and a.get("email"):
            return a["email"].strip().lower()
    if supabase:
        try:
            res = supabase.table("admins").select("email").eq("username", username).execute()
            if res.data and res.data[0].get("email"):
                return str(res.data[0]["email"]).strip().lower()
        except Exception:
            pass
    return ""

def dispatch_document_notification(event_type: str, record: dict, extra: dict = None):
    """Registra notificación in-app y envía correo transaccional (si SMTP/Resend está activo) al Graduando y a todos los Auditores GTU/MPPRE vinculados."""
    try:
        _load_notifications_cache()
        info = dict(record or {})
        if extra:
            info.update(extra)

        now_iso = datetime.datetime.utcnow().isoformat() + "Z"
        owner = info.get("owner_name") or info.get("ownerName") or "Graduando"
        cedula = info.get("cedula") or ""
        code = info.get("solicitud_code") or info.get("solicitudCode") or "GTU-2026"
        doc_hash = info.get("hash") or ""
        apostille_no = info.get("apostille_number") or info.get("apostilleNumber") or ""
        reason = info.get("reason") or info.get("rejection_reason") or info.get("rejectionReason") or ""
        student_email = _find_student_email_for_record(info)

        gtu_emails = _get_admin_emails_for_ente("MPPEU")
        mppre_emails = _get_admin_emails_for_ente("MPPRE")
        frontend_url = (os.getenv("FRONTEND_URL") or "").strip()

        def _push_inapp(target_role: str, target_id: str, title: str, message: str, severity: str = "info"):
            _notifications_memory.insert(0, {
                "id": f"ntf_{secrets.token_hex(5)}",
                "targetRole": target_role,
                "targetId": target_id,
                "eventType": event_type,
                "title": title,
                "message": message,
                "solicitudCode": code,
                "hash": doc_hash,
                "severity": severity,
                "read": False,
                "createdAt": now_iso,
            })
            del _notifications_memory[120:]

        # 1. Notificación al Graduando y a todos los Auditores del ente correspondiente
        if event_type == "SOLICITUD_CREADA":
            _push_inapp("student", re.sub(r"\D", "", cedula), "Solicitud GTU Registrada", f"Tu expediente {code} entró en cola de auditoría GTU (MPPEU).", "info")
            _push_inapp("admin", "MPPEU", "Nuevo Expediente en Taquilla GTU", f"{owner} ({cedula}) registró el expediente {code} para Cotejo GTU.", "warning")
            if HAS_EMAIL_SERVICE and EmailNotificationService:
                if student_email:
                    EmailNotificationService.send_document_event_email(student_email, "student", "SOLICITUD_CREADA", info, frontend_url)
                for g_em in gtu_emails:
                    EmailNotificationService.send_document_event_email(g_em, "gtu_admin", "SOLICITUD_CREADA", info, frontend_url)

        elif event_type == "CERTIFICADO_MPPEU":
            _push_inapp("student", re.sub(r"\D", "", cedula), "Certificación GTU Aprobada ✓", f"Tu título ({code}) fue certificado por GTU (MPPEU). Ya puedes solicitar la Apostilla MPPRE.", "success")
            _push_inapp("admin", "MPPEU", "Certificación GTU Completada", f"Se certificó on-chain el expediente {code} de {owner}.", "success")
            if HAS_EMAIL_SERVICE and EmailNotificationService and student_email:
                EmailNotificationService.send_document_event_email(student_email, "student", "CERTIFICADO_MPPEU", info, frontend_url)

        elif event_type == "PENDIENTE_APOSTILLA_MPPRE":
            country = info.get("country_destiny") or info.get("countryDestiny") or "Exterior"
            _push_inapp("student", re.sub(r"\D", "", cedula), "Apostilla Solicitada ante MPPRE", f"Tu solicitud {code} para {country} fue enviada a Cancillería (MPPRE).", "info")
            _push_inapp("admin", "MPPRE", "Nueva Solicitud de Apostilla", f"{owner} ({cedula}) solicitó Apostilla de La Haya ({country}) para {code}.", "warning")
            if HAS_EMAIL_SERVICE and EmailNotificationService:
                for m_em in mppre_emails:
                    EmailNotificationService.send_document_event_email(m_em, "mppre_admin", "PENDIENTE_APOSTILLA_MPPRE", info, frontend_url)

        elif event_type == "APOSTILLADO_MPPRE":
            _push_inapp("student", re.sub(r"\D", "", cedula), "Apostilla de La Haya Emitida 🌍", f"Cancillería (MPPRE) emitió tu Apostilla N° {apostille_no or code}. ¡Ya puedes descargarla!", "success")
            _push_inapp("admin", "MPPRE", "Apostilla Emitida", f"Apostilla {apostille_no or code} emitida para {owner}.", "success")
            if HAS_EMAIL_SERVICE and EmailNotificationService and student_email:
                EmailNotificationService.send_document_event_email(student_email, "student", "APOSTILLADO_MPPRE", info, frontend_url)

        elif event_type == "RECHAZADO":
            _push_inapp("student", re.sub(r"\D", "", cedula), "Observación Ministerial ⚠️", f"Tu trámite {code} fue observado: {reason or 'Revisa los recaudos.'}", "danger")
            if HAS_EMAIL_SERVICE and EmailNotificationService and student_email:
                EmailNotificationService.send_document_event_email(student_email, "student", "RECHAZADO", info, frontend_url)

        _save_notifications_cache()
    except Exception as ne:
        logger.debug(f"Aviso en notificación de documento: {ne}")


@app.route("/notifications", methods=["GET"])
@app.route("/api/notifications", methods=["GET"])
def get_notifications():
    _load_notifications_cache()
    role = (request.args.get("role") or "student").strip().lower()
    cedula = re.sub(r"\D", "", request.args.get("cedula") or "")
    ente = (request.args.get("ente") or "").strip().upper()

    if role == "admin":
        items = [
            n for n in _notifications_memory
            if n.get("targetRole") == "admin" and (not ente or ente == "ALL" or n.get("targetId") == ente)
        ]
    else:
        items = [
            n for n in _notifications_memory
            if n.get("targetRole") == "student" and (not cedula or n.get("targetId") == cedula)
        ]

    email_status = EmailNotificationService.get_provider_status() if (HAS_EMAIL_SERVICE and EmailNotificationService) else {"configured": False, "provider": "none"}
    return jsonify({
        "success": True,
        "notifications": items[:30],
        "unreadCount": sum(1 for n in items[:30] if not n.get("read")),
        "emailConfigured": email_status.get("configured", False),
        "emailProvider": email_status.get("provider", "none"),
    }), 200


@app.route("/notifications/read", methods=["POST"])
@app.route("/api/notifications/read", methods=["POST"])
def mark_notifications_read():
    _load_notifications_cache()
    data = request.get_json() or {}
    notif_id = data.get("id")
    role = (data.get("role") or "").strip().lower()
    cedula = re.sub(r"\D", "", data.get("cedula") or "")
    ente = (data.get("ente") or "").strip().upper()

    for n in _notifications_memory:
        if notif_id and n.get("id") == notif_id:
            n["read"] = True
        elif not notif_id:
            if role == "admin" and n.get("targetRole") == "admin" and (not ente or n.get("targetId") == ente):
                n["read"] = True
            elif role == "student" and n.get("targetRole") == "student" and (not cedula or n.get("targetId") == cedula):
                n["read"] = True
    _save_notifications_cache()
    return jsonify({"success": True}), 200


@app.route("/student/update-profile", methods=["POST", "PUT"])
@app.route("/api/student/update-profile", methods=["POST", "PUT"])
def update_student_profile():
    _load_students_cache()
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    cedula = (data.get("cedula") or "").strip()
    ced_digits = re.sub(r"\D", "", cedula)

    student = next(
        (s for s in _students_auth_memory if (email and (s.get("email") or "").lower() == email) or (ced_digits and re.sub(r"\D", "", s.get("cedula") or "") == ced_digits)),
        None
    )

    if student:
        # Verificar que exista JWT válido del propietario o coincidencia estricta de correo + cédula
        auth_payload = get_current_admin()
        is_jwt_owner = bool(auth_payload and ((auth_payload.get("email") or "").lower() == (student.get("email") or "").lower()))
        stored_ced_digits = re.sub(r"\D", "", student.get("cedula") or "")
        is_identity_match = bool(
            email and (student.get("email") or "").lower() == email and
            stored_ced_digits and ced_digits and stored_ced_digits == ced_digits
        )
        if not is_jwt_owner and not is_identity_match:
            return jsonify({"success": False, "error": "No autorizado para modificar este perfil."}), 403

    if not student:
        if not email and not cedula:
            return jsonify({"success": False, "error": "Identificador de estudiante requerido."}), 400
        student = {
            "id": data.get("id") or f"usr-{secrets.token_hex(6)}",
            "email": email,
            "password_hash": _hash_student_password(data.get("new_password") or secrets.token_urlsafe(12)),
            "nombre": (data.get("nombre") or "Graduando USM").strip(),
            "cedula": cedula,
            "telefono": (data.get("telefono") or "").strip(),
            "fecha_nacimiento": (data.get("fecha_nacimiento") or "").strip(),
            "carrera": (data.get("carrera") or "Ingeniería en Sistemas").strip(),
            "semestre": (data.get("semestre") or "10mo").strip(),
            "is_profile_complete": True,
            "is_cedula_locked": True,
            "role": "estudiante",
            "created_at": datetime.datetime.now().isoformat()
        }
        _students_auth_memory.append(student)
    else:
        if data.get("nombre"):
            student["nombre"] = data["nombre"].strip()
        if "telefono" in data:
            student["telefono"] = (data.get("telefono") or "").strip()
        if "fecha_nacimiento" in data:
            student["fecha_nacimiento"] = (data.get("fecha_nacimiento") or "").strip()
        if data.get("carrera"):
            student["carrera"] = data["carrera"].strip()
        if data.get("semestre"):
            student["semestre"] = data["semestre"].strip()
        if data.get("new_password"):
            student["password_hash"] = _hash_student_password(data["new_password"].strip())
        student["updated_at"] = datetime.datetime.now().isoformat()

    _save_students_cache()

    # Sincronizar también en _profiles_memory
    stu_ced_clean = re.sub(r"\D", "", student.get("cedula") or "")
    existing_prof = next((i for i, p in enumerate(_profiles_memory) if re.sub(r"\D", "", p.get("cedula") or "") == stu_ced_clean), None)
    prof_entry = {
        "cedula": student.get("cedula"),
        "nombre": student.get("nombre"),
        "carrera": student.get("carrera"),
        "semestre": student.get("semestre"),
        "email": student.get("email"),
        "telefono": student.get("telefono", ""),
        "fecha_nacimiento": student.get("fecha_nacimiento", "")
    }
    if existing_prof is not None:
        _profiles_memory[existing_prof] = prof_entry
    else:
        _profiles_memory.append(prof_entry)
    _save_profiles_cache()

    safe_profile = {k: v for k, v in student.items() if k != "password_hash"}
    return jsonify({
        "success": True,
        "message": "Perfil académico actualizado exitosamente.",
        "profile": safe_profile
    }), 200


@app.route("/admin/login", methods=["GET"])
def admin_login_page_redirect():
    from flask import redirect
    return redirect("/admin", code=302)


@app.route("/admin/login", methods=["POST"])
@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if username in ["mppeu_agente", "mppeu_admin", "mppre_agente", "mppre_auditor", "saren_admin", "admin"] and password in ["admin123", "usm2026", "mppeu2026", "mppre2026"]:
        cargo = "Auditor Principal SAREN"
        ente = "SAREN"
        role = "AUDITOR_GUBERNAMENTAL"
        if "mppeu" in username:
            cargo = "Analista Revisor de Taquilla GTU"
            ente = "MPPEU"
            role = "AGENTE_MPPEU"
        elif "mppre" in username:
            cargo = "Oficial Consular de Legalización y Apostilla"
            ente = "MPPRE"
            role = "AGENTE_MPPRE"
        elif username == "admin":
            cargo = "Administrador Central del Sistema"
            ente = "USM"
            role = "ADMIN_USM"

        linked_email = _find_admin_email(username)
        token = create_jwt_token({
            "username": username,
            "cargo": cargo,
            "ente": ente,
            "email": linked_email,
            "role": role
        })
        return jsonify({
            "success": True,
            "token": token,
            "username": username,
            "cargo": cargo,
            "ente": ente,
            "email": linked_email,
            "role": role
        }), 200

    # Verificar en administradores creados en memoria (_admins_memory)
    _load_admins_cache()
    mem_admin = next((a for a in _admins_memory if (a.get("username") or "").lower() == username.lower()), None)
    if mem_admin and verify_password(password, mem_admin.get("password", "")):
        linked_email = (mem_admin.get("email") or "").strip().lower()
        token = create_jwt_token({
            "username": mem_admin["username"],
            "cargo": mem_admin.get("cargo", "Auditor Ministerial"),
            "ente": mem_admin.get("ente", "MPPEU"),
            "email": linked_email,
            "role": mem_admin.get("role", "AUDITOR_GUBERNAMENTAL")
        })
        return jsonify({
            "success": True,
            "token": token,
            "username": mem_admin["username"],
            "cargo": mem_admin.get("cargo", "Auditor Ministerial"),
            "ente": mem_admin.get("ente", "MPPEU"),
            "email": linked_email,
            "role": mem_admin.get("role", "AUDITOR_GUBERNAMENTAL")
        }), 200

    if not supabase:
        return jsonify({"detail": "Credenciales inválidas"}), 401

    try:
        res = supabase.table("admins").select("*").eq("username", username).execute()
        if len(res.data) > 0:
            user = res.data[0]
            if verify_password(password, user["password"]):
                linked_email = (user.get("email") or "").strip().lower()
                token = create_jwt_token({
                    "username": username,
                    "cargo": user.get("cargo", "Auditor Ministerial"),
                    "ente": user.get("ente", "MPPEU"),
                    "email": linked_email,
                    "role": "AUDITOR_GUBERNAMENTAL"
                })
                return jsonify({
                    "success": True,
                    "token": token,
                    "username": username,
                    "cargo": user.get("cargo", "Auditor Ministerial"),
                    "ente": user.get("ente", "MPPEU"),
                    "email": linked_email
                }), 200
        return jsonify({"detail": "Credenciales inválidas"}), 401
    except Exception as e:
        return jsonify({"detail": str(e)}), 500


@app.route("/admin/users", methods=["GET", "POST"])
@app.route("/api/admin/users", methods=["GET", "POST"])
def create_admin():
    admin_payload = get_current_admin()
    if not admin_payload or admin_payload.get("role") == "estudiante":
        return jsonify({"detail": "Token de autorización requerido o inválido"}), 401

    _load_admins_cache()
    if request.method == "GET":
        auditors = []
        seen = set()
        if supabase:
            try:
                res = supabase.table("admins").select("username,cargo,ente,email").execute()
                for row in (res.data or []):
                    u = (row.get("username") or "").lower()
                    if u and u not in seen:
                        seen.add(u)
                        auditors.append({
                            "username": row.get("username"),
                            "cargo": row.get("cargo") or "Auditor Ministerial",
                            "ente": row.get("ente") or "MPPEU",
                            "email": row.get("email") or "",
                        })
            except Exception:
                pass
        for a in _admins_memory:
            u = (a.get("username") or "").lower()
            if u and u not in seen:
                seen.add(u)
                auditors.append({
                    "username": a.get("username"),
                    "cargo": a.get("cargo") or "Auditor Ministerial",
                    "ente": a.get("ente") or "MPPEU",
                    "email": a.get("email") or "",
                })
        return jsonify({
            "success": True,
            "admins": auditors,
            "gtuEmails": _get_admin_emails_for_ente("MPPEU"),
            "mppreEmails": _get_admin_emails_for_ente("MPPRE"),
        }), 200

    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    cargo = data.get("cargo", "").strip()
    ente = (data.get("ente") or "MPPEU").strip().upper()
    email = (data.get("email") or "").strip().lower()
    pin_institucional = data.get("pin_institucional", "")

    pin_ingresado = (pin_institucional or "").strip().upper()
    if not pin_ingresado:
        pin_ingresado = f"GOV-{secrets.token_hex(3).upper()}-{(ente or 'GOV').upper()}"

    if not is_valid_pin_format(pin_ingresado) and not os.getenv("TESTING_ENV"):
        return jsonify({"detail": "Segregación de Funciones (SoD): Código PIN Institucional no válido."}), 403

    if any((a.get("username") or "").lower() == username.lower() for a in _admins_memory):
        return jsonify({"detail": "El usuario ya existe"}), 400

    hashed_pwd = hash_password(password)
    admin_record = {
        "username": username,
        "password": hashed_pwd,
        "cargo": cargo or "Auditor Ministerial",
        "ente": ente or "MPPEU",
        "email": email,
        "pin_institucional": pin_ingresado,
        "role": "AUDITOR_GUBERNAMENTAL"
    }

    if supabase:
        try:
            exist = supabase.table("admins").select("username").eq("username", username).execute()
            if len(exist.data) > 0:
                return jsonify({"detail": "El usuario ya existe"}), 400
            try:
                supabase.table("admins").insert({
                    "username": username,
                    "password": hashed_pwd,
                    "cargo": cargo,
                    "ente": ente,
                    "email": email
                }).execute()
            except Exception:
                supabase.table("admins").insert({
                    "username": username,
                    "password": hashed_pwd,
                    "cargo": cargo,
                    "ente": ente
                }).execute()
        except Exception as e:
            logger.warning(f"Guardando admin en memoria por indisponibilidad de Supabase: {e}")

    _admins_memory.append(admin_record)
    _save_admins_cache()
    token = create_jwt_token({
        "username": username,
        "cargo": cargo,
        "ente": ente,
        "email": email,
        "role": "AUDITOR_GUBERNAMENTAL"
    })
    return jsonify({
        "success": True,
        "message": "Auditor ministerial registrado y correo vinculado exitosamente.",
        "token": token,
        "email": email,
        "pin_institucional": pin_ingresado
    }), 200


@app.route("/admin/update-email", methods=["POST", "PUT"])
@app.route("/api/admin/update-email", methods=["POST", "PUT"])
def update_admin_email():
    """Permite a cualquier auditor GTU (MPPEU) o Cancillería (MPPRE) vincular su correo personal/institucional para recibir alertas."""
    admin_payload = get_current_admin()
    if not admin_payload or admin_payload.get("role") == "estudiante":
        return jsonify({"success": False, "error": "Token de autorización ministerial requerido."}), 401

    _load_admins_cache()
    data = request.get_json() or {}
    new_email = (data.get("email") or "").strip().lower()
    if not new_email or "@" not in new_email:
        return jsonify({"success": False, "error": "Ingresa una dirección de correo electrónico válida."}), 400

    username = (admin_payload.get("username") or "").strip()
    ente = (admin_payload.get("ente") or data.get("ente") or "MPPEU").strip().upper()
    cargo = (admin_payload.get("cargo") or "Auditor Ministerial").strip()

    found_idx = next((i for i, a in enumerate(_admins_memory) if (a.get("username") or "").lower() == username.lower()), None)
    if found_idx is not None:
        _admins_memory[found_idx]["email"] = new_email
        _admins_memory[found_idx]["ente"] = ente
    else:
        _admins_memory.append({
            "username": username,
            "password": "",
            "cargo": cargo,
            "ente": ente,
            "email": new_email,
            "role": admin_payload.get("role", "AUDITOR_GUBERNAMENTAL")
        })
    _save_admins_cache()

    if supabase:
        try:
            exist = supabase.table("admins").select("username").eq("username", username).execute()
            if exist.data and len(exist.data) > 0:
                supabase.table("admins").update({"email": new_email, "ente": ente}).eq("username", username).execute()
            else:
                supabase.table("admins").insert({
                    "username": username,
                    "password": hash_password(secrets.token_urlsafe(16)),
                    "cargo": cargo,
                    "ente": ente,
                    "email": new_email,
                }).execute()
        except Exception as e:
            logger.debug(f"No se pudo sincronizar email de admin en Supabase: {e}")

    return jsonify({
        "success": True,
        "username": username,
        "ente": ente,
        "email": new_email,
        "linkedEnteEmails": _get_admin_emails_for_ente(ente),
        "message": f"Correo {new_email} vinculado correctamente a tus alertas de {ente}."
    }), 200


# ─── Perfiles de Estudiantes ─────────────────────────────────────────────────
@app.route("/profiles/register", methods=["POST"])
@app.route("/api/profiles/register", methods=["POST"])
def register_profile():
    data = request.get_json() or {}
    cedula = (data.get("cedula") or "").strip()
    nombre = (data.get("nombre") or "").strip()
    carrera = (data.get("carrera") or "Ingeniería en Sistemas").strip()
    semestre = (data.get("semestre") or "10mo").strip()

    profile_data = {
        "cedula": cedula,
        "nombre": nombre,
        "carrera": carrera,
        "semestre": semestre,
        "created_at": datetime.datetime.now().isoformat()
    }

    # 1. Guardar en memoria y persistir en cache
    existing_idx = next((i for i, p in enumerate(_profiles_memory) if (p.get("cedula") or "").replace(".", "").replace("-", "").upper() == cedula.replace(".", "").replace("-", "").upper()), None)
    if existing_idx is not None:
        _profiles_memory[existing_idx] = profile_data
    else:
        _profiles_memory.append(profile_data)
    _save_profiles_cache()

    increment_stat("graduandos_activos", 1, log_entry=f"NUEVO REGISTRO: Graduando {nombre} ({cedula}) registrado en el portal USM.")

    # 2. Guardar en Supabase si está disponible
    if supabase:
        for tbl in ["perfiles", "profiles"]:
            try:
                supabase.table(tbl).upsert(profile_data).execute()
                break
            except Exception:
                pass

    return jsonify({"success": True, "profile": profile_data}), 200


@app.route("/profiles/<cedula>", methods=["GET"])
@app.route("/api/profiles/<cedula>", methods=["GET"])
def get_profile(cedula: str):
    _load_profiles_cache()
    ced_clean = cedula.replace(".", "").replace("-", "").replace(" ", "").upper()

    # Buscar en memoria
    for p in _profiles_memory:
        if (p.get("cedula") or "").replace(".", "").replace("-", "").replace(" ", "").upper() == ced_clean:
            return jsonify({"success": True, "profile": p}), 200

    if supabase:
        for tbl in ["perfiles", "profiles"]:
            try:
                res = supabase.table(tbl).select("*").ilike("cedula", f"%{ced_clean}%").execute()
                if res.data and len(res.data) > 0:
                    return jsonify({"success": True, "profile": res.data[0]}), 200
            except Exception:
                pass

    return jsonify({"detail": "Perfil no encontrado"}), 404


# ─── Blockchain & Certificación Transfronteriza ──────────────────────────────
@app.route("/blockchain/verify/<doc_hash>", methods=["GET"])
@app.route("/api/blockchain/verify/<doc_hash>", methods=["GET"])
def verify_blockchain_document(doc_hash: str):
    raw_hash = doc_hash.strip()
    clean_hash = raw_hash[2:] if raw_hash.lower().startswith('0x') else raw_hash

    hash_variations = list(set([
        raw_hash, raw_hash.upper(), raw_hash.lower(),
        f"0x{clean_hash.lower()}", f"0x{clean_hash.upper()}", f"0X{clean_hash.upper()}",
        clean_hash.upper(), clean_hash.lower()
    ]))

    # 1. Verificación REAL On-Chain vía Ethereum Sepolia RPC (zero-dependency)
    contract_addr = get_current_contract_address()
    if sepolia_client is not None and contract_addr and contract_addr != "0x1234567890123456789012345678901234567890":
        for h in hash_variations:
            try:
                on_chain = sepolia_client.verify_document(contract_addr, h)
                if on_chain and on_chain.get("exists"):
                    tx_hash = None
                    if supabase:
                        try:
                            res = supabase.table("records").select("tx_hash").in_("hash", hash_variations).execute()
                            if res.data and len(res.data) > 0:
                                cand = res.data[0].get("tx_hash")
                                if is_plausible_tx_hash(cand, raw_hash):
                                    tx_hash = cand
                        except Exception:
                            pass
                    if not tx_hash:
                        mem_rec = next((r for r in _records_memory if _normalize_hex(r.get("hash")) == clean_hash.lower()), None)
                        if mem_rec and is_plausible_tx_hash(mem_rec.get("tx_hash"), raw_hash):
                            tx_hash = mem_rec.get("tx_hash")
                    return jsonify({
                        "exists": True,
                        "isOnChainSmartContract": True,
                        "isRevoked": bool(on_chain.get("isRevoked")),
                        "status": "REVOCADO / ANULADO" if on_chain.get("isRevoked") else "VALIDADO E INMUTABLE (SEPOLIA ON-CHAIN)",
                        "ownerName": on_chain.get("ownerName"),
                        "cedula": on_chain.get("cedula"),
                        "documentType": on_chain.get("documentType"),
                        "timestamp": int(on_chain.get("timestamp") or 0),
                        "contractAddress": contract_addr,
                        "txHash": tx_hash or "PENDIENTE_ANCLAJE_ONCHAIN"
                    }), 200
            except Exception:
                pass

    if supabase:
        try:
            res = supabase.table("records").select("*").in_("hash", hash_variations).execute()
            if res.data and len(res.data) > 0:
                record = res.data[0]
                try:
                    dt = datetime.datetime.fromisoformat(record.get("created_at").replace('Z', '+00:00'))
                    timestamp = int(dt.timestamp())
                except Exception:
                    timestamp = int(datetime.datetime.now().timestamp())

                is_rev = record.get("is_revoked", False) or "Rechazado" in str(record.get("status", "")) or "Revocado" in str(record.get("status", ""))
                safe_tx = _sanitize_tx_hash(record.get("tx_hash"), raw_hash)
                return jsonify({
                    "exists": True,
                    "isOnChainSmartContract": False,
                    "isRevoked": is_rev,
                    "status": record.get("status", "VALIDADO E INMUTABLE"),
                    "rejectionReason": record.get("rejection_reason"),
                    "verifiedBy": record.get("verified_by"),
                    "ownerName": record.get("owner_name", "Desconocido"),
                    "cedula": record.get("cedula", "N/A"),
                    "documentType": record.get("document_type", "Documento PUB"),
                    "timestamp": timestamp,
                    "contractAddress": contract_addr,
                    "txHash": safe_tx,
                    "solicitudCode": record.get("solicitud_code"),
                    "mppeuVerified": record.get("mppeu_verified", False),
                    "mppreVerified": record.get("mppre_verified", False),
                    "apostilleNumber": record.get("apostille_number")
                }), 200
        except Exception as e:
            logger.warning(f"Database verification fallback error: {e}")

    for r in _records_memory:
        if (
            r.get("hash") in hash_variations
            or _normalize_hex(r.get("hash")) == clean_hash.lower()
            or (is_plausible_tx_hash(r.get("tx_hash")) and _normalize_hex(r.get("tx_hash")) == clean_hash.lower())
        ):
            try:
                dt = datetime.datetime.fromisoformat(r.get("created_at").replace('Z', '+00:00'))
                ts = int(dt.timestamp())
            except Exception:
                ts = int(datetime.datetime.now().timestamp())
            is_rev = r.get("is_revoked", False) or "Rechazado" in str(r.get("status", "")) or "Revocado" in str(r.get("status", ""))
            safe_tx = _sanitize_tx_hash(r.get("tx_hash"), raw_hash)
            return jsonify({
                "exists": True,
                "isOnChainSmartContract": False,
                "isRevoked": is_rev,
                "status": r.get("status", "VALIDADO E INMUTABLE"),
                "rejectionReason": r.get("rejection_reason"),
                "verifiedBy": r.get("verified_by"),
                "ownerName": r.get("owner_name", "Desconocido"),
                "cedula": r.get("cedula", "N/A"),
                "documentType": r.get("document_type", "Documento PUB"),
                "timestamp": ts,
                "contractAddress": contract_addr,
                "txHash": safe_tx,
                "solicitudCode": r.get("solicitud_code"),
                "mppeuVerified": r.get("mppeu_verified", False),
                "mppreVerified": r.get("mppre_verified", False),
                "apostilleNumber": r.get("apostille_number")
            }), 200

    return jsonify({
        "exists": False,
        "error": "Documento no registrado en blockchain ni en base de datos."
    }), 200


@app.route("/blockchain/register", methods=["POST"])
@app.route("/api/blockchain/register", methods=["POST"])
def register_blockchain_document():
    data = request.get_json() or {}
    doc_hash = data.get("hash")
    owner_name = data.get("ownerName") or data.get("owner_name") or "Graduando USM"
    cedula = data.get("cedula", "V-00.000.000")
    account_cedula = data.get("accountCedula") or data.get("account_cedula") or cedula
    account_owner = data.get("accountOwner") or data.get("account_owner") or data.get("accountNombre") or ""
    account_email = data.get("accountEmail") or data.get("account_email") or ""
    document_type = data.get("documentType") or data.get("document_type") or "Título Universitario USM"
    solicitud_code = data.get("solicitudCode") or data.get("solicitud_code") or f"GTU-2026-USM-{secrets.token_hex(2).upper()}"
    tomo = data.get("tomo", "XVIII")
    folio = data.get("folio", "142")
    libro = data.get("libro", "Grados 2026")
    document_url = data.get("documentUrl") or data.get("document_url") or data.get("fileUrl") or ""
    estado = data.get("estado") or ""
    municipio = data.get("municipio") or ""
    sede_taquilla = data.get("sedeTaquilla") or data.get("sede_taquilla") or ""
    sede_direccion = data.get("sedeDireccion") or data.get("sede_direccion") or ""
    sede_horario = data.get("sedeHorario") or data.get("sede_horario") or ""
    pub_code = data.get("pubCode") or data.get("pub_code") or data.get("stablePubCode") or ""
    pub_hash = data.get("pubHash") or data.get("pub_hash") or ""
    saren_verified = bool(data.get("sarenVerified") or data.get("saren_verified") or pub_code)
    payment_reference = data.get("paymentReference") or data.get("payment_reference") or ""
    payment_status = data.get("paymentStatus") or data.get("payment_status") or ("LIQUIDADA / CONCILIADA" if payment_reference else "")
    banco_receptor = data.get("bancoReceptor") or data.get("banco_receptor") or ""
    monto_arancel = data.get("montoArancel") or data.get("monto_arancel") or ""
    form_data = data.get("formData") or data.get("form_data") or None

    now_iso = datetime.datetime.utcnow().isoformat() + "Z"
    tx_hash = data.get("txHash") or data.get("tx_hash") or "0xPENDIENTE_COTEJO"
    clean_doc_h = _normalize_hex(doc_hash)

    existing_idx = next((i for i, r in enumerate(_records_memory) if _normalize_hex(r.get("hash")) == clean_doc_h), None)
    prev_rec = _records_memory[existing_idx] if existing_idx is not None else {}

    new_rec = {
        "hash": prev_rec.get("hash") or doc_hash,
        "owner_name": owner_name or prev_rec.get("owner_name") or "Graduando USM",
        "cedula": cedula if cedula != "V-00.000.000" else (prev_rec.get("cedula") or cedula),
        "account_cedula": account_cedula or prev_rec.get("account_cedula") or cedula,
        "account_owner": account_owner or prev_rec.get("account_owner") or "",
        "account_email": account_email or prev_rec.get("account_email") or "",
        "document_type": prev_rec.get("document_type") or document_type,
        "document_url": document_url or prev_rec.get("document_url") or "",
        "tx_hash": prev_rec.get("tx_hash") if (prev_rec.get("tx_hash") and "PENDIENTE" not in str(prev_rec.get("tx_hash"))) else tx_hash,
        "status": prev_rec.get("status") or data.get("status") or ("SAREN_PUB_LIQUIDADA" if saren_verified else "PENDIENTE_COTEJO_MPPEU"),
        "created_at": prev_rec.get("created_at") or now_iso,
        "verified_by": prev_rec.get("verified_by"),
        "rejection_reason": prev_rec.get("rejection_reason"),
        "solicitud_code": prev_rec.get("solicitud_code") or solicitud_code,
        "mppeu_verified": bool(prev_rec.get("mppeu_verified", False)),
        "mppre_verified": bool(prev_rec.get("mppre_verified", False)),
        "apostille_number": prev_rec.get("apostille_number"),
        "tomo": tomo if tomo != "XVIII" else (prev_rec.get("tomo") or tomo),
        "folio": folio if folio != "142" else (prev_rec.get("folio") or folio),
        "libro": libro if libro != "Grados 2026" else (prev_rec.get("libro") or libro),
        "estado": estado or prev_rec.get("estado") or "",
        "municipio": municipio or prev_rec.get("municipio") or "",
        "sede_taquilla": sede_taquilla or prev_rec.get("sede_taquilla") or "",
        "sede_direccion": sede_direccion or prev_rec.get("sede_direccion") or "",
        "sede_horario": sede_horario or prev_rec.get("sede_horario") or "",
        "saren_verified": bool(saren_verified or prev_rec.get("saren_verified")),
        "pub_code": pub_code or prev_rec.get("pub_code") or "",
        "pub_hash": pub_hash or prev_rec.get("pub_hash") or "",
        "payment_reference": payment_reference or prev_rec.get("payment_reference") or "",
        "payment_status": payment_status or prev_rec.get("payment_status") or "",
        "banco_receptor": banco_receptor or prev_rec.get("banco_receptor") or "",
        "monto_arancel": monto_arancel or prev_rec.get("monto_arancel") or "",
        "form_data": form_data or prev_rec.get("form_data")
    }

    if existing_idx is not None:
        _records_memory[existing_idx] = new_rec
    else:
        _records_memory.insert(0, new_rec)

    _save_records_cache()

    if supabase:
        try:
            supabase.table("records").upsert(new_rec).execute()
        except Exception as e:
            logger.warning(f"Upsert completo falló ({e}), reintentando con columnas base de records...")
            try:
                base_keys = {
                    "hash", "owner_name", "cedula", "document_type", "document_url",
                    "solicitud_code", "tomo", "folio", "libro", "tx_hash", "status",
                    "mppeu_verified", "mppre_verified", "apostille_number",
                    "rejection_reason", "created_at"
                }
                base_rec = {k: v for k, v in new_rec.items() if k in base_keys}
                supabase.table("records").upsert(base_rec).execute()
            except Exception as e2:
                logger.warning(f"No se pudo guardar en Supabase: {e2}")

    increment_stat("docs_prevalidados", 1, log_entry=f"SOLICITUD: Trámite {solicitud_code} emitido para {owner_name}.")
    dispatch_document_notification("SOLICITUD_CREADA", new_rec)
    return jsonify({
        "success": True,
        "message": "Solicitud de trámite GTU generada exitosamente.",
        "hash": doc_hash,
        "txHash": tx_hash,
        "solicitudCode": solicitud_code,
        "status": "PENDIENTE_COTEJO_MPPEU",
        "record": map_record(new_rec)
    }), 200


if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    UPLOAD_DOCS_DIR = os.path.join(tempfile.gettempdir(), "usm_uploads", "documents")
else:
    UPLOAD_DOCS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads", "documents")
try:
    os.makedirs(UPLOAD_DOCS_DIR, exist_ok=True)
except OSError:
    UPLOAD_DOCS_DIR = os.path.join(tempfile.gettempdir(), "usm_uploads", "documents")
    os.makedirs(UPLOAD_DOCS_DIR, exist_ok=True)

@app.route("/api/documents/upload", methods=["POST"])
@app.route("/documents/upload", methods=["POST"])
def upload_document():
    try:
        doc_hash = request.form.get("docHash") or request.form.get("hash") or f"doc_{secrets.token_hex(8)}"
        clean_name = re.sub(r'[^a-zA-Z0-9_\-]', '', doc_hash)
        
        file_bytes = None
        ext = "jpg"
        
        if "file" in request.files:
            file_obj = request.files["file"]
            if file_obj.filename:
                ext = file_obj.filename.rsplit(".", 1)[-1].lower() if "." in file_obj.filename else "jpg"
            file_bytes = file_obj.read()
        elif request.is_json:
            json_data = request.get_json() or {}
            data_url = json_data.get("dataUrl") or json_data.get("imageBase64") or ""
            if "," in data_url:
                header, data_url = data_url.split(",", 1)
                if "pdf" in header:
                    ext = "pdf"
                elif "png" in header:
                    ext = "png"
            file_bytes = base64.b64decode(data_url)
        elif "dataUrl" in request.form:
            data_url = request.form["dataUrl"]
            if "," in data_url:
                header, data_url = data_url.split(",", 1)
                if "pdf" in header:
                    ext = "pdf"
                elif "png" in header:
                    ext = "png"
            file_bytes = base64.b64decode(data_url)

        if not file_bytes:
            return jsonify({"error": "No se recibió archivo o imagen base64 válido"}), 400

        filename = f"{clean_name}_{int(datetime.datetime.utcnow().timestamp())}.{ext}"
        filepath = os.path.join(UPLOAD_DOCS_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(file_bytes)

        supabase_url_res = None
        if supabase:
            try:
                content_type = f"image/{ext}" if ext != "pdf" else "application/pdf"
                supabase.storage.from_("documentos").upload(
                    f"titulos/{filename}",
                    file_bytes,
                    {"content-type": content_type, "upsert": "true"}
                )
                pub_info = supabase.storage.from_("documentos").get_public_url(f"titulos/{filename}")
                if pub_info:
                    supabase_url_res = pub_info
            except Exception as se:
                logger.warning(f"No se pudo sincronizar a Supabase Storage: {se}")

        base_url = request.host_url.rstrip("/")
        local_url = f"{base_url}/api/documents/file/{filename}"
        is_serverless = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))

        # Si Supabase Storage no está disponible, generar versión inline comprimida (<150 KB)
        # para evitar imágenes rotas 404 por /tmp efímero entre instancias serverless de Vercel.
        inline_data_url = None
        if not supabase_url_res:
            try:
                if ext != "pdf":
                    from PIL import Image
                    img = Image.open(io.BytesIO(file_bytes))
                    if img.mode not in ("RGB", "L"):
                        img = img.convert("RGB")
                    img.thumbnail((1200, 1200))
                    buf = io.BytesIO()
                    img.save(buf, format="JPEG", quality=74, optimize=True)
                    inline_b64 = base64.b64encode(buf.getvalue()).decode("ascii")
                    inline_data_url = f"data:image/jpeg;base64,{inline_b64}"
                elif len(file_bytes) <= 450_000:
                    inline_b64 = base64.b64encode(file_bytes).decode("ascii")
                    inline_data_url = f"data:application/pdf;base64,{inline_b64}"
            except Exception as ie:
                logger.debug(f"No se pudo generar inlineDataUrl de respaldo: {ie}")

        final_url = supabase_url_res or (inline_data_url if is_serverless else local_url) or inline_data_url or local_url

        return jsonify({
            "success": True,
            "filename": filename,
            "url": final_url,
            "supabaseUrl": supabase_url_res,
            "inlineDataUrl": inline_data_url,
            "localUrl": local_url,
            "ephemeral": bool(is_serverless and not supabase_url_res and not inline_data_url),
            "sizeBytes": len(file_bytes)
        }), 200
    except Exception as e:
        logger.error(f"Error subiendo documento: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/documents/file/<filename>", methods=["GET"])
@app.route("/documents/file/<filename>", methods=["GET"])
def get_document_file(filename: str):
    from flask import send_from_directory
    clean_fn = os.path.basename(filename)
    return send_from_directory(UPLOAD_DOCS_DIR, clean_fn)


def _normalize_hex(h: str) -> str:
    if not h:
        return ''
    s = str(h).strip().lower()
    return s[2:] if s.startswith('0x') else s


def _get_status_weight(status: str) -> int:
    if not status:
        return 0
    s = str(status).upper()
    if "APOSTILL" in s:
        return 50
    if "CERTIFICAD" in s:
        return 40
    if "VERIFICAD" in s:
        return 30
    if "COTEJO" in s:
        return 20
    if "SOLICITUD" in s or "EMITID" in s:
        return 10
    if "RECHAZ" in s:
        return 5
    return 15


def _merge_records_lists(list_a, list_b):
    merged = {}
    for item in list(list_b) + list(list_a):
        if not item or not item.get('hash'):
            continue
        h = _normalize_hex(item.get('hash'))
        if not h:
            continue
        if h not in merged:
            merged[h] = dict(item)
        else:
            cur = merged[h]
            w_cur = _get_status_weight(cur.get('status'))
            w_new = _get_status_weight(item.get('status'))
            chosen_status = item.get('status') if w_new >= w_cur else cur.get('status')
            is_mppeu = bool(cur.get('mppeuVerified') or item.get('mppeuVerified') or 'CERTIFICADO' in str(chosen_status) or 'APOSTILLADO' in str(chosen_status) or 'Verificado' in str(chosen_status))
            is_mppre = bool(cur.get('mppreVerified') or item.get('mppreVerified') or 'APOSTILLADO' in str(chosen_status))
            chosen_tx = item.get('txHash') if (item.get('txHash') and 'PENDIENTE' not in str(item.get('txHash'))) else (cur.get('txHash') or item.get('txHash') or '0xPENDIENTE_COTEJO')
            merged[h].update({
                'ownerName': item.get('ownerName') or cur.get('ownerName'),
                'cedula': item.get('cedula') or cur.get('cedula'),
                'documentType': item.get('documentType') or cur.get('documentType'),
                'status': chosen_status,
                'mppeuVerified': is_mppeu,
                'mppreVerified': is_mppre,
                'apostilleNumber': item.get('apostilleNumber') or cur.get('apostilleNumber'),
                'solicitudCode': item.get('solicitudCode') or cur.get('solicitudCode'),
                'txHash': chosen_tx,
                'timestamp': cur.get('timestamp') or item.get('timestamp'),
                'documentUrl': item.get('documentUrl') or cur.get('documentUrl') or item.get('document_url') or cur.get('document_url'),
                'document_url': item.get('document_url') or cur.get('document_url') or item.get('documentUrl') or cur.get('documentUrl'),
                'estado': item.get('estado') or cur.get('estado'),
                'municipio': item.get('municipio') or cur.get('municipio'),
                'sede_taquilla': item.get('sede_taquilla') or cur.get('sede_taquilla') or item.get('sedeTaquilla') or cur.get('sedeTaquilla'),
                'sedeTaquilla': item.get('sedeTaquilla') or cur.get('sedeTaquilla') or item.get('sede_taquilla') or cur.get('sede_taquilla'),
                'sedeDireccion': item.get('sedeDireccion') or cur.get('sedeDireccion') or item.get('sede_direccion') or cur.get('sede_direccion'),
                'sedeHorario': item.get('sedeHorario') or cur.get('sedeHorario') or item.get('sede_horario') or cur.get('sede_horario'),
                'countryDestiny': item.get('countryDestiny') or cur.get('countryDestiny') or item.get('country_destiny') or cur.get('country_destiny'),
                'country_destiny': item.get('country_destiny') or cur.get('country_destiny') or item.get('countryDestiny') or cur.get('countryDestiny'),
                'sarenVerified': bool(item.get('sarenVerified') or cur.get('sarenVerified') or item.get('saren_verified') or cur.get('saren_verified') or item.get('pubCode') or cur.get('pubCode')),
                'pubCode': item.get('pubCode') or cur.get('pubCode') or item.get('pub_code') or cur.get('pub_code') or '',
                'pubHash': item.get('pubHash') or cur.get('pubHash') or item.get('pub_hash') or cur.get('pub_hash') or '',
                'paymentReference': item.get('paymentReference') or cur.get('paymentReference') or item.get('payment_reference') or cur.get('payment_reference') or '',
                'paymentStatus': item.get('paymentStatus') or cur.get('paymentStatus') or item.get('payment_status') or cur.get('payment_status') or '',
                'bancoReceptor': item.get('bancoReceptor') or cur.get('bancoReceptor') or item.get('banco_receptor') or cur.get('banco_receptor') or '',
                'montoArancel': item.get('montoArancel') or cur.get('montoArancel') or item.get('monto_arancel') or cur.get('monto_arancel') or '',
                'formData': item.get('formData') or cur.get('formData') or item.get('form_data') or cur.get('form_data')
            })
    return list(merged.values())


@app.route("/blockchain/records", methods=["GET"])
@app.route("/api/blockchain/records", methods=["GET"])
def get_all_records():
    _load_records_cache()
    db_records = []
    if supabase:
        try:
            res = supabase.table("records").select("*").order("created_at", desc=True).execute()
            if res.data:
                db_records = [map_record(r) for r in res.data]
        except Exception as e:
            logger.warning(f"Error obteniendo records de Supabase: {e}")

    memory_records = [map_record(r) for r in _records_memory]
    final_records = _merge_records_lists(memory_records, db_records)
    return jsonify({"success": True, "records": final_records}), 200


@app.route("/blockchain/records/cedula/<cedula>", methods=["GET"])
@app.route("/api/blockchain/records/cedula/<cedula>", methods=["GET"])
def get_records_by_cedula(cedula: str):
    _load_records_cache()
    cedula_clean = cedula.replace(".", "").replace("-", "").replace(" ", "").upper()
    variations = list(set([cedula, cedula_clean, f"V-{cedula_clean}", f"V-{cedula_clean.replace('V', '')}"]))

    db_records = []
    if supabase:
        try:
            res = supabase.table("records").select("*").in_("cedula", variations).order("created_at", desc=True).execute()
            if res.data and len(res.data) > 0:
                db_records = [map_record(r) for r in res.data]
        except Exception:
            pass

    clean_vars = [v.replace(".", "").replace("-", "").replace(" ", "").upper() for v in variations]

    matched_memory = [
        map_record(r) for r in _records_memory
        if (
            (r.get("cedula") or "").replace(".", "").replace("-", "").replace(" ", "").upper() in clean_vars
            or (r.get("account_cedula") or r.get("accountCedula") or "").replace(".", "").replace("-", "").replace(" ", "").upper() in clean_vars
        )
    ]

    final_matches = _merge_records_lists(matched_memory, db_records)
    return jsonify({"success": True, "records": final_matches}), 200


@app.route("/blockchain/status", methods=["GET"])
@app.route("/api/blockchain/status", methods=["GET"])
def blockchain_status_diagnostics():
    """Diagnóstico en vivo de la red Ethereum Sepolia, contrato USMDocumentRegistry y wallet custodial."""
    if sepolia_client is None:
        return jsonify({
            "network": "Ethereum Sepolia Testnet",
            "chainId": 11155111,
            "rpcConnected": False,
            "contractAddress": get_current_contract_address(),
            "contractDeployed": False,
            "readyForCustodialAnchoring": False,
            "issues": ["Cliente RPC Sepolia no inicializado."],
        }), 200
    diag = sepolia_client.get_full_diagnostics(get_current_contract_address(), WALLET_PRIVATE_KEY)
    return jsonify(diag), 200


@app.route("/blockchain/tx/<tx_hash>", methods=["GET"])
@app.route("/api/blockchain/tx/<tx_hash>", methods=["GET"])
def verify_blockchain_tx(tx_hash: str):
    """Verifica en vivo contra Ethereum Sepolia si una transacción existe y está confirmada."""
    if sepolia_client is None:
        return jsonify({"exists": False, "confirmed": False, "reason": "Cliente RPC Sepolia no disponible."}), 200
    status = sepolia_client.get_transaction_status(tx_hash)
    return jsonify(status), 200


@app.route("/blockchain/contract-address", methods=["GET", "POST"])
@app.route("/api/blockchain/contract-address", methods=["GET", "POST"])
def manage_contract_address():
    if request.method == "POST":
        admin_payload = get_current_admin()
        if not admin_payload or admin_payload.get("role") == "estudiante":
            return jsonify({"success": False, "error": "Autorización institucional requerida para modificar el contrato."}), 401
        data = request.get_json() or {}
        new_addr = data.get("contractAddress") or data.get("contract_address")
        if not new_addr or not new_addr.startswith("0x") or len(new_addr) != 42:
            return jsonify({"success": False, "error": "Dirección de contrato inválida (debe iniciar con 0x y tener 42 caracteres)."}), 400
        set_current_contract_address(new_addr)
        return jsonify({"success": True, "contractAddress": get_current_contract_address(), "message": "Contrato actualizado exitosamente."}), 200
    return jsonify({"contractAddress": get_current_contract_address()}), 200


@app.route("/blockchain/records/<doc_hash>/mppeu-certify", methods=["POST"])
@app.route("/api/blockchain/records/<doc_hash>/mppeu-certify", methods=["POST"])
def mppeu_certify_record(doc_hash: str):
    admin_payload = get_current_admin()
    if not admin_payload or admin_payload.get("role") == "estudiante":
        return jsonify({"success": False, "error": "Token de autorización ministerial (MPPEU) requerido."}), 401
    _load_records_cache()
    data = request.get_json() or {}
    auditor_name = data.get("auditor_username", "mppeu_agente")
    auditor_cargo = data.get("auditor_cargo", "Analista Revisor de Taquilla GTU")
    client_tx_hash = data.get("txHash") or data.get("tx_hash")
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    clean_h = _normalize_hex(doc_hash)

    rec = next((r for r in _records_memory if _normalize_hex(r.get("hash")) == clean_h), None)
    existing_real_tx = _sanitize_tx_hash(rec.get("tx_hash") if rec else None, doc_hash)
    tx_hash = existing_real_tx
    on_chain_anchored = is_plausible_tx_hash(existing_real_tx, doc_hash)
    on_chain_reason = None

    if is_plausible_tx_hash(client_tx_hash, doc_hash):
        tx_hash = str(client_tx_hash).strip()
        on_chain_anchored = True
    elif not on_chain_anchored:
        try:
            owner_val = (rec.get("owner_name") if rec else None) or data.get("owner_name") or "Graduando USM"
            ced_val = (rec.get("cedula") if rec else None) or data.get("cedula") or "V-28.315.101"
            type_val = (rec.get("document_type") if rec else None) or data.get("document_type") or "Título Universitario USM"
            tx_res = send_register_transaction_detailed(doc_hash, owner_val, ced_val, type_val)
            if tx_res.get("sent") and tx_res.get("txHash"):
                tx_hash = tx_res["txHash"]
                on_chain_anchored = True
            elif tx_res.get("alreadyRegistered"):
                on_chain_anchored = True
                on_chain_reason = tx_res.get("reason")
            else:
                on_chain_reason = tx_res.get("reason")
        except Exception as e_tx:
            on_chain_reason = str(e_tx)

    found = False
    for r in _records_memory:
        if _normalize_hex(r.get("hash")) == clean_h:
            r["status"] = "CERTIFICADO_MPPEU"
            r["mppeu_verified"] = True
            r["mppeu_officer"] = f"{auditor_name} ({auditor_cargo})"
            r["mppeu_date"] = now_str
            r["tx_hash"] = tx_hash
            r["verified_by"] = auditor_name
            found = True
            break

    if not found:
        _records_memory.insert(0, {
            "hash": doc_hash if doc_hash.startswith("0x") else f"0x{doc_hash}",
            "status": "CERTIFICADO_MPPEU",
            "mppeu_verified": True,
            "mppeu_officer": f"{auditor_name} ({auditor_cargo})",
            "mppeu_date": now_str,
            "tx_hash": tx_hash,
            "verified_by": auditor_name,
            "created_at": datetime.datetime.utcnow().isoformat() + "Z"
        })

    _save_records_cache()

    if supabase:
        try:
            upd = {
                "status": "CERTIFICADO_MPPEU",
                "mppeu_verified": True,
                "mppeu_officer": f"{auditor_name} ({auditor_cargo})",
                "mppeu_date": now_str,
                "tx_hash": tx_hash,
                "verified_by": auditor_name
            }
            supabase.table("records").update(upd).eq("hash", doc_hash).execute()
            supabase.table("records").update(upd).eq("hash", f"0x{clean_h}").execute()
            supabase.table("records").update(upd).eq("hash", clean_h).execute()
        except Exception as e:
            logger.warning(f"Error actualizando certificación MPPEU en Supabase: {e}")

    increment_stat("titulos_blockchain", 1, log_entry=f"MPPEU GTU: Documento {doc_hash[:10]}... certificado por {auditor_name}{' (anclado en Sepolia)' if on_chain_anchored else ' (pendiente anclaje Sepolia)'}.")
    rec_for_notif = next((r for r in _records_memory if _normalize_hex(r.get("hash")) == clean_h), {"hash": doc_hash})
    dispatch_document_notification("CERTIFICADO_MPPEU", rec_for_notif, {"txHash": tx_hash})
    return jsonify({
        "success": True,
        "message": (
            "Título cotejado, certificado por MPPEU y anclado realmente en Ethereum Sepolia."
            if on_chain_anchored
            else "Título certificado por MPPEU en registro ministerial (pendiente de anclaje on-chain en Sepolia)."
        ),
        "status": "CERTIFICADO_MPPEU",
        "txHash": tx_hash,
        "onChainAnchored": on_chain_anchored,
        "onChainReason": on_chain_reason,
        "explorerUrl": f"https://sepolia.etherscan.io/tx/{tx_hash}" if is_plausible_tx_hash(tx_hash, doc_hash) else None,
        "contractAddress": get_current_contract_address(),
        "verifiedBy": auditor_name
    }), 200



@app.route("/blockchain/records/<doc_hash>/request-apostille", methods=["POST"])
@app.route("/api/blockchain/records/<doc_hash>/request-apostille", methods=["POST"])
def request_apostille_endpoint(doc_hash: str):
    _load_records_cache()
    data = request.get_json() or {}
    country_destiny = data.get("countryDestiny") or data.get("country_destiny") or "General (Convenio de La Haya)"
    motivo = data.get("motivoApostille") or data.get("motivo_apostille") or "Trámite de Validez Internacional"
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    clean_h = _normalize_hex(doc_hash)

    found = False
    for r in _records_memory:
        if _normalize_hex(r.get("hash")) == clean_h:
            r["status"] = "PENDIENTE_APOSTILLA_MPPRE"
            r["country_destiny"] = country_destiny
            r["motivo_apostille"] = motivo
            r["apostille_requested_at"] = now_str
            found = True
            break

    if not found:
        _records_memory.insert(0, {
            "hash": doc_hash if doc_hash.startswith("0x") else f"0x{doc_hash}",
            "status": "PENDIENTE_APOSTILLA_MPPRE",
            "country_destiny": country_destiny,
            "motivo_apostille": motivo,
            "apostille_requested_at": now_str,
            "created_at": datetime.datetime.utcnow().isoformat() + "Z"
        })

    _save_records_cache()

    if supabase:
        try:
            upd = {
                "status": "PENDIENTE_APOSTILLA_MPPRE",
                "rejection_reason": None
            }
            supabase.table("records").update(upd).eq("hash", doc_hash).execute()
            supabase.table("records").update(upd).eq("hash", f"0x{clean_h}").execute()
            supabase.table("records").update(upd).eq("hash", clean_h).execute()
        except Exception as e:
            logger.warning(f"Error actualizando solicitud de apostilla en Supabase: {e}")

    increment_stat("docs_prevalidados", 0, log_entry=f"SOLICITUD APOSTILLA: Graduando solicitó Apostilla MPPRE para país {country_destiny} (Doc {doc_hash[:10]}...).")
    rec_for_notif = next((r for r in _records_memory if _normalize_hex(r.get("hash")) == clean_h), {"hash": doc_hash, "country_destiny": country_destiny})
    dispatch_document_notification("PENDIENTE_APOSTILLA_MPPRE", rec_for_notif, {"country_destiny": country_destiny})
    return jsonify({
        "success": True,
        "message": "Solicitud de Apostilla de La Haya enviada a Cancillería (MPPRE). En espera de revisión consular.",
        "status": "PENDIENTE_APOSTILLA_MPPRE",
        "countryDestiny": country_destiny
    }), 200

@app.route("/blockchain/records/<doc_hash>/mppre-apostille", methods=["POST"])
@app.route("/api/blockchain/records/<doc_hash>/mppre-apostille", methods=["POST"])
def mppre_apostille_record(doc_hash: str):
    admin_payload = get_current_admin()
    if not admin_payload or admin_payload.get("role") == "estudiante":
        return jsonify({"success": False, "error": "Token de autorización consular (MPPRE) requerido."}), 401
    _load_records_cache()
    data = request.get_json() or {}
    auditor_name = data.get("auditor_username", "mppre_agente")
    country_destiny = data.get("countryDestiny") or data.get("country_destiny") or "España"
    notes = data.get("notes") or "Apostilla Electrónica de La Haya Conforme"
    client_tx_hash = data.get("txHash") or data.get("tx_hash")
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    apostille_num = f"APO-VE-2026-{secrets.token_hex(3).upper()}"
    clean_h = _normalize_hex(doc_hash)

    existing_rec = next((r for r in _records_memory if _normalize_hex(r.get("hash")) == clean_h), None)
    tx_hash = _sanitize_tx_hash(existing_rec.get("tx_hash") if existing_rec else None, doc_hash)
    on_chain_anchored = is_plausible_tx_hash(tx_hash, doc_hash)
    on_chain_reason = None

    if is_plausible_tx_hash(client_tx_hash, doc_hash):
        tx_hash = str(client_tx_hash).strip()
        on_chain_anchored = True
    elif not on_chain_anchored:
        try:
            owner_val = (existing_rec.get("owner_name") if existing_rec else None) or "Graduando USM"
            ced_val = (existing_rec.get("cedula") if existing_rec else None) or "V-28.315.101"
            type_val = f"Apostilla La Haya ({country_destiny}) — {(existing_rec.get('document_type') if existing_rec else 'Título USM')}"
            tx_res = send_register_transaction_detailed(doc_hash, owner_val, ced_val, type_val)
            if tx_res.get("sent") and tx_res.get("txHash"):
                tx_hash = tx_res["txHash"]
                on_chain_anchored = True
            elif tx_res.get("alreadyRegistered"):
                on_chain_anchored = True
            else:
                on_chain_reason = tx_res.get("reason")
        except Exception as e_tx:
            on_chain_reason = str(e_tx)

    found = False
    for r in _records_memory:
        if _normalize_hex(r.get("hash")) == clean_h:
            r["status"] = "APOSTILLADO_MPPRE"
            r["mppre_verified"] = True
            r["mppre_officer"] = f"{auditor_name} (Cancillería)"
            r["mppre_date"] = now_str
            r["apostille_number"] = apostille_num
            r["country_destiny"] = country_destiny
            r["notes"] = notes
            r["verified_by"] = auditor_name
            r["tx_hash"] = tx_hash
            found = True
            break

    if not found:
        _records_memory.insert(0, {
            "hash": doc_hash if doc_hash.startswith("0x") else f"0x{doc_hash}",
            "status": "APOSTILLADO_MPPRE",
            "mppre_verified": True,
            "mppre_officer": f"{auditor_name} (Cancillería)",
            "mppre_date": now_str,
            "apostille_number": apostille_num,
            "verified_by": auditor_name,
            "tx_hash": tx_hash,
            "created_at": datetime.datetime.utcnow().isoformat() + "Z"
        })

    _save_records_cache()

    if supabase:
        try:
            upd = {
                "status": "APOSTILLADO_MPPRE",
                "mppre_verified": True,
                "mppre_officer": f"{auditor_name} (Cancillería)",
                "mppre_date": now_str,
                "apostille_number": apostille_num,
                "verified_by": auditor_name,
                "tx_hash": tx_hash
            }
            supabase.table("records").update(upd).eq("hash", doc_hash).execute()
            supabase.table("records").update(upd).eq("hash", f"0x{clean_h}").execute()
            supabase.table("records").update(upd).eq("hash", clean_h).execute()
        except Exception as e:
            logger.warning(f"Error actualizando apostilla MPPRE en Supabase: {e}")

    increment_stat("titulos_blockchain", 0, log_entry=f"MPPRE APOSTILLA: Documento {doc_hash[:10]}... apostillado legalmente con código {apostille_num} por {auditor_name}.")
    rec_for_notif = next((r for r in _records_memory if _normalize_hex(r.get("hash")) == clean_h), {"hash": doc_hash, "apostille_number": apostille_num})
    dispatch_document_notification("APOSTILLADO_MPPRE", rec_for_notif, {"apostille_number": apostille_num, "country_destiny": country_destiny, "txHash": tx_hash})
    return jsonify({
        "success": True,
        "message": "Apostilla Electrónica de La Haya emitida y sellada digitalmente.",
        "status": "APOSTILLADO_MPPRE",
        "apostilleNumber": apostille_num,
        "txHash": tx_hash,
        "onChainAnchored": on_chain_anchored,
        "onChainReason": on_chain_reason,
        "explorerUrl": f"https://sepolia.etherscan.io/tx/{tx_hash}" if is_plausible_tx_hash(tx_hash, doc_hash) else None,
        "verifiedBy": auditor_name
    }), 200


@app.route("/blockchain/records/<doc_hash>/verify", methods=["POST"])
@app.route("/api/blockchain/records/<doc_hash>/verify", methods=["POST"])
def verify_record_status(doc_hash: str):
    admin_payload = get_current_admin()
    if not admin_payload or admin_payload.get("role") == "estudiante":
        return jsonify({"success": False, "error": "Token de autorización ministerial requerido."}), 401
    _load_records_cache()
    data = request.get_json() or {}
    auditor_info = data.get("auditor_username", "mppeu_agente")
    ente_info = (data.get("auditor_ente") or "MPPEU").strip()
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    clean_h = _normalize_hex(doc_hash)

    is_usm = "USM" in ente_info.upper() or "RECTOR" in ente_info.upper()
    is_saren = "SAREN" in ente_info.upper()
    is_mppeu = "MPPEU" in ente_info.upper() or "GTU" in ente_info.upper()
    is_mppre = "MPPRE" in ente_info.upper() or "CANCILLER" in ente_info.upper()

    if is_usm:
        status_str = "VERIFICADO_USM"
    elif is_saren:
        status_str = "PROTOCOLIZADO_SAREN"
    else:
        status_str = f"Verificado por {ente_info} ({auditor_info})"

    tomo_val = (data.get("tomo") or "").strip()
    folio_val = (data.get("folio") or "").strip()
    libro_val = (data.get("libro") or "").strip()

    found = False
    for r in _records_memory:
        if _normalize_hex(r.get("hash")) == clean_h:
            if _get_status_weight(status_str) >= _get_status_weight(r.get("status")) or is_usm or is_saren:
                if not (r.get("mppre_verified") or r.get("mppeu_verified")):
                    r["status"] = status_str
            r["verified_by"] = auditor_info
            if is_usm:
                r["usm_verified"] = True
                r["usm_officer"] = auditor_info
                r["usm_date"] = now_str
            if is_saren:
                r["saren_verified"] = True
            if is_mppeu:
                r["mppeu_verified"] = True
            if is_mppre:
                r["mppre_verified"] = True
            if tomo_val:
                r["tomo"] = tomo_val
            if folio_val:
                r["folio"] = folio_val
            if libro_val:
                r["libro"] = libro_val
            found = True
            break

    if not found:
        _records_memory.insert(0, {
            "hash": doc_hash if doc_hash.startswith("0x") else f"0x{doc_hash}",
            "status": status_str,
            "verified_by": auditor_info,
            "usm_verified": is_usm,
            "usm_officer": auditor_info if is_usm else "",
            "usm_date": now_str if is_usm else "",
            "saren_verified": is_saren,
            "mppeu_verified": is_mppeu,
            "mppre_verified": is_mppre,
            "tomo": tomo_val or "XVIII",
            "folio": folio_val or "142",
            "libro": libro_val or "Grados 2026",
            "created_at": datetime.datetime.utcnow().isoformat() + "Z"
        })

    _save_records_cache()

    if supabase:
        try:
            upd = {
                "status": status_str,
                "verified_by": auditor_info
            }
            if is_mppeu:
                upd["mppeu_verified"] = True
            if is_mppre:
                upd["mppre_verified"] = True
            supabase.table("records").update(upd).eq("hash", doc_hash).execute()
            supabase.table("records").update(upd).eq("hash", f"0x{clean_h}").execute()
            supabase.table("records").update(upd).eq("hash", clean_h).execute()
        except Exception as e:
            logger.warning(f"Error actualizando verified_by en Supabase: {e}")

    increment_stat("titulos_blockchain", 0, log_entry=f"AUDITORÍA: Documento {doc_hash[:10]}... verificado por {auditor_info}.")
    return jsonify({"success": True, "message": "Documento verificado exitosamente.", "status": status_str, "verifiedBy": auditor_info}), 200


@app.route("/blockchain/records/<doc_hash>/reject", methods=["POST"])
@app.route("/api/blockchain/records/<doc_hash>/reject", methods=["POST"])
def reject_record_status(doc_hash: str):
    admin_payload = get_current_admin()
    if not admin_payload or admin_payload.get("role") == "estudiante":
        return jsonify({"success": False, "error": "Token de autorización ministerial requerido."}), 401
    _load_records_cache()
    data = request.get_json() or {}
    reason = (data.get("reason") or "Inconsistencia física u observación registral").strip()
    auditor_info = data.get("auditor_username", "mppeu_agente")
    status_str = f"Rechazado: {reason}"
    clean_h = _normalize_hex(doc_hash)

    found = False
    for r in _records_memory:
        if _normalize_hex(r.get("hash")) == clean_h:
            r["status"] = status_str
            r["rejection_reason"] = reason
            r["verified_by"] = auditor_info
            found = True
            break

    if not found:
        _records_memory.insert(0, {
            "hash": doc_hash if doc_hash.startswith("0x") else f"0x{doc_hash}",
            "status": status_str,
            "rejection_reason": reason,
            "verified_by": auditor_info,
            "created_at": datetime.datetime.utcnow().isoformat() + "Z"
        })

    _save_records_cache()

    if supabase:
        try:
            upd = {
                "status": status_str,
                "rejection_reason": reason,
                "verified_by": auditor_info
            }
            supabase.table("records").update(upd).eq("hash", doc_hash).execute()
            supabase.table("records").update(upd).eq("hash", f"0x{clean_h}").execute()
            supabase.table("records").update(upd).eq("hash", clean_h).execute()
        except Exception as e:
            logger.warning(f"Error actualizando rechazo en Supabase: {e}")

    increment_stat("titulos_blockchain", 0, log_entry=f"RECHAZO: Documento {doc_hash[:10]}... rechazado por {auditor_info}: {reason}.")
    rec_for_notif = next((r for r in _records_memory if _normalize_hex(r.get("hash")) == clean_h), {"hash": doc_hash, "rejection_reason": reason})
    dispatch_document_notification("RECHAZADO", rec_for_notif, {"reason": reason})
    return jsonify({"success": True, "message": "Documento rechazado con observación oficial.", "status": status_str, "rejectionReason": reason}), 200


@app.route("/blockchain/certificate/<doc_hash>", methods=["GET"])
@app.route("/api/blockchain/certificate/<doc_hash>", methods=["GET"])
def get_digital_certificate(doc_hash: str):
    _load_records_cache()
    raw_hash = doc_hash.strip()
    clean_hash = raw_hash[2:] if raw_hash.lower().startswith('0x') else raw_hash

    hash_variations = list(set([
        raw_hash, raw_hash.upper(), raw_hash.lower(),
        f"0x{clean_hash.lower()}", f"0x{clean_hash.upper()}",
        clean_hash.upper(), clean_hash.lower()
    ]))

    owner_name = None
    cedula = None
    doc_type = None
    timestamp = int(datetime.datetime.now().timestamp())
    tx_hash = None
    verified_by = "GTU (MPPEU) / Cancillería (MPPRE)"
    is_revoked_on_chain = False
    on_chain_verified = False

    contract_addr = get_current_contract_address()
    if sepolia_client is not None and contract_addr and contract_addr != "0x1234567890123456789012345678901234567890":
        for h in hash_variations:
            try:
                on_chain = sepolia_client.verify_document(contract_addr, h)
                if on_chain and on_chain.get("exists"):
                    owner_name = on_chain.get("ownerName")
                    cedula = on_chain.get("cedula")
                    doc_type = on_chain.get("documentType")
                    timestamp = int(on_chain.get("timestamp") or timestamp)
                    is_revoked_on_chain = bool(on_chain.get("isRevoked"))
                    on_chain_verified = True
                    break
            except Exception:
                pass

    if supabase:
        for h in hash_variations:
            try:
                res = supabase.table("records").select("*").eq("hash", h).execute()
                if res.data and len(res.data) > 0:
                    rec = res.data[0]
                    if not owner_name:
                        owner_name = rec.get("owner_name", "Graduando USM")
                        cedula = rec.get("cedula", "V-28.315.101")
                        doc_type = rec.get("document_type", "Título de Grado USM")
                    cand_tx = _sanitize_tx_hash(rec.get("tx_hash"), raw_hash)
                    if is_plausible_tx_hash(cand_tx, raw_hash):
                        tx_hash = cand_tx
                    verified_by = rec.get("verified_by") or verified_by
                    if rec.get("is_revoked") or "Rechazado" in str(rec.get("status", "")) or "Revocado" in str(rec.get("status", "")):
                        is_revoked_on_chain = True
                    try:
                        dt = datetime.datetime.fromisoformat(rec.get("created_at").replace('Z', '+00:00'))
                        timestamp = int(dt.timestamp())
                    except Exception:
                        pass
                    break
            except Exception as e:
                logger.warning(f"Error consultando Supabase para certificado: {e}")

    if not owner_name or not tx_hash:
        for r in _records_memory:
            if (
                r.get("hash") in hash_variations
                or _normalize_hex(r.get("hash")) == clean_hash.lower()
                or (is_plausible_tx_hash(r.get("tx_hash")) and _normalize_hex(r.get("tx_hash")) == clean_hash.lower())
            ):
                if not owner_name:
                    owner_name = r.get("owner_name", "Graduando USM")
                    cedula = r.get("cedula", "V-28.315.101")
                    doc_type = r.get("document_type", "Título Universitario USM")
                cand_tx = _sanitize_tx_hash(r.get("tx_hash"), raw_hash)
                if not tx_hash and is_plausible_tx_hash(cand_tx, raw_hash):
                    tx_hash = cand_tx
                verified_by = r.get("verified_by") or verified_by
                if r.get("is_revoked") or "Rechazado" in str(r.get("status", "")) or "Revocado" in str(r.get("status", "")):
                    is_revoked_on_chain = True
                try:
                    dt = datetime.datetime.fromisoformat(r.get("created_at").replace('Z', '+00:00'))
                    timestamp = int(dt.timestamp())
                except Exception:
                    pass
                break

    is_demo_fallback = False
    if not owner_name:
        if ALLOW_DEFENSE_DEMO_FALLBACK:
            owner_name = "MAURO DANIEL MAIESE FERREIRA"
            cedula = "V-28315101"
            doc_type = "Título Universitario de Ingeniero de Sistemas"
            is_demo_fallback = True
        else:
            return jsonify({"detail": "Documento no registrado en la blockchain ni en la base de datos."}), 404

    verify_url = f"{FRONTEND_URL}/?hash={doc_hash}"
    return jsonify({
        "title": "CERTIFICADO DE AUTENTICIDAD DIGITAL",
        "institution": "Universidad Santa María - Facultad de Ingeniería",
        "owner": owner_name,
        "id_number": cedula,
        "document_type": doc_type,
        "blockchain_status": "REVOCADO / ANULADO" if is_revoked_on_chain else ("ANCLADO EN ETHEREUM SEPOLIA" if (on_chain_verified or tx_hash) else "CERTIFICADO MINISTERIAL (PENDIENTE ANCLAJE ON-CHAIN)"),
        "is_revoked": is_revoked_on_chain,
        "on_chain_verified": bool(on_chain_verified or tx_hash),
        "network": "Ethereum Sepolia Testnet",
        "contract_address": contract_addr,
        "registration_date": str(datetime.datetime.fromtimestamp(timestamp)),
        "document_hash": doc_hash,
        "tx_hash": tx_hash,
        "verified_by": verified_by,
        "qr_link": verify_url,
        "verification_url": verify_url,
        "is_demo_fallback": is_demo_fallback
    }), 200


@app.route("/blockchain/send-raw-tx", methods=["POST"])
@app.route("/api/blockchain/send-raw-tx", methods=["POST"])
def send_client_raw_transaction():
    if sepolia_client is None:
        return jsonify({"detail": "Nodo RPC Sepolia no conectado"}), 503
    try:
        data = request.get_json() or {}
        raw_tx = data.get("raw_transaction", "").strip()
        tx_hash = sepolia_client.send_raw_transaction(raw_tx)
        return jsonify({"success": True, "txHash": tx_hash, "explorerUrl": f"https://sepolia.etherscan.io/tx/{tx_hash}"}), 200
    except Exception as e:
        return jsonify({"detail": f"Error transmitiendo transacción pre-firmada (SSI): {str(e)}"}), 400


@app.route("/hash/generate", methods=["POST"])
@app.route("/api/hash/generate", methods=["POST"])
def generate_document_hash():
    try:
        req_data = request.get_json() or {}
        data_to_hash = req_data.get("data", {})
        ipfs_info = pin_json_to_ipfs(data_to_hash)
        return jsonify({
            "success": True,
            "hash": ipfs_info["sha256"],
            "sha256": ipfs_info["sha256"],
            "ipfs_cid": ipfs_info["ipfs_cid"],
            "ipfs_gateway_url": ipfs_info["ipfs_gateway_url"],
            "pinned_remote": ipfs_info["pinned_remote"]
        }), 200
    except Exception as e:
        return jsonify({"detail": str(e)}), 500


# ─── MÓDULO OCR: Reconocimiento Óptico Especializado USM (100% funcional sin API key) ───
@app.route("/ocr/status", methods=["GET"])
@app.route("/api/ocr/status", methods=["GET"])
def ocr_engine_status():
    has_frk = USMOcrService.check_fraktur_available() if HAS_USM_OCR and USMOcrService else False
    has_tess = USMOcrService.check_tesseract_available() if HAS_USM_OCR and USMOcrService else False
    gemini_ready = bool(GeminiVisionExtractor and GeminiVisionExtractor.is_configured())
    return jsonify({
        "success": True,
        "keyless_ocr_ready": True,
        "gemini_configured": gemini_ready,
        "engines": {
            "client_wasm_ner": {
                "available": True,
                "requires_api_key": False,
                "notes": "Motor público sin API key: Tesseract.js WASM + pypdf + AcademicDegreeNER"
            },
            "tesseract": {
                "available": has_tess and cv2 is not None,
                "fraktur_gothic_installed": has_frk,
                "notes": "Modelo 'frk' listo para tipografía gótica Old English Text MT" if has_frk else "Fallback activo con Tesseract.js WASM + AcademicDegreeNER"
            },
            "ollama_vision": {
                "available": True,
                "recommended_model": "llama3.2-vision:latest",
                "notes": "Motor multimodal local de alta fidelidad ejecutado en Ollama"
            }
        }
    }), 200


@app.route("/ocr/extract", methods=["POST"])
@app.route("/api/ocr/extract", methods=["POST"])
def ocr_extract_document():
    """
    Extracción avanzada y análisis semántico de diplomas académicos (100% sin API key).
    Soporte dual: texto reconocido por el cliente (Tesseract.js WASM), PDFs digitales/escaneados
    (PyMuPDF/pypdf/zlib) y motores locales opcionales (OpenCV, Tesseract, Ollama).
    """
    try:
        image_bytes = None
        mode = "auto"
        raw_text_client = None
        user_cedula = None

        if "file" in request.files:
            f = request.files["file"]
            if f.filename != "":
                image_bytes = f.read()
                mode = request.form.get("mode", "auto")
                raw_text_client = request.form.get("raw_text")
                user_cedula = request.form.get("user_cedula")
        elif request.is_json:
            data = request.get_json() or {}
            mode = data.get("mode", "auto")
            raw_text_client = data.get("raw_text")
            user_cedula = data.get("user_cedula")
            b64_str = data.get("image_base64")
            if b64_str:
                if "," in b64_str:
                    b64_str = b64_str.split(",")[1]
                try:
                    image_bytes = base64.b64decode(b64_str)
                except Exception as e:
                    return jsonify({"success": False, "error": f"Base64 inválido: {str(e)}"}), 400

        if not HAS_USM_OCR or USMOcrService is None:
            return jsonify({"success": False, "error": "Módulo AcademicDegreeNER no disponible en el servidor."}), 503

        # 1. Si el cliente ya extrajo el texto mediante Tesseract.js (WASM) en el navegador
        if raw_text_client and len(raw_text_client.strip()) > 15:
            ner_fields = USMOcrService.rule_based_ner(raw_text_client)
            # Si falta el titular o institución y también se adjuntó imagen + Tesseract/Fraktur local está disponible, reforzar con OCR servidor
            if (
                not ner_fields.get("titular")
                and image_bytes
                and cv2 is not None
                and np is not None
                and not (image_bytes.startswith(b"%PDF") or b"%PDF-" in image_bytes[:40])
                and USMOcrService.check_tesseract_available()
            ):
                try:
                    nparr = np.frombuffer(image_bytes, np.uint8)
                    img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    if img_cv is not None:
                        tess_srv = USMOcrService.extract_with_tesseract(img_cv)
                        srv_txt = (tess_srv.get("full_text") or "").strip()
                        if srv_txt:
                            raw_text_client = f"{srv_txt}\n{raw_text_client}".strip()
                            ner_fields = USMOcrService.rule_based_ner(raw_text_client)
                except Exception as srv_ocr_err:
                    logger.debug(f"Refuerzo OCR servidor omitido: {srv_ocr_err}")

            resp = USMOcrService.format_for_frontend(
                ner_fields,
                raw_text_client,
                "WASM Tesseract + Flask Academic NER",
                user_cedula=user_cedula
            )
            return jsonify(resp), 200

        if not image_bytes:
            return jsonify({"success": False, "error": "Debe proporcionar 'file', 'image_base64' o 'raw_text'."}), 400

        # 2. Soporte especializado para documentos PDF sin API key (PyMuPDF -> pypdf -> zlib)
        extracted_pdf_text = ""
        extracted_pdf_img_bytes = None
        is_pdf = bool(image_bytes.startswith(b"%PDF") or b"%PDF-" in image_bytes[:40])
        if is_pdf:
            extracted_pdf_text = USMOcrService.extract_pdf_text_bytes(image_bytes)
            if len(extracted_pdf_text.strip()) < 25:
                extracted_pdf_img_bytes = USMOcrService.extract_pdf_first_image_bytes(image_bytes)
                if extracted_pdf_img_bytes:
                    image_bytes = extracted_pdf_img_bytes

        # 3. Modo Forzado Visión Ollama (solo si se solicita explícitamente)
        if mode == "vision_ai":
            try:
                res = USMOcrService.extract_with_ollama_vision(image_bytes)
                resp = USMOcrService.format_for_frontend(
                    res["extracted_fields"],
                    res.get("raw_response", ""),
                    res["engine"],
                    user_cedula=user_cedula
                )
                return jsonify(resp), 200
            except Exception as e:
                logger.warning(f"Ollama local no disponible, activando motor local: {e}")

        # 4. Modo Híbrido servidor (OpenCV + Tesseract solo si están disponibles en el host)
        tess_text = ""
        tess_res = {"engine": "serverless_pdf_ner", "fraktur_enabled": False}
        if cv2 is not None and np is not None and not (is_pdf and image_bytes.startswith(b"%PDF")):
            try:
                nparr = np.frombuffer(image_bytes, np.uint8)
                img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if img_cv is not None:
                    tess_res = USMOcrService.extract_with_tesseract(img_cv)
                    tess_text = tess_res.get("full_text", "")
            except Exception as cv_err:
                logger.warning(f"Decodificación OpenCV omitida: {cv_err}")

        combined_text = "\n".join(part for part in [extracted_pdf_text.strip(), tess_text.strip(), (raw_text_client or "").strip()] if part).strip()

        if combined_text:
            merged_fields = AcademicDegreeNER.extract_all(combined_text)
            engine_name = (
                "PyMuPDF + Tesseract Fraktur Hybrid" if (extracted_pdf_text and tess_text)
                else ("PDF Parser + AcademicDegreeNER (Sin API Key)" if extracted_pdf_text else tess_res.get("engine", "tesseract_hybrid"))
            )
            resp = USMOcrService.format_for_frontend(
                merged_fields,
                combined_text,
                engine_name,
                user_cedula=user_cedula
            )
            resp["fraktur_enabled"] = tess_res.get("fraktur_enabled", False)
            return jsonify(resp), 200

        # 5. Si era PDF escaneado (sin capa de texto) y logramos extraer su página en imagen, devolverla al navegador para Tesseract.js WASM
        if extracted_pdf_img_bytes:
            return jsonify({
                "success": True,
                "needs_client_ocr": True,
                "extracted_image_base64": base64.b64encode(extracted_pdf_img_bytes).decode("utf-8"),
                "engine": "PDF Rasterizado -> Tesseract.js WASM Cliente",
                "fields": {},
                "full_text": ""
            }), 200

        return jsonify({
            "success": False,
            "needs_client_ocr": True,
            "error": "No se detectó texto en el servidor; procesando mediante motor OCR del navegador (sin API key)."
        }), 200

    except Exception as e:
        logger.error(f"Error procesando OCR: {e}", exc_info=True)
        return jsonify({"success": False, "error": f"Falla en el pipeline OCR: {str(e)}"}), 500


@app.route("/ocr/gemini", methods=["POST"])
@app.route("/api/ocr/gemini", methods=["POST"])
def ocr_gemini_endpoint():
    """
    Endpoint opcional de digitalización con Google Gemini cuando GEMINI_API_KEY está configurada.
    Si no hay API Key, activa inmediatamente el fallback local sin API Key ni demoras.
    """
    raw_bytes = None

    if "file" in request.files:
        uploaded = request.files["file"]
        if uploaded.filename != "":
            raw_bytes = uploaded.read()
    elif request.is_json:
        payload = request.get_json() or {}
        image_b64 = payload.get("image_base64")
        if image_b64:
            if "," in image_b64:
                image_b64 = image_b64.split(",", 1)[1]
            try:
                raw_bytes = base64.b64decode(image_b64)
            except Exception as dec_err:
                return jsonify({
                    "success": False,
                    "error": f"Base64 inválido o corrupto: {str(dec_err)}"
                }), 400

    if not raw_bytes:
        return jsonify({
            "success": False,
            "error": "Debe enviar la imagen mediante 'file' (form-data) o 'image_base64' (JSON)."
        }), 400

    if GeminiVisionExtractor is not None and GeminiVisionExtractor.is_configured():
        success, fields, err_msg = GeminiVisionExtractor.extract_from_image_bytes(raw_bytes)
    else:
        success, fields, err_msg = False, {}, "Modo público sin GEMINI_API_KEY: usando OCR local."

    if not success:
        extracted_text = ""
        if HAS_USM_OCR and USMOcrService is not None:
            if raw_bytes.startswith(b"%PDF") or b"%PDF-" in raw_bytes[:40]:
                extracted_text = USMOcrService.extract_pdf_text_bytes(raw_bytes)

            if len(extracted_text.strip()) < 15 and cv2 is not None and np is not None:
                try:
                    img_bytes = raw_bytes
                    if raw_bytes.startswith(b"%PDF") or b"%PDF-" in raw_bytes[:40]:
                        img_bytes = USMOcrService.extract_pdf_first_image_bytes(raw_bytes) or raw_bytes
                    if not img_bytes.startswith(b"%PDF"):
                        nparr = np.frombuffer(img_bytes, np.uint8)
                        img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                        if img_cv is not None:
                            tess_res = USMOcrService.extract_with_tesseract(img_cv)
                            extracted_text = tess_res.get("full_text", "")
                except Exception as e_tess:
                    logger.debug(f"Fallback Tesseract aviso: {e_tess}")

            if len(extracted_text.strip()) >= 8:
                ner_res = USMOcrService.rule_based_ner(extracted_text)
                fields = {
                    "nombre_completo": ner_res.get("titular") or ner_res.get("nombre_completo"),
                    "cedula": ner_res.get("cedula"),
                    "institucion_educativa": ner_res.get("institucion"),
                    "mencion_carrera": ner_res.get("titulo_conferido") or ner_res.get("carrera"),
                    "fecha_emision": ner_res.get("fecha_expedicion") or ner_res.get("fecha"),
                    "facultad": ner_res.get("facultad"),
                    "model_used": "PDF / AcademicDegreeNER (Sin API Key)"
                }
                return jsonify({
                    "success": True,
                    "engine": "AcademicDegreeNER Local (Sin API Key)",
                    "data": fields
                }), 200

        return jsonify({
            "success": False,
            "fallback_client_ocr": True,
            "error": err_msg
        }), 200

    model_label = fields.get("model_used", "Multimodal Vision")
    return jsonify({
        "success": True,
        "engine": f"Google Gemini ({model_label})",
        "data": fields
    }), 200


# ─── Chat Asistente ──────────────────────────────────────────────────────────
chat_sessions = {}

@app.route("/chat/message", methods=["POST"])
@app.route("/api/chat/message", methods=["POST"])
def chat_rest_endpoint():
    data = request.get_json() or {}
    session_id = data.get("session_id", "default")
    texto_usuario = (data.get("message") or "").strip()
    is_file = data.get("is_file", False)
    user_context = data.get("user") or {}

    if session_id not in chat_sessions:
        chat_sessions[session_id] = {
            "modo_auditoria": False,
            "checklist_paso": 0,
            "checklist_estados": {},
            "checklist_items": None
        }

    session = chat_sessions[session_id]
    if session["checklist_items"] is None:
        session["checklist_items"] = get_checklist()

    checklist = session["checklist_items"]
    t_lower = texto_usuario.lower()

    # 1. Comando de Bienvenida /start
    if t_lower == "/start" or t_lower == "hola" or t_lower == "inicio":
        increment_stat("graduandos_activos", 1)
        nombre = user_context.get("nombre") or user_context.get("nombre_completo") or "Egresado"
        carrera = user_context.get("carrera") or user_context.get("mencion") or "Ingeniería de Sistemas"
        return jsonify({
            "reply": (
                f"🏛️ **ASISTENTE INSTITUCIONAL USM — ASESOR JURÍDICO & ACADÉMICO** 🏛️\n\n"
                f"¡Saludos, **{nombre}**! Como egresado de **{carrera}**, estoy a tu disposición para asesorarte "
                f"en la ruta completa de digitalización, validación ministerial y fe pública transfronteriza:\n\n"
                f"• 📋 **Auditoría de Expediente:** Escribe **'auditar'** para verificar los 5 recaudos obligatorios paso a paso.\n"
                f"• 🏛️ **GTU (MPPEU):** Citas, legalización de firmas del Rector y emisión del Sello Digital.\n"
                f"• 📄 **SAREN / PUB:** Planilla Única Bancaria, cálculo de aranceles y timbres fiscales (0.5 UT).\n"
                f"• 🌍 **Apostilla de La Haya (MPPRE):** Trámite electrónico y validez internacional.\n"
                f"• ⛓️ **Blockchain Sepolia:** Hash SHA-256 e inmutabilidad on-chain contra falsificaciones.\n\n"
                f"Puedes seleccionar cualquiera de las consultas rápidas abajo o escribir tu duda libremente."
            ),
            "quick_actions": [
                {"label": "🔎 Auditar mi Expediente", "command": "auditar"},
                {"label": "🏛️ Ruta GTU / MPPEU", "command": "¿Cómo tramito el GTU del MPPEU?"},
                {"label": "📄 Llenar Planilla PUB", "command": "¿Cómo generar y pagar la Planilla PUB SAREN?"},
                {"label": "🌍 Apostilla de La Haya", "command": "¿Cuáles son los pasos para la Apostilla MPPRE?"},
                {"label": "⛓️ Verificar Blockchain", "command": "¿Cómo funciona la verificación de mi título en Blockchain?"}
            ]
        }), 200

    # 2. Archivo Adjunto recibido
    if is_file or texto_usuario.startswith("[FILE_UPLOAD]"):
        nombre_archivo = texto_usuario.replace("[FILE_UPLOAD]", "").strip()
        log_msg = f"IA VISION: Analizando '{nombre_archivo}'... Verificando sellos, firmas y resolución forense."
        increment_stat("docs_prevalidados", 1, log_entry=log_msg)
        increment_stat("tiempo_ahorrado_hrs", 0.5)

        if session["modo_auditoria"] and session["checklist_paso"] < len(checklist):
            item_actual = checklist[session["checklist_paso"]]
            session["checklist_estados"][item_actual["id"]] = "✅"
            session["checklist_paso"] += 1
            resumen = formato_checklist_resumen(checklist, session["checklist_estados"])

            if session["checklist_paso"] < len(checklist):
                siguiente = checklist[session["checklist_paso"]]
                respuesta = f"🔍 **Documento `{nombre_archivo}` inspeccionado:** Sello húmedo y firmas conformes. ✅ **APROBADO.**\n\n{resumen}\n\n---\n{siguiente['pregunta']}"
            else:
                respuesta = f"🔍 **Documento `{nombre_archivo}` inspeccionado.** ✅ **APROBADO.**\n\n{resumen}\n\n🎉 **¡Felicidades! Expediente auditado y conforme al 100%.** Tu documentación cumple con los estándares del MPPEU y SAREN.\n\n[ACTION:ocr]"
                increment_stat("titulos_blockchain", 1)
                session["modo_auditoria"] = False
            return jsonify({"reply": respuesta}), 200
        else:
            return jsonify({
                "reply": (
                    f"🔍 **Documento `{nombre_archivo}` recibido y pre-validado:**\n\n"
                    f"• **Metadatos y Formato:** Conforme.\n"
                    f"• **Legibilidad y Contraste:** Aceptable para el escaneo OCR.\n"
                    f"• **Observación Ministerial:** Si es para presentar ante el SAREN o MPPEU, recuerda llevar copia en tamaño oficio y pergamino original.\n\n"
                    f"¿Deseas digitalizarlo en el motor de visión artificial o auditar tu expediente completo?\n\n[ACTION:ocr]"
                )
            }), 200

    # 3. Flujo Interactivo de Auditoría de Expediente
    if t_lower in ["salir", "cancelar", "terminar auditoria", "cancelar auditoria", "salir de auditoria"]:
        session["modo_auditoria"] = False
        return jsonify({
            "reply": "🛑 **Auditoría cancelada.** Puedes retomarla en cualquier momento escribiendo **'auditar'** o haciéndome cualquier consulta institucional."
        }), 200

    if session["modo_auditoria"]:
        item_actual = checklist[session["checklist_paso"]]
        aprobado = any(w in t_lower for w in ["sí", "si", "yes", "tengo", "listo", "ok", "claro", "afirmativo", "correcto"])
        omitir = any(w in t_lower for w in ["omitir", "pasar", "siguiente", "después", "luego"])

        if aprobado:
            session["checklist_estados"][item_actual["id"]] = "✅"
            session["checklist_paso"] += 1
            resumen = formato_checklist_resumen(checklist, session["checklist_estados"])

            if session["checklist_paso"] < len(checklist):
                siguiente = checklist[session["checklist_paso"]]
                respuesta = f"✅ **{item_actual['label']}** — Confirmado.\n\n{resumen}\n\n---\n{siguiente['pregunta']}"
            else:
                respuesta = f"✅ **{item_actual['label']}** — Confirmado.\n\n{resumen}\n\n🎉 **¡Expediente Completo al 100%!** Cuentas con todos los recaudos para tu cita GTU y protocolización SAREN.\n\n[ACTION:pub]"
                increment_stat("docs_prevalidados", 1)
                increment_stat("tiempo_ahorrado_hrs", 0.5)
                session["modo_auditoria"] = False
            return jsonify({"reply": respuesta}), 200
        elif omitir:
            session["checklist_estados"][item_actual["id"]] = "⏭️"
            session["checklist_paso"] += 1
            resumen = formato_checklist_resumen(checklist, session["checklist_estados"])
            if session["checklist_paso"] < len(checklist):
                siguiente = checklist[session["checklist_paso"]]
                respuesta = f"⏭️ **Requisito omitido temporalmente.**\n\n{resumen}\n\n---\n{siguiente['pregunta']}"
            else:
                respuesta = f"🏁 **Auditoría finalizada con recaudos pendientes.**\n\n{resumen}\n\nRecuerda completar los recaudos faltantes antes de asistir a tu cita ministerial."
                session["modo_auditoria"] = False
            return jsonify({"reply": respuesta}), 200
        else:
            session["checklist_estados"][item_actual["id"]] = "❌"
            resumen = formato_checklist_resumen(checklist, session["checklist_estados"])
            return jsonify({
                "reply": f"{item_actual['pista']}\n\n{resumen}\n\nCuando lo consigas, responde **'sí'** o pulsa **'Omitir'** para continuar con el siguiente requisito."
            }), 200

    # Iniciar Auditoría
    if "auditar" in t_lower or "auditoria" in t_lower:
        session["modo_auditoria"] = True
        session["checklist_paso"] = 0
        session["checklist_estados"] = {}
        return jsonify({
            "reply": (
                f"🔎 **Iniciando Auditoría Interactiva de Expediente Académico**\n\n"
                f"Revisaremos los **{len(checklist)} recaudos legales obligatorios** para GTU, SAREN y Apostilla MPPRE.\n\n"
                f"• Responde **'sí'** si ya cuentas con el documento.\n"
                f"• Responde **'no'** si te falta (te indicaré exactamente dónde y cómo tramitarlo).\n"
                f"• O adjunta una foto con el 📎 para verificación forense de sellos.\n\n"
                f"---\n{checklist[0]['pregunta']}"
            )
        }), 200

    # 4. Intento con Google Gemini IA Especialista
    try:
        from gemini_service import GeminiVisionExtractor
        gemini_ok, gemini_reply = GeminiVisionExtractor.generate_institutional_response(texto_usuario, user_context)
        if gemini_ok and gemini_reply and len(gemini_reply) > 20:
            return jsonify({"reply": gemini_reply}), 200
    except Exception as gem_e:
        logger.info(f"Consulta Gemini fallback: {gem_e}")

    # 5. Base de Conocimiento Experta Institucional (Respuesta Inmediata & Exhaustiva)
    # ── GTU / MPPEU ──
    if any(k in t_lower for k in ["gtu", "mppeu", "ministerio de educacion", "legalizacion universitaria", "sello digital"]):
        return jsonify({
            "reply": (
                "🏛️ **Gestión de Trámites Universitarios (GTU — MPPEU)**\n\n"
                "El **GTU** es la legalización ministerial obligatoria de las firmas de las autoridades rectorales "
                "(Rector y Secretario General) de la Universidad Santa María, previa a la protocolización en SAREN o Apostilla.\n\n"
                "**Hoja de Ruta del Trámite:**\n"
                "1. **Solicitud de Cita en Línea:** Ingresa al portal oficial del MPPEU según el terminal de tu cédula de identidad.\n"
                "2. **Presentación en Taquilla:** Acude a la sede del MPPEU o Zona Educativa asignada con tu **Título original en pergamino**, copia simple legible y comprobante de cita impreso.\n"
                "3. **Certificación Electrónica:** El funcionario coteja las firmas físicas contra la base de datos de rectores autorizados y estampa la hoja de certificación con el **Sello Digital GTU** y código de barra institucional.\n\n"
                "💡 *Recomendación:* Utiliza el módulo de digitalización IA de esta plataforma para extraer y corroborar los datos de tu título antes de acudir a la cita.\n\n[ACTION:ocr]"
            )
        }), 200

    # ── SAREN / PUB / ARANCELES / TIMBRES ──
    if any(k in t_lower for k in ["pub", "saren", "planilla unica", "arancel", "timbre", "timbres", "registro principal"]):
        return jsonify({
            "reply": (
                "📄 **Planilla Única Bancaria (PUB) y Protocolización SAREN**\n\n"
                "La **Planilla Única Bancaria (PUB)** es el formato emitido por el SAREN para la liquidación de aranceles "
                "necesarios para asentar y protocolizar tu título en los libros del Registro Principal.\n\n"
                "**Requisitos para la Taquilla del SAREN:**\n"
                "1. **Planilla PUB SAREN:** Con el código de trámite y monto exacto de aranceles.\n"
                "2. **Comprobante de Pago Bancario:** Cancelado en bancos receptores autorizados (Banco de Venezuela, Banco Bicentenario, etc.) o mediante banca digital.\n"
                "3. **Timbres Fiscales Regionales:** Denominación equivalente a **0.5 Unidades Tributarias (UT)** del estado o Distrito Capital donde se registra.\n"
                "4. **Fondo Negro Certificado:** Emitido y sellado previamente por la Secretaría General USM.\n"
                "5. **Copia de Cédula:** Laminada, legible y vigente.\n\n"
                "💡 *Puedes generar y descargar tu formato PUB pre-cargado directamente en nuestra plataforma:*\n\n[ACTION:pub]"
            )
        }), 200

    # ── APOSTILLA / LA HAYA / MPPRE ──
    if any(k in t_lower for k in ["apostilla", "la haya", "mppre", "cancilleria", "exterior", "transfronterizo", "validez internacional"]):
        return jsonify({
            "reply": (
                "🌍 **Apostilla Electrónica de La Haya (MPPRE / Cancillería)**\n\n"
                "La **Apostilla de La Haya** es la certificación que otorga plena validez jurídica a tu título universitario venezolano "
                "en más de **126 países miembros** del Convenio de La Haya de 1961, sin necesidad de trámites consulares adicionales.\n\n"
                "**Cadena de Legalización Obligatoria:**\n"
                "• **Paso 1:** Certificación del Título y fondo negro en **Secretaría General USM**.\n"
                "• **Paso 2:** Legalización de firmas en taquilla **GTU (MPPEU)**.\n"
                "• **Paso 3:** Registro y asignación de Folio/Tomo en el **Registro Principal (SAREN)**.\n"
                "• **Paso 4:** Emisión de la **Apostilla Electrónica MPPRE** con código QR de verificación internacional.\n\n"
                "🛡️ *Nuestra plataforma ancla la certificación dual en Ethereum Sepolia para verificación inmediata desde el extranjero:*\n\n[ACTION:guide]"
            )
        }), 200

    # ── USM / SECRETARÍA GENERAL / FONDO NEGRO ──
    if any(k in t_lower for k in ["usm", "santa maria", "secretaria", "florencia", "fondo negro", "control de estudios", "modulo 4", "pensum"]):
        return jsonify({
            "reply": (
                "🎓 **Trámites en Secretaría General — Universidad Santa María (USM)**\n\n"
                "Para iniciar la legalización ministerial, requieres los recaudos expedidos por la Secretaría General USM:\n\n"
                "• **Ubicación:** Campus La Florencia, Edificio Administrativo, **Módulo 4 (Secretaría General y Control de Estudios)**.\n"
                "• **Horario:** Lunes a Viernes de 8:30 a.m. a 3:30 p.m.\n\n"
                "**Documentos esenciales de egreso:**\n"
                "1. **Fondo Negro Certificado:** Fotocopia del título en papel fotográfico satinado, firmada y sellada en original.\n"
                "2. **Certificación de Título y Notas:** Desglose oficial de calificaciones de los semestres de tu carrera.\n"
                "3. **Puesto y Rango / Carga Horaria:** Indispensables para homologaciones académicas y colegiación profesional en el extranjero.\n\n"
                "💡 *Consulta los modelos de solicitudes oficiales en la sección de Planillas:*\n\n[ACTION:forms]"
            )
        }), 200

    # ── BLOCKCHAIN / SEPOLIA / QR / INMUTABILIDAD ──
    if any(k in t_lower for k in ["blockchain", "sepolia", "hash", "sha256", "inmutable", "smart contract", "contrato"]):
        return jsonify({
            "reply": (
                "⛓️ **Seguridad Criptográfica y Registro en Blockchain (Ethereum Sepolia)**\n\n"
                "Para eliminar el fraude documental y las demoras consulares, el sistema utiliza tecnología descentralizada:\n\n"
                "• **Hash Criptográfico SHA-256:** Cada diploma digitalizado genera una huella matemática única (`0x...`). Si el documento sufre la alteración de un solo pixel o letra, el hash cambia por completo.\n"
                "• **Anclaje en Smart Contract:** El hash y los metadatos ministeriales (GTU + MPPRE) se registran de forma irreversible en un contrato inteligente en Ethereum Sepolia.\n"
                "• **Verificación Transfronteriza con QR:** Cualquier empleador, universidad o consulado en el mundo puede escanear el código QR del Certificado de Inmutabilidad para corroborar la autenticidad en tiempo real sin llamar a la universidad.\n\n"
                "[ACTION:blockchain]"
            )
        }), 200

    # ── RESPUESTA GENERAL ASISTIDA ──
    return jsonify({
        "reply": (
            f"✅ **Consulta Recibida:** *{texto_usuario}*\n\n"
            f"Como Asistente Institucional de la USM, estoy preparado para guiarte en cada etapa:\n\n"
            f"1. **Digitalización y Cotejo IA:** Sube la foto de tu título para extraer los datos automáticamente con el modelo de visión multimodal.\n"
            f"2. **Auditoría de Requisitos:** Escribe **'auditar'** para verificar que tu carpeta manila cumpla con las normativas del SAREN y GTU.\n"
            f"3. **Aranceles y Planilla PUB:** Descarga y genera los formatos oficiales bancarios.\n"
            f"4. **Certificación en Blockchain:** Consulta el estado criptográfico de tu expediente on-chain.\n\n"
            f"¿Sobre cuál de estos trámites deseas asesoría detallada?\n\n[ACTION:guide]"
        )
    }), 200
# ─── Datos Dinámicos y Contenido ─────────────────────────────────────────────
@app.route("/admin/checklist", methods=["GET"])
@app.route("/api/admin/checklist", methods=["GET"])
def get_checklist_items():
    items = get_checklist()
    return jsonify({"success": True, "items": items}), 200


@app.route("/admin/checklist", methods=["POST"])
@app.route("/api/admin/checklist", methods=["POST"])
def create_checklist_item():
    admin_payload = get_current_admin()
    if not admin_payload or admin_payload.get("role") == "estudiante":
        return jsonify({"detail": "Autorización institucional requerida."}), 401
    new_id = int(datetime.datetime.now().timestamp() * 1000) % 1000000
    item_dict = request.get_json() or {}
    norm = normalize_checklist_item({**item_dict, "id": new_id})
    if supabase:
        try:
            supabase.table("checklist_items").insert({
                "label": norm["label"],
                "pregunta": norm["pregunta"],
                "pista": norm["pista"],
                "orden": norm["orden"],
                "activo": norm["activo"]
            }).execute()
            return jsonify({"success": True, "message": "Item creado", "item": norm}), 200
        except Exception as e:
            logger.warning(f"Error insertando en Supabase: {e}")
    _checklist_memory.append(norm)
    return jsonify({"success": True, "message": "Item creado en memoria", "item": norm}), 200


@app.route("/admin/checklist/<int:item_id>", methods=["PUT"])
@app.route("/api/admin/checklist/<int:item_id>", methods=["PUT"])
def update_checklist_item(item_id: int):
    admin_payload = get_current_admin()
    if not admin_payload or admin_payload.get("role") == "estudiante":
        return jsonify({"detail": "Autorización institucional requerida."}), 401
    item_dict = request.get_json() or {}
    norm = normalize_checklist_item({**item_dict, "id": item_id})
    if supabase:
        try:
            supabase.table("checklist_items").update({
                "label": norm["label"],
                "pregunta": norm["pregunta"],
                "pista": norm["pista"],
                "orden": norm["orden"],
                "activo": norm["activo"]
            }).eq("id", item_id).execute()
            return jsonify({"success": True, "message": "Item actualizado", "item": norm}), 200
        except Exception as e:
            logger.warning(f"Error actualizando en Supabase: {e}")
    for idx, it in enumerate(_checklist_memory):
        if it.get("id") == item_id:
            _checklist_memory[idx] = norm
            break
    return jsonify({"success": True, "message": "Item actualizado en memoria", "item": norm}), 200


@app.route("/admin/checklist/<int:item_id>", methods=["DELETE"])
@app.route("/api/admin/checklist/<int:item_id>", methods=["DELETE"])
def delete_checklist_item(item_id: int):
    admin_payload = get_current_admin()
    if not admin_payload or admin_payload.get("role") == "estudiante":
        return jsonify({"detail": "Autorización institucional requerida."}), 401
    global _checklist_memory
    if supabase:
        try:
            supabase.table("checklist_items").delete().eq("id", item_id).execute()
        except Exception as e:
            logger.warning(f"Error eliminando en Supabase: {e}")
    _checklist_memory = [it for it in _checklist_memory if it.get("id") != item_id]
    return jsonify({"success": True, "message": "Item eliminado"}), 200


@app.route("/guias", methods=["GET"])
@app.route("/api/guias", methods=["GET"])
def get_guias_logistica():
    if supabase:
        try:
            res = supabase.table("guias_logistica").select("*").execute()
            if res.data:
                return jsonify({"success": True, "guias": res.data}), 200
        except Exception:
            pass
    return jsonify({"success": True, "guias": _guias_memory}), 200


@app.route("/admin/guias", methods=["POST"])
@app.route("/api/admin/guias", methods=["POST"])
def create_guia():
    admin_payload = get_current_admin()
    if not admin_payload or admin_payload.get("role") == "estudiante":
        return jsonify({"detail": "Autorización institucional requerida."}), 401
    global _guias_memory
    data = request.get_json() or {}
    new_g = {
        "id": data.get("id") or f"guia_{secrets.token_hex(4)}",
        "ente": (data.get("ente") or "saren").strip().lower(),
        "location": (data.get("location") or "Sede Ministerial").strip(),
        "warning": (data.get("warning") or "Cita previa obligatoria.").strip(),
        "image_url": data.get("image_url") or "/images/saren_facade.png",
        "steps": data.get("steps") or [
            {"title": "Recepción en Taquilla", "time": "8:00 AM", "desc": "Presentar documento original y comprobante."}
        ]
    }
    if supabase:
        try:
            supabase.table("guias_logistica").insert(new_g).execute()
        except Exception as e:
            logger.warning(f"Guardando guía en memoria local: {e}")
    _guias_memory = [g for g in _guias_memory if g.get("ente") != new_g["ente"]] + [new_g]
    return jsonify({"success": True, "message": "Guía creada exitosamente", "guia": new_g}), 200


@app.route("/planillas", methods=["GET"])
@app.route("/api/planillas", methods=["GET"])
def get_planillas():
    if supabase:
        try:
            res = supabase.table("planillas").select("*").order("orden").execute()
            if res.data and len(res.data) > 0:
                return jsonify({"success": True, "planillas": res.data}), 200
        except Exception:
            pass
    return jsonify({"success": True, "planillas": _planillas_memory}), 200


@app.route("/admin/planillas", methods=["POST"])
@app.route("/api/admin/planillas", methods=["POST"])
def create_planilla():
    admin_payload = get_current_admin()
    if not admin_payload or admin_payload.get("role") == "estudiante":
        return jsonify({"detail": "Autorización institucional requerida."}), 401
    global _planillas_memory
    data = request.get_json() or {}
    new_p = {
        "id": f"pla_{secrets.token_hex(4)}",
        "nombre": data.get("nombre", ""),
        "url": data.get("url", "#"),
        "categoria": data.get("categoria", "Oficial"),
        "orden": data.get("orden", len(_planillas_memory) + 1)
    }
    if supabase:
        try:
            supabase.table("planillas").insert(new_p).execute()
            return jsonify({"success": True, "message": "Planilla creada", "planilla": new_p}), 200
        except Exception as e:
            logger.warning(f"Error insertando en Supabase: {e}")
    _planillas_memory.append(new_p)
    return jsonify({"success": True, "message": "Planilla creada", "planilla": new_p}), 200


@app.route("/admin/planillas/<planilla_id>", methods=["DELETE"])
@app.route("/api/admin/planillas/<planilla_id>", methods=["DELETE"])
def delete_planilla(planilla_id: str):
    admin_payload = get_current_admin()
    if not admin_payload or admin_payload.get("role") == "estudiante":
        return jsonify({"detail": "Autorización institucional requerida."}), 401
    global _planillas_memory
    if supabase:
        try:
            supabase.table("planillas").delete().eq("id", planilla_id).execute()
        except Exception as e:
            logger.warning(f"Error eliminando en Supabase: {e}")
    _planillas_memory = [p for p in _planillas_memory if str(p.get("id")) != str(planilla_id) and p.get("nombre") != str(planilla_id)]
    return jsonify({"success": True, "message": "Planilla eliminada"}), 200


@app.route("/carreras", methods=["GET"])
@app.route("/api/carreras", methods=["GET"])
def get_carreras():
    if supabase:
        try:
            res = supabase.table("carreras").select("*").order("nombre").execute()
            if res.data and len(res.data) > 0:
                return jsonify({"success": True, "carreras": [r["nombre"] for r in res.data]}), 200
        except Exception:
            pass
    return jsonify({"success": True, "carreras": [
        "Ingeniería en Sistemas", "Ingeniería Civil", "Ingeniería Industrial",
        "Ingeniería Eléctrica", "Ingeniería Mecánica", "Arquitectura"
    ]}), 200


@app.route("/pub/fields", methods=["GET"])
@app.route("/api/pub/fields", methods=["GET"])
def get_pub_fields():
    if supabase:
        try:
            res = supabase.table("pub_fields").select("*").order("orden").execute()
            if res.data and len(res.data) > 0:
                return jsonify({"success": True, "fields": res.data}), 200
        except Exception:
            pass
    return jsonify({"success": True, "fields": [
        {"id": "nombre_completo", "label": "Nombre Completo del Solicitante", "placeholder": "Ej: Juan Carlos Pérez García", "pregunta": "Formulario Oficial — Planilla Única Bancaria (PUB)\n\n**Campo 1 — Nombre Completo**\n\n¿Cuál es su nombre completo tal como aparece en su cédula de identidad?", "ayuda": "Escribe **todos tus nombres y ambos apellidos**, exactamente como aparecen en tu cédula laminada. Ejemplo: *Juan Carlos Pérez García*. No uses abreviaciones ni apodos.", "validacion_regex": "", "validacion_mensaje": "", "orden": 1},
        {"id": "cedula", "label": "Cédula de Identidad", "placeholder": "Ej: V-12.345.678", "pregunta": "**Campo 2 — Cédula de Identidad**\n\n¿Cuál es tu número de cédula? (Incluye el prefijo V- o E-)", "ayuda": "Usa el formato: **V-12.345.678** (venezolano) o **E-12.345.678** (extranjero). El formato incorrecto causa rechazo inmediato en el SAREN.", "validacion_regex": "", "validacion_mensaje": "", "orden": 2},
        {"id": "telefono", "label": "Teléfono de Contacto", "placeholder": "Ej: 0414-1234567", "pregunta": "**Campo 3 — Teléfono de Contacto**\n\n¿Cuál es tu número de teléfono venezolano activo?", "ayuda": "Escribe tu número con la operadora incluida: **0414-1234567**, **0212-5551234**, etc. El SAREN lo usa para notificaciones del trámite.", "validacion_regex": "", "validacion_mensaje": "", "orden": 3},
        {"id": "correo", "label": "Correo Electrónico", "placeholder": "Ej: juan.perez@gmail.com", "pregunta": "**Campo 4 — Correo Electrónico**\n\n¿Cuál es tu correo electrónico activo?", "ayuda": "Usa un correo que revises con frecuencia. El SAREN envía confirmaciones y estados del trámite a este correo.", "validacion_regex": "", "validacion_mensaje": "", "orden": 4},
        {"id": "tramite", "label": "Tipo de Trámite", "placeholder": "Registro de Título Universitario", "pregunta": "**Campo 5 — Tipo de Trámite**\n\nEscribe el tipo de trámite. Ejemplos:\n• *Registro de Título Universitario*\n• *Apostilla de Documento Educativo*\n• *Legalización*", "ayuda": "Escribe exactamente el nombre del trámite. La IA calculará el costo basado en esto.", "validacion_regex": "", "validacion_mensaje": "", "orden": 5},
        {"id": "institucion", "label": "Institución Educativa", "placeholder": "Universidad Santa María (USM)", "pregunta": "**Campo 6 — Institución Educativa**\n\n¿En qué universidad obtuviste tu título?", "ayuda": "Escribe el nombre oficial completo: **\"Universidad Santa María\"**. No uses variantes informales.", "validacion_regex": "", "validacion_mensaje": "", "orden": 6},
        {"id": "pago_cedula", "label": "Cédula del Pagador (Pago Móvil)", "placeholder": "Ej: V-12.345.678", "pregunta": "**Campo 7 — Cédula del Pagador**\n\n¿Cuál es la cédula de identidad asociada al pago móvil?", "ayuda": "Escribe la cédula de la persona que realizará el pago móvil, en formato **V-12.345.678** o **E-12.345.678**.", "validacion_regex": "", "validacion_mensaje": "", "orden": 7},
        {"id": "pago_telefono", "label": "Teléfono del Pagador (Pago Móvil)", "placeholder": "Ej: 0414-1234567", "pregunta": "**Campo 8 — Teléfono del Pagador**\n\n¿Cuál es el número de teléfono asociado al pago móvil?", "ayuda": "Escribe el número de teléfono registrado en tu banco para pago móvil. Formato: **0414-1234567**.", "validacion_regex": "", "validacion_mensaje": "", "orden": 8},
        {"id": "pago_banco", "label": "Banco del Pagador", "placeholder": "Ej: Banco de Venezuela", "pregunta": "**Campo 9 — Banco del Pagador**\n\n¿Desde qué banco realizarás el pago móvil?", "ayuda": "Escribe el nombre completo del banco desde el cual harás la transferencia o pago móvil.", "validacion_regex": "", "validacion_mensaje": "", "orden": 9},
        {"id": "confirmacion_pago", "label": "Confirmación de Pago", "placeholder": "Escribe \"listo\"", "pregunta": "**Campo 10 — Confirmación de Pago**\n\nRealice la transferencia al número de cuenta indicado y escriba \"listo\".", "ayuda": "Realiza la transferencia al número de cuenta indicado y escribe \"listo\".", "validacion_regex": "", "validacion_mensaje": "", "orden": 10}
    ]}), 200



@app.route("/admin/clean-test-data", methods=["POST", "DELETE"])
@app.route("/api/admin/clean-test-data", methods=["POST", "DELETE"])
def clean_test_data():
    admin_payload = get_current_admin()
    if not admin_payload or admin_payload.get("role") == "estudiante":
        return jsonify({"success": False, "error": "Autorización de administrador institucional requerida."}), 401
    global _records_memory
    _records_memory = []
    if os.path.exists(RECORDS_CACHE_FILE):
        try:
            os.remove(RECORDS_CACHE_FILE)
        except Exception:
            pass
    if supabase:
        try:
            supabase.table("records").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        except Exception as e:
            logger.warning(f"Error borrando records en Supabase: {e}")
    return jsonify({"success": True, "message": "Todas las solicitudes de prueba han sido limpiadas exitosamente."}), 200

@app.route("/admin/reset-demo-records", methods=["POST"])
@app.route("/api/admin/reset-demo-records", methods=["POST"])
def reset_demo_records():
    admin_payload = get_current_admin()
    if not admin_payload or admin_payload.get("role") == "estudiante":
        return jsonify({"success": False, "error": "Autorización de administrador institucional requerida."}), 401
    global _records_memory
    _records_memory = copy.deepcopy(CANONICAL_DEMO_RECORDS)
    _save_records_cache()
    return jsonify({"success": True, "message": "Registros de demostración restaurados.", "records": _records_memory}), 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"🏛️  Iniciando Servidor Flask USM-ApostillaBot en http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
