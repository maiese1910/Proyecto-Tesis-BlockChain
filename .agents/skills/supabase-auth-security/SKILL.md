---
name: supabase-auth-security
description: Manages Supabase PostgreSQL schemas, Storage bucket policies, student/admin authentication flows (password, OTP, recovery, Turnstile CAPTCHA), OWASP client rate limiting, and offline-first local synchronization. Use when editing supabase_schema.sql, supabase/migrations/, src/services/supabaseClient.js, src/services/securityGuard.js, StudentAuth.jsx, PasswordlessLogin.jsx, or hybrid persistence fallbacks. Do not use for OpenCV OCR logic or Solidity code.
---

# Supabase Auth, Security & Hybrid Persistence Skill

## Architecture & Key Files
- **Database Schema & Migrations:** `supabase_schema.sql`, `supabase/config.toml`, `supabase/migrations/`, `supabase/templates/`. Core tables include `profiles`, `admins`, `records`, `stats`, `audit_logs`, and `checklist_items`.
- **Auth & Anti-Abuse Modules:**
  - `src/services/supabaseClient.js`: Supabase client connection.
  - `src/services/securityGuard.js`: Brute-force lockout after `MAX_FAILED_ATTEMPTS = 5`, `60s` OTP/recovery cooldowns, and input sanitization.
  - `@marsidev/react-turnstile` in auth views (`StudentAuth.jsx`, `PasswordlessLogin.jsx`, `StudentProfileModal.jsx`).
- **Immutability Invariant:** Preserve `cedula` immutability across registration, profile updates, and linked PUB/OCR records.

## Offline-First & Fallback Rules
1. Never leave frontend state broken if Supabase or serverless backend memory (`Vercel`) resets or fails temporarily: cross-reference local state (`usm_blockchain_records`, `usm_student_session`, `usm_students_registry`, IndexedDB `USM_DocumentVault`) cleanly without duplicating records.
2. Never commit `.env` credentials, service role keys, or plaintext admin passwords; inspect `test_supabase.py` behavior safely.
3. Verify browser auth/security flows with `test_otp_and_recovery_verification.mjs`, `test_security_ratelimit_verification.mjs`, or `test_login_unregistered_verification.mjs` when touching login/recovery.
