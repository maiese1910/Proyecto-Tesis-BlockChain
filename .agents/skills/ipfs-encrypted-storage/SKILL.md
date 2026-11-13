---
name: ipfs-encrypted-storage
description: Manages off-chain document encryption, SHA-256 hashing, and IPFS pinning (Pinata or local IPFS node) for academic PDFs. Use when implementing file uploads, CID retrieval, pre-IPFS encryption, or hash verification. Do not use for UI components or OCR text extraction.
---

# Encrypted IPFS Storage Skill

## Security & Integrity Protocol
1. **Canonical Hash First:** Calculate the `SHA-256` digest (`bytes32` hex) on the original validated PDF *before* encryption so external verifiers with the original PDF can verify its authenticity directly against the smart contract.
2. **Pre-IPFS Encryption:** Encrypt the document payload using `AES-256-GCM` prior to uploading to Pinata or the IPFS node so sensitive academic records are never publicly readable on IPFS gateways.
3. **Metadata Envelope:** Pin only the encrypted blob and non-PII integrity metadata (`version`, `cipher`, `iv`, `doc_sha256_hash`).
4. **Error Handling:** Implement retry with exponential backoff and clean timeout exceptions when communicating with Pinata API (`pinFileToIPFS`) or public IPFS gateways.

