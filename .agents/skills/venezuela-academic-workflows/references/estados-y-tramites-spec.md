# Especificación de Estados, 4 Estaciones e Integración de Trámites (Venezuela)

## 1. Flujo Institucional de 4 Estaciones
1. **Estación 1 — Rectorado USM (Emisión y Refrendo):** Registro inicial del documento digitalizado (`OCRExtractor.jsx`), auditoría óptica (`PreValidation.jsx`) y refrendo institucional (`AdminDashboard.jsx`).
2. **Estación 2 — Gestión de Trámites Universitarios (MPPEU / GTU):** Cotejo documental y legalización ministerial (`GovernmentPanel.jsx` / `MPPEUCotejoModal.jsx`) + recaudos territoriales (`ESTADOS_VENEZUELA`).
3. **Estación 3 — Registro Principal SAREN (PUB y Aranceles):** Generación de Planilla Única Bancaria (`PUBForm.jsx`), conciliación bancaria de referencia de **12 dígitos** (SENIAT/SAREN -> estado `LIQUIDADA / CONCILIADA`) y protocolización.
4. **Estación 4 — Cancillería MPPRE (Apostilla Electrónica de La Haya):** Emisión del código único de apostilla (`MPPRECotejoModal.jsx`), certificado verificable (`ApostilleCertificate.jsx`) y validación pública transfronteriza (`BlockchainVerifier.jsx`).

## 2. Estados Canónicos del Expediente (`records.status` / UI)
- `PENDIENTE_COTEJO_MPPEU` *(inicial tras registro base)*
- `VERIFICADO_USM` *(refrendo rectoral — Módulo 10)*
- `VERIFICADO_MPPEU` *(aprobación GTU)*
- `APOSTILLADO` *(emisión final MPPRE con `apostille_number`)*
- `RECHAZADO` *(con `rejection_reason` técnico obligatorio)*

## 3. Planillas Oficiales (`OfficialFormsPanel.jsx`)
1. Solicitud de Grado USM
2. Certificación de Fondo Negro USM
3. Planilla de Cita / Legalización GTU (MPPEU)
4. Solicitud de Protocolización SAREN (vinculada a PUB)
5. Solicitud de Apostilla Electrónica MPPRE
6. Carta de Autorización a Terceros (editable antes de imprimir)
