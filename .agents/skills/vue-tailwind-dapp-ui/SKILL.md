---
name: vue-tailwind-dapp-ui
description: Develops and styles Vue.js components using Tailwind CSS for the graduate portal, MPPEU/MPPRE institutional validation dashboards, Web3 wallet connection, and QR/hash verification views. Use when editing .vue files, Tailwind classes, or frontend API/Web3 calls. Do not use for backend Python logic.
---

# Vue.js + Tailwind CSS DApp Frontend Skill

## Role-Based Views
1. **Vista Egresado (Graduate Portal):**
   - Drag-and-drop PDF/image uploader with client-side file type/size validation.
   - Interactive split preview showing the uploaded degree alongside the JSON extracted by Flask/Gemini OCR.
   - Real-time stepper tracking credential status (`Emitido USM` -> `Validado MPPEU` -> `Apostillado MPPRE`).
2. **Vista Institucional (Universidad / MPPEU / MPPRE):**
   - Pending queue table with filter by `docHash` and date.
   - Side-by-side comparison modal (decrypted IPFS preview + OCR audit metrics) and one-click Web3 signature button.
3. **Vista Verificador Público Transfronterizo:**
   - Wallet-free public verification page accepting a PDF file drop (computes SHA-256 locally in browser via Web Crypto API), transaction hash, or QR scan to query the smart contract state directly.

