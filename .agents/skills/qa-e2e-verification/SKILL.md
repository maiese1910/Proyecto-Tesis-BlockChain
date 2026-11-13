---
name: qa-e2e-verification
description: Executes structured build, Python syntax, OCR/NER unit tests, and Puppeteer E2E/responsive browser checks in this Windows repository. Use before marking any feature or module complete, before committing, or when debugging build/runtime regressions. Do not use for thesis prose writing.
---

# QA & End-to-End Verification Skill

## Windows PowerShell Environment Rules
- **NPM Execution Policy:** On Windows in this workspace, `npm.ps1` can be blocked by PowerShell policy. Always invoke `npm.cmd` (e.g., `npm.cmd run build`, `npm.cmd run lint`).
- **Python Environment:** Always execute backend scripts and compilers through the project virtual environment: `.\venv\Scripts\python.exe`.

## Verification Gates (Run Only What Applies to Changed Scope)
1. **Frontend Gate (React / Vite / Tailwind):**
   - Run `npm.cmd run build` to verify zero bundler or JSX syntax errors.
   - Run `npm.cmd run lint` when modifying component logic, hooks, or service imports.
2. **Backend Gate (Python / Flask / OCR):**
   - Run `.\venv\Scripts\python.exe -m py_compile api\main.py api\app_flask.py api\ocr_service.py api\gemini_service.py api\vision_preprocessor.py` (or modified `.py` files).
   - Run `.\venv\Scripts\python.exe test_ner_robust.py` and `.\venv\Scripts\python.exe test_flask_ocr.py` when editing OCR, NER, or Flask API endpoints.
3. **Browser E2E & Mobile `< 480px` Gate (Module 11 & UI Flows):**
   - Run targeted Node/Puppeteer checks (`validate_browser.mjs`, `check_errors.mjs`, `test_otp_and_recovery_verification.mjs`, `test_security_ratelimit_verification.mjs`, `test_login_unregistered_verification.mjs`) when modifying auth, security, or cross-module flows; clean up temporary screenshots if outside tracked paths.
4. **Git Hygiene Pre-Push Gate:**
   - Check `git status --short` to ensure `.env`, `usm_records_cache.json`, `temp_ocr/`, `*.tmp`, `artifacts/`, `cache/`, `node_modules/`, `venv/`, and `__pycache__/` remain untracked/ignored.
