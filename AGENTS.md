# Proyecto-Tesis-BlockChain — Core Invariants

- **Proyecto:** Prototipo de Plataforma Descentralizada con IA (`USM-ApostillaBot`) para la Digitalización, Validación y Apostilla Transfronteriza de Títulos Universitarios (USM / SAREN / MPPEU-GTU / MPPRE).
- **Stack Estricto Real:**
  - **Backend:** Python con **Flask** (`api/main.py` puerto 8000 y `api/app_flask.py` puerto 5000). **PROHIBIDO usar FastAPI.**
  - **IA / OCR:** Pipeline híbrido con **OpenCV + Google Gemini API + PyMuPDF (`fitz`) + Tesseract (`spa`/`frk`)**.
  - **Base de Datos y Custodia:** **Supabase** (PostgreSQL + Auth + Storage bucket `documentos`) y almacenamiento off-chain cifrado en **IPFS** (`AES-256-GCM`) con respaldo local (`IndexedDB` / `localStorage`).
  - **Blockchain:** Contratos inteligentes en **Solidity `^0.8.20`** (`blockchain/USMDocumentRegistry.sol`, red EVM Sepolia) e integración vía `web3.py` / `ethers` v6.
  - **Frontend:** **React 19 + Vite 8 + Tailwind CSS v4** en `src/` (`*.jsx`, `*.js`). *(El repositorio no utiliza archivos `.vue` ni carpetas `frontend/` o `client/`)*.
- **Privacidad On-Chain:** En la arquitectura objetivo on-chain está prohibido almacenar datos personales (PII) o PDFs en texto plano; se registran únicamente hashes `SHA-256` (`bytes32`), CIDs de IPFS cifrados, direcciones de roles institucionales y estados *(nota: `blockchain/USMDocumentRegistry.sol` v1 conserva campos heredados pendientes de migración a v2 según `.agents/skills/solidity-academic-apostille/references/roles-and-events-spec.md`)*.
- **Redacción Académica:** Toda documentación de tesis, bases teóricas, bases legales e informes técnicos de grado debe redactarse estrictamente en **tercera persona del singular** bajo normas de la Universidad Santa María (USM).
