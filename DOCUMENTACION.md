# 🏛️ DOCUMENTACIÓN TÉCNICA Y OPERATIVA DEL SISTEMA
## USM-ApostillaBot: Plataforma Descentralizada con Inteligencia Artificial y Blockchain para la Verificación y Tramitación de Documentos Académicos
**Proyecto de Grado para optar al Título de Ingeniero — Universidad Santa María (USM)**  
*Facultad de Ingeniería — Décimo Semestre*

---

## 📑 ÍNDICE GENERAL

1. [Información General y Alcance](#1-información-general-y-alcance)
2. [Requisitos Previos y Variables de Entorno](#2-requisitos-previos-y-variables-de-entorno)
3. [Guía de Arranque y Activación del Servidor](#3-guía-de-arranque-y-activación-del-servidor)
   - 3.1. [Gestión del Entorno Local con Docker y Supabase CLI](#31-gestión-del-entorno-local-con-docker-y-supabase-cli)
     - 3.1.1. [¿Con qué dirección entro a Supabase? (Direcciones y Puertos)](#311-con-qué-dirección-entro-a-supabase-direcciones-y-puertos)
     - 3.1.2. [Acceso a Supabase Storage y Bóveda de Documentos](#312-acceso-a-supabase-storage-y-bóveda-de-documentos)
   - 3.2. [Método Automatizado Unificado (Recomendado)](#32-método-automatizado-unificado-recomendado)
   - 3.3. [Método Manual Paso a Paso (Dos Terminales)](#33-método-manual-paso-a-paso-dos-terminales)
   - 3.4. [Inicialización del Esquema en Supabase Cloud](#34-inicialización-del-esquema-en-supabase-cloud)
   - 3.5. [Despliegue del Smart Contract en Sepolia](#35-despliegue-del-smart-contract-en-sepolia)
4. [Arquitectura del Sistema y Flujo de Datos](#4-arquitectura-del-sistema-y-flujo-de-datos)
5. [Módulos del Frontend (React 19 + Vite)](#5-módulos-del-frontend-react-19--vite)
   - 5.12. [StudentAuth.jsx — Autenticación Integral de Graduandos (Clave, OTP, Registro y Recuperación)](#512-studentauthjsx--autenticación-integral-de-graduandos)
   - 5.13. [GovernmentLoginPortal.jsx — Portal Ministerial Aislado por URL (/admin y /gobierno)](#513-governmentloginportaljsx--portal-ministerial-aislado-por-url)
6. [Módulos del Backend y Endpoints de la API (FastAPI / Flask)](#6-módulos-del-backend-y-endpoints-de-la-api-fastapi)
   - 6.4. [Pipeline de Digitalización Forense OCR Multimodal y Soporte PDF (PyMuPDF, Gemini Vision y AcademicDegreeNER)](#64-pipeline-de-digitalización-forense-ocr-multimodal-y-soporte-pdf)
7. [Contrato Inteligente Blockchain (Solidity)](#7-contrato-inteligente-blockchain-solidity)
8. [Base de Datos y Persistencia (Supabase / PostgreSQL)](#8-base-de-datos-y-persistencia-supabase--postgresql)
   - 8.2. [Esquema de Autenticación Passwordless y Sincronización Reactiva (Triggers)](#82-esquema-de-autenticación-passwordless-y-sincronización-reactiva-triggers)
   - 8.3. [Blindaje de Inmutabilidad de la Cédula de Identidad en PostgreSQL](#83-blindaje-de-inmutabilidad-de-la-cédula-de-identidad-en-postgresql)
   - 8.4. [Matriz Comparativa de Ciberseguridad: Arquitectura USM vs. Modelo Arcaico SAREN](#84-matriz-comparativa-de-ciberseguridad-arquitectura-usm-vs-modelo-arcaico-saren)
   - 8.5. [Mecanismo de Entrega de Códigos OTP y Enlaces Mágicos (Mailpit Local)](#85-mecanismo-de-entrega-de-códigos-otp-y-enlaces-mágicos-mailpit-local)
   - 8.6. [Política de Complejidad de Contraseñas y Datos Civiles del Graduando](#86-política-de-complejidad-de-contraseñas-y-datos-civiles-del-graduando)
   - 8.7. [Diagnóstico Preciso de Acceso y Validación Cédula-Correo](#87-diagnóstico-preciso-de-acceso-y-validación-cédula-correo)
   - 8.8. [Guía Completa de Comandos Docker & Supabase CLI (Referencia Operativa, Migraciones y Troubleshooting)](#88-guía-completa-de-comandos-docker--supabase-cli-referencia-operativa-migraciones-y-troubleshooting)
   - 8.9. [Arquitectura y Diagnóstico de Supabase Storage: Bóveda Criptográfica de Documentos (Bucket 'documentos', RLS y Visor Ministerial)](#89-arquitectura-y-diagnóstico-de-supabase-storage-bóveda-criptográfica-de-documentos)
9. [Protocolo y Guía para la Defensa de Grado](#9-protocolo-y-guía-para-la-defensa-de-grado)
10. [Hoja de Ruta y Posibles Actualizaciones Futuras](#10-hoja-de-ruta-y-posibles-actualizaciones-futuras)
11. [Subsistema de Reconocimiento Óptico Forense (OCR), Gestión de PDFs y Visualización Ministerial](#11-subsistema-de-reconocimiento-óptico-forense-ocr-gestión-de-pdfs-y-visualización-ministerial)
   - 11.1. [Optimización y Carga Asíncrona de Documentos PDF vs. Imágenes](#111-optimización-y-carga-asíncrona-de-documentos-pdf-vs-imágenes)
   - 11.2. [Pipeline Híbrido de Digitalización y Extracción OCR (PyMuPDF + Tesseract Fraktur)](#112-pipeline-híbrido-de-digitalización-y-extracción-ocr-pymupdf--tesseract-fraktur)
   - 11.3. [Visor de Documentos para Funcionarios Ministeriales (MPPEU y MPPRE)](#113-visor-de-documentos-para-funcionarios-ministeriales-mppeu-y-mppre)
   - 11.4. [Integración Híbrida del Catálogo Universitario Nacional, Carreras OPSU y Fuzzy Matching](#114-integración-híbrida-del-catálogo-universitario-nacional-carreras-opsu-y-fuzzy-matching)
   - 11.5. [Optimización de la Vista de Auditoría Gubernamental (GovernmentPanel.jsx)](#115-optimización-de-la-vista-de-auditoría-gubernamental-governmentpaneljsx)

---

## 1. INFORMACIÓN GENERAL Y ALCANCE

### 1.1. Contexto del Problema
Los graduandos de las distintas escuelas de la Facultad de Ingeniería de la Universidad Santa María (Sistemas, Civil, Industrial, Mecánica, Eléctrica, Arquitectura) enfrentan históricamente un complejo y fragmentado proceso burocrático para la autenticación, legalización y apostilla de sus documentos académicos en la República Bolivariana de Venezuela. Dicho trayecto involucra tres entidades gubernamentales distintas:

1. **MPPEU (GTU):** Ministerio del Poder Popular para la Educación Universitaria — Gestión de Trámites Universitarios (certificación y cotejo institucional del título).
2. **SAREN:** Servicio Autónomo de Registros y Notarías — Protocolización legal y pago de aranceles mediante la Planilla Única Bancaria (PUB).
3. **MPPRE:** Ministerio del Poder Popular para Relaciones Exteriores — Emisión de la Apostilla de La Haya electrónica para validez internacional.

Las principales debilidades del esquema tradicional son: altas tasas de rechazo presencial por errores subsanables (falta de firmas, timbres fiscales incorrectos, recaudos ilegibles), desinformación logística de las sedes físicas, ausencia de trazabilidad digital y vulnerabilidad ante la falsificación documental física.

### 1.2. Solución Propuesta
**USM-ApostillaBot** resuelve esta problemática a través de una arquitectura web integral descentralizada que combina:
- **Visión por Computadora (OCR con IA):** Extracción automatizada de datos a partir de diplomas y actas para evitar discrepancias humanas.
- **Asistente Virtual Especializado:** Chatbot interactivo dotado de base de conocimiento normativo venezolano y modo de auditoría en vivo.
- **Simulador de Pre-Validación:** Semáforo interactivo de verificación de requisitos previos antes del traslado físico.
- **Registro Inmutable en Blockchain:** Anclaje del hash criptográfico SHA-256 en la red pública de pruebas Ethereum Sepolia mediante un Smart Contract propio.
- **Panel Intergubernamental Multi-Ente:** Módulo de auditoría ministerial para cotejo (MPPEU) y apostillado (MPPRE) con certificación QR verificable públicamente.

### 1.3. Ficha Técnica del Stack
| Capa | Tecnologías Empleadas |
|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS, Framer Motion, Lucide React, Ethers.js v6, HTML5-QRCode, HTML2PDF |
| **Backend API** | Python 3.10+, FastAPI, Uvicorn, WebSockets bidireccionales, Web3.py, PyJWT, Bcrypt |
| **Inteligencia Artificial / OCR** | EasyOCR (CRAFT + CRNN), Algoritmos de Extracción de Entidades (NER) basados en Expresiones Regulares |
| **Blockchain & Almacenamiento** | Solidity 0.8.20, Ethereum Sepolia Testnet, InterPlanetary File System (IPFS / Pinata) |
| **Base de Datos** | Supabase (PostgreSQL 15 con Row Level Security) |

---

## 2. REQUISITOS PREVIOS Y VARIABLES DE ENTORNO

### 2.1. Requisitos de Software
- **Docker Desktop:** Versión 4.25 o superior con backend WSL 2 activo (`docker --version`). Esencial para la orquestación local de los contenedores de Supabase (PostgreSQL, GoTrue Auth, Inbucket, Storage, Kong).
- **Supabase CLI:** Herramienta de línea de comandos para inicializar, migrar y gestionar el stack de datos localmente. Se ejecuta de forma nativa vía `npx supabase` o mediante instalación global (`npm install -g supabase`).
- **Node.js:** Versión 20.0.0 o superior (`node -v`).
- **npm:** Versión 10.0.0 o superior (`npm -v`).
- **Python:** Versión 3.10 o superior (`python --version`).
- **Git:** Para clonación y control de versiones.
- **Navegador Web:** Google Chrome, Brave, Firefox o Edge con soporte Web Crypto API y WebSockets.

### 2.2. Configuración de Variables de Entorno (`.env`)
En la raíz del proyecto (`Proyecto-Tesis-BlockChain/`) reside el archivo `.env`. El sistema está preconfigurado para operar contra la base de datos local emulada en **Docker** o conmutar opcionalmente a un proyecto alojado en la nube (**Supabase Cloud**):

```ini
# ==============================================================================
# CONFIGURACIÓN DEL BACKEND (FASTAPI & FLASK)
# ==============================================================================
FRONTEND_URL=http://localhost:5173
JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long

# ==============================================================================
# CONECTIVIDAD BLOCKCHAIN (ETHEREUM SEPOLIA)
# ==============================================================================
WEB3_PROVIDER_URL=https://ethereum-sepolia-rpc.publicnode.com
CONTRACT_ADDRESS=0x9A4bF67448d3c52aE668601dC304859a22fA4960
WALLET_PRIVATE_KEY=0xbd3b273b1e21dc84e9c89227f09fa69cd2f87818d74bfa63cc0504ee1fde3ba3

# ==============================================================================
# BASE DE DATOS LOCAL DOCKER (SUPABASE POSTGRESQL & AUTH)
# ==============================================================================
# Modo Local (Default - Docker activo):
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# (Alternativa Cloud para producción / despliegue externo):
# SUPABASE_URL=https://<id-proyecto>.supabase.co
# SUPABASE_KEY=<tu_service_role_o_anon_key>

# ==============================================================================
# MODO DE DEFENSA DE TESIS (SALVAVIDAS PARA JURADO)
# ==============================================================================
ALLOW_DEFENSE_DEMO_FALLBACK=true

# ==============================================================================
# CONFIGURACIÓN DEL FRONTEND (VITE + CLIENTE SUPABASE)
# ==============================================================================
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# ==============================================================================
# INTELIGENCIA ARTIFICIAL MULTIMODAL (GOOGLE GEMINI)
# ==============================================================================
GEMINI_API_KEY=tu_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite
VITE_GEMINI_API_KEY=tu_gemini_api_key
```

---

## 3. GUÍA DE ARRANQUE Y ACTIVACIÓN DEL SERVIDOR

### 3.1. Gestión del Entorno Local con Docker y Supabase CLI

Para garantizar total independencia de conectividad a internet externa y permitir pruebas completas de autenticación sin costos de envío de emails, el sistema utiliza **Supabase Local** orquestado sobre contenedores **Docker**.

#### Paso 1: Iniciar el Motor de Docker
Antes de levantar Supabase, es obligatorio que el servicio o la aplicación de Docker esté activa:
- **En Windows:** Abra la aplicación **Docker Desktop** desde el Menú Inicio, o ejecute desde PowerShell:
  ```powershell
  Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  ```
- **Verificar que el motor esté listo:**
  ```powershell
  docker ps
  ```
  *(Si el comando muestra los encabezados `CONTAINER ID`, `IMAGE`, etc., sin errores, Docker está funcionando correctamente).*

#### Paso 2: Iniciar los Servicios Locales de Supabase
En la raíz del proyecto (`Proyecto-Tesis-BlockChain/`), ejecute:

```bash
npx supabase start
```

> **¿Qué ocurre durante este comando?**
> 1. Descarga o verifica las imágenes oficiales de Supabase configuradas en `supabase/config.toml`.
> 2. Inicializa la red interna de contenedores con sus respectivos puertos de servicio:
>    - **Kong API Gateway (REST & Storage API):** `http://127.0.0.1:54321`
>    - **Motor de Base de Datos PostgreSQL 17:** `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
>    - **Supabase Studio (Administrador Web de BD):** `http://127.0.0.1:54323`
>    - **Inbucket (Servidor Web de Correos y Códigos OTP):** `http://127.0.0.1:54324`
>    - **GoTrue (Microservicio de Autenticación Passwordless y JWT):** Puerto interno
> 3. Aplica de manera automática y en orden cronológico todas las migraciones SQL almacenadas en `supabase/migrations/`.

#### 3.1.1. 🌐 ¿Con qué dirección entro a Supabase? (Direcciones y Puertos)

Para ingresar a la consola gráfica de administración de **Supabase Studio** en su navegador web:

👉 **[http://localhost:54323](http://localhost:54323)** (o también `http://127.0.0.1:54323`)

> 💡 **Acceso Libre Local:** En el entorno local de desarrollo Docker, **no se requiere usuario ni contraseña**. Al abrir la URL en el navegador ingresarás de inmediato al panel de administración.

##### ¿Qué puedes gestionar dentro de Supabase Studio (`:54323`)?
1. **Table Editor (Editor de Tablas):** Visualizar, crear, editar o eliminar filas en las tablas del sistema (`perfiles`, `records`, `admins`, `stats`, `audit_logs`, `planillas`, etc.).
2. **SQL Editor (Consola SQL):** Ejecutar consultas directas `SELECT`, scripts de prueba, disparadores (triggers) de inmutabilidad de cédula o funciones de validación.
3. **Authentication -> Users:** Consultar la lista de graduandos registrados en `auth.users`, sus IDs únicos (`UUID`), correos y estados de confirmación.
4. **Storage:** Administrar buckets y comprobar la persistencia de imágenes y títulos escaneados.

---

##### 📋 Directorio Completo de Direcciones y Puertos Locales de Supabase:

| Componente / Servicio | Dirección / URL | Descripción y Uso |
|---|---|---|
| **Supabase Studio (Dashboard Web)** | **[http://localhost:54323](http://localhost:54323)** | Consola gráfica principal para ver y modificar la base de datos y usuarios. |
| **Inbucket (Buzón de Correos & OTPs)** | **[http://localhost:54324](http://localhost:54324)** | Servidor web donde llegan los correos de confirmación y códigos OTP de 6 dígitos. |
| **API REST & Storage (Kong Gateway)** | **[http://localhost:54321](http://localhost:54321)** | URL base de la API consumida por el Frontend y Backend (`SUPABASE_URL` en `.env`). |
| **PostgreSQL (Conexión Directa)** | `localhost:54322` | Host: `127.0.0.1`, Puerto: `54322`, BD: `postgres`, Usuario: `postgres`, Clave: `postgres`. Compatible con DBeaver, pgAdmin y VS Code. |
| **GraphQL Endpoint** | `http://localhost:54321/graphql/v1` | Endpoint para consultas GraphQL locales. |
| **Supabase Cloud (Plataforma Remota)** | **[https://supabase.com/dashboard](https://supabase.com/dashboard)** | Consola web oficial en la nube (utilizada si el proyecto se despliega fuera de Docker). |

---

#### Paso 3: Inspeccionar Estado y Credenciales Locales
Para consultar en cualquier instante las llaves de acceso, URLs y puertos generados:

```bash
npx supabase status
```

#### Paso 4: Detener o Reiniciar Supabase
- **Detener los servicios (conservando los datos y registros creados):**
  ```bash
  npx supabase stop
  ```
- **Detener sin respaldar estado (inicio en blanco en el próximo arranque):**
  ```bash
  npx supabase stop --no-backup
  ```
- **Reiniciar todos los contenedores:**
  ```bash
  npx supabase restart
  ```

#### Paso 5: Resetear la Base de Datos a su Estado Inicial
Si durante las pruebas los datos de prueba se saturan o se requiere re-aplicar todas las migraciones desde cero:

```bash
npx supabase db reset
```
*Este comando trunca la base de datos local, ejecuta en limpio todos los scripts de `supabase/migrations/` y ejecuta el archivo de semillas `supabase/seed.sql` si existe.*

---

### 3.2. Método Automatizado Unificado (Recomendado)
Una vez que Supabase está activo vía Docker, el proyecto cuenta con un orquestador en Python (`run_system.py`) que inicializa de manera coordinada todos los microservicios de la aplicación.

Para arrancarlo, abra una terminal en la raíz del proyecto y ejecute:

```bash
python run_system.py
```

**Comportamiento interno de `run_system.py`:**
1. Valida el entorno virtual (`venv`) y las librerías necesarias.
2. Lanza el **Microservicio OCR & Visión Computacional** (Flask) en `http://localhost:5000`.
3. Lanza el **Backend Central** (Flask / FastAPI) en `http://localhost:8000`.
4. Lanza el **Frontend Web** (Vite + React) en `http://localhost:5173`.
5. Monitorea los procesos en tiempo real. Presionar `CTRL+C` finaliza todos los servicios de forma limpia.

---

### 3.3. Método Manual Paso a Paso (Servicios Independientes)

Si prefiere ejecutar cada componente de forma individual en terminales separadas:

#### Terminal 1: Iniciar Backend Central (Puerto 8000)
```bash
# Activar entorno virtual
.\venv\Scripts\Activate.ps1   # En Windows PowerShell
# venv\Scripts\activate.bat   # En Windows CMD

# Ejecutar backend
python api/main.py
```
> **Verificación:** Visite `http://localhost:8000/docs` o `http://localhost:8000`.

#### Terminal 2: Iniciar Microservicio OCR (Puerto 5000)
```bash
# Activar entorno virtual y ejecutar OCR
.\venv\Scripts\Activate.ps1
python api/app_flask.py
```
> **Verificación:** Visite `http://localhost:5000/api/health` para comprobar el estado de salud del motor EasyOCR.

#### Terminal 3: Iniciar Frontend (Puerto 5173)
```bash
npm install
npm run dev
```
> **Verificación:** Abra en su navegador `http://localhost:5173`.

---

### 3.4. Inicialización del Esquema en Supabase Cloud (Alternativa Producción)
Si en lugar de Docker local desea conectar el sistema a un proyecto remoto en [supabase.com](https://supabase.com):
1. Inicie sesión en [supabase.com](https://supabase.com) y cree un nuevo proyecto.
2. Diríjase a su proyecto -> **SQL Editor** -> **New Query**.
3. Copie y pegue la totalidad del archivo [supabase_schema.sql](file:///c:/Users/Lenovo/.gemini/antigravity/scratch/Proyecto-Tesis-BlockChain/supabase_schema.sql).
4. Presione **Run**. Esto creará todas las tablas (`profiles`, `records`, `admins`, `stats`, `audit_logs`, `checklist_items`, `guias_logistica`, `planillas`, `carreras`, `pub_fields`) con sus políticas RLS y valores iniciales.
5. Actualice las variables `SUPABASE_URL`, `SUPABASE_KEY`, `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en su archivo `.env` con las credenciales provistas en el panel de Supabase Cloud.

---

### 3.5. Despliegue del Smart Contract en Sepolia (Opcional si ya está desplegado)
El contrato ya está compilado y referenciado en el `.env`. Si desea volver a compilarlo y desplegarlo en una nueva dirección:
```bash
python deploy.py
```
*El script compila `blockchain/USMDocumentRegistry.sol` con `solc 0.8.20`, envía la transacción a Sepolia con su clave privada y actualiza automáticamente el campo `CONTRACT_ADDRESS` en su archivo `.env`.*

---

## 4. ARQUITECTURA DEL SISTEMA Y FLUJO DE DATOS

### 4.1. Diagrama de Arquitectura
```mermaid
flowchart TD
    subgraph Cliente["Capa de Presentación (Frontend - React 19)"]
        UI_Graduando["Portal del Graduando USM"]
        UI_Gobierno["Panel de Auditoría Gubernamental (MPPEU / SAREN / MPPRE)"]
        UI_Verificador["Verificador Público Criptográfico (QR / Hash)"]
    end

    subgraph API["Capa de Negocio y Orquestación (FastAPI)"]
        Router["Enrutador REST & WebSockets"]
        ServicioIA["Motor IA (Chatbot Normativo & Auditor)"]
        ServicioOCR["Pipeline OCR (CRAFT + CRNN + NER)"]
        ServicioWeb3["Conector Web3.py"]
        ServicioAuth["Autenticación JWT & Bcrypt"]
    end

    subgraph Infraestructura["Capa de Persistencia y Descentralización"]
        Sepolia["Blockchain Ethereum Sepolia (Smart Contract USMDocumentRegistry)"]
        IPFS["Red IPFS / Pinata (Metadatos Inmutables)"]
        SupabaseDB[("Supabase (PostgreSQL - Perfiles, Estados y Métricas)")]
    end

    UI_Graduando -->|REST / WebSockets| Router
    UI_Gobierno -->|REST con JWT| Router
    UI_Verificador -->|REST sin autenticación| Router

    Router --> ServicioIA
    Router --> ServicioOCR
    Router --> ServicioWeb3
    Router --> ServicioAuth

    ServicioWeb3 -->|Transacciones Firmadas & Consultas| Sepolia
    ServicioWeb3 -->|Pinning de CIDs| IPFS
    Router -->|Lectura / Escritura con RLS| SupabaseDB
```

### 4.2. Flujo de Vida del Documento Académico
1. **Digitalización & Extracción:** El graduando digitaliza su título. El módulo OCR reconoce la institución (USM), nombre, cédula y carrera.
2. **Pre-validación Física:** El sistema contrasta el expediente contra el checklist normativo del SAREN (firmas de autoridades, timbres fiscales).
3. **Generación PUB:** Se construye interactivamente la Planilla Única Bancaria validando en vivo los campos venezolanos.
4. **Fijado Criptográfico:** Se computa el Hash SHA-256 canónico del documento y se sube a IPFS.
5. **Anclaje en Sepolia:** El backend envía una transacción al Smart Contract registrando el hash, el nombre, la cédula y la marca de tiempo de forma inalterable.
6. **Cadena de Validación Ministerial:**
   - **MPPEU:** El funcionario realiza el cotejo de actas/folios y aprueba la validez universitaria.
   - **SAREN:** Protocoliza el registro público con los aranceles validados.
   - **MPPRE:** Genera la Apostilla electrónica de La Haya certificada con sello digital.
7. **Verificación Universal:** Cualquier entidad receptora en el mundo escanea el código QR del certificado y comprueba la validez directamente en la cadena de bloques.

---

## 5. MÓDULOS DEL FRONTEND (`src/`)

La interfaz de usuario está construida sobre una arquitectura de componentes reactivos en `src/components/`, controlados por el despachador de vistas principal en `src/App.jsx`.

### 5.1. `LandingPortal.jsx` — Portal de Entrada y Acceso Unificado
- **Propósito:** Punto de aterrizaje que orienta al usuario según su rol en el sistema.
- **Funcionalidad:**
  - Selector visual entre **Graduando de Ingeniería USM** y **Funcionario Gubernamental / Auditor**.
  - Modal de autenticación y registro de estudiantes con selección de carrera y semestre.
  - Modal de credenciales seguras para funcionarios (MPPEU, SAREN, MPPRE, Admin USM).

### 5.2. `Dashboard.jsx` — Panel de Control y Métricas en Tiempo Real
- **Propósito:** Mostrar de manera gráfica y animada el estado actual del ecosistema.
- **Componentes clave:**
  - **Cuatro contadores reactivos:** Graduandos Activos, Documentos Pre-validados, Horas Ahorradas (basado en tiempo medio de colas presenciales de 14.5 hrs) y Títulos Registrados en Blockchain.
  - **Conexión WebSocket (`/ws/stats`):** Escucha eventos broadcast para animar los números instantáneamente cuando otros usuarios interactúan con la plataforma.
  - **Live Audit Stream:** Consola de auditoría visual que despliega las últimas operaciones criptográficas y ministeriales ejecutadas.

### 5.3. `OCRExtractor.jsx` — Extracción Inteligente de Títulos con IA
- **Propósito:** Digitalizar documentos físicos eliminando errores de transcripción tipográfica.
- **Funcionalidad:**
  - Permite arrastrar o cargar imágenes del título universitario o notas certificadas.
  - Simula el pipeline de visión artificial en 5 etapas: Normalización, Reducción de Ruido, Detección de Regiones de Texto (CRAFT), Reconocimiento (CRNN) y Extracción de Entidades (NER).
  - Extrae y puntúa con porcentaje de confianza: Nombre completo, Cédula de Identidad, Universidad y Carrera.
  - Botón **"Transferir a Planilla PUB"** que precarga automáticamente el formulario SAREN.

### 5.4. `PreValidation.jsx` — Simulador de Pre-Validación Documental
- **Propósito:** Evitar que el estudiante acuda al registro con recaudos faltantes o erróneos.
- **Funcionalidad:**
  - Checklist dinámico de los 5 requisitos críticos del SAREN (Firma del Rector, Validación GTU, Planilla PUB, Nitidez >300 DPI, Timbres Fiscales).
  - Semáforo reactivo: Verde (Aprobado), Rojo (Error con sugerencia correctiva detallada) y Gris (Pendiente).
  - Reporta automáticamente la simulación al backend para incrementar el contador de documentos pre-validados.

### 5.5. `SurvivalGuide.jsx` — Guía Logística de Supervivencia
- **Propósito:** Proveer instrucciones tácticas y operativas para el día de la cita presencial en Caracas.
- **Funcionalidad:**
  - Filtro por Ente (**SAREN Principal La Candelaria** o **MPPRE Cancillería**) y Turno (**Mañana: 6:00 AM** o **Tarde: 11:30 AM**).
  - Hoja de ruta secuencial con horarios exactos de llegada, advertencias ambientales (sol, hidratación, ausencia de asientos) y mapa de ubicación.
  - Galería visual con fotografías reales de las fachadas oficiales para fácil reconocimiento.

### 5.6. `PUBForm.jsx` — Asistente de Llenado PUB con Validación en Vivo
- **Propósito:** Asistir al estudiante en la confección de la Planilla Única Bancaria del SAREN.
- **Funcionalidad:**
  - **Validación sintáctica en tiempo real:** Cédula venezolana (`V-`/`E-`), números telefónicos de operadoras nacionales (`0414`, `0424`, `0412`, `0416`, `0426`, `0212`), montos numéricos y banco emisor.
  - Resalta en rojo los campos con error y explica en un tooltip conversacional cómo subsanarlo.
  - Botón **"⛓️ Registrar Huella en Blockchain"**: Calcula el hash SHA-256 canónico y lo envía al Smart Contract en Sepolia.
  - Generación de PDF oficial mediante `html2pdf.js`.

### 5.7. `HistoryPanel.jsx` & `TrackingTimeline.jsx` — Historial y Trazabilidad
- **Propósito:** Ofrecer al graduando el seguimiento de sus documentos registrados.
- **Funcionalidad:**
  - Despliega cada trámite con su estado actual: *Pendiente de Auditoría*, *Cotejado por MPPEU*, *Verificado por SAREN*, *Apostillado por MPPRE* o *Rechazado*.
  - Enlace directo a Sepolia Etherscan para auditar la transacción original en la Blockchain pública.
  - Botones de acción para invocar el **Certificado Digital USM** o el **Certificado de Apostilla de La Haya**.

### 5.8. `BlockchainVerifier.jsx` & `QRScanner.jsx` — Verificador Público Descentralizado
- **Propósito:** Permitir a cualquier tercero (empresas, universidades extranjeras, consulados) validar la autenticidad de un documento sin requerir credenciales de usuario.
- **Funcionalidad:**
  - Consulta directa al Smart Contract en Sepolia por hash SHA-256.
  - Lector de código QR integrado (`html5-qrcode`) que permite escanear certificados físicos mediante la cámara del dispositivo o archivo de imagen.
  - Despliega: Estado de validez, Nombre del titular, Cédula de Identidad, Tipo de documento, Timestamp de emisión y Hash de la transacción.

### 5.9. `ChatBotWidget.jsx` — Asistente Virtual Especializado
- **Propósito:** Asistente conversacional con inteligencia artificial enfocado en la normativa de graduación y legalización de la USM.
- **Funcionalidad:**
  - Responde preguntas sobre aranceles, ubicaciones, requisitos de fondo negro y citas.
  - **Modo Auditoría Guiada:** Se activa con el comando `auditar` o el botón "🔎 Auditar mi Expediente"; guía al estudiante pregunta por pregunta revisando cada recaudo antes de generar el trámite.

### 5.10. `GovernmentPanel.jsx` & `MPPEUCotejoModal.jsx` — Panel de Auditoría Ministerial
- **Propósito:** Entorno exclusivo para los inspectores gubernamentales de los ministerios.
- **Funcionalidad:**
  - Selector de modo según el ente del funcionario: **MPPEU (Taquilla GTU)**, **SAREN (Registro)** o **MPPRE (Cancillería)**.
  - **Cotejo Ministerial MPPEU:** Modal de cotejo físico/digital donde se valida firma del Rector, Secretario General, sello de agua y coincidencia de acta y folio.
  - **Emisión de Apostilla MPPRE:** Genera el número oficial de apostilla (`APO-VE-2026-XXXXXX`) con registro inmutable.
  - Rechazo motivado con notificación inmediata al expediente del estudiante.

### 5.11. `AdminDashboard.jsx` — Módulo Administrativo USM
- **Propósito:** Otorgar a la Universidad Santa María control sobre los datos dinámicos.
- **Funcionalidad:**
  - CRUD para ítems de checklist, rutas de supervivencia logística y repositorio de planillas descargables.

### 5.12. `StudentAuth.jsx` — Autenticación Integral de Graduandos
- **Propósito:** Centralizar y asegurar el ciclo completo de identidad de los graduandos de la USM combinando familiaridad, alta seguridad y modernización contra el modelo tradicional del SAREN.
- **Modos Soportados:**
  1. **Inicio de Sesión con Clave (Predeterminado):** Correo electrónico institucional y contraseña encriptada mediante Supabase Auth con visibilidad alternable de contraseña (`Eye`/`EyeOff`).
  2. **Registro de Nuevos Graduandos:** Formulario de alta con Nombre Oficial, Correo, Contraseña, Cédula de Identidad con selector `V/E`, autoformato `28.315.101`, Carrera y Semestre. La cédula queda bloqueada (`is_cedula_locked = true`) desde el instante de su creación.
  3. **Recuperación de Contraseña ("Olvidé mi clave"):** Envío automático de enlaces de restablecimiento de contraseña vía Supabase Auth. En entorno Docker local, los mensajes se inspeccionan en Mailpit (`http://localhost:54324`).
  4. **Acceso Passwordless con OTP (Sin Contraseña):** Autenticación en dos pasos mediante código efímero de 6 dígitos y verificación anti-bot invisible con Cloudflare Turnstile.
  5. **⚡ Acceso Rápido Modo Jurado (Defensa de Grado):** Acceso directo en 1 clic diseñado para la evaluación presencial de jurados universitarios ante contingencias de red local o ausencia de conexión a internet.

### 5.13. `GovernmentLoginPortal.jsx` — Portal Ministerial Aislado por URL
- **Propósito:** Segregación estricta de funciones (SoD). El acceso de inspectores ministeriales y auditores se encuentra **100% desacoplado** de la interfaz pública de los estudiantes y **no posee botones de acceso en la página de graduandos**.
- **Acceso Exclusivo por URL:** Disponible únicamente navegando a `http://localhost:5173/admin`, `http://localhost:5173/gobierno` o mediante el parámetro `?portal=gobierno`.
- **Entes de Fiscalización Soportados:**
  - **MPPEU (Taquilla GTU):** Cotejo ministerial de actas, folios y firmas universitarias (`mppeu_agente`).
  - **SAREN (Registro Principal):** Protocolización legal y comprobación de pago PUB (`saren_admin`).
  - **MPPRE (Cancillería):** Emisión y certificación de Apostilla electrónica de La Haya (`mppre_agente`).
  - **USM (Secretaría General):** Administración del catálogo dinámico institucional (`admin`).

#### A. Credenciales Rápidas de Demostración (Defensa de Tesis)
El sistema incluye cuentas institucionales preconfiguradas que permiten iniciar sesión de inmediato sin necesidad de crear usuarios previos:

| Ente Ministerial / Institución | Pestaña en el Portal | Usuario | Contraseña | Rol Asignado |
|---|---|---|---|---|
| **MPPEU (Taquilla GTU)** | MPPEU (Taquilla GTU) | `mppeu_agente` | `admin123` *(o `mppeu2026`)* | `AGENTE_MPPEU` (Cotejo de actas/folios) |
| **SAREN (Registros y Notarías)** | SAREN (Registro Principal) | `saren_admin` | `admin123` *(o `usm2026`)* | `AUDITOR_GUBERNAMENTAL` (Validación PUB) |
| **MPPRE (Cancillería)** | MPPRE (Cancillería) | `mppre_agente` | `admin123` *(o `mppre2026`)* | `AGENTE_MPPRE` (Emisión de Apostilla) |
| **USM (Rectorado / Auditoría)** | USM (Auditoría Central) | `admin` | `usm2026` *(o `admin123`)* | `ADMIN_USM` (Administrador Central) |

---

#### B. ¿Cómo Crear Nuevas Credenciales Administrativas?

Para dar de alta nuevos funcionarios, inspectores o auditores ministeriales en la tabla `admins`, dispones de 3 métodos:

##### Método 1: Asistente Interactivo en Python (`create_admin.py` — Recomendado)
En la raíz del proyecto, ejecuta el script interactivo que solicitará los datos y aplicará hashing criptográfico seguro (Bcrypt / PBKDF2):

```powershell
# 1. Asegúrate de activar el entorno virtual
.\venv\Scripts\activate

# 2. Ejecutar el asistente
python create_admin.py
```
El script te solicitará:
1. **Nombre de usuario:** (ejemplo: `inspector_gtu_2`)
2. **Selección del ente:** MPPEU (1), SAREN (2), MPPRE (3) o USM (4)
3. **Cargo institucional:** (ejemplo: `Inspector Revisor de Grados`)
4. **Contraseña:** (oculta al teclear por seguridad)

---

##### Método 2: Desde la Interfaz Gráfica de Supabase Studio
Si tienes Supabase levantado con Docker (`npx supabase start`):
1. Abre en tu navegador el panel visual: **[http://localhost:54323](http://localhost:54323)**
2. En el menú lateral izquierdo, haz clic en **Table Editor** y selecciona la tabla **`admins`**.
3. Haz clic en el botón superior derecho **"Insert row"** (Insertar fila).
4. Completa los campos:
   - `username`: El nombre de usuario que usará en el portal (ej. `auditor_saren_caracas`).
   - `password`: La contraseña deseada (el sistema admite contraseñas en texto o hasheadas).
   - `cargo`: Función del funcionario (ej. `Registrador Principal Subalterno`).
   - `ente`: Las siglas del ministerio en mayúsculas (`MPPEU`, `SAREN`, `MPPRE` o `USM`).
5. Haz clic en **Save**. El usuario ya podrá ingresar en `http://localhost:5173/admin`.

---

##### Método 3: Mediante Consulta SQL (SQL Editor de Supabase)
En **[http://localhost:54323](http://localhost:54323)** -> **SQL Editor** -> **New query**, pega y ejecuta la siguiente instrucción:

```sql
INSERT INTO admins (username, password, cargo, ente)
VALUES 
  ('nuevo_auditor_gtu', 'MiClaveSegura2026', 'Analista Revisor GTU', 'MPPEU'),
  ('registrador_saren', 'MiClaveSegura2026', 'Registrador Principal', 'SAREN'),
  ('cancilleria_oficial', 'MiClaveSegura2026', 'Director de Apostilla', 'MPPRE');
```

---

##### Método 4: Mediante el Endpoint REST del Backend (`POST /admin/users`)
Si interactúas mediante cURL, Postman o scripts HTTP:
```bash
POST http://localhost:8000/admin/users
Authorization: Bearer <TOKEN_ADMIN_ACTUAL>
Content-Type: application/json

{
  "username": "auditor_mppeu_3",
  "password": "PasswordSeguro2026!",
  "cargo": "Analista de Legalizaciones",
  "ente": "MPPEU",
  "pin_institucional": "GOV-A1B2-MPPEU"
}
```

---

## 6. MÓDULOS DEL BACKEND Y ENDPOINTS DE LA API (FASTAPI)

El backend expone una API REST moderna estructurada en `api/main.py` con documentación OpenAPI disponible en `/docs`.

### 6.1. Tabla Resumen de Rutas y Endpoints

| Método | Endpoint | Descripción | Acceso / Rol |
|---|---|---|---|
| `GET` | `/` | Health check y estado de servicios conectados | Público |
| `GET` | `/api/stats` | Contadores numéricos consolidados para el Dashboard | Público |
| `POST` | `/stats/heartbeat` | Incrementa tiempo de uso activo del estudiante | Público |
| `POST` | `/prevalidation/report` | Registra simulación de pre-validación | Público |
| `WS` | `/ws/stats` | WebSocket bidireccional de métricas en tiempo real | Público |
| `POST` | `/admin/login` | Autenticación de funcionarios gubernamentales y administradores | Público |
| `POST` | `/admin/users` | Creación de nuevos usuarios administrativos | Requiere JWT |
| `POST` | `/profiles/register` | Registro / actualización de graduando USM | Público |
| `GET` | `/profiles/{cedula}` | Obtención del perfil académico por cédula | Público |
| `POST` | `/blockchain/register` | Anclaje de documento en Smart Contract Sepolia / Supabase | Graduando / Admin |
| `GET` | `/blockchain/verify/{doc_hash}` | Verificación pública del estado inmutable en Blockchain | Público |
| `GET` | `/blockchain/records` | Listado general de documentos registrados | Público / Auditor |
| `GET` | `/blockchain/records/cedula/{cedula}` | Consulta de historial de trámites por graduando | Público |
| `POST` | `/blockchain/records/{doc_hash}/mppeu-certify` | Certificación y cotejo ministerial por el MPPEU | Auditor MPPEU |
| `POST` | `/blockchain/records/{doc_hash}/mppre-apostille` | Emisión electrónica de la Apostilla de La Haya | Auditor MPPRE |
| `POST` | `/blockchain/records/{doc_hash}/verify` | Validación general del trámite (SAREN / USM) | Auditor / Admin |
| `POST` | `/blockchain/records/{doc_hash}/reject` | Rechazo motivado de un documento | Auditor |
| `GET` | `/blockchain/certificate/{doc_hash}` | Datos consolidados para renderizar el Certificado Digital | Público |
| `POST` | `/blockchain/send-raw-tx` | Relay de transacciones firmadas por MetaMask (SSI) | Público |
| `POST` | `/hash/generate` | Generación de Hash SHA-256 en el servidor | Público |
| `POST` | `/chat/message` | Procesamiento del asistente inteligente y auditoría | Público |
| `POST` | `/ocr/extract` | Procesamiento OCR de imagen de diploma con EasyOCR/NER | Público |
| `GET` | `/guias` | Listado de rutas de supervivencia logística | Público |
| `POST` | `/admin/guias` | Creación de nueva guía logística | Requiere JWT |
| `GET` | `/planillas` | Repositorio de planillas oficiales descargables | Público |
| `POST` | `/admin/planillas` | Publicación de nueva planilla oficial | Requiere JWT |
| `DELETE` | `/admin/planillas/{id}` | Eliminación de una planilla | Requiere JWT |
| `GET` | `/admin/checklist` | Requisitos dinámicos de pre-validación | Público |
| `POST` | `/admin/checklist` | Alta de nuevo requisito | Requiere JWT |
| `PUT` | `/admin/checklist/{id}` | Modificación de requisito | Requiere JWT |
| `DELETE` | `/admin/checklist/{id}` | Baja de requisito | Requiere JWT |
| `GET` | `/carreras` | Catálogo de carreras de ingeniería de la USM | Público |
| `GET` | `/pub/fields` | Especificación de campos dinámicos para el SAREN | Público |

---

### 6.2. Detalle de Endpoints Críticos

#### `POST /blockchain/register`
- **Entrada:**
  ```json
  {
    "hash": "0x4A8F...",
    "owner_name": "CARLOS EDUARDO MENDOZA",
    "cedula": "V-27891234",
    "document_type": "Título de Ingeniero de Sistemas",
    "form_data": { ... }
  }
  ```
- **Lógica:** Si Web3 está conectado y la clave privada configurada tiene balance de gas, ejecuta `USMDocumentRegistry.registerDocument(...)` en Sepolia. Almacena en Supabase el transaction hash retornado (`tx_hash`). Si se activa el modo de contingencia de defensa, asegura la persistencia en base de datos local y memoria sin romper el flujo del usuario.
- **Salida Exitosa:** Retorna objeto de confirmación con `tx_hash`, `status` y enlace a Etherscan.

#### `GET /blockchain/verify/{doc_hash}`
- **Parámetro de ruta:** `doc_hash` (formato hexadecimal `0x...` o sin prefijo).
- **Lógica:** Ejecuta la función `verifyDocument(_hash)` del Smart Contract en Sepolia. Comprueba las banderas de `exists` y `isRevoked`. Devuelve el titular, la cédula y la fecha inmutable del bloque Ethereum.

#### `POST /blockchain/records/{doc_hash}/mppeu-certify`
- **Entrada:**
  ```json
  {
    "auditor_name": "Lic. María Rodríguez",
    "auditor_cargo": "Directora de Cotejo GTU",
    "acta_numero": "ACT-2026-0891",
    "folio_numero": "FOL-412"
  }
  ```
- **Lógica:** Actualiza el estado del registro a `"Cotejado por MPPEU"` y añade la bitácora ministerial en `audit_logs`.

#### `POST /blockchain/records/{doc_hash}/mppre-apostille`
- **Entrada:**
  ```json
  {
    "auditor_name": "Emb. Carlos Soto",
    "country_destiny": "España",
    "notes": "Apostilla de La Haya Electrónica Conforme"
  }
  ```
- **Lógica:** Asigna código oficial de apostilla, actualiza el estatus a `"Apostillado por MPPRE"` y genera la estructura de validez internacional.

#### `POST /ocr/extract`
- **Entrada:** Imagen en formato Base64.
- **Lógica:** Invoca la red neuronal EasyOCR para reconocimiento óptico de caracteres en español e inglés. Segmenta el texto crudo y aplica expresiones regulares especializadas para extraer: Nombre del egresado, Cédula de Identidad, Denominación de la Universidad Santa María y Especialidad de Ingeniería.

---

## 7. CONTRATO INTELIGENTE BLOCKCHAIN (SOLIDITY)

Ubicación del código fuente: [blockchain/USMDocumentRegistry.sol](file:///c:/Users/Lenovo/.gemini/antigravity/scratch/Proyecto-Tesis-BlockChain/blockchain/USMDocumentRegistry.sol)  
Red destino: **Ethereum Sepolia Testnet** (Chain ID: `11155111`)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title USMDocumentRegistry
 * @notice Registro inmutable y certificable de documentos validados de la Universidad Santa María.
 *         Implementa control de acceso basado en roles (onlyAdmin) y revocación de credenciales.
 */
contract USMDocumentRegistry {

    address public institutionAdmin;
    uint256 public totalDocumentsCount;

    struct Document {
        string documentHash;     // CID de IPFS o Hash SHA-256 del documento
        string ownerName;        // Nombre del graduando
        string cedula;           // Cédula de identidad
        string documentType;     // Tipo de documento (PUB, Título, etc.)
        address registeredBy;    // Wallet de la autoridad que registró
        uint256 timestamp;       // Unix timestamp del registro
        bool exists;             // Bandera de existencia
        bool isRevoked;          // Bandera de validez/revocación
    }

    mapping(string => Document) private documents;

    event DocumentRegistered(
        string indexed documentHash,
        string ownerName,
        string cedula,
        string documentType,
        uint256 timestamp
    );

    event DocumentRevoked(
        string indexed documentHash,
        uint256 timestamp
    );

    modifier onlyAdmin() {
        require(msg.sender == institutionAdmin, "Acceso denegado: Solo la autoridad institucional puede ejecutar esta accion");
        _;
    }

    constructor() {
        institutionAdmin = msg.sender;
        totalDocumentsCount = 0;
    }

    function registerDocument(
        string calldata _hash,
        string calldata _ownerName,
        string calldata _cedula,
        string calldata _documentType
    ) external onlyAdmin {
        require(!documents[_hash].exists, "El documento ya se encuentra registrado");
        require(bytes(_hash).length > 0, "El hash no puede estar vacio");

        documents[_hash] = Document({
            documentHash: _hash,
            ownerName: _ownerName,
            cedula: _cedula,
            documentType: _documentType,
            registeredBy: msg.sender,
            timestamp: block.timestamp,
            exists: true,
            isRevoked: false
        });

        totalDocumentsCount++;
        emit DocumentRegistered(_hash, _ownerName, _cedula, _documentType, block.timestamp);
    }

    function revokeDocument(string calldata _hash) external onlyAdmin {
        require(documents[_hash].exists, "El documento no existe");
        require(!documents[_hash].isRevoked, "El documento ya ha sido revocado");

        documents[_hash].isRevoked = true;
        emit DocumentRevoked(_hash, block.timestamp);
    }

    function verifyDocument(string calldata _hash)
        external
        view
        returns (
            bool exists,
            bool isRevoked,
            string memory ownerName,
            string memory cedula,
            string memory documentType,
            uint256 timestamp
        )
    {
        Document memory doc = documents[_hash];
        return (doc.exists, doc.isRevoked, doc.ownerName, doc.cedula, doc.documentType, doc.timestamp);
    }
}
```

### Características Criptográficas Clave
- **Sin Costo para Verificadores (`view`):** La función `verifyDocument` se ejecuta en modo lectura local; ninguna entidad gubernamental o particular requiere saldo de criptomonedas para validar un título emitido.
- **Inmutabilidad y Trazabilidad:** Cada registro emite el evento `DocumentRegistered`, indexable por el explorador de bloques (Etherscan).
- **Protección Institucional (`onlyAdmin`):** Únicamente la wallet firmante de la Universidad Santa María posee privilegios para acuñar nuevos registros en el contrato.

---

## 8. BASE DE DATOS Y PERSISTENCIA (SUPABASE / POSTGRESQL)

El sistema utiliza Supabase para persistir metadatos y configuraciones dinámicas.

### 8.1. Diccionario de Tablas Principales
- **`perfiles` (Nuevo Esquema Seguro):** Perfil del graduando vinculado a `auth.users(id)` con clave foránea (`UUID PRIMARY KEY REFERENCES auth.users(id)`), cédula única (`cedula TEXT UNIQUE`), correo oficial, flags de inmutabilidad (`is_cedula_locked BOOLEAN`) y estado de onboarding (`is_profile_complete BOOLEAN`).
- **`profiles` (Esquema de Compatibilidad Legacy):** Almacena cédula (PK), nombre, carrera de ingeniería y semestre del estudiante para retrocompatibilidad con scripts de prueba y modo defensa.
- **`admins`:** Contiene los usuarios de fiscalización de los entes gubernamentales (MPPEU, SAREN, MPPRE, USM) con passwords hasheados en Bcrypt.
- **`records`:** Registro híbrido de documentos anclados a la blockchain (`hash`, `owner_name`, `cedula`, `document_type`, `tx_hash`, `status`, `created_at`).
- **`stats`:** Contadores globales (`graduandos_activos`, `docs_prevalidados`, `tiempo_ahorrado_hrs`, `titulos_blockchain`).
- **`audit_logs`:** Registro cronológico de actividades y eventos de auditoría para el panel principal.
- **`checklist_items`:** Banco de preguntas y validaciones físicas del checklist SAREN con soporte para actualización dinámica sin reiniciar el servidor.
- **`guias_logistica`:** Estructura JSONB con los pasos de supervivencia para cada ente y turno.
- **`planillas`:** Catálogo de enlaces y nombres de formatos oficiales institucionales.
- **`carreras`:** Listado de especialidades de ingeniería autorizadas en la USM.

### 8.2. Esquema de Autenticación Passwordless y Sincronización Reactiva (Triggers)
Para garantizar la integridad referencial absoluta entre la capa de autenticación interna de Supabase (`auth.users`) y la capa de datos públicos de la aplicación (`public.perfiles`), se implementó un **Trigger PostgreSQL reactivo**:

```sql
-- Trigger que crea automáticamente el perfil base tras la emisión del usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 8.3. Blindaje de Inmutabilidad de la Cédula de Identidad en PostgreSQL
A diferencia de los sistemas tradicionales donde la cédula puede ser sobrescrita o transferida a través de vulnerabilidades en la API, esta arquitectura implementa un **candado de inmutabilidad en el motor de base de datos**:

```sql
CREATE OR REPLACE FUNCTION public.enforce_cedula_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la cédula ya fue registrada y bloqueada, impedir cualquier alteración posterior
  IF OLD.is_cedula_locked = TRUE AND (OLD.cedula IS DISTINCT FROM NEW.cedula) THEN
    RAISE EXCEPTION 'Operación denegada por seguridad: La Cédula de Identidad es inmutable tras su registro legal.';
  END IF;

  -- Si se asigna la cédula por primera vez, marcar como bloqueada y completa
  IF NEW.cedula IS NOT NULL AND (OLD.cedula IS NULL OR OLD.cedula = '') THEN
    NEW.is_cedula_locked := TRUE;
    NEW.is_profile_complete := TRUE;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_cedula_profile_update
  BEFORE UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cedula_immutability();
```

Adicionalmente, se aplica **Row Level Security (RLS)** estricto:
- `SELECT`: `auth.uid() = id` (Un graduando solo puede leer sus propios datos).
- `UPDATE`: `auth.uid() = id` (Solo el propio titular puede completar su formulario).
- `SERVICE_ROLE`: Acceso exclusivo para el backend institucional y microservicios autorizados.

### 8.4. Matriz Comparativa de Ciberseguridad: Arquitectura USM vs. Modelo Arcaico SAREN

| Dimensión Técnica | Enfoque Tradicional / SAREN | Nueva Arquitectura USM-ApostillaBot |
|---|---|---|
| **Credenciales de Acceso** | Cédula + Contraseña estática vulnerable a filtraciones y reutilización. | **Passwordless (Email OTP efímero de 6 dígitos)** con expiración en 10 min. |
| **Protección contra Bots** | Captchas de imágenes distorsionadas y rompecabezas lentos y molestos. | **Cloudflare Turnstile invisible** (0 fricción, verificación automática en segundo plano). |
| **Flujo de Registro (UX)** | Formulario masivo inicial obligatorio antes de conocer la plataforma. | **Onboarding Progresivo:** acceso en 2 segundos; solicitud de cédula solo al requerir trámites legales. |
| **Integridad de Identidad** | Cédula modificable en paneles vulnerables o expuesta a colisiones. | **Cédula Única e Inmutable por Trigger PL/pgSQL**, ligada a la clave criptográfica `auth.uid()`. |
| **Protección de Sesión** | Sesiones propensas a secuestro o tokens en almacenamiento inseguro. | Sesiones gestionadas por **Supabase Auth con refresh token rotation** y RLS hermético. |
| **Soporte Next.js 16 / Vite** | Monolito desacoplado propenso a inconsistencias de estado. | Arquitectura híbrida lista para Server Components / Server Actions y Middleware de protección. |

### 8.5. Mecanismo de Entrega de Códigos OTP y Enlaces Mágicos (Mailpit Local)

En el entorno de desarrollo local con contenedores Docker, los correos salientes no se envían a servidores SMTP externos reales para evitar bloqueos por spam o costos de pasarelas. En su lugar, Supabase GoTrue se conecta al servidor SMTP simulado **Mailpit**:

1. **Bandeja de Entrada Local:** Accesible en el navegador en `http://localhost:54324`.
2. **Plantilla Híbrida (`magic_link.html`):** Configurada en `supabase/config.toml` con la ruta `./supabase/templates/magic_link.html`. La plantilla incluye:
   - El **código numérico OTP de 6 dígitos** destacado mediante la variable `{{ .Token }}` para ser copiado manualmente en el formulario de la aplicación.
   - El **enlace seguro directo (Magic Link)** mediante `{{ .ConfirmationURL }}` para autenticación con un solo clic.
   - Redirección automática (`site_url`) ajustada al puerto de Vite `http://localhost:5173`.
3. **Escuchador de Sesión React (`onAuthStateChange`):** Detecta cuando el graduando pulsa el enlace en el correo y monta automáticamente su sesión académica en el cliente sin requerir teclear el código. Para evitar sesiones fantasma al revisar la bandeja en otra pestaña, sólo se auto-inicia si la URL entrante contiene explícitamente el token del Magic Link (`#access_token`).
4. **Mecanismo de Respaldo para la Defensa:** Si en plena evaluación presencial la red o el contenedor se detienen, se acepta el código de contingencia `123456` para garantizar la continuidad sin contratiempos.

### 8.6. Política de Complejidad de Contraseñas y Datos Civiles del Graduando

Conforme a las recomendaciones de ciberseguridad NIST SP 800-63B y OWASP:

1. **Requisitos Estrictos de Contraseña (Evaluación en Tiempo Real):**
   - **Mínimo 8 caracteres**.
   - **Al menos 1 letra Mayúscula** (`[A-Z]`).
   - **Al menos 1 letra Minúscula** (`[a-z]`).
   - **Al menos 1 Número** (`[0-9]`).
   - **Al menos 1 Carácter Especial** (`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]`).
   - **Confirmación Obligatoria:** Campo de verificación "Repetir Contraseña" con comprobación idéntica.
2. **Formulario de Registro Actualizado:**
   - Se eliminaron los campos superfluos de "Carrera" y "Semestre".
   - Se incorporaron **Teléfono de Contacto** (formato móvil venezolano) y **Fecha de Nacimiento** (selector de calendario estandarizado `YYYY-MM-DD`), almacenados de forma segura en `public.perfiles`.

### 8.7. Diagnóstico Preciso de Acceso y Validación Cédula-Correo

Para erradicar la frustración del graduando y evitar ataques de denegación o suplantación:

1. **Detección de Usuario No Registrado en Inicio de Sesión (`check_email_registered`):**
   - Si un usuario ingresa credenciales fallidas, el sistema ejecuta una función PostgreSQL `SECURITY DEFINER` que verifica si el correo existe en `auth.users` o `public.perfiles`.
   - **Si el correo no existe:** Arroja el mensaje `"El usuario no se encuentra registrado en el sistema. Debes registrarte primero."` y despliega un botón de un clic `"¿Deseas crear tu cuenta ahora? Regístrate aquí →"`.
   - **Si el correo existe pero la clave es errónea:** Arroja `"La contraseña ingresada es incorrecta. Por favor verifica tus datos o utiliza '¿Olvidaste tu contraseña?'."` sin inducir al usuario a registrarse de nuevo.
2. **Validación Cruzada Pre-Envío en OTP y Recuperación (`verify_cedula_email_match`):**
   - Antes de generar cualquier código OTP o enlace de recuperación, se exige Cédula (V/E) y Correo.
   - Si los datos pertenecen a personas distintas, el sistema rechaza la solicitud de inmediato: `"Los datos no coinciden. La Cédula no corresponde al correo electrónico"`.
3. **Doble Modalidad de Recuperación de Contraseña:**
   - **Vía A (Magic Link):** Redirección al puerto `http://localhost:5173/?action=reset-password`.
   - **Vía B (Código Directo):** La vista permite ingresar el código de 6 dígitos recibido en el correo y la nueva contraseña directamente en pantalla, evitando cualquier fallo de redirección o puertos.

### 8.8. Guía Completa de Comandos Docker & Supabase CLI (Referencia Operativa, Migraciones y Troubleshooting)

Para la ejecución local, la plataforma orquesta un conjunto de microservicios contenerizados mediante **Docker** y administrados con el **Supabase CLI**. Esta sección reúne todos los comandos operativos, diagnóstico de contenedores, gestión de migraciones y resolución de incidentes técnicos.

#### A. Contenedores Docker Desplegados por el Sistema

Al ejecutar `npx supabase start`, Docker inicializa automáticamente los siguientes contenedores bajo la red aislada `supabase_network_Proyecto-Tesis-BlockChain`:

| Nombre del Contenedor | Servicio / Función | Puerto Expuesto en Host |
|---|---|---|
| `supabase_db_Proyecto-Tesis-BlockChain` | Motor relacional PostgreSQL 17 + extensiones criptográficas | `127.0.0.1:54322` |
| `supabase_kong_Proyecto-Tesis-BlockChain` | API Gateway unificado (Enrutador de REST y Storage) | `127.0.0.1:54321` |
| `supabase_studio_Proyecto-Tesis-BlockChain` | Panel web visual para administración de esquemas y tablas | `127.0.0.1:54323` |
| `supabase_inbucket_Proyecto-Tesis-BlockChain` | Servidor SMTP simulado (Buzón de correos y códigos OTP) | `127.0.0.1:54324` |
| `supabase_auth_Proyecto-Tesis-BlockChain` | GoTrue: Emisión y validación de tokens JWT y flujo Passwordless | Interno (expuesto vía Kong) |
| `supabase_storage_Proyecto-Tesis-BlockChain` | Almacenamiento de objetos y documentos académicos escaneados | Interno (expuesto vía Kong) |
| `supabase_realtime_Proyecto-Tesis-BlockChain` | Motor de WebSockets para notificaciones reactivas | Interno (expuesto vía Kong) |

---

#### B. Matriz de Comandos Operativos de Docker

Los siguientes comandos permiten inspeccionar, monitorear y gestionar los contenedores del proyecto desde PowerShell o CMD:

```powershell
# 1. Verificar si el motor Docker está activo y en ejecución
docker info

# 2. Listar todos los contenedores activos de Supabase
docker ps --filter "name=supabase"

# 3. Listar todos los contenedores (incluyendo los detenidos o con error)
docker ps -a --filter "name=supabase"

# 4. Inspeccionar logs en tiempo real de la base de datos PostgreSQL
docker logs -f supabase_db_Proyecto-Tesis-BlockChain

# 5. Inspeccionar logs en tiempo real del servicio de autenticación (GoTrue)
docker logs -f supabase_auth_Proyecto-Tesis-BlockChain

# 6. Inspeccionar logs del API Gateway Kong
docker logs -f supabase_kong_Proyecto-Tesis-BlockChain

# 7. Monitorear el consumo de CPU y memoria RAM de cada contenedor
docker stats

# 8. Reiniciar manualmente un contenedor específico ante una desconexión
docker restart supabase_db_Proyecto-Tesis-BlockChain

# 9. Limpieza de contenedores, redes e imágenes huérfanas o no utilizadas
docker system prune -f
```

---

#### C. Matriz de Comandos de Supabase CLI (`npx supabase`)

El CLI de Supabase permite controlar el ciclo de vida del entorno local, sincronizar cambios y gestionar las migraciones:

| Comando | Propósito y Comportamiento |
|---|---|
| `npx supabase start` | **Inicia el stack local completo.** Descarga imágenes faltantes, levanta los contenedores en Docker y aplica todas las migraciones SQL pendientes. |
| `npx supabase status` | **Muestra el cuadro de estado.** Detalla la URL de la API, claves criptográficas (`anon`, `service_role`), URL de PostgreSQL y enlaces web a Studio e Inbucket. |
| `npx supabase stop` | **Detiene todos los contenedores.** Mantiene la persistencia de datos almacenados en los volúmenes de Docker para la siguiente sesión. |
| `npx supabase stop --no-backup` | **Detiene y destruye los datos de prueba.** No respalda el volumen de base de datos; el próximo inicio será desde cero. |
| `npx supabase restart` | **Reinicia el ecosistema.** Apaga y vuelve a encender los contenedores recargando la configuración de `supabase/config.toml`. |
| `npx supabase db reset` | **Restablece la base de datos a estado cero.** Trunca tablas, re-ejecuta cronológicamente todos los archivos en `supabase/migrations/` y ejecuta `supabase/seed.sql`. |
| `npx supabase migration new <nombre>` | **Crea un archivo de migración.** Genera un nuevo script en blanco con formato `YYYYMMDDHHMMSS_<nombre>.sql` dentro de `supabase/migrations/`. |
| `npx supabase db diff -f <nombre>` | **Genera migraciones por diferencias.** Compara la base de datos local contra el código de migraciones y genera el script diferencial automáticamente. |
| `npx supabase db psql` | **Consola interactiva SQL.** Abre una sesión interactiva `psql` conectada directamente a la base de datos PostgreSQL local. |
| `npx supabase login` | **Autenticación con Supabase Cloud.** Abre el navegador para enlazar el CLI con la cuenta de desarrollador en la nube. |
| `npx supabase link --project-ref <id>` | **Vinculación a la nube.** Asocia el repositorio local a un proyecto remoto de producción en Supabase. |
| `npx supabase db push` | **Despliegue de migraciones.** Sube y ejecuta las migraciones locales en la base de datos remota de Supabase Cloud. |
| `npx supabase db pull` | **Descarga de esquema remoto.** Obtiene las modificaciones realizadas desde el panel web de la nube y crea una migración local. |

---

#### D. Solución de Problemas Frecuentes (Troubleshooting)

##### Caso 1: Error `Cannot connect to the Docker daemon at unix:///var/run/docker.sock`
* **Causa:** El motor de Docker Desktop no se ha iniciado o la integración con WSL 2 no ha completado su arranque.
* **Solución:**
  1. Abra la aplicación **Docker Desktop** en Windows.
  2. Espere hasta que el indicador en la esquina inferior izquierda pase de naranja ("Starting...") a verde ("Engine running").
  3. Ejecute `docker ps` en su terminal para confirmar. Luego repita `npx supabase start`.

##### Caso 2: Conflicto de Puertos (`Port 54321 / 54322 / 54323 is already allocated`)
* **Causa:** Otro proceso local (por ejemplo una instancia independiente de PostgreSQL en puerto 5432/54322 o un servidor previo que no se cerró limpiamente) está ocupando el puerto.
* **Solución en Windows (PowerShell):**
  ```powershell
  # Localizar el identificador de proceso (PID) que ocupa el puerto (ejemplo: 54321):
  netstat -ano | findstr :54321

  # Terminar el proceso forzosamente usando su PID:
  taskkill /PID <NUMERO_PID> /F
  ```
  Una vez liberado, ejecute `npx supabase start`.

##### Caso 3: Desincronización o Error en Migraciones (`failed to apply migration`)
* **Causa:** Se modificó manualmente una tabla en Studio que entró en conflicto con los archivos versionados de `supabase/migrations/`.
* **Solución:**
  Ejecute un reseteo forzado del esquema:
  ```bash
  npx supabase db reset
  ```

##### Caso 4: Inspección del Buzón de Correos OTP en Modo Sin Internet
* **Escenario:** Al evaluar el registro de graduandos o la recuperación de contraseña, el usuario necesita ver el código de 6 dígitos generado sin tener conexión a internet.
* **Procedimiento:**
  Abra la URL del servidor local de correo **Inbucket**:
  👉 **`http://localhost:54324`**
  Allí aparecerán instantáneamente todos los correos electrónicos emitidos por Supabase Auth, permitiendo copiar el OTP o pulsar el Magic Link directamente.

---

### 8.9. Arquitectura y Diagnóstico de Supabase Storage: Bóveda Criptográfica de Documentos

#### A. Diagnóstico de la Falla Inicial ("No veo nada en el Storage")
Al inspeccionar la consola web de Supabase Studio (`http://localhost:54323/project/default/storage/buckets`) y probar la subida de pergaminos universitarios, se detectó que el panel mostraba la pantalla vacía (*"Create a file bucket"*). Los motivos técnicos identificados fueron:
1. **Inexistencia del Bucket `documentos`:** Los contenedores locales de Supabase se iniciaron con un volumen de Storage en blanco (`Buckets: []`), sin aprovisionar previamente el bucket de custodia de expedientes académicos.
2. **Restricción de Seguridad por Row-Level Security (RLS) en `storage.objects`:** Las políticas predeterminadas de Supabase Storage bloqueaban las inserciones de los roles `anon` y `authenticated` con el error `403 Unauthorized: new row violates row-level security policy for table "objects"`.
3. **Flujo de Carga Postergado:** El componente original sólo invocaba la subida al Storage al hacer clic en "Confirmar y Emitir GTU". Si el usuario cancelaba, se bloqueaba en el OCR o no completaba el formulario, el archivo nunca llegaba al Storage.

#### B. Solución Técnica Implementada y Verificada
1. **Aprovisionamiento del Bucket Público `documentos`:**
   - Creado mediante el SDK de Supabase con visibilidad pública activada:
     ```python
     client.storage.create_bucket('documentos', options={'public': True})
     ```
2. **Habilitación de Políticas RLS Permisivas en PostgreSQL (`localhost:54322`):**
   ```sql
   ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Allow All Documentos"
   ON storage.objects
   FOR ALL
   TO public, anon, authenticated, service_role
   USING (bucket_id = 'documentos')
   WITH CHECK (bucket_id = 'documentos');
   ```
3. **Ampliación de Columnas de Custodia en la Tabla `records`:**
   Se incorporaron los campos `document_url`, `solicitud_code`, `tomo`, `folio`, `libro`, `mppeu_verified`, `mppre_verified`, `mppeu_officer`, `mppeu_date`, `mppre_officer`, `mppre_date`, `apostille_number` y `rejection_reason` para asegurar trazabilidad bidireccional entre la base de datos relacional y el Storage.
4. **Pre-Carga Inmediata y Reactiva en `src/components/OCRExtractor.jsx`:**
   Tan pronto como el graduando arrastra o selecciona su archivo, `handleFile` ejecuta una subida preliminar en segundo plano (`uploadDocumentToStorage`) con el MIME y extensión reales (`.pdf` / `.jpg` / `.png`), asegurando que el documento aparezca de inmediato en la carpeta `titulos/` de Supabase Studio sin esperar a que el usuario complete el trámite.
5. **Visor Dual en la Mesa de Cotejo Ministerial (`src/components/MPPEUCotejoModal.jsx`):**
   Para permitir que los funcionarios del MPPEU fiscalicen tanto fotos (`.jpg`, `.png`) como diplomas digitales en formato PDF (`.pdf`), el componente evalúa la extensión y MIME:
   - **Imágenes:** Renderizadas con controles interactivos de Zoom (hasta 2.5x), Rotación (90°) y contraste.
   - **Documentos PDF:** Renderizados dinámicamente mediante un contenedor `<iframe>` / `<embed>` nativo a pantalla completa, permitiendo al fiscal ministerial leer texto, sellos y firmas digitales vectoriales.

---

### 6.4. Pipeline de Digitalización Forense OCR Multimodal y Soporte PDF (PyMuPDF, Gemini Vision y AcademicDegreeNER)

#### A. Diagnóstico de la Falla en Extracción ("El OCR tampoco me funciona" / 0% confianza)
Al evaluar el procesamiento de títulos universitarios en formato PDF, se manifestaron cuatro anomalías:
1. **Incompatibilidad de Archivos PDF con Motores Raster:** Ni Tesseract.js (navegador WebAssembly) ni OpenCV `cv2.imdecode` pueden decodificar directamente los bytes binarios de un PDF (`%PDF-1.4`). Al recibir un PDF, arrojaban excepciones silenciosas, dejando el texto reconocido en blanco (`""`).
2. **Bloqueo en "Optimizando y calibrando resolución del pergamino...":** En el frontend, `optimizeDocument` intentaba cargar el data URL de un PDF dentro de un objeto `new Image()`. Como los navegadores no pueden pintar PDFs dentro de una etiqueta `Image`, la promesa quedaba suspendida indefinidamente.
3. **Clave de Gemini API Inválida (Token OAuth):** La variable `GEMINI_API_KEY` contenía un token de sesión de desarrollo (`AQ.Ab8RN6...`) en lugar de una API Key oficial de Google AI Studio (`AIzaSy...`). La API de Google respondía con `401 Unauthorized (ACCESS_TOKEN_TYPE_UNSUPPORTED)`.
4. **Falta de Importación en Backend (`NameError: USMOcrService`):** En `api/main.py`, la bandera `HAS_USM_OCR = False` estaba fijada y la clase `USMOcrService` no estaba importada, lo que provocaba un error 500 no capturado en `/api/ocr/extract` y un `UnboundLocalError` en `/api/ocr/gemini`.

#### B. Solución de Ingeniería y Arquitectura Implementada
1. **Integración de PyMuPDF (`fitz`) y `pypdf` en el Backend:**
   - Si el archivo recibido comienza con la firma mágica `%PDF`, el sistema utiliza `pymupdf` para:
     a) Extraer todo el texto vectorial incrustado en el documento en milisegundos (`page.get_text()`).
     b) Si el PDF es un escaneo sin texto vectorial, rasteriza automáticamente la primera página a una imagen PNG de alta densidad a **200 DPI** (`page.get_pixmap(dpi=200)`), lista para inferencia visual.
2. **Fallback Inteligente y Alta Disponibilidad en `/api/ocr/gemini` y `/api/ocr/extract`:**
   - Jerarquía de procesamiento multinivel:
     - **Nivel 1:** Google Gemini Multimodal Vision (`gemini-2.5-flash` / `gemini-1.5-flash`). Si la clave es válida y comienza con `AIzaSy...`, extrae entidades semánticas con razonamiento multimodal.
     - **Nivel 2 (Fallback Local Automático):** Si Gemini no está disponible (código 401, cuota agotada o token temporal), el endpoint conmuta inmediatamente a **PyMuPDF + AcademicDegreeNER**, extrayendo con 95%+ de precisión:
       - `titular` (Nombre completo del graduando)
       - `cedula` (Formato canónico V-XX.XXX.XXX)
       - `institucion` (Universidad emisora)
       - `carrera` (Título o grado conferido)
       - `facultad` (Facultad o escuela)
       - `fecha` (Fecha de expedición)
       - Devolviendo HTTP 200 con `engine: "PyMuPDF + AcademicDegreeNER (Fallback Local)"`.
3. **Extracción en Cliente Offline para PDFs (`extractTextFromPdfBase64`):**
   - En `src/components/OCRExtractor.jsx`, se implementó un decodificador de streams PDF en JavaScript que extrae los operadores `(...) Tj` y `[...] TJ`. Esto garantiza que incluso si el backend está apagado, el frontend extrae el texto del diploma en el navegador y autocompleta el formulario.
4. **Autocompletado Asistido por Perfil:**
   - Si algún campo no resulta detectable en el diploma (por desgaste físico del papel), el modal de validación precarga los datos del perfil activo del graduando (`user.institucion`, `user.carrera`, etc.) con advertencia visual para que el usuario simplemente coteje y confirme con un clic.

---

## 9. PROTOCOLO Y GUÍA PARA LA DEFENSA DE GRADO

Para garantizar una presentación exitosa y fluida ante el Jurado Calificador, siga este orden de demostración práctica:

### 9.1. Preparación Previa
1. Inicie **Docker Desktop** y verifique que el motor se encuentre activo (`docker ps`).
2. Levante los contenedores locales de base de datos y autenticación con:
   ```bash
   npx supabase start
   ```
3. Inicie el sistema unificado con:
   ```bash
   python run_system.py
   ```
4. Verifique que el Frontend esté visible en `http://localhost:5173`.
5. Verifique que el Backend responda en `http://localhost:8000/docs` y el OCR en `http://localhost:5000/api/health`.
6. Tenga abierta en una pestaña adicional la bandeja de Inbucket (`http://localhost:54324`) para mostrar al jurado la llegada instantánea del correo OTP.
7. Tenga a mano un teléfono móvil con cámara para escanear el código QR del Certificado Digital.

### 9.2. Guión de Demostración en Vivo ("Efecto WOW")
1. **Paso 1 — Panel Principal:** Muestre el Dashboard y explique las métricas de impacto (especialmente el indicador de *Horas Ahorradas* basado en las 14.5 horas de colas físicas en Caracas).
2. **Paso 2 — OCR con Inteligencia Artificial:** Vaya a la pestaña "Extractor OCR". Suba una imagen de muestra de un título. Muestre cómo el modelo CRAFT + CRNN extrae los datos y presione "Transferir a Planilla PUB".
3. **Paso 3 — Asistente de Llenado PUB y Rechazo en Vivo:** En la Planilla PUB, intente colocar intencionalmente una cédula mal formateada o un teléfono incorrecto. Muestre al jurado cómo el sistema rechaza el dato con un marco rojo explicativo. Luego, complételo correctamente y presione **"⛓️ Registrar Huella en Blockchain"**.
4. **Paso 4 — Auditoría Ministerial:** En otra pestaña del navegador (o en modo incógnito), inicie sesión como funcionario del **MPPEU** (`mppeu_agente`). Abra la solicitud recién creada, ejecute el **Cotejo Ministerial de Actas y Folios** y apruebe el documento.
5. **Paso 5 — Emisión de Apostilla y Verificación QR:** Cambie al rol de Cancillería (**MPPRE**), emita la Apostilla de La Haya y abra el Certificado Digital. Pídale a un jurado que escanee el código QR con su propio teléfono móvil: el enlace abrirá directamente el **Verificador Descentralizado**, demostrando la inmutabilidad y autenticidad en tiempo real.

---

## 10. HOJA DE RUTA Y POSIBLES ACTUALIZACIONES FUTURAS

### 10.1. Módulo de Recuperación "Perdí u Olvidé mi Correo" (Evaluación y Diseño Técnico)

#### A. Justificación y Necesidad Real en el Entorno Universitario
En la Universidad Santa María, el tiempo transcurrido entre la culminación de carga académica (10mo semestre) y los actos solemnes de graduación suele oscilar entre 6 y 18 meses. Durante este lapso, es recurrente que los estudiantes:
1. Pierdan acceso o dejen de consultar su correo institucional (`@usm.edu.ve`).
2. Olviden con cuál cuenta personal (`@gmail.com`, `@hotmail.com`, etc.) completaron el registro inicial en el portal.
3. Se encuentren ante un bloqueo de acceso al intentar usar "Olvidé mi contraseña" porque el sistema les exige el correo que no recuerdan.

Dado que la **Cédula de Identidad venezolana** es un dato inmutable que el estudiante conoce de memoria, surge la necesidad de un mecanismo de recuperación de identidad a partir de la Cédula.

#### B. Análisis de Riesgos y Ciberseguridad (Prevención de Amenazas)
Implementar una búsqueda directa de correo mediante cédula sin salvaguardas expondría el sistema a riesgos severos:
- **Ataque de Enumeración y Fuga de Privacidad (Data Harvesting):** Los listados de grado y actas universitarias suelen circular de forma semipública. Un atacante con las cédulas de los graduandos podría consultar el sistema y cosechar masivamente correos personales no públicos.
- **Suplantación de Identidad:** Conocer el correo personal de un estudiante facilitaría ataques dirigidos de ingeniería social o *phishing*.

#### C. Arquitectura Propuesta: Recuperación Segura en Tres Capas

Para que el mecanismo sea **100% funcional y seguro**, se propone un flujo escalonado basado en las mejores prácticas de OWASP ASVS:

```
                  ┌────────────────────────────────────────┐
                  │ Graduando: "Olvidé con qué correo me   │
                  │ registré en la plataforma"             │
                  └──────────────────┬─────────────────────┘
                                     │
                     Ingresa: Cédula (V/E) + Fecha de
                     Nacimiento (Registrada en Expediente)
                                     ▼
                  ┌────────────────────────────────────────┐
                  │ CAPA 1: Enmascaramiento Parcial Seguro │
                  │ Muestra pista criptográfica:           │
                  │ "Tu correo es: j***3@gm***.com"        │
                  └──────────────────┬─────────────────────┘
                                     │
               ¿El graduando reconoce el correo?
               ├─────────────── SÍ ───────────────► Inicia sesión o solicita OTP/Clave.
               │
               ▼ NO (No tiene acceso al buzón)
                  ┌────────────────────────────────────────┐
                  │ CAPA 2: Despacho Out-of-Band           │
                  │ Se envía un recordatorio al buzón sin  │
                  │ revelar el texto plano en el navegador.│
                  └──────────────────┬─────────────────────┘
                                     │
               ¿Pérdida total del buzón de correo?
               │
               ▼
                  ┌────────────────────────────────────────┐
                  │ CAPA 3: Segundo Canal (SMS / WhatsApp) │
                  │ Se envía un OTP de 6 dígitos al        │
                  │ teléfono móvil registrado en el perfil.│
                  │ Tras validar el OTP, se permite        │
                  │ vincular un nuevo correo verificado.   │
                  └────────────────────────────────────────┘
```

1. **Capa 1 — Enmascaramiento Parcial (Hint Masking):**
   - El estudiante proporciona su Cédula y su Fecha de Nacimiento (registrada durante la inscripción).
   - Si ambos datos coinciden en `public.perfiles`, el sistema devuelve únicamente una versión ofuscada del correo:
     - Entrada en BD: `juandavid.torres@gmail.com`
     - Salida en pantalla: `j*********s@g****.com`
   - Esto es suficiente para que el usuario legítimo recuerde de inmediato qué cuenta utilizó, pero es inútil para un atacante externo.

2. **Capa 2 — Notificación Ciega Fuera de Banda (Out-of-Band Notification):**
   - El sistema despacha un correo de recordatorio al buzón registrado:
     *"Hola, hemos recibido una solicitud para recordarte el correo de acceso a tu expediente de grado en la USM. Este es el correo registrado. Si deseas ingresar, haz clic aquí..."*.
   - En la interfaz web únicamente se muestra un aviso neutro: *"Se ha enviado un mensaje de confirmación al correo vinculado a esta cédula"*, bloqueando ataques de temporización (*timing attacks*).

3. **Capa 3 — Migración de Correo por Segundo Canal (Teléfono SMS / OTP):**
   - Si el graduando perdió irreversiblemente la contraseña de su correo electrónico, puede optar por la validación mediante el **Teléfono de Contacto** (campo ya capturado y almacenado en `public.perfiles`).
   - Se despacha un código SMS / OTP de un solo uso a su línea móvil registrada. Al confirmarlo, el graduando puede asociar una nueva dirección de correo electrónico a su expediente civil inmutable.
   - Todo cambio de correo queda asentado en un log de auditoría criptográfica con estampilla de tiempo (`updated_at`), IP de procedencia y firma del sistema.

---

### 10.2. Integración con Red Principal (Ethereum Mainnet / Arbitrum L2)
- Migración de la red de pruebas Sepolia a una solución de Capa 2 (L2) como **Arbitrum One** u **Optimism**, reduciendo los costos de gas de emisión a menos de \$0.01 USD por título manteniendo la seguridad de Ethereum.

---
*Documento elaborado conforme a las normas de trabajo especial de grado de la Facultad de Ingeniería — Universidad Santa María.*



---

## 11. SUBSISTEMA DE RECONOCIMIENTO ÓPTICO FORENSE (OCR), GESTIÓN DE PDFS Y VISUALIZACIÓN MINISTERIAL

### 11.1. Optimización y Carga Asíncrona de Documentos PDF vs. Imágenes

#### A. Diagnóstico de la Anomalía Original
En versiones previas, al seleccionar o arrastrar un archivo en formato **PDF** (ej. títulos escaneados o digitalizados en PDF), la interfaz de usuario del graduando se quedaba congelada indefinidamente en el estado:
> *"⚡ Optimizando y calibrando resolución del pergamino para custodia..."*

**Causa Raíz:**
1. El motor de optimización de imágenes cliente (`optimizeDocument`) ejecutaba una rutina basada en Canvas HTML5 (`new Image()`).
2. Al asignarle a un objeto `Image` una URL blob o base64 de un documento PDF (`data:application/pdf`), los navegadores modernos (Chromium, Firefox, WebKit) no pueden decodificar un PDF como imagen de mapa de bits estándar, provocando que los eventos `onload` y `onerror` no se dispararan o colapsaran.
3. El estado reactivo `isOptimizing` se mantenía en `true`, impidiendo la transición al estado listo.

#### B. Solución Técnica Implementada
1. **Detección Temprana de Tipo MIME y Extensión:**
   En `src/components/OCRExtractor.jsx` y `src/services/documentStorage.js`, se implementó la discriminación inmediata:
   ```javascript
   const isPdf = file?.type === 'application/pdf' || file?.name?.toLowerCase().endsWith('.pdf');
   setIsOptimizing(!isPdf);
   ```
2. **Tratamiento Vectorial Puro:**
   Los documentos PDF no requieren compresión bicúbica en Canvas cliente ya que poseen definición nativa vectorial o empaquetado de alta resolución. Se preparan directamente como `application/pdf` y se almacenan íntegros en Supabase Storage (`titulos/{hash}.pdf`).
3. **Indicador Visual de Estado Listo:**
   Para PDFs, se reemplazó el banner de espera por una tarjeta de verificación verde:
   > **Documento PDF Académico:** Listo para custodia digital y análisis IA (`✓ Vector / Alta Resolución`).

---

### 11.2. Pipeline Híbrido de Digitalización y Extracción OCR (PyMuPDF + Tesseract Fraktur)

#### A. Arquitectura Multicapa del Backend Flask (`/api/ocr/extract`)
Para garantizar que ningún título universitario quede ilegible o con campos vacíos, el backend Flask implementa un pipeline de cuatro etapas coordinadas:

```
[ Archivo PDF o Imagen ]
          │
          ├──> ¿Es PDF? ───> PyMuPDF (fitz)
          │                      │
          │                      ├──> 1. Extracción de Capa de Texto Nativo (page.get_text())
          │                      └──> 2. Renderizado Rasterizado a 300 DPI (pix.tobytes("png"))
          │                                     │
          ▼                                     ▼
[ OpenCV Morfología & Deskew ] <────────────────┘
          │
          ├──> Pase 1: CLAHE en Escala de Grises (Preserva fuentes delgadas y fondo blanco)
          └──> Pase 2: Umbralización Adaptativa Gaussiana (Suprime texturas de pergamino)
          │
          ▼
[ Tesseract OCR Multilingüe ]
          ├──> frk.traineddata (Tipografías góticas solemnes: Old English Text MT / Cancilleresca)
          ├──> spa.traineddata (Diccionario español académico oficial)
          └──> eng.traineddata (Soporte alfanumérico y términos internacionales)
          │
          ▼
[ Fusión Inteligente de Textos ] ───> Texto Unificado Completo
          │
          ▼
[ AcademicDegreeNER (Reconocedor Semántico Universal) ]
          │
          ├──> Institución Universitaria (USM, UCV, USB, UCAB, LUZ, ULA, UC, UNEXPO, UNEFA, etc.)
          ├──> Título Conferido / Carrera (Sistemas, Informática, Telecomunicaciones, Civil, etc.)
          ├──> Titular / Graduando (Patrones rectorales, de concesión y cumplimiento)
          ├──> Cédula de Identidad (V-XX.XXX.XXX / Pasaporte internacional)
          ├──> Facultad o Escuela Emisora
          └──> Fecha de Grado (Conversión de texto ceremonial "veinticinco de mayo..." a DD/MM/YYYY)
```

#### B. Modelos de Lenguaje Tesseract Integrados Localmente
Se configuró el directorio local de recursos `api/tessdata/` con la variable de entorno `TESSDATA_PREFIX`:
- `spa.traineddata` (2.3 MB): Reconocimiento ortográfico en español con tildes y diéresis.
- `frk.traineddata` (10.9 MB): Modelo Fraktur para fuentes góticas e inscripciones con caracteres solemnes (`ſ`, `𝔘`, etc.).
- `eng.traineddata` (4.1 MB) y `osd.traineddata` (10.5 MB): Orientación espacial y metadatos técnicos.

#### C. Eliminación de Asignaciones Fijas / Falsos Positivos
Anteriormente, cuando el OCR fallaba, el sistema rellenaba por defecto `"Universidad Santa María"` e `"Ingeniería de Sistemas"`. En esta versión:
- Se eliminaron las asignaciones fijas inventadas.
- Si un campo no puede ser extraído con un umbral de confianza mínimo, se preserva el dato ingresado en el perfil real del graduando o se solicita validación manual en el modal de verificación.

---

### 11.3. Visor de Documentos para Funcionarios Ministeriales (MPPEU y MPPRE)

#### A. Botón de Inspección Rápida en Tablas y Tarjetas
Tanto en el portal de fiscalización del **MPPEU** (Etapa 2 - Cotejo de Firmas Rectorales y Sello GTU) como en el del **MPPRE** (Etapa 3 - Apostilla de La Haya), se incorporó el botón:
> `[ 📄 Ver Documento ]`

Disponible en:
1. **Vista de Tabla:** Columna de acciones de cada fila, con acceso en un solo clic.
2. **Vista de Tarjetas Expandidas:** Barra superior de herramientas de cada expediente.

#### B. Modal Forense Interactivo (`MPPEUCotejoModal`)
- **Renderizado Adaptativo de PDF:** Si el archivo almacenado es un PDF, el modal instancia un elemento `<iframe>` nativo seguro, permitiendo desplazamiento fluido por páginas, zoom del navegador e impresión oficial.
- **Herramientas de Peritaje Visual para Imágenes:** Si es una imagen (`jpg`, `png`), provee controles de ampliación (+ / -), rotación incremental de 90° para corregir orientaciones y enlace a vista en pantalla completa.
- **Doble Modalidad (Acción vs. Consulta):**
  - Si el trámite está pendiente de aprobación: Muestra la lista de comprobación ministerial (firmas rectorales, sellos, cédula) y los botones de aprobación con firma criptográfica (MetaMask o Llave de Custodia GTU).
  - Si el trámite ya fue certificado por el MPPEU o está en fase MPPRE: Despliega el distintivo institucional `✓ Documento Cotejado y Certificado con GTU` y el botón `Cerrar Visor`, evitando duplicidad de firmas.


---

### 11.4. Integración Híbrida del Catálogo Universitario Nacional, Carreras OPSU y Fuzzy Matching

#### A. Justificación y Análisis de Arquitectura
A partir del análisis de requerimientos forenses para la validación de títulos universitarios en Venezuela, se integraron los catálogos oficiales y patrones jurídicos dentro del motor `AcademicDegreeNER`:
1. **Catálogo Nacional de 23 Universidades:** Registro con nombres canónicos, siglas y variantes reconocidas de las 23 instituciones de educación superior del país (UCV, USM, UCAB, USB, UC, ULA, LUZ, UNIMET, UNEFA, UNESR, UPEL, UCLA, URBE, UJAP, UAH, UMA, UBA, URU, UNY, UNEG, UNELLEZ, UNEFM, UBV, UNEXPO, USMA).
2. **Catálogo Oficial de Títulos y Carreras (OPSU / CNU):** Denominaciones homologadas para carreras de Ingeniería, Ciencias de la Salud, Ciencias Económicas y Sociales, Humanidades y Ciencias Básicas.
3. **Fórmulas de Anclaje Jurídico:** Identificación de frases de control ceremonial que delimitan los datos dentro del pergamino (*"Hago saber"*, *"Por cuanto el ciudadano..."*, *"cumplió con los requisitos legales"*, *"en nombre de la República y por autoridad de la Ley"*, *"se le confiere el Título de"*).

#### B. Algoritmo de Similitud Ortográfica (Fuzzy Matching Levenshtein)
Para resolver las distorsiones inherentes a tipografías góticas (*Old English* o cancillerescas) donde caracteres como `ſ`, `f`, `l`, `t`, `r` suelen confundirse en el OCR (ej. *"Ingenicro be Siftemas"*):
- Se implementó una función pura en Python y JavaScript de cálculo de similitud basada en la distancia de Levenshtein normalizada:
  $$\text{similitud}(s_1, s_2) = 1 - \frac{\text{distancia}(s_1, s_2)}{\max(\text{len}(s_1), \text{len}(s_2))}$$
- Umbral de confianza adaptativo: **$\ge 72\%$**.
- Si una mención o institución extraída coincide difusamente por encima del umbral con una entrada del catálogo oficial, el sistema realiza la transposición automática al término oficial normalizado, garantizando precisión sin intervención manual.

#### C. Control de Fronteras de Palabra (Regex Boundaries)
Para evitar falsos positivos críticos:
- Se implementaron delimitadores de frontera de palabra estricta (`\b`) en las siglas universitarias, impidiendo que palabras comunes como `"Cédula"` activen la sigla `"ULA"`, o que `"República Bolivariana de Venezuela"` active indebidamente a la `"Universidad Bolivariana de Venezuela (UBV)"`.

---

### 11.5. Optimización de la Vista de Auditoría Gubernamental (`GovernmentPanel.jsx`)

#### A. Rediseño de la Tabla en Dos Niveles (2-Tier Stack)
- **Diagnóstico:** Anteriormente, los 5 botones de auditoría en cada fila se encontraban en una sola fila horizontal `flex` con `whiteSpace: nowrap`. Esto expandía la celda de acciones a más de 650px, desbordando el ancho de la tabla y empujando las columnas fuera del área visible.
- **Solución Implementada:**
  - **Fila Superior (Custodia y Evidencias):** Tres píldoras compactas simétricas en ancho uniforme:
    - `[📄 Doc]`: Apertura inmediata del pergamino original en Supabase Storage.
    - `[👁️ PUB]`: Visualización de la Planilla Única Bancaria y expediente.
    - `[🛡️ Cert]`: Certificado de inmutabilidad SHA-256 en Blockchain.
  - **Fila Inferior (Acción Ministerial de Estado):** Botón principal de estado según el ente activo:
    - MPPEU: `[Cotejo GTU]` y `[Rechazar]`, o distintivo `[🏛️ Sello GTU Listo]`.
    - MPPRE: `[Apostillar]` y `[Rechazar]`, o `[🌐 Ver Apostilla de La Haya]`.
  - Reducción del ancho mínimo de columna de 350px a **240px**, y del ancho de la tabla de 1180px a **1000px**.

#### B. Adaptabilidad de Cuadrícula en Tarjetas (Mobile-Friendly)
- Se actualizó el layout de tarjetas a `repeat(auto-fill, minmax(min(100%, 330px), 1fr))`, garantizando que en dispositivos con pantallas pequeñas las tarjetas se adapten fluidamente sin barras de desplazamiento horizontal forzadas.


---

### 11.4. Integración Híbrida del Catálogo Universitario Nacional, Carreras OPSU y Fuzzy Matching

#### A. Justificación y Análisis de Arquitectura
A partir del análisis de requerimientos forenses para la validación de títulos universitarios en Venezuela, se integraron los catálogos oficiales y patrones jurídicos dentro del motor `AcademicDegreeNER`:
1. **Catálogo Nacional de 23 Universidades:** Registro con nombres canónicos, siglas y variantes reconocidas de las 23 instituciones de educación superior del país (UCV, USM, UCAB, USB, UC, ULA, LUZ, UNIMET, UNEFA, UNESR, UPEL, UCLA, URBE, UJAP, UAH, UMA, UBA, URU, UNY, UNEG, UNELLEZ, UNEFM, UBV, UNEXPO, USMA).
2. **Catálogo Oficial de Títulos y Carreras (OPSU / CNU):** Denominaciones homologadas para carreras de Ingeniería, Ciencias de la Salud, Ciencias Económicas y Sociales, Humanidades y Ciencias Básicas.
3. **Fórmulas de Anclaje Jurídico:** Identificación de frases de control ceremonial que delimitan los datos dentro del pergamino (*"Hago saber"*, *"Por cuanto el ciudadano..."*, *"cumplió con los requisitos legales"*, *"en nombre de la República y por autoridad de la Ley"*, *"se le confiere el Título de"*).

#### B. Algoritmo de Similitud Ortográfica (Fuzzy Matching Levenshtein)
Para resolver las distorsiones inherentes a tipografías góticas (*Old English* o cancillerescas) donde caracteres como `ſ`, `f`, `l`, `t`, `r` suelen confundirse en el OCR (ej. *"Ingenicro be Siftemas"*):
- Se implementó una función pura en Python y JavaScript de cálculo de similitud basada en la distancia de Levenshtein normalizada:
  $$\text{similitud}(s_1, s_2) = 1 - \frac{\text{distancia}(s_1, s_2)}{\max(\text{len}(s_1), \text{len}(s_2))}$$
- Umbral de confianza adaptativo: **$\ge 72\%$**.
- Si una mención o institución extraída coincide difusamente por encima del umbral con una entrada del catálogo oficial, el sistema realiza la transposición automática al término oficial normalizado, garantizando precisión sin intervención manual.

#### C. Control de Fronteras de Palabra (Regex Boundaries)
Para evitar falsos positivos críticos:
- Se implementaron delimitadores de frontera de palabra estricta (`\b`) en las siglas universitarias, impidiendo que palabras comunes como `"Cédula"` activen la sigla `"ULA"`, o que `"República Bolivariana de Venezuela"` active indebidamente a la `"Universidad Bolivariana de Venezuela (UBV)"`.

---

### 11.5. Optimización de la Vista de Auditoría Gubernamental (`GovernmentPanel.jsx`)

#### A. Rediseño de la Tabla en Dos Niveles (2-Tier Stack)
- **Diagnóstico:** Anteriormente, los 5 botones de auditoría en cada fila se encontraban en una sola fila horizontal `flex` con `whiteSpace: nowrap`. Esto expandía la celda de acciones a más de 650px, desbordando el ancho de la tabla y empujando las columnas fuera del área visible.
- **Solución Implementada:**
  - **Fila Superior (Custodia y Evidencias):** Tres píldoras compactas simétricas en ancho uniforme:
    - `[📄 Doc]`: Apertura inmediata del pergamino original en Supabase Storage.
    - `[👁️ PUB]`: Visualización de la Planilla Única Bancaria y expediente.
    - `[🛡️ Cert]`: Certificado de inmutabilidad SHA-256 en Blockchain.
  - **Fila Inferior (Acción Ministerial de Estado):** Botón principal de estado según el ente activo:
    - MPPEU: `[Cotejo GTU]` y `[Rechazar]`, o distintivo `[🏛️ Sello GTU Listo]`.
    - MPPRE: `[Apostillar]` y `[Rechazar]`, o `[🌐 Ver Apostilla de La Haya]`.
  - Reducción del ancho mínimo de columna de 350px a **240px**, y del ancho de la tabla de 1180px a **1000px**.

#### B. Adaptabilidad de Cuadrícula en Tarjetas (Mobile-Friendly)
- Se actualizó el layout de tarjetas a `repeat(auto-fill, minmax(min(100%, 330px), 1fr))`, garantizando que en dispositivos con pantallas pequeñas las tarjetas se adapten fluidamente sin barras de desplazamiento horizontal forzadas.


---

### 11.6. Adaptaciones Operativas: Corrección Asistida, Validación Estricta, Segregación MPPRE y Asignación Territorial

#### A. Selectores Oficiales y Fecha Dual (OCR UX Assist)
- **Problema Abordado:** En casos de pergaminos antiguos, texturas marcadas o tipografías góticas deterioradas donde el OCR no alcance alta certeza en la institución o mención, el egresado requería una vía guiada sin posibilidad de escribir nombres universitarios informales o inconsistentes.
- **Solución Implementada:**
  - **Universidad Oficial (`institucion`):** Desplegable conectado a `UNIVERSIDADES_CATALOGO` con las 23 casas de estudio oficiales de Venezuela.
  - **Carrera / Mención (`carrera`):** Desplegable conectado a `CARRERAS_CATALOGO` con 30 denominaciones homologadas por la OPSU y el CNU.
  - **Datos de Entrada Manual Estricta:** Exclusivamente **Nombre Completo** y **Cédula de Identidad**.
  - **Fecha de Emisión Dual:** Campo de texto manual (`DD/MM/YYYY`) sincronizado bidireccionalmente con un selector de fecha/calendario interactivo HTML5 (`<input type="date">`), transpilanado automáticamente el estándar ISO a formato legal venezolano.

#### B. Validación Estricta de 8 Campos Obligatorios
- Se implementó un guardián de validación previa en `ValidationFloatingModal` y en `handleRegisterGtu` (`OCRExtractor.jsx`).
- Para emitir la Solicitud GTU, es indispensable que los 8 campos estén completos:
  1. `nombre_completo`
  2. `cedula`
  3. `institucion`
  4. `carrera`
  5. `fecha`
  6. `estado`
  7. `municipio`
  8. `sede_taquilla`
- Si falta alguno de ellos, el sistema deshabilita la generación de la solicitud y despliega una alerta visual identificando específicamente cuáles campos requieren ser completados.

#### C. Segregación de Funciones: Revisión y Firma Diplomática MPPRE
- **Flujo Consular Diferenciado:** El egresado no puede auto-firmar ni auto-emitir la Apostilla de La Haya.
- **Solicitud Consular (`TrackingTimeline.jsx`):** El egresado presiona *"Solicitar Apostilla MPPRE"* y en un modal selecciona el **País de Destino** (de entre los países firmantes del Convenio de La Haya de 1961) y el motivo legal (Estudios, Trabajo, Residencia). La solicitud se radicará en el backend (`POST /blockchain/records/<doc_hash>/request-apostille`) con estado `PENDIENTE_APOSTILLA_MPPRE`.
- **Cotejo y Emisión Diplomática (`MPPRECotejoModal.jsx` y `GovernmentPanel.jsx`):**
  - El oficial del MPPRE visualiza la solicitud en su bandeja de entrada.
  - Al pulsar *"Revisar y Apostillar"*, se activa el modal diplomático `MPPRECotejoModal`, que permite visualizar el pergamino custodiado en Supabase Storage, verificar el sello GTU y firmas rectorales certificadas previamente por el MPPEU, validar la conformidad con el Convenio de La Haya y estampar la firma criptográfica (Web3 MetaMask o Llave Ministerial).
  - Al firmar, se genera el número de apostilla oficial (`APOSTILLA-2026-MPPRE-xxxx`) y el registro pasa a `APOSTILLADO_MPPRE`.

#### D. Asignación Territorial y Ficha de Agencia de Entrega Presencial
- **Base Geográfica Oficial (`src/data/venezuelaLocations.js`):** Integración de los 24 estados de Venezuela (`ESTADOS_VENEZUELA`), con sus municipios y las sedes oficiales del MPPEU / Zonas Educativas habilitadas para la recepción física del pergamino.
- **Ficha Descriptiva de Taquilla:** Cada sede cuenta con dirección física oficial y horarios de atención al público.
- **Visibilidad Integral:** La agencia seleccionada se guarda en el registro del expediente (base de datos y almacenamiento local) y se muestra en la tarjeta de culminación del OCR, en el banner de seguimiento del egresado (`TrackingTimeline.jsx`) y en las tarjetas y tablas de auditoría ministerial (`GovernmentPanel.jsx`).
