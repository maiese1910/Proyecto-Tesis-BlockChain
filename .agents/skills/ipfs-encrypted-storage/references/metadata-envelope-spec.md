# Especificación de Sobre Cifrado (Metadata Envelope) y Custodia Híbrida

## 1. Sobre de Metadatos No-PII para IPFS
Todo objeto JSON asociado a un CID fijado en Pinata/IPFS debe excluir datos personales en texto plano (`nombre`, `cedula`, URLs firmadas privadas) y limitarse a metadatos criptográficos:

```json
{
  "version": "1.0.0",
  "cipher": "AES-256-GCM",
  "iv": "<hex-or-base64-96bit-iv>",
  "auth_tag": "<hex-or-base64-128bit-tag>",
  "doc_sha256_hash": "0x<64-hex-chars-canonical-pre-encryption>",
  "mime_type": "application/pdf",
  "created_at": "2026-11-13T00:00:00Z"
}
```

## 2. Regla de Precedencia de Hash
1. Calcular `SHA-256` sobre los bytes canónicos del archivo original validado.
2. Cifrar esos bytes con `AES-256-GCM` antes de fijar en IPFS (`pinFileToIPFS`).
3. Anclar en blockchain únicamente `doc_sha256_hash` (`bytes32`) y `ipfsCid`.

## 3. Custodia Híbrida Actual (`src/services/documentStorage.js`)
Mientras se ejecuta el flujo híbrido académico:
- **Primario:** Supabase Storage (bucket `documentos`, ruta `titulos/`).
- **Secundario:** Backend Flask (`/api/documents/upload`).
- **Contingencia Local:** `IndexedDB` (`USM_DocumentVault`, store `documents` indexado por `hash` en mayúsculas).
