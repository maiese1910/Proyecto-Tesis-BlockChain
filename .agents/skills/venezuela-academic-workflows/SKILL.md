---
name: venezuela-academic-workflows
description: Enforces domain consistency across the 4-station Venezuelan academic apostille workflow (USM Rectorado -> MPPEU GTU -> SAREN PUB -> MPPRE Apostilla), official record statuses, bank reconciliation rules, territorial catalogs (ESTADOS_VENEZUELA), and the 6 autocompletable official forms. Use when implementing Modules 6, 8, 9, or 10 or linking tracking/status/PDF dossier logic across frontend and backend. Do not use for low-level OpenCV filters or Solidity gas tuning.
---

# Venezuela Academic Apostille Domain Workflows Skill

## Core Domain Protocol
1. **Canonical 4-Station Workflow & Statuses:** Before adding or changing status badges, filters, timeline stations, or institutional approval buttons (`AdminDashboard.jsx`, `GovernmentPanel.jsx`, `TrackingTimeline.jsx`, `HistoryPanel.jsx`, `SurvivalGuide.jsx`, `api/main.py`), read `.agents/skills/venezuela-academic-workflows/references/estados-y-tramites-spec.md`.
2. **Zero Duplicate Records:** Link PUB liquidations, Pre-Validation checklists, and institutional approvals to the active `solicitudCode` / document hash in `usm_blockchain_records` and `/blockchain/register` rather than spawning detached rows.
3. **Dynamic Autocomplete & Official Forms (`OfficialFormsPanel.jsx`):** Populate all 6 official forms from the authenticated student session (`usm_student_session` / `usm_students_registry`) and active record (`usm_blockchain_records`) plus `ESTADOS_VENEZUELA` (`src/data/venezuelaLocations.js`), supporting controlled last-mile edits (e.g., third-party proxy details) before PDF/print output.
