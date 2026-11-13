---
name: solidity-academic-apostille
description: Designs, audits, and modifies Solidity smart contracts (blockchain/USMDocumentRegistry.sol) for academic degree registration, multi-institutional validation (University, MPPEU, MPPRE), Merkle trees, ABI syncing, and IPFS CID anchoring. Use when writing or testing .sol files, deploy.py, src/contracts/*.json, or gas optimization. Do not use for Python OCR or React UI styling.
---

# Solidity Academic Credential & Apostille Skill

## Current Repo Context vs Target Architecture (v2)
- **Active Contract:** `blockchain/USMDocumentRegistry.sol` (v1 legacy currently uses `onlyAdmin`, string `require`, and stores `ownerName`/`cedula` in `struct Document`).
- **Migration Goal (v2):** Any contract upgrade must eliminate on-chain PII, implement role-based state transitions, and match `.agents/skills/solidity-academic-apostille/references/roles-and-events-spec.md`.

## Architectural Constraints
1. **Zero On-Chain PII:** Store only the document `bytes32` SHA-256 hash, encrypted IPFS CID (`string`), institutional validator addresses, and status timestamps.
2. **State Machine Workflow:** Enforce sequential transitions:
   - `1: EMITIDO_UNIVERSIDAD` (Registered by University authority)
   - `2: VALIDADO_MPPEU` (Verified by Ministry of University Education / GTU)
   - `3: APOSTILLADO_MPPRE` (Apostilled by Ministry of Foreign Affairs)
   - `4: REVOCADO` (Revoked with cryptographic audit trail)

## Execution & Verification Checklist
- Read `.agents/skills/solidity-academic-apostille/references/roles-and-events-spec.md` before modifying structs, roles, or events.
- Use custom `error` declarations to minimize deployment and transaction gas.
- Emit indexed events (`TituloEmitido`, `TituloValidadoMPPEU`, `TituloApostilladoMPPRE`, `TituloRevocado`) on every state mutation.
- Recompile with `py-solc-x` / `deploy.py` (`solc 0.8.20`) and sync updated ABI JSON into both `blockchain/USMDocumentRegistry.json` and `src/contracts/USMDocumentRegistry.json`.
