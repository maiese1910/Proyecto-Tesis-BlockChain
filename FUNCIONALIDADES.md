# 📋 Roadmap de Funcionalidades — USM ApostillaBot

> Plataforma Descentralizada para la Verificación de Documentos y Ejecución de Procesos Administrativos  
> Exclusivo para graduandos del 10mo Semestre de Ingeniería — Universidad Santa María

---

## 1. 🎯 Alcance Hiper-localizado (Recomendación del Tutor)

| Campo | Detalle |
|---|---|
| **Descripción** | Reducir el alcance del proyecto a los trámites gubernamentales reales que enfrentan los egresados de Ingeniería USM: GTU, SAREN y MPPRE. Se descartó la idea original de cubrir "todas las universidades" por ser estadísticamente imposible de validar con el 30% mínimo para Alfa de Cronbach/KR20. |
| **Estado** | ✅ Implementado |
| **Dónde se ve** | En toda la interfaz: textos, chatbot, guía de supervivencia. |

---

## 2. 🤖 Asistente de IA Integrado (Chatbot Gubernamental)

| Campo | Detalle |
|---|---|
| **Descripción** | Un asistente virtual en tiempo real que responde dudas exclusivamente sobre los trámites de apostilla y legalización, incluyendo tiempos de espera, ubicación de taquillas y requisitos actualizados de cada ente. |
| **Estado** | ✅ Implementado |
| **Dónde se ve** | Menú lateral → "Asistente IA". Comunicación bidireccional vía WebSockets (React ↔ FastAPI). |

---

## 3. 🗺️ Guía de Supervivencia Dinámica

| Campo | Detalle |
|---|---|
| **Descripción** | Línea de tiempo logística que genera una "hoja de ruta" personalizada dependiendo del trámite (SAREN o MPPRE) y el turno de cita (mañana/tarde). Incluye tiempos de llegada, advertencias físicas (sol, lluvia, sin sillas) y ubicaciones exactas. |
| **Estado** | ✅ Implementado |
| **Dónde se ve** | Menú lateral → "Guía de Supervivencia". Selecciona ente + turno y presiona "Generar Ruta". |

---

## 4. 📥 Descarga Integrada de Planillas Oficiales

| Campo | Detalle |
|---|---|
| **Descripción** | El sistema provee directamente los formatos oficiales (ej. Planilla Única Bancaria - PUB del SAREN) sin que el usuario tenga que buscarlos en páginas web gubernamentales que suelen estar caídas o desactualizadas. |
| **Estado** | ✅ Implementado |
| **Dónde se ve** | En el Paso 2 de la Guía de Supervivencia (trámite SAREN) y en el módulo "Planillas Oficiales". |

---

## 5. 🔍 Pre-validación Visual con Checklist Flotante

| Campo | Detalle |
|---|---|
| **Descripción** | El usuario sube su expediente (simulado) y un panel lateral muestra en tiempo real el estado de cada requisito obligatorio: ✅ verde (aprobado), ❌ rojo (falta) con descripción del error, o ⏳ gris (pendiente de revisión). |
| **Estado** | ✅ Implementado |
| **Dónde se ve** | Menú lateral → "Pre-validación". Pantalla dividida: zona de carga (izquierda) + checklist reactivo (derecha). |

---

## 6. 💬 Auditoría Guiada "En Vivo" dentro del Chatbot

| Campo | Detalle |
|---|---|
| **Descripción** | La revisión del expediente completo se puede hacer conversacionalmente dentro del propio chatbot. La IA pregunta requisito por requisito, el usuario responde "sí/no" o adjunta el archivo con el clip 📎. Si algo falta, la IA da instrucciones precisas y no avanza hasta que el usuario lo resuelva. |
| **Estado** | ✅ Implementado |
| **Dónde se ve** | Menú → "Asistente IA" → Botón **🔎 Auditar mi Expediente** o escribe `auditar`. |

---

## 7. 📊 Dashboard con Métricas en Tiempo Real (Efecto WOW para Defensa)

| Campo | Detalle |
|---|---|
| **Descripción** | El Panel Principal muestra 4 contadores que se actualizan en vivo con animación suave de números: Graduandos Activos, Documentos Pre-validados, Horas Ahorradas y Títulos en Blockchain. Todos arrancan en 0 y suben automáticamente cada vez que un usuario entra al chat, sube un archivo o completa una auditoría. |
| **Estado** | ✅ Implementado |
| **Dónde se ve** | Menú → "Panel Principal". El punto verde "En vivo" indica conexión activa. |
| **Para la defensa** | Abre el Dashboard en la pantalla grande del salón, pídele a un jurado que abra el Asistente IA en otra pestaña, y el número sube frente al jurado en tiempo real. |

---

## 8. 📝 Asistente de Llenado PUB con Validación IA + Registro Blockchain

| Campo | Detalle |
|---|---|
| **Descripción** | El asistente guía al estudiante campo por campo para llenar la Planilla Única Bancaria (PUB) del SAREN. **Cada campo es validado en tiempo real**: si el dato es inválido (ej. cédula sin formato, teléfono incorrecto, correo mal escrito), el bot lo rechaza con un mensaje rojo y el campo en el formulario se ilumina en rojo hasta que sea corregido. Al finalizar todos los campos limpios, aparece el botón **"⛓️ Registrar Huella en Blockchain"** que genera un hash SHA256 único e inmutable del documento. |
| **Estado** | ✅ Implementado |
| **Validaciones activas** | Nombre (≥2 palabras, sin números), Cédula (V-/E- + formato), Teléfono (operadora VEN), Correo (regex), Trámite (min. 5 chars), Institución, Banco, Monto (numérico). |
| **Dónde se ve** | Menú → "Llenar Planilla PUB". Pantalla dividida: chatbot con corrección en tiempo real (izq) + formulario visual que se llena en vivo (der) + sello Blockchain al final. |
| **Para la defensa** | El jurado puede intentar escribir una cédula incorrecta y ver cómo el sistema la rechaza instantáneamente. Luego, al completar bien la planilla, presiona el botón morado y el hash aparece en pantalla. |

---

## 9. 🏛️ Verificación Blockchain de Documentos

| Campo | Detalle |
|---|---|
| **Descripción** | Registro inmutable del expediente validado en una red Blockchain (Sepolia/Ethereum testnet). Una vez que el sistema confirma que el expediente está completo, se emite un hash único como certificado de validación digital. |
| **Estado** | 🚧 Pendiente de implementar |
| **Tecnología** | Web3.py, Pinata IPFS, Smart Contract en Solidity. Claves en `.env`. |
| **Prioridad** | Media — presentar como "arquitectura preparada" en la defensa. |

---

## 9. 🗺️ Mapas y Fotos de Ubicaciones Exactas

| Campo | Detalle |
|---|---|
| **Descripción** | Integrar fotos reales de las sedes (entrada del SAREN, taquilla del MPPRE, esquinas exactas del ministerio) para que el estudiante no se pierda. El tutor lo mencionó explícitamente. |
| **Estado** | 🚧 Pendiente de implementar |
| **Cómo implementar** | Galería de imágenes dentro de la Guía de Supervivencia por cada ente gubernamental. |

---

## 10. 🔔 Notificaciones de Estado de Trámite

| Campo | Detalle |
|---|---|
| **Descripción** | El sistema notifica al usuario cuando cambia el estado de su documento en el ente gubernamental (ej. "Tu título fue procesado en el SAREN"). |
| **Estado** | 💡 Idea propuesta — No implementado |
| **Requiere** | Integración con APIs gubernamentales o scraping + sistema de notificaciones push. |

---

## 9. 🔐 Sistema de Registro y Login Personalizado

| Campo | Detalle |
|---|---|
| **Descripción** | Pantalla de bienvenida donde el graduando crea su perfil (nombre, cédula, carrera, semestre) antes de entrar a la plataforma. El sistema lo recuerda en siguientes sesiones. La barra lateral muestra su nombre y carrera, y los formularios como la PUB pueden ser pre-llenados con sus datos. |
| **Estado** | ✅ Implementado |
| **Dónde se ve** | Al abrir la app por primera vez. Desde el sidebar se puede cerrar sesión. |

---

## 10. ⛓️ Smart Contract Blockchain Real (Sepolia Testnet)

| Campo | Detalle |
|---|---|
| **Descripción** | Contrato inteligente `USMDocumentRegistry.sol` escrito en Solidity. Registra el hash de cada documento validado de forma inmutable en la red Ethereum Sepolia (gratuita). Cada registro incluye: nombre del graduando, cédula, tipo de documento, wallet y timestamp. El contrato no puede ser alterado ni eliminado. |
| **Estado** | ✅ Contrato creado — Pendiente despliegue en Sepolia |
| **Archivo** | `blockchain/USMDocumentRegistry.sol` |
| **Para desplegar** | Usar Remix IDE (remix.ethereum.org) → pegar el .sol → compilar → Deploy en Injected Provider (MetaMask en Sepolia). Copiar la `CONTRACT_ADDRESS` al `.env`. |

---

## 11. 🔍 Verificador Público de Documentos Blockchain

| Campo | Detalle |
|---|---|
| **Descripción** | Portal donde cualquier persona (jurado, empleador, ente gubernamental) puede pegar el hash de un documento y verificar su autenticidad en la Blockchain. Muestra: nombre del propietario, cédula, tipo de documento, fecha exacta de registro y link al transaction hash en Sepolia Etherscan. |
| **Estado** | ✅ Implementado (con simulación) — Requiere CONTRACT_ADDRESS en .env para conectar a Sepolia real |
| **Dónde se ve** | Menú → "Verificar Blockchain". |
| **Para la defensa** | Pegar el hash generado en la PUB → aparece "✅ Documento Auténtico" con todos los detalles y el link a Etherscan. |

---

*Última actualización: Sesión de tesis — Abril 2026*

