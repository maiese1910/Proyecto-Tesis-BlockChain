# Guía Práctica de Uso de Skills y Reglas en Antigravity (`Proyecto-Tesis-BlockChain`)

Esta guía documenta la arquitectura real de contexto configurada en `AGENTS.md`, `.agents/rules/` y `.agents/skills/` para trabajar de forma ordenada, rápida y consistente entre todos los integrantes del equipo.

---

## 1. Aclaración de Diferencias Reales del Repositorio (vs. Plantilla Inicial)

Tras auditar el código fuente real frente a la configuración inicial, se alinearon las siguientes diferencias técnicas para evitar contradicciones y reglas inactivas:

| Área | Plantilla Inicial | Estado Real del Repositorio y Alineación Aplicada |
| :--- | :--- | :--- |
| **Frontend** | Indicaba **Vue.js (`.vue`)** en rutas `frontend/` y `client/` (`frontend-vue.md`, `vue-tailwind-dapp-ui`). | No existe ningún archivo `.vue` en el repositorio; toda la interfaz vive en `src/` usando **React 19 (`.jsx`) + Vite 8 + Tailwind CSS v4 + Ethers.js v6** (`package.json`). Se reemplazó la regla y skill de Vue por `.agents/rules/frontend-react.md` (`globs: "src/**/*.jsx, src/**/*.js"`) y `.agents/skills/react-vite-dapp-ui/`. *(Nota: `next-architecture/` contiene un boceto aislado sin uso en producción).* |
| **Backend Flask** | Menciones heredadas a FastAPI en `README.md` y regla única estricta de sobre `{ "success", "data", "error" }` sin excepciones. | Tanto el servidor central (`api/main.py`, puerto `8000`) como el microservicio OCR (`api/app_flask.py`, puerto `5000`) corren **100% en Flask**. En `backend-flask.md` se mantuvo el estándar JSON para rutas nuevas preservando retrocompatibilidad con `src/services/api.js` (`fields`, `records`, `detail`). |
| **Smart Contract** | Asumía carpeta `contracts/` y contrato ya migrado a arquitectura v2 sin PII. | El contrato activo vive en `blockchain/USMDocumentRegistry.sol` (v1 heredado aún guarda `ownerName`/`cedula` y usa `onlyAdmin`), con ABIs en `blockchain/USMDocumentRegistry.json` y `src/contracts/USMDocumentRegistry.json`. `solidity-academic-apostille` distingue ahora entre v1 actual y el plano objetivo v2 sin PII (`roles-and-events-spec.md`). |
| **Pipeline OCR / IA** | Solo describía OpenCV + Gemini genérico. | El proyecto implementa extracción híbrida multicapa (`api/vision_preprocessor.py` + `api/gemini_service.py` + `api/ocr_service.py` + `PyMuPDF` + Tesseract `spa`/`frk` en `api/tessdata/`). La skill `flask-opencv-gemini-ocr` ahora enlaza estos módulos y las pruebas `test_ner_robust.py` / `test_flask_ocr.py`. |
| **Custodia y Base de Datos** | Enfocada únicamente en Pinata/IPFS sin referencia local ni cobertura para Supabase. | Hoy conviven Supabase (`supabase_schema.sql`, bucket `documentos/titulos/`), `src/services/documentStorage.js` (`IndexedDB` `USM_DocumentVault`) y respaldo local. Se pobló `ipfs-encrypted-storage/references/metadata-envelope-spec.md` y se creó la skill `supabase-auth-security`. |

---

## 2. Cómo carga Antigravity el contexto (Progressive Disclosure)

| Nivel | Ubicación | Cuándo se activa | Propósito |
| :--- | :--- | :--- | :--- |
| **Invariantes Globales** | `AGENTS.md` | **Siempre activo** en todo el repositorio. | Define stack real (React 19 + Flask + OpenCV/Gemini + Supabase/IPFS + Solidity), privacidad on-chain y redacción USM. |
| **Reglas por Archivo** | `.agents/rules/backend-flask.md`<br>`.agents/rules/frontend-react.md`<br>`.agents/rules/solidity-contracts.md` | Automáticamente al abrir o editar archivos que coincidan con `globs` (`**/*.py`, `src/**/*.jsx, src/**/*.js`, `**/*.sol`). | Impone restricciones de implementación según la capa editada. |
| **Skills Especializadas** | `.agents/skills/<nombre>/SKILL.md` | **Bajo demanda.** Inicialmente el agente solo ve su `name` y `description`; carga el `SKILL.md` y sus `references/` al activarse la tarea. | Contiene procedimientos paso a paso, esquemas, specs y checklists de verificación sin saturar la ventana de contexto. |

> **Sincronización en equipo:** Cada vez que tú o tu compañero modifiquen `AGENTS.md`, `.agents/rules/` o `.agents/skills/`, ejecuten `git pull` antes de iniciar una sesión nueva para trabajar exactamente bajo las mismas reglas.

---

## 3. Las 4 formas efectivas de mandarme a usar una Skill

1. **Invocación directa por nombre (máxima precisión):**
   > *"Usa la skill `react-vite-dapp-ui` sobre `@src/components/HistoryPanel.jsx`..."*
2. **Adjuntar archivos clave con `@`:**
   > Puedes referenciar en el chat código (`@api/main.py`, `@src/services/web3Service.js`), especificaciones (`@.agents/skills/venezuela-academic-workflows/references/estados-y-tramites-spec.md`) o la hoja de ruta (`@HOJA_DE_RUTA_MODULOS_PENDIENTES.md`).
3. **Invocación natural por palabras clave:**
   > Describir términos exactos del dominio (`Flask / OpenCV`, `Supabase / Turnstile`, `Solidity / ABI Sepolia`, `npm.cmd run build / Puppeteer`, `tercera persona / Pirámide de Kelsen`) activa automáticamente la skill correspondiente.
4. **Combinación con Slash Commands nativos de Antigravity:**
   * **`/plan`:** Para acordar el plan paso a paso antes de tocar archivos (recomendado al iniciar cada módulo pendiente o refactorizar Solidity).
   * **`/grill-me`:** Para alinear decisiones técnicas mediante preguntas cortas antes de programar.
   * **`/boost`** o **`/teamwork`:** Para auditorías profundas o cambios que cruzan varias capas.
   * **`/learn`:** Para convertir en aprendizaje persistente soluciones a errores complejos de entorno.

---

## 4. Fórmula de Prompt Estructurado

Usa esta plantilla de 5 bloques para mantener al agente enfocado y evitar cambios fuera de alcance:

```text
[1. Skill / Comando] Usa la skill `<nombre-de-skill>` (opcional: con `/plan`).
[2. Contexto @]      Revisa @<archivo-principal> y @<referencia-o-hoja-de-ruta>.
[3. Objetivo]        Implementa / corrige / redacta <descripción concreta o Módulo X>.
[4. Límites]         No modifiques <archivos o capas fuera del alcance>.
[5. Verificación]    Al terminar, valida usando `qa-e2e-verification` (<build / tests>).
```

---

## 5. Catálogo completo de Skills disponibles (`9` skills)

### A. Skills Técnicas del Stack
| Skill | Cuándo usarla | Cuándo NO usarla | Referencia en `references/` |
| :--- | :--- | :--- | :--- |
| `react-vite-dapp-ui` | Componentes React `.jsx`, Tailwind CSS v4, diseño editorial de `DESIGN.md`, `web3Service.js`, QR/PDF y responsividad móvil. | Backend Python o Solidity. | `design-and-services.md` |
| `flask-opencv-gemini-ocr` | Rutas Flask en `api/`, preprocesamiento OpenCV, Gemini Vision, PyMuPDF/Tesseract y `AcademicDegreeNER`. | Componentes UI o contratos `.sol`. | `titulo-json-schema.json` |
| `supabase-auth-security` | Esquema SQL (`supabase_schema.sql`), auth OTP/recuperación, `securityGuard.js`, Turnstile y respaldo offline. | Filtros OpenCV o Solidity. | — |
| `ipfs-encrypted-storage` | Hash `SHA-256` previo al cifrado, cifrado `AES-256-GCM`, Pinata/IPFS y `src/services/documentStorage.js`. | Estilos UI o prompts OCR. | `metadata-envelope-spec.md` |
| `solidity-academic-apostille` | Contratos `.sol` (`blockchain/USMDocumentRegistry.sol`), roles v2, custom `error`, compilación `deploy.py` y sincronización ABI en `src/contracts/`. | Python OCR o React UI. | `roles-and-events-spec.md` |

### B. Skills de Flujo, Calidad y Tesis
| Skill | Cuándo usarla | Cuándo NO usarla | Referencia en `references/` |
| :--- | :--- | :--- | :--- |
| `thesis-roadmap-orchestrator` | Al iniciar o cerrar cualquiera de los Módulos `6` al `11` de `HOJA_DE_RUTA_MODULOS_PENDIENTES.md` y preparar commits. | Dudas rápidas aisladas. | — |
| `venezuela-academic-workflows` | Flujo de 4 estaciones (USM → MPPEU → SAREN → MPPRE), estados canónicos, conciliación bancaria PUB y las 6 planillas oficiales. | Filtros OpenCV o gas EVM. | `estados-y-tramites-spec.md` |
| `qa-e2e-verification` | Antes de cerrar módulo o hacer `git push` (`npm.cmd run build`, `eslint`, `py_compile`, `test_ner_robust.py`, `test_flask_ocr.py`, Puppeteer `< 480px`). | Redacción académica. | — |
| `usm-thesis-academic-writer` | Redacción de capítulos, bases legales, encuestas y descripción arquitectónica en tercera persona bajo normas USM. | Escribir código fuente. | `marco-legal-venezuela.md`, `usm-format-and-project-docs.md` |

---

## 6. Prompts listos para los Módulos Pendientes (`6` al `11`)

### Para iniciar un módulo completo con flujo estructurado (ej. Módulo 6)
> Usa `thesis-roadmap-orchestrator` junto con `react-vite-dapp-ui` y `venezuela-academic-workflows`. Revisa `@HOJA_DE_RUTA_MODULOS_PENDIENTES.md` (Módulo 6), `@src/components/HistoryPanel.jsx` y `@src/components/DigitalCertificate.jsx`. Implementa el respaldo offline en `DigitalCertificate.jsx`, filtros por estado y el botón de Dossier Criptográfico PDF Unificado. Al final valida con `qa-e2e-verification` (`npm.cmd run build`).

### Módulo 7 (Verificador Público + QR + Efecto Avalancha)
> Usa `react-vite-dapp-ui`. Revisa `@src/components/BlockchainVerifier.jsx`, `@src/components/QRScanner.jsx` y `@src/services/web3Service.js`. Conecta el escáner QR, verificación por Drag & Drop de archivo con SHA-256 en navegador y el Laboratorio de Efecto Avalancha. Verifica con `npm.cmd run build` y `npm.cmd run lint`.

### Módulos 8 y 9 (Guía de Supervivencia y Planillas Oficiales)
> Usa `venezuela-academic-workflows` y `react-vite-dapp-ui`. Revisa `@src/components/SurvivalGuide.jsx` y `@src/components/OfficialFormsPanel.jsx`. Sincroniza las 4 estaciones reales con el trámite activo y habilita autocompletado completo desde el perfil y expediente con edición previa a imprimir.

### Módulo 10 (Rectorado USM, MPPEU y MPPRE)
> Usa `venezuela-academic-workflows`, `supabase-auth-security` y `react-vite-dapp-ui`. Revisa `@src/components/AdminDashboard.jsx`, `@src/components/GovernmentPanel.jsx` y `@api/main.py`. Sincroniza la bandeja del Rectorado USM, agrega la acción `VERIFICADO_USM` y la bitácora exportable CSV/PDF. Verifica backend (`py_compile`) y frontend (`npm.cmd run build`).

### Módulo 11 (Responsividad `< 480px` y QA Integral)
> Usa `qa-e2e-verification` y `react-vite-dapp-ui`. Revisa `@src/index.css` y `@validate_browser.mjs`. Ajusta modales de certificados, vista previa de planillas y tablas ministeriales en `< 480px`, luego ejecuta `npm.cmd run build` y las pruebas E2E en navegador.

---

## 7. Buenas prácticas de trabajo en equipo

1. **Un dominio por turno o conversación:** Evita mezclar en un solo mensaje cambios de Solidity, CSS y redacción de Capítulo III. Trabaja por bloques limpios para respetar las exclusiones de cada skill.
2. **Comandos correctos en Windows PowerShell:** En este entorno `npm.ps1` suele bloquearse por política de ejecución; exige usar siempre `npm.cmd` (`npm.cmd run build`, `npm.cmd run lint`) y el intérprete del entorno virtual `.\venv\Scripts\python.exe`.
3. **Higiene Git antes de cada `git push`:** Verifica con `git status --short` que nunca se incluyan `.env`, `usm_records_cache.json`, `temp_ocr/`, `*.tmp`, `artifacts/`, `cache/`, `node_modules/` ni `venv/`.
