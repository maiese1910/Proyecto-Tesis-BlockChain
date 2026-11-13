---
name: ipfs-encrypted-storage
description: Manages off-chain document encryption, SHA-256 hashing, IPFS pinning (Pinata or local IPFS node), and hybrid Supabase/IndexedDB custody for academic PDFs and images. Use when implementing file uploads, CID retrieval, pre-IPFS AES-256-GCM encryption, metadata envelopes, src/services/documentStorage.js, or hash verification. Do not use for UI layout styling or OCR text extraction.
---

# Encrypted IPFS & Off-Chain Custody Skill

## Security & Integrity Protocol
1. **Canonical Hash First:** Calculate the `SHA-256` digest (`bytes32` hex) on the original validated PDF or image *before* encryption so external verifiers with the original file can verify authenticity directly against the smart contract.
2. **Pre-IPFS Encryption:** Encrypt the document payload using `AES-256-GCM` prior to uploading to Pinata or an IPFS node so sensitive academic records are never publicly readable on IPFS gateways.
3. **Metadata Envelope & Hybrid Custody:**
   - Read `.agents/skills/ipfs-encrypted-storage/references/metadata-envelope-spec.md` before modifying metadata structures or storage adapters.
   - Keep `src/services/documentStorage.js` aligned across primary Supabase Storage (`documentos` bucket under `titulos/`), Flask upload fallback (`/api/documents/upload`), and IndexedDB contingency vault (`USM_DocumentVault`).
4. **Error Handling:** Implement retry with exponential backoff and clean timeout exceptions when communicating with Pinata API (`pinFileToIPFS`), public IPFS gateways, or storage endpoints.
