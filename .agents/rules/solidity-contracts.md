---
trigger: glob
globs: "**/*.sol"
---
# Reglas Estrictas de Contratos Inteligentes (Solidity)
- Utiliza Solidity `^0.8.20` (`blockchain/USMDocumentRegistry.sol`) con errores personalizados (`error`) en lugar de cadenas largas en `require` al implementar o migrar a la arquitectura v2 para optimizar gas.
- En la arquitectura objetivo (v2), nunca almacenes nombres, números de cédula ni documentos planos dentro del `storage` del contrato.
- Verifica en cada transición de estado el rol institucional correspondiente (`UNIVERSITY_ISSUER_ROLE`, `MPPEU_VALIDATOR_ROLE`, `MPPRE_APOSTILLE_ROLE`) con eventos indexados y mantén sincronizado el ABI compilado (`deploy.py`) en `blockchain/USMDocumentRegistry.json` y `src/contracts/USMDocumentRegistry.json`.
