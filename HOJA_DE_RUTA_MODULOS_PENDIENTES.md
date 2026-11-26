# Hoja de Ruta y Auditoría Técnica de Módulos — USM ApostillaBot

> **Proyecto de Tesis:** *"Prototipo de Plataforma Descentralizada con Inteligencia Artificial para la Digitalización, Validación y Apostilla Transfronteriza de Títulos Universitarios"*
> **Universidad Santa María (USM) — Facultad de Ingeniería y Arquitectura**

Este documento registra el estado actual de los módulos ya optimizados (**Módulos 1 al 5**) y detalla las correcciones técnicas e innovaciones de tesis pendientes para los **Módulos 6 al 11**, de modo que puedas retomar el desarrollo en futuras sesiones exactamente donde quedamos.

---

## ✅ Módulos Completados y Desplegados (1 al 5)

### 1. Módulo 1: Portal de Inicio y Autenticación Estudiantil
- **Archivos:** `src/components/LandingPortal.jsx`, `src/components/StudentAuth.jsx`, `src/components/StudentProfileModal.jsx`, `src/components/Sidebar.jsx`, `api/main.py`, `src/services/api.js`
- **Estado:** **Completado (100%)**
- **Implementaciones realizadas:**
  - Registro e inicio de sesión sincronizados con Supabase (`usm_students`) y respaldo local por cédula.
  - Endpoints de recuperación de contraseña (`/api/auth/recover-password`) y actualización de perfil (`/api/auth/update-profile`) integrados en `api/main.py`.
  - Modal interactivo **"Mi Expediente USM"** (`StudentProfileModal.jsx`) accesible desde la barra lateral con edición de teléfono, carrera y semestre, más cambio de contraseña y cédula/correo inmutables.
  - Estadísticas reales en vivo en `LandingPortal.jsx` conectadas al endpoint `/api/blockchain/stats` y Sepolia Testnet.
  - Sin billetera Web3 vinculada al perfil estudiantil (reservada exclusivamente para el Verificador Blockchain y el Panel Administrativo/Gobierno).

### 2. Módulo 2: Panel Principal (Dashboard) y Tracking de 4 Estaciones
- **Archivos:** `src/components/Dashboard.jsx`, `src/components/TrackingTimeline.jsx`, `src/App.jsx`
- **Estado:** **Completado (100%)**
- **Implementaciones realizadas:**
  - Selector de expediente activo cuando el estudiante posee múltiples documentos digitalizados (Título, Notas Certificadas, Acta de Grado, etc.).
  - Botones de acción rápida en cada una de las 4 estaciones (`1. Rectorado USM`, `2. Legalización GTU`, `3. Registro SAREN`, `4. Apostilla MPPRE`) que redirigen al módulo correspondiente o abren los certificados verificables.
  - **Innovación de Tesis:** **Calculadora de Aranceles Petro/UT y Tiempo Estimado de Apostilla** integrada en `Dashboard.jsx` con cálculo según tipo de documento, vía de cita y país destino (Convenio de La Haya vs. Vía Consular).
  - Conector Web3 (`WalletConnect.jsx`) integrado en `BlockchainVerifier.jsx` y en la cabecera de Rectorado/Gobierno (`App.jsx`).

### 3. Módulo 3: Motor de Extracción OCR Multimodal y Pre-Validación Forense
- **Archivos:** `src/components/OCRExtractor.jsx`, `src/components/PreValidation.jsx`, `src/App.jsx`
- **Estado:** **Completado (100%)**
- **Implementaciones realizadas:**
  - Corrección definitiva del error de hooks de React (`Minified React error #310`) en `OCRExtractor.jsx`.
  - **Innovación de Tesis:** **Analizador Forense de Calidad Óptica y Sellos Húmedos en Canvas** (`analyzeImageForensics`) que evalúa resolución estimada (DPI), índice de contraste luminoso, nitidez y detección cromática de tinta azul/violeta y lacre dorado en el cuadrante inferior del documento.
  - Sincronización bidireccional en vivo entre `OCRExtractor.jsx`, `PUBForm.jsx` y `PreValidation.jsx` (`usm_forensic_audit_<cedula>`), permitiendo marcar requisitos manuales y exportar el **Reporte de Pre-Validación Forense** para el jurado.

### 4. Módulo 4: Asistente Institucional IA (ChatBot Contextual)
- **Archivos:** `src/components/ChatBotWidget.jsx`
- **Estado:** **Completado (100%)**
- **Implementaciones realizadas:**
  - Conciencia contextual en vivo del expediente real del estudiante autenticado (`usm_blockchain_records`, `usm_pub_history` y `/api/blockchain/records`), respondiendo con el hash SHA-256 real, estado de las 4 estaciones y taquilla GTU asignada al consultar *"📋 Estado de Mi Trámite"*.
  - Flujo de **Auditoría Interactiva de 5 Pasos** (`AUDIT_QUESTIONS`) corregido de principio a fin con cálculo porcentual de elegibilidad para apostilla.
  - Persistencia del historial de conversación por estudiante (`usm_chat_history_<cedula>`) y botón **"Exportar PDF"** para imprimir el informe de asesoría legal/técnica.

### 5. Módulo 5: Generador de Planilla Única Bancaria (SAREN PUB)
- **Archivos:** `src/components/PUBForm.jsx`, `src/components/PreValidation.jsx`, `src/components/TrackingTimeline.jsx`, `src/App.jsx`, `api/main.py`
- **Estado:** **Completado (100%)**
- **Implementaciones realizadas:**
  - **Vinculación con trámite existente (Sin duplicados):** Selector superior de expediente OCR para actualizar el mismo hash y registro en `usm_blockchain_records`, `usm_pub_history` y backend (`/blockchain/register`), evitando crear trámites separados.
  - **Autocompletado e integridad de identidad:** Precarga automática desde el perfil (`user`) y resultado OCR (`initialData`), con **Cédula del Titular Inmutable (`🔒`)** y salto automático de campos ya validados en el modo Asistente Chat.
  - **Selector dinámico territorial:** Integración de `ESTADOS_VENEZUELA` (`Estado → Municipio → Taquilla SAREN/GTU`) con dirección y horario impresos en la planilla oficial.
  - **Innovación de Tesis:** **Simulador de Liquidación y Conciliación Bancaria Interbancaria (SENIAT / SAREN)** con selección de banco recaudador de la Tesorería Nacional, referencia bancaria de 12 dígitos, sello de estatus `LIQUIDADA / CONCILIADA` y activación automática del Requisito 4 en `PreValidation.jsx` y de la Estación 2 en `TrackingTimeline.jsx`.

### 6. Módulo 6: Historial de Trámites y Certificados Digitales
- **Archivos:** `src/components/HistoryPanel.jsx`, `src/components/DigitalCertificate.jsx`, `src/components/ApostilleCertificate.jsx`
- **Estado:** **Completado (100%)**
- **Implementaciones realizadas:**
  - Respaldo local/híbrido en `DigitalCertificate.jsx` cuando el backend serverless responde fallback demo o reinicia memoria efímera.
  - Barra de búsqueda y píldoras de filtro por estatus (`Todos`, `En Proceso`, `Certificado GTU`, `Apostillado`) en `HistoryPanel.jsx`, preservando integridad completa de metadatos en `localStorage`.
  - **Innovación de Tesis:** Botón **"Dossier PDF"** en `HistoryPanel.jsx` que genera el **Expediente Académico Unificado (Dossier Criptográfico PDF)** consolidando datos USM, auditoría forense óptica, conciliación bancaria PUB SAREN, anclaje Ethereum Sepolia y sello de Apostilla de La Haya.

### 7. Módulo 7: Verificador Blockchain Público y Escáner QR
- **Archivos:** `src/components/BlockchainVerifier.jsx`, `src/components/QRScanner.jsx`
- **Estado:** **Completado (100%)**
- **Implementaciones realizadas:**
  - Integración completa del modal embebido `QRScanner.jsx` (cámara + imagen) directamente en `BlockchainVerifier.jsx` y corrección de hashes canónicos de demostración.
  - Verificación mediante archivo físico (**Drag & Drop** + selector de archivo) calculando SHA-256 local en el navegador con Web Crypto API.
  - **Innovación de Tesis:** **Laboratorio de Integridad Criptográfica (Demostrador de Efecto Avalancha SHA-256)** con botones rápidos de alteración, resaltado de caracteres modificados, porcentaje real de bits alterados (~50%) y veredicto `HASH_MISMATCH_TAMPER_DETECTED`.

### 8. Módulo 8: Guía de Supervivencia y Ruta Legal (SAREN / GTU / MPPRE)
- **Archivos:** `src/components/SurvivalGuide.jsx`, `src/data/venezuelaLocations.js`, `src/App.jsx`
- **Estado:** **Completado (100%)**
- **Implementaciones realizadas:**
  - Banner en vivo sincronizado con el progreso real del expediente activo del estudiante y botones de navegación directa a `Escáner OCR`, `Pre-Validación`, `Planilla PUB` y `Planillas Oficiales`.
  - **Innovación de Tesis:** **Directorio Interactivo de Sedes y Taquillas (Caracas / Miranda / Nacional)** con búsqueda y filtro por ente (`USM`, `MPPEU`, `SAREN`, `MPPRE`), horarios, recaudos físicos y tiempos estimados de entrega.

### 9. Módulo 9: Repositorio de Planillas Oficiales Autocompletables
- **Archivo:** `src/components/OfficialFormsPanel.jsx`
- **Estado:** **Completado (100%)**
- **Implementaciones realizadas:**
  - Catálogo completo de 6 planillas oficiales (incluyendo *Carta de Autorización a Terceros*) autocompletadas reactivamente desde el perfil y el expediente activo del estudiante, con escape HTML seguro y deduplicación de formularios dinámicos.
  - Barra de **Edición Rápida antes de Imprimir / Descargar PDF** dentro de la vista previa (teléfono, tomo, folio, sede/taquilla y datos del apoderado) con actualización instantánea.

### 10. Módulo 10: Panel Administrativo Ministerial (GTU — MPPEU / Cancillería — MPPRE)
- **Archivos:** `src/AdminApp.jsx`, `src/components/AdminDashboard.jsx`, `src/components/GovernmentPanel.jsx`, `src/components/GovernmentLoginPortal.jsx`, `api/main.py`
- **Estado:** **Completado (100%)**
- **Implementaciones realizadas:**
  - Portal `/admin` y `/gobierno` centrado exclusivamente en los dos entes auditores ministeriales: **GTU — MPPEU (Gestión de Trámites Universitarios)** y **Cancillería — MPPRE (Apostilla Electrónica de La Haya)**, con `<WalletConnect />` en la cabecera y conmutador directo entre la Bandeja Principal GTU/MPPRE y el Centro de Bitácora y Configuración Ministerial.
  - **Bandeja y Control Rápido GTU / MPPRE (`GovernmentPanel.jsx` y `AdminDashboard.jsx`):** Sincronización en tiempo real de los expedientes estudiantiles, inspección del título digitalizado y datos de acta (Libro/Tomo/Folio), certificación en taquilla **`CERTIFICADO_MPPEU`**, emisión de Apostilla Electrónica **`APOSTILLADO_MPPRE`**, aprobación por lote sincronizada y rechazo con observación oficial.
  - **Innovación de Tesis:** **Bitácora de Auditoría Ministerial Inmutable (Audit Trail Exportable CSV/PDF)** que registra cronológicamente todas las firmas y resoluciones de **GTU (`MPPEU`)** y **Cancillería (`MPPRE`)** con timestamp, funcionario, ente y hash SHA-256 / TxHash Sepolia.
  - CRUD completo con respaldo en memoria y backend para creación de auditores (`MPPEU` / `MPPRE`), checklist de requisitos, planillas oficiales (con eliminación) y guías logísticas de sedes en `api/main.py`.

### 11. Módulo 11: Pulido Final de Responsividad Móvil y UX Global
- **Archivos:** `src/index.css`, `src/components/ApostilleCertificate.jsx`, `src/components/Sidebar.jsx`, `src/main.jsx`
- **Estado:** **Completado (100%)**
- **Implementaciones realizadas:**
  - Ajustes responsivos finos `< 480px` para modales anchos (`DigitalCertificate`, `ApostilleCertificate`, previsualización de `OfficialFormsPanel`), accesibilidad de teclado en `Sidebar.jsx`, soporte `/admin/` con barra final en `main.jsx` y validación E2E móvil (`375×812`) sin desbordamiento horizontal.

---

## 🎉 Estado Global de la Hoja de Ruta: 11 / 11 Módulos Completados (100%)
Todos los módulos del sistema (**Módulos 1 al 11**), tanto del Portal del Graduando como del Panel Administrativo Ministerial de Auditores (**GTU — MPPEU** y **Cancillería — MPPRE**), se encuentran implementados, auditados y verificados de extremo a extremo.
