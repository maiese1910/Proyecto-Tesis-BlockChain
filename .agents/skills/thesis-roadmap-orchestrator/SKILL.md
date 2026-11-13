---
name: thesis-roadmap-orchestrator
description: Orchestrates disciplined step-by-step execution of pending thesis modules (Modules 6 to 11) in HOJA_DE_RUTA_MODULOS_PENDIENTES.md, keeping implementation, roadmap status, and clean Conventional Commits synchronized. Use when starting a new module from the roadmap, planning multi-file module work, or preparing module completion handoffs. Do not use for isolated quick questions.
---

# Thesis Roadmap Orchestrator Skill

## Module Execution Protocol
Follow these 5 steps in strict order for every module in `HOJA_DE_RUTA_MODULOS_PENDIENTES.md`:

1. **Audit Against Live Code:**
   - Read the target module section in `HOJA_DE_RUTA_MODULOS_PENDIENTES.md` and inspect the actual referenced files (`src/components/*.jsx`, `api/main.py`, etc.) before proposing edits, because some roadmap notes may differ from recent code state.
2. **Scoped Plan & Thesis Alignment:**
   - Break work into concrete changes plus any functional **Innovación de Tesis** noted for that module without breaking completed Modules 1–5 (`Auth`, `Dashboard`, `OCR/PreValidation`, `ChatBotWidget`, `PUBForm`).
3. **Implement Within Invariants:**
   - Respect `AGENTS.md` and active `.agents/rules/*.md` (React `.jsx` in `src/`, Flask in `api/`, zero PII on-chain).
4. **Verify via `qa-e2e-verification`:**
   - Run `npm.cmd run build` and/or `.\venv\Scripts\python.exe -m py_compile ...` + relevant tests after final edits.
5. **Update Roadmap & Prepare Clean Commit:**
   - Move the completed module in `HOJA_DE_RUTA_MODULOS_PENDIENTES.md` to completed status summarizing implemented features, verify `.env` and caches are ignored, and prepare a clean Conventional Commit (`feat(module-X): ...`).
