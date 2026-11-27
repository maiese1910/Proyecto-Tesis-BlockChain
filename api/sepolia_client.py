"""
Zero-Dependency Ethereum Sepolia JSON-RPC Client & EIP-1559 Transaction Signer.

Designed for Vercel Serverless Python (0 external packages required — pure Python stdlib).
Implements:
  - Genuine Keccak-256 (Ethereum padding 0x01, NOT NIST SHA3-256)
  - secp256k1 elliptic curve arithmetic + RFC 6979 deterministic ECDSA signing (low-S BIP-62)
  - EIP-55 checksum address normalization
  - RLP encoding for EIP-1559 (Type-2) Ethereum transactions (Sepolia chainId = 11155111)
  - Solidity ABI encoding/decoding for USMDocumentRegistry:
      * registerDocument(string,string,string,string)
      * revokeDocument(string)
      * verifyDocument(string) -> (bool,bool,string,string,string,uint256)
      * institutionAdmin() -> address
      * totalDocumentsCount() -> uint256
  - Multi-RPC failover for Ethereum Sepolia public nodes.
"""

import hashlib
import hmac
import json
import logging
import os
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("USM_Sepolia_Client")

SEPOLIA_CHAIN_ID = 11155111
DEFAULT_SEPOLIA_RPCS = [
    "https://ethereum-sepolia-rpc.publicnode.com",
    "https://1rpc.io/sepolia",
    "https://rpc.sepolia.org",
]
PLACEHOLDER_ADDRESSES = {
    "",
    "0x0000000000000000000000000000000000000000",
    "0x1234567890123456789012345678901234567890",
}
KNOWN_FAKE_TX_HASHES = {
    "0x4b7891a2bc3456def0123456789abcdef0123456789abcdef0123456789abcd1",
    "0x9876543210abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
}

# ─── 1. Genuine Keccak-256 (Ethereum, delimiter 0x01) ────────────────────────
_RC = [
    0x0000000000000001, 0x0000000000008082, 0x800000000000808A, 0x8000000080008000,
    0x000000000000808B, 0x0000000080000001, 0x8000000080008081, 0x8000000000008009,
    0x000000000000008A, 0x0000000000000088, 0x0000000080008009, 0x000000008000000A,
    0x000000008000808B, 0x800000000000008B, 0x8000000000008089, 0x8000000000008003,
    0x8000000000008002, 0x8000000000000080, 0x000000000000800A, 0x800000008000000A,
    0x8000000080008081, 0x8000000000008080, 0x0000000080000001, 0x8000000080008008,
]
_ROT = [
    [0, 36, 3, 41, 18],
    [1, 44, 10, 45, 2],
    [62, 6, 43, 15, 61],
    [28, 55, 25, 21, 56],
    [27, 20, 39, 8, 14],
]
_MASK64 = (1 << 64) - 1


def _rotl64(x: int, n: int) -> int:
    return ((x << n) | (x >> (64 - n))) & _MASK64


def _keccak_f1600(state: List[int]) -> None:
    for r in range(24):
        c = [state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20] for x in range(5)]
        d = [c[(x - 1) % 5] ^ _rotl64(c[(x + 1) % 5], 1) for x in range(5)]
        for x in range(5):
            for y in range(5):
                state[x + 5 * y] ^= d[x]
        b = [0] * 25
        for x in range(5):
            for y in range(5):
                b[y + 5 * ((2 * x + 3 * y) % 5)] = _rotl64(state[x + 5 * y], _ROT[x][y])
        for x in range(5):
            for y in range(5):
                state[x + 5 * y] = b[x + 5 * y] ^ ((~b[((x + 1) % 5) + 5 * y]) & b[((x + 2) % 5) + 5 * y])
        state[0] ^= _RC[r]


def keccak256(data: bytes) -> bytes:
    rate = 136  # 1088 bits for Keccak-256
    padded = bytearray(data)
    padded.append(0x01)
    while len(padded) % rate != 0:
        padded.append(0x00)
    padded[-1] |= 0x80

    state = [0] * 25
    for offset in range(0, len(padded), rate):
        block = padded[offset : offset + rate]
        for i in range(rate // 8):
            lane = int.from_bytes(block[i * 8 : (i + 1) * 8], "little")
            state[i] ^= lane
        _keccak_f1600(state)

    out = bytearray()
    for i in range(4):
        out.extend(state[i].to_bytes(8, "little"))
    return bytes(out)


def keccak256_hex(data: bytes) -> str:
    return "0x" + keccak256(data).hex()


# ─── 2. EIP-55 Address & Tx Hash Helpers ─────────────────────────────────────
def is_valid_hex_address(addr: Optional[str]) -> bool:
    if not addr or not isinstance(addr, str):
        return False
    s = addr.strip()
    if not s.lower().startswith("0x") or len(s) != 42:
        return False
    try:
        int(s[2:], 16)
        return True
    except ValueError:
        return False


def to_checksum_address(addr: Optional[str]) -> Optional[str]:
    if not is_valid_hex_address(addr):
        return None
    lower = addr.strip().lower()[2:]
    hashed = keccak256(lower.encode("ascii")).hex()
    out = ["0x"]
    for ch, hch in zip(lower, hashed):
        if ch in "abcdef" and int(hch, 16) >= 8:
            out.append(ch.upper())
        else:
            out.append(ch)
    return "".join(out)


def is_plausible_tx_hash(tx_hash: Optional[str], doc_hash: Optional[str] = None) -> bool:
    if not tx_hash or not isinstance(tx_hash, str):
        return False
    clean = tx_hash.strip().lower()
    if not clean.startswith("0x") or len(clean) != 66:
        return False
    if clean in KNOWN_FAKE_TX_HASHES:
        return False
    if doc_hash:
        d = doc_hash.strip().lower()
        if not d.startswith("0x"):
            d = "0x" + d
        if clean == d:
            return False
    try:
        int(clean[2:], 16)
        return True
    except ValueError:
        return False


# ─── 3. secp256k1 + RFC 6979 Deterministic ECDSA ─────────────────────────────
_P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
_GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798
_GY = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8
_G = (_GX, _GY)


def _point_add(p1: Optional[Tuple[int, int]], p2: Optional[Tuple[int, int]]) -> Optional[Tuple[int, int]]:
    if p1 is None:
        return p2
    if p2 is None:
        return p1
    x1, y1 = p1
    x2, y2 = p2
    if x1 == x2 and (y1 + y2) % _P == 0:
        return None
    if p1 == p2:
        lam = (3 * x1 * x1 * pow(2 * y1, -1, _P)) % _P
    else:
        lam = ((y2 - y1) * pow((x2 - x1) % _P, -1, _P)) % _P
    x3 = (lam * lam - x1 - x2) % _P
    y3 = (lam * (x1 - x3) - y1) % _P
    return (x3, y3)


def _point_mul(k: int, point: Tuple[int, int] = _G) -> Optional[Tuple[int, int]]:
    result = None
    addend: Optional[Tuple[int, int]] = point
    k = k % _N
    while k:
        if k & 1:
            result = _point_add(result, addend)
        addend = _point_add(addend, addend)
        k >>= 1
    return result


def private_key_to_address(private_key_hex: str) -> str:
    clean = private_key_hex.strip()
    if clean.lower().startswith("0x"):
        clean = clean[2:]
    priv_int = int(clean, 16)
    if not (1 <= priv_int < _N):
        raise ValueError("Private key out of secp256k1 range")
    pt = _point_mul(priv_int)
    if pt is None:
        raise ValueError("Invalid secp256k1 public key")
    pub_bytes = pt[0].to_bytes(32, "big") + pt[1].to_bytes(32, "big")
    addr_raw = "0x" + keccak256(pub_bytes)[-20:].hex()
    return to_checksum_address(addr_raw) or addr_raw


def _rfc6979_k(priv_int: int, msg_hash: bytes) -> int:
    """RFC 6979 deterministic nonce generation with HMAC-SHA256."""
    x_bytes = priv_int.to_bytes(32, "big")
    h1_int = int.from_bytes(msg_hash, "big") % _N
    h1 = h1_int.to_bytes(32, "big")
    v = b"\x01" * 32
    k = b"\x00" * 32
    k = hmac.new(k, v + b"\x00" + x_bytes + h1, hashlib.sha256).digest()
    v = hmac.new(k, v, hashlib.sha256).digest()
    k = hmac.new(k, v + b"\x01" + x_bytes + h1, hashlib.sha256).digest()
    v = hmac.new(k, v, hashlib.sha256).digest()
    while True:
        v = hmac.new(k, v, hashlib.sha256).digest()
        candidate = int.from_bytes(v, "big")
        if 1 <= candidate < _N:
            return candidate
        k = hmac.new(k, v + b"\x00", hashlib.sha256).digest()
        v = hmac.new(k, v, hashlib.sha256).digest()


def sign_hash_secp256k1(msg_hash: bytes, private_key_hex: str) -> Tuple[int, int, int]:
    """Returns (y_parity, r, s) normalized to low-S per EIP-2 / EIP-1559."""
    clean = private_key_hex.strip()
    if clean.lower().startswith("0x"):
        clean = clean[2:]
    priv_int = int(clean, 16)
    z = int.from_bytes(msg_hash, "big")
    k = _rfc6979_k(priv_int, msg_hash)
    pt = _point_mul(k)
    if pt is None:
        raise RuntimeError("Invalid ECDSA point R")
    rx, ry = pt
    r = rx % _N
    if r == 0:
        raise RuntimeError("Invalid ECDSA r=0")
    s = (pow(k, -1, _N) * (z + r * priv_int)) % _N
    if s == 0:
        raise RuntimeError("Invalid ECDSA s=0")
    y_parity = ry & 1
    if rx >= _N:
        y_parity ^= 1
    if s > _N // 2:
        s = _N - s
        y_parity ^= 1
    return y_parity, r, s


# ─── 4. RLP Encoding (EIP-1559 Type-2 Transaction) ───────────────────────────
def _int_to_min_bytes(val: int) -> bytes:
    if val == 0:
        return b""
    length = (val.bit_length() + 7) // 8
    return val.to_bytes(length, "big")


def rlp_encode(item: Any) -> bytes:
    if isinstance(item, int):
        item = _int_to_min_bytes(item)
    if isinstance(item, (bytes, bytearray)):
        b = bytes(item)
        if len(b) == 1 and b[0] < 0x80:
            return b
        if len(b) <= 55:
            return bytes([0x80 + len(b)]) + b
        len_bytes = _int_to_min_bytes(len(b))
        return bytes([0xB7 + len(len_bytes)]) + len_bytes + b
    if isinstance(item, list):
        payload = b"".join(rlp_encode(el) for el in item)
        if len(payload) <= 55:
            return bytes([0xC0 + len(payload)]) + payload
        len_bytes = _int_to_min_bytes(len(payload))
        return bytes([0xF7 + len(len_bytes)]) + len_bytes + payload
    raise TypeError(f"Unsupported RLP type: {type(item)}")


def sign_eip1559_tx(
    private_key_hex: str,
    *,
    chain_id: int,
    nonce: int,
    max_priority_fee_per_gas: int,
    max_fee_per_gas: int,
    gas_limit: int,
    to_address: str,
    value: int = 0,
    data: bytes = b"",
) -> Tuple[str, str]:
    """Signs an EIP-1559 Type-2 transaction and returns (raw_tx_hex, tx_hash_hex)."""
    to_bytes = bytes.fromhex(to_address.lower().replace("0x", ""))
    unsigned_fields = [
        chain_id,
        nonce,
        max_priority_fee_per_gas,
        max_fee_per_gas,
        gas_limit,
        to_bytes,
        value,
        data,
        [],  # accessList
    ]
    unsigned_payload = b"\x02" + rlp_encode(unsigned_fields)
    sig_hash = keccak256(unsigned_payload)
    y_parity, r, s = sign_hash_secp256k1(sig_hash, private_key_hex)
    signed_fields = unsigned_fields + [y_parity, r, s]
    raw_tx = b"\x02" + rlp_encode(signed_fields)
    tx_hash = keccak256_hex(raw_tx)
    return "0x" + raw_tx.hex(), tx_hash


# ─── 5. Solidity ABI Codec for USMDocumentRegistry ───────────────────────────
def _selector(signature: str) -> bytes:
    return keccak256(signature.encode("ascii"))[:4]


def _encode_strings(values: List[str]) -> bytes:
    encoded_list = [v.encode("utf-8") for v in values]
    head_size = 32 * len(encoded_list)
    heads = bytearray()
    tails = bytearray()
    offset = head_size
    for raw in encoded_list:
        heads.extend(offset.to_bytes(32, "big"))
        padded_len = ((len(raw) + 31) // 32) * 32
        chunk = len(raw).to_bytes(32, "big") + raw + (b"\x00" * (padded_len - len(raw)))
        tails.extend(chunk)
        offset += len(chunk)
    return bytes(heads + tails)


def encode_register_document(doc_hash: str, owner_name: str, cedula: str, doc_type: str) -> bytes:
    return _selector("registerDocument(string,string,string,string)") + _encode_strings(
        [doc_hash, owner_name, cedula, doc_type]
    )


def encode_revoke_document(doc_hash: str) -> bytes:
    return _selector("revokeDocument(string)") + _encode_strings([doc_hash])


def encode_verify_document(doc_hash: str) -> bytes:
    return _selector("verifyDocument(string)") + _encode_strings([doc_hash])


def encode_institution_admin() -> bytes:
    return _selector("institutionAdmin()")


def encode_total_documents_count() -> bytes:
    return _selector("totalDocumentsCount()")


def _read_abi_string(data: bytes, head_index: int) -> str:
    offset = int.from_bytes(data[head_index * 32 : (head_index + 1) * 32], "big")
    length = int.from_bytes(data[offset : offset + 32], "big")
    raw = data[offset + 32 : offset + 32 + length]
    return raw.decode("utf-8", errors="replace")


def decode_verify_document_result(hex_data: str) -> Optional[Dict[str, Any]]:
    if not hex_data or hex_data == "0x":
        return None
    raw = bytes.fromhex(hex_data[2:] if hex_data.startswith("0x") else hex_data)
    if len(raw) < 192:
        return None
    exists = int.from_bytes(raw[0:32], "big") != 0
    is_revoked = int.from_bytes(raw[32:64], "big") != 0
    owner_name = _read_abi_string(raw, 2)
    cedula = _read_abi_string(raw, 3)
    doc_type = _read_abi_string(raw, 4)
    timestamp = int.from_bytes(raw[160:192], "big")
    return {
        "exists": exists,
        "isRevoked": is_revoked,
        "ownerName": owner_name,
        "cedula": cedula,
        "documentType": doc_type,
        "timestamp": timestamp,
    }


# ─── 6. Live Sepolia JSON-RPC Client ─────────────────────────────────────────
class SepoliaClient:
    def __init__(self, primary_rpc_url: Optional[str] = None, timeout: float = 8.0):
        rpcs: List[str] = []
        if primary_rpc_url and primary_rpc_url.strip().startswith("http"):
            rpcs.append(primary_rpc_url.strip())
        for url in DEFAULT_SEPOLIA_RPCS:
            if url not in rpcs:
                rpcs.append(url)
        self.rpc_urls = rpcs
        self.timeout = timeout
        self.last_working_rpc: Optional[str] = None

    def rpc(self, method: str, params: list) -> Any:
        payload = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode("utf-8")
        last_err: Optional[Exception] = None
        order = list(self.rpc_urls)
        if self.last_working_rpc and self.last_working_rpc in order:
            order.remove(self.last_working_rpc)
            order.insert(0, self.last_working_rpc)

        for url in order:
            try:
                req = urllib.request.Request(
                    url,
                    data=payload,
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "User-Agent": "USM-ApostillaBot-Sepolia/2.0",
                    },
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    parsed = json.loads(resp.read().decode("utf-8", errors="replace"))
                if "error" in parsed and parsed["error"]:
                    err_msg = parsed["error"].get("message") or str(parsed["error"])
                    raise RuntimeError(f"RPC error ({method}): {err_msg}")
                self.last_working_rpc = url
                return parsed.get("result")
            except RuntimeError as rpc_err:
                # Re-raise contract revert / execution errors directly instead of retrying all nodes
                if any(k in str(rpc_err).lower() for k in ("revert", "insufficient funds", "already known", "nonce too low", "execution")):
                    raise
                last_err = rpc_err
            except Exception as e:
                last_err = e
        raise RuntimeError(f"No Sepolia RPC available for {method}: {last_err}")

    def get_block_number(self) -> Optional[int]:
        try:
            res = self.rpc("eth_blockNumber", [])
            return int(res, 16) if res else None
        except Exception:
            return None

    def get_balance_eth(self, address: str) -> Optional[float]:
        norm = to_checksum_address(address)
        if not norm:
            return None
        try:
            wei_hex = self.rpc("eth_getBalance", [norm, "latest"])
            return int(wei_hex, 16) / 1e18
        except Exception:
            return None

    def is_contract_deployed(self, contract_address: str) -> bool:
        norm = to_checksum_address(contract_address)
        if not norm or norm.lower() in PLACEHOLDER_ADDRESSES:
            return False
        try:
            code = self.rpc("eth_getCode", [norm, "latest"])
            return bool(code and code != "0x" and len(code) > 4)
        except Exception:
            return False

    def get_contract_metadata(self, contract_address: str) -> Dict[str, Any]:
        norm = to_checksum_address(contract_address)
        if not norm or norm.lower() in PLACEHOLDER_ADDRESSES:
            return {"deployed": False, "address": norm, "admin": None, "totalDocuments": 0}
        deployed = self.is_contract_deployed(norm)
        if not deployed:
            return {"deployed": False, "address": norm, "admin": None, "totalDocuments": 0}
        admin = None
        total = 0
        try:
            res_admin = self.rpc("eth_call", [{"to": norm, "data": "0x" + encode_institution_admin().hex()}, "latest"])
            if res_admin and len(res_admin) >= 66:
                admin = to_checksum_address("0x" + res_admin[-40:])
        except Exception:
            pass
        try:
            res_count = self.rpc("eth_call", [{"to": norm, "data": "0x" + encode_total_documents_count().hex()}, "latest"])
            if res_count and res_count != "0x":
                total = int(res_count, 16)
        except Exception:
            pass
        return {"deployed": True, "address": norm, "admin": admin, "totalDocuments": total}

    def verify_document(self, contract_address: str, doc_hash: str) -> Optional[Dict[str, Any]]:
        norm = to_checksum_address(contract_address)
        if not norm or norm.lower() in PLACEHOLDER_ADDRESSES:
            return None
        try:
            calldata = "0x" + encode_verify_document(doc_hash).hex()
            res = self.rpc("eth_call", [{"to": norm, "data": calldata}, "latest"])
            decoded = decode_verify_document_result(res)
            if decoded and decoded.get("exists"):
                decoded["contractAddress"] = norm
                return decoded
        except Exception as e:
            logger.debug(f"verify_document RPC error: {e}")
        return None

    def get_transaction_status(self, tx_hash: str) -> Dict[str, Any]:
        if not is_plausible_tx_hash(tx_hash):
            return {"exists": False, "confirmed": False, "reason": "Hash de transacción inválido o placeholder"}
        clean = tx_hash.strip()
        try:
            receipt = self.rpc("eth_getTransactionReceipt", [clean])
            if receipt:
                status_ok = int(receipt.get("status", "0x0"), 16) == 1
                block_num = int(receipt.get("blockNumber", "0x0"), 16)
                return {
                    "exists": True,
                    "confirmed": True,
                    "statusSuccess": status_ok,
                    "blockNumber": block_num,
                    "from": to_checksum_address(receipt.get("from")),
                    "to": to_checksum_address(receipt.get("to")),
                    "txHash": clean,
                    "explorerUrl": f"https://sepolia.etherscan.io/tx/{clean}",
                }
            tx = self.rpc("eth_getTransactionByHash", [clean])
            if tx:
                return {
                    "exists": True,
                    "confirmed": False,
                    "pending": True,
                    "from": to_checksum_address(tx.get("from")),
                    "to": to_checksum_address(tx.get("to")),
                    "txHash": clean,
                    "explorerUrl": f"https://sepolia.etherscan.io/tx/{clean}",
                }
            return {"exists": False, "confirmed": False, "reason": "No existe en la red Ethereum Sepolia"}
        except Exception as e:
            return {"exists": False, "confirmed": False, "reason": f"Error consultando RPC Sepolia: {e}"}

    def send_raw_transaction(self, raw_tx_hex: str) -> str:
        clean = raw_tx_hex.strip()
        if not clean.startswith("0x"):
            clean = "0x" + clean
        tx_hash = self.rpc("eth_sendRawTransaction", [clean])
        return str(tx_hash)

    def send_register_document(
        self,
        contract_address: str,
        private_key_hex: str,
        doc_hash: str,
        owner_name: str,
        cedula: str,
        doc_type: str,
    ) -> Dict[str, Any]:
        """Broadcasts a real EIP-1559 registerDocument transaction to Ethereum Sepolia."""
        norm_contract = to_checksum_address(contract_address)
        if not norm_contract or norm_contract.lower() in PLACEHOLDER_ADDRESSES:
            return {"sent": False, "txHash": None, "reason": "CONTRACT_ADDRESS no está configurado en el servidor."}

        if not private_key_hex or len(private_key_hex.replace("0x", "").strip()) != 64:
            return {"sent": False, "txHash": None, "reason": "WALLET_PRIVATE_KEY no configurada en el servidor."}

        try:
            sender = private_key_to_address(private_key_hex)
            meta = self.get_contract_metadata(norm_contract)
            if not meta.get("deployed"):
                return {
                    "sent": False,
                    "txHash": None,
                    "reason": f"No hay contrato USMDocumentRegistry desplegado en Sepolia en {norm_contract}.",
                }
            if meta.get("admin") and meta["admin"].lower() != sender.lower():
                return {
                    "sent": False,
                    "txHash": None,
                    "reason": f"La wallet custodial ({sender}) no es institutionAdmin del contrato ({meta['admin']}).",
                }

            # Check if already registered on-chain to avoid revert
            clean_doc_hash = doc_hash if doc_hash.startswith("0x") else f"0x{doc_hash}"
            already = self.verify_document(norm_contract, clean_doc_hash)
            if already and already.get("exists"):
                return {
                    "sent": True,
                    "alreadyRegistered": True,
                    "txHash": None,
                    "contractAddress": norm_contract,
                    "reason": "El documento ya estaba anclado on-chain en Ethereum Sepolia.",
                }

            bal = self.get_balance_eth(sender)
            if bal is not None and bal < 0.0005:
                return {
                    "sent": False,
                    "txHash": None,
                    "reason": f"La wallet custodial ({sender}) tiene {bal:.6f} Sepolia ETH (insuficiente para gas).",
                }

            calldata = encode_register_document(clean_doc_hash, owner_name, cedula, doc_type)
            nonce = int(self.rpc("eth_getTransactionCount", [sender, "pending"]), 16)
            gas_price = int(self.rpc("eth_gasPrice", []), 16)
            try:
                priority_fee = int(self.rpc("eth_maxPriorityFeePerGas", []), 16)
            except Exception:
                priority_fee = 1_500_000_000  # 1.5 gwei
            max_priority = max(priority_fee, 1_500_000_000)
            max_fee = max(int(gas_price * 2), max_priority * 2)

            try:
                est_hex = self.rpc(
                    "eth_estimateGas",
                    [{"from": sender, "to": norm_contract, "data": "0x" + calldata.hex()}],
                )
                gas_limit = max(int(int(est_hex, 16) * 1.25), 180_000)
            except Exception:
                gas_limit = 300_000

            raw_tx, computed_hash = sign_eip1559_tx(
                private_key_hex,
                chain_id=SEPOLIA_CHAIN_ID,
                nonce=nonce,
                max_priority_fee_per_gas=max_priority,
                max_fee_per_gas=max_fee,
                gas_limit=gas_limit,
                to_address=norm_contract,
                value=0,
                data=calldata,
            )
            broadcast_hash = self.send_raw_transaction(raw_tx)
            return {
                "sent": True,
                "txHash": broadcast_hash or computed_hash,
                "contractAddress": norm_contract,
                "sender": sender,
                "explorerUrl": f"https://sepolia.etherscan.io/tx/{broadcast_hash or computed_hash}",
                "reason": None,
            }
        except Exception as e:
            logger.warning(f"Error enviando transacción Sepolia: {e}")
            return {"sent": False, "txHash": None, "reason": str(e)}

    def get_full_diagnostics(self, contract_address: str, private_key_hex: Optional[str] = None) -> Dict[str, Any]:
        norm_contract = to_checksum_address(contract_address)
        block_num = self.get_block_number()
        rpc_ok = block_num is not None
        meta = self.get_contract_metadata(norm_contract) if (rpc_ok and norm_contract) else {
            "deployed": False, "address": norm_contract, "admin": None, "totalDocuments": 0
        }

        relayer_addr = None
        relayer_bal = None
        if private_key_hex and len(private_key_hex.replace("0x", "").strip()) == 64:
            if private_key_hex.strip().lower() != "0x1234567890123456789012345678901234567890123456789012345678901234":
                try:
                    relayer_addr = private_key_to_address(private_key_hex)
                    if rpc_ok:
                        relayer_bal = self.get_balance_eth(relayer_addr)
                except Exception:
                    pass

        issues: List[str] = []
        if not rpc_ok:
            issues.append("No se pudo conectar a los nodos RPC públicos de Ethereum Sepolia.")
        if not norm_contract or norm_contract.lower() in PLACEHOLDER_ADDRESSES:
            issues.append("CONTRACT_ADDRESS no está configurado (actualmente usa dirección placeholder).")
        elif rpc_ok and not meta.get("deployed"):
            issues.append(f"La dirección {norm_contract} no tiene un contrato inteligente desplegado en Ethereum Sepolia.")
        if not relayer_addr:
            issues.append("WALLET_PRIVATE_KEY no configurada para firma custodial automática (se puede firmar con MetaMask).")
        elif rpc_ok and relayer_bal is not None and relayer_bal < 0.0005:
            issues.append(f"La wallet custodial ({relayer_addr}) tiene {relayer_bal:.4f} Sepolia ETH. Carga Sepolia ETH gratis desde un faucet para pagar el gas.")
        if meta.get("deployed") and meta.get("admin") and relayer_addr and meta["admin"].lower() != relayer_addr.lower():
            issues.append(f"La wallet custodial ({relayer_addr}) no coincide con institutionAdmin del contrato ({meta['admin']}).")

        ready_custodial = bool(
            rpc_ok
            and meta.get("deployed")
            and relayer_addr
            and (relayer_bal or 0) >= 0.0005
            and (not meta.get("admin") or meta["admin"].lower() == relayer_addr.lower())
        )

        return {
            "network": "Ethereum Sepolia Testnet",
            "chainId": SEPOLIA_CHAIN_ID,
            "rpcConnected": rpc_ok,
            "rpcUrl": self.last_working_rpc or (self.rpc_urls[0] if self.rpc_urls else None),
            "blockNumber": block_num,
            "contractAddress": norm_contract or contract_address,
            "contractDeployed": bool(meta.get("deployed")),
            "contractAdmin": meta.get("admin"),
            "totalDocumentsCount": meta.get("totalDocuments", 0),
            "contractExplorerUrl": f"https://sepolia.etherscan.io/address/{norm_contract}" if (norm_contract and meta.get("deployed")) else None,
            "relayerAddress": relayer_addr,
            "relayerBalanceEth": round(relayer_bal, 6) if relayer_bal is not None else None,
            "readyForCustodialAnchoring": ready_custodial,
            "issues": issues,
        }
