---
trigger: glob
globs: "**/*.sol"
---
# Reglas Estrictas de Contratos Inteligentes (Solidity)
- Utiliza Solidity `^0.8.20` con errores personalizados (`error`) en lugar de cadenas largas en `require` para optimizar el consumo de gas.
- Nunca almacenes nombres, números de cédula ni documentos planos dentro del almacenamiento del contrato (`storage`).
- Asegura que cada transición de estado verifique el rol institucional correspondiente y emita su evento indexado.

