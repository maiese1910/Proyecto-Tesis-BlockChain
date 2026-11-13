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

---

## 🛠️ Módulos Pendientes por Pulir (6 al 11)

A continuación se detallan las correcciones e innovaciones pendientes para las próximas sesiones, ordenadas por prioridad:

---

### Módulo 6: Historial de Trámites y Certificados Digitales
- **Archivos principales:** `src/components/HistoryPanel.jsx`, `src/components/DigitalCertificate.jsx`, `src/components/ApostilleCertificate.jsx`
- **Qué funciona actualmente:**
  - Listado filtrado exclusivamente por el estudiante autenticado, visualización del documento original adjunto, apertura del Certificado Blockchain (`DigitalCertificate.jsx`) y de la Apostilla de La Haya (`ApostilleCertificate.jsx`).
- **Qué falta corregir:**
  1. **Respaldo Offline/Local en `DigitalCertificate.jsx`:** Cuando el estudiante abre el certificado desde `HistoryPanel.jsx`, `DigitalCertificate.jsx` consulta `/api/blockchain/verify/<hash>`. Si el servidor serverless de Vercel reinició su memoria efímera y el hash fue emitido en modo local/híbrido, debe cruzar automáticamente con `usm_blockchain_records` para mostrar todos los metadatos académicos sin fallar.
  2. **Filtros y Búsqueda Rápida en `HistoryPanel.jsx`:** Añadir barra de búsqueda por hash/tipo de documento y filtro por estado (`TODOS`, `EN_PROCESO`, `VERIFICADO_MPPEU`, `APOSTILLADO`).
- **Innovación de Tesis a añadir:**
  - **Descarga de "Expediente Académico Unificado (Dossier Criptográfico PDF)":** Un botón en `HistoryPanel.jsx` que genere un documento consolidado de auditoría con: (1) Datos del graduando USM, (2) Resultados de la auditoría forense óptica, (3) Planilla PUB asociada, (4) Certificado de anclaje en Ethereum Sepolia y (5) Sello de Apostilla de La Haya.

---

### Módulo 7: Verificador Blockchain Público y Escáner QR
- **Archivos principales:** `src/components/BlockchainVerifier.jsx`, `src/components/QRScanner.jsx`
- **Qué funciona actualmente:**
  - Consulta en tiempo real a Ethereum Sepolia (`eth_blockNumber`, `eth_gasPrice`), conector Web3 (`WalletConnect`), botones de hashes de prueba y visualización del certificado.
- **Qué falta corregir:**
  1. **Integrar `QRScanner.jsx` dentro de `BlockchainVerifier.jsx`:** El componente `QRScanner.jsx` (`html5-qrcode`) ya existe en el repositorio pero **no está conectado en la interfaz del Verificador Blockchain**. Se debe agregar un botón *"📷 Escanear Código QR de Certificado"* (tanto por cámara web/móvil como subiendo una imagen de QR) que extraiga el hash `0x...` y ejecute la verificación en Sepolia automáticamente.
  2. **Verificación mediante archivo físico (Drag & Drop):** Permitir que un empleador o cancillería extranjera arrastre un archivo PDF/imagen de un título sobre el verificador para calcular su hash SHA-256 en el navegador y comprobar si coincide con el registrado en el Smart Contract.
- **Innovación de Tesis a añadir:**
  - **Laboratorio de Integridad Criptográfica (Demostrador de Efecto Avalancha SHA-256):** Una sección interactiva pensada para la **defensa de tesis ante el jurado**, donde al alterar un solo carácter (ej. cambiar el promedio de `16.5` a `18.5` o un dígito de la cédula) se muestre en tiempo real cómo cambia radicalmente el hash SHA-256 y cómo el Smart Contract rechaza el documento adulterado (`HASH_MISMATCH_TAMPER_DETECTED`).

---

### Módulo 8: Guía de Supervivencia y Ruta Legal (SAREN / GTU / MPPRE)
- **Archivo principal:** `src/components/SurvivalGuide.jsx`
- **Qué funciona actualmente:**
  - Guía interactiva de 4 etapas (`Rectorado USM → GTU MPPEU → SAREN → MPPRE`) con pestañas de requisitos, consejos prácticos y advertencias legales.
- **Qué falta corregir:**
  1. **Sincronización con el progreso real del estudiante:** Resaltar automáticamente en qué etapa de las 4 se encuentra actualmente el trámite activo del estudiante (ej. *"Tu trámite actual está en la Etapa 2: Legalización GTU"*).
  2. **Botones de navegación directa:** Conectar cada etapa de la guía con los módulos funcionales de la plataforma (`Ir a Escáner OCR`, `Generar Planilla PUB`, `Ir a Pre-Validación`, `Ver Planillas Oficiales`).
- **Innovación de Tesis a añadir:**
  - **Directorio Interactivo de Sedes y Taquillas (Caracas / Miranda / Nacional):** Añadir una tabla consultable de sedes oficiales (Rectorado USM La Florencia, Sede Principal MPPEU Chorro a Coliseo, Registros Principales SAREN y Cancillería MPPRE Casa Amarilla) con horarios de atención, requisitos de vestimenta/sobre manila y tiempos reales de entrega.

---

### Módulo 9: Repositorio de Planillas Oficiales Autocompletables
- **Archivo principal:** `src/components/OfficialFormsPanel.jsx`
- **Qué funciona actualmente:**
  - Catálogo de 6 planillas oficiales (Solicitud de Grado USM, Certificación de Fondo Negro, Planilla GTU, Solicitud de Legalización SAREN, Solicitud de Apostilla MPPRE y Carta de Autorización a Terceros) con vista previa e impresión.
- **Qué falta corregir:**
  1. **Autocompletado 100% dinámico con el expediente real:** Actualmente algunos campos como `carrera`, `telefono`, `folio`, `tomo`, `sede_taquilla` y `hash` usan valores genéricos si no se pasan explícitamente. Debe leer automáticamente los datos actualizados del perfil (`usm_student_session` / `usm_students_registry`) y del trámite activo (`usm_blockchain_records`) para que las 6 planillas salgan completamente llenas con los datos reales del estudiante.
  2. **Edición rápida antes de imprimir:** Permitir que el estudiante edite campos puntuales (ej. nombre y cédula del apoderado en la *Carta de Autorización a Terceros*) antes de generar el PDF/impresión.

---

### Módulo 10: Paneles de Rectorado USM y Gobierno (MPPEU / MPPRE)
- **Archivos principales:** `src/components/AdminDashboard.jsx`, `src/components/GovernmentPanel.jsx`, `src/components/GovernmentLoginPortal.jsx`
- **Qué funciona actualmente:**
  - Acceso por rol institucional (`/admin` y `/gobierno`), inspección visual del documento adjunto, aprobación de Legalización GTU (`VERIFICADO_MPPEU`) y emisión de Apostilla de La Haya (`APOSTILLADO`) con código único y firma criptográfica.
- **Qué falta corregir:**
  1. **Sincronización completa en `AdminDashboard.jsx` (Rectorado USM):** Mientras que `GovernmentPanel.jsx` ya lee y actualiza todos los trámites de `usm_blockchain_records` y del backend, `AdminDashboard.jsx` necesita sincronizarse con la misma fuente de datos para que cualquier título recién escaneado por un estudiante aparezca de inmediato en la bandeja del Rectorado USM.
  2. **Acción de Refrendo Rectoral (`VERIFICADO_USM`):** Permitir que desde `AdminDashboard.jsx` el Rectorado USM pueda validar o rechazar con motivo técnico un documento antes de que pase a la bandeja ministerial del MPPEU/MPPRE, completando el flujo real de las **4 Estaciones**.
- **Innovación de Tesis a añadir:**
  - **Bitácora de Auditoría Institucional (Audit Trail Exportable CSV/PDF):** Registro cronológico de todas las firmas, aprobaciones y rechazos realizados por Rectorado USM, MPPEU y MPPRE con marca de tiempo, operador firmante, wallet Web3 (si está conectada) y hash de transacción.

---

### Módulo 11: Pulido Final de Responsividad Móvil y UX Global
- **Archivo principal:** `src/index.css`
- **Qué funciona actualmente:**
  - `LandingPortal`, barra superior móvil de `Sidebar` y cuadrículas de `OCRExtractor` adaptadas a pantallas móviles.
- **Qué falta corregir:**
  1. Ajuste fino de modales anchos (`DigitalCertificate`, `ApostilleCertificate`, vista previa de `OfficialFormsPanel` y tablas de `GovernmentPanel` / `AdminDashboard`) en pantallas menores a `480px` para garantizar desplazamiento fluido y certificados legibles sin recortes horizontales.
  2. Prueba integral de extremo a extremo (End-to-End) del flujo completo para la defensa de tesis.

---

## 📌 Cómo retomar en la próxima sesión
Cuando inicies una nueva conversación o quieras continuar, basta con indicar:
> *"Continuemos con la hoja de ruta (`HOJA_DE_RUTA_MODULOS_PENDIENTES.md`), empecemos por el Módulo 5"* (o los módulos que desees abordar en ese turno).
