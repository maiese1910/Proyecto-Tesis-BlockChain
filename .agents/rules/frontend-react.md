---
trigger: glob
globs: "src/**/*.jsx, src/**/*.js"
---
# Reglas Estrictas de Frontend (React 19 + Vite + Tailwind CSS)
- Utiliza **React 19** (componentes funcionales y hooks en `.jsx`), **Vite 8** y utilidades de **Tailwind CSS v4** (sin introducir Vue `.vue` ni hojas CSS innecesarias fuera de `src/index.css` / `src/App.css`).
- Mantén desacopladas las vistas según los 3 roles del sistema: Egresado (`Dashboard.jsx`, `OCRExtractor.jsx`, `PreValidation.jsx`, `PUBForm.jsx`, `HistoryPanel.jsx`), Validador Institucional (`AdminDashboard.jsx`, `GovernmentPanel.jsx`, `MPPEUCotejoModal.jsx`, `MPPRECotejoModal.jsx`) y Verificador Público (`BlockchainVerifier.jsx`, `QRScanner.jsx`).
- Centraliza peticiones HTTP en `src/services/api.js`, custodia de documentos en `src/services/documentStorage.js`, seguridad cliente en `src/services/securityGuard.js` y operaciones Web3 (`window.ethereum`, `ethers` v6) en `src/services/web3Service.js` con retroalimentación visual clara.
