---
name: solidity-academic-apostille
description: Designs, audits, and modifies Solidity smart contracts for academic degree registration, multi-institutional validation (University, MPPEU, MPPRE), Merkle trees, and IPFS CID anchoring. Use when writing or testing .sol files, ABI integrations, or gas optimization. Do not use for Python backend OCR or Vue UI styling.
---

# Solidity Academic Credential & Apostille Skill

## Architectural Constraints
1. **Zero On-Chain PII:** Store only the document `bytes32` SHA-256 hash, encrypted IPFS CID (`string`), institutional validator addresses, and status timestamps.
2. **State Machine Workflow:** Enforce sequential transitions:
   - `1: EMITIDO_UNIVERSIDAD` (Registered by University authority)
   - `2: VALIDADO_MPPEU` (Verified by Ministry of University Education / GTU)
   - `3: APOSTILLADO_MPPRE` (Apostilled by Ministry of Foreign Affairs)
   - `4: REVOCADO` (Revoked with cryptographic audit trail)
3. **Reference Specification:** Before modifying contract structs, roles, or events, read `.agents/skills/solidity-academic-apostille/references/roles-and-events-spec.md`.

## Execution Checklist
- Use custom `error` declarations to minimize deployment and transaction gas.
- Emit indexed events (`TituloEmitido`, `TituloValidadoMPPEU`, `TituloApostilladoMPPRE`, `TituloRevocado`) on every state mutation.
- Keep ABI exports updated whenever public/external function signatures change.

