---
trigger: glob
globs: "**/*.vue, frontend/**/*.js"
---
# Reglas Estrictas de Frontend (Vue.js + Tailwind CSS)
- Utiliza Vue.js (Composition API) y utilidades de **Tailwind CSS** sin hojas CSS personalizadas innecesarias.
- Mantén desacopladas las vistas según los 3 roles del sistema: Egresado, Validador Institucional (Universidad / MPPEU / MPPRE) y Verificador Público Transfronterizo.
- Maneja los estados asíncronos de billetera Web3 (`window.ethereum`), cambio de red y espera de confirmación de bloques con retroalimentación visual clara.

