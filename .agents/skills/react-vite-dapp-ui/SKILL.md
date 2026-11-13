---
name: react-vite-dapp-ui
description: Develops and styles React 19 (.jsx) + Vite + Tailwind CSS v4 components for the graduate portal, Rectorado USM/MPPEU/MPPRE institutional validation dashboards, Ethers v6 Web3 wallet flows, PDF dossier/certificate generation, and QR/hash public verification views. Use when editing src/**/*.jsx, src/**/*.js, DESIGN.md styles, or frontend API/Web3 integrations. Do not use Vue (.vue) syntax or modify Python backend OCR or Solidity contracts.
---

# React + Vite + Tailwind DApp Frontend Skill

## Stack & Service Architecture
- **UI Stack:** React 19 functional components (`.jsx`), Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), `lucide-react`, `qrcode.react`, `html5-qrcode`, `html2pdf.js`.
- **Service Layer:** Read `.agents/skills/react-vite-dapp-ui/references/design-and-services.md` before building new components or styling surfaces. Never bypass `src/services/api.js`, `src/services/documentStorage.js`, or `src/services/web3Service.js` with ad-hoc fetch/contract boilerplate.

## Role-Based Views
1. **Vista Graduando:** `Dashboard.jsx`, `OCRExtractor.jsx`, `PreValidation.jsx`, `PUBForm.jsx`, `HistoryPanel.jsx`, `OfficialFormsPanel.jsx`, `SurvivalGuide.jsx`, `TrackingTimeline.jsx`.
2. **Vista Institucional (`/admin` y `/gobierno`):** `AdminDashboard.jsx` (Rectorado USM), `GovernmentPanel.jsx` (MPPEU GTU / MPPRE), `MPPEUCotejoModal.jsx`, `MPPRECotejoModal.jsx`.
3. **Vista Verificador Público Transfronterizo:** `BlockchainVerifier.jsx`, `QRScanner.jsx`, `DigitalCertificate.jsx`, `ApostilleCertificate.jsx` (wallet-free SHA-256 verification and Sepolia RPC inspection).

## Execution Checklist
- Preserve responsive layouts down to `< 480px` for modals, certificates, and institutional tables (`src/index.css`).
- Provide explicit loading/error feedback via `ToastNotification.jsx` and `ErrorBoundary.jsx`.
- Verify changes on Windows PowerShell with `npm.cmd run build` (and `npm.cmd run lint` when modifying component hooks/imports).
