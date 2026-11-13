# Referencia Visual y Servicios del Frontend (`src/`)

## 1. Sistema Visual (`DESIGN.md`)
- Paleta base editorial limpia (`Ink Black #17191c`, `Paper White #ffffff`, `Mist Gray #f2f2f3`, `Fog White #fafafb`, `Slate Gray #777b86`, acento cálido `Blush Peach #fbe1d1` / `Sienna Brown #5d2a1a`) junto con utilidades Tailwind CSS v4 en `src/index.css`.
- Tarjetas amplias (`24px`), inputs redondeados (`16px`), controles tipo píldora y jerarquía clara para certificados e impresión (`html2pdf.js` / `@media print`).

## 2. Mapa de Servicios Centrales (`src/services/`)
- `api.js`: Wrapper HTTP (`apiFetch`) con manejo automático de prefijo `/api`, lectura de `VITE_API_URL`, soporte de tokens JWT y extracción de errores (`errorData.detail || errorData.error`).
- `web3Service.js`: Conexión MetaMask (`ethers` v6 `BrowserProvider`), RPC público Ethereum Sepolia (`chainId: 11155111`, `https://ethereum-sepolia-rpc.publicnode.com`), ABI importado desde `../contracts/USMDocumentRegistry.json` y dirección activa vía `getContractAddress()`.
- `documentStorage.js`: Compresión bicúbica en Canvas HTML5, custodia en Supabase Storage (`documentos/titulos/`), respaldo en Flask (`/api/documents/upload`) y bóveda local IndexedDB (`USM_DocumentVault`).
- `supabaseClient.js` y `securityGuard.js`: Sesión de graduando, autenticación OTP/Turnstile y protección OWASP contra fuerza bruta en cliente.
