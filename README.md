# 🏛️ USM-ApostillaBot
> **Plataforma Descentralizada con Inteligencia Artificial y Blockchain para la Verificación y Tramitación de Documentos Académicos**  
> *Trabajo Especial de Grado — Facultad de Ingeniería, Universidad Santa María (USM)*

---

## 🚀 Inicio Rápido

### 1. Iniciar Docker y Supabase (Base de Datos & Auth Local)
El proyecto utiliza una base de datos PostgreSQL local junto con el motor de autenticación (GoTrue) y buzón de correo local emulados con **Supabase** mediante contenedores **Docker**:

1. **Abre Docker Desktop** en tu equipo y asegúrate de que el motor de Docker esté en ejecución (*Engine Running*).
2. **Inicia los servicios locales de Supabase** desde la raíz del proyecto:
   ```bash
   npx supabase start
   ```

---

### 🌐 ¿Con qué dirección entro a Supabase?

Para acceder a la consola gráfica de administración de tu base de datos local en el navegador, ingresa a:

👉 **[http://localhost:54323](http://localhost:54323)** (o `http://127.0.0.1:54323`)

> 💡 **No requiere usuario ni contraseña** en el entorno local. Desde este panel (Supabase Studio) podrás:
> - **Table Editor:** Explorar, filtrar y editar los datos de las tablas (`perfiles`, `records`, `admins`, `audit_logs`, etc.).
> - **SQL Editor:** Ejecutar consultas, funciones PL/pgSQL y scripts directamente sobre PostgreSQL.
> - **Authentication:** Ver los usuarios creados, sus correos, IDs y estados de confirmación.
> - **Storage:** Consultar los archivos escaneados almacenados.

#### Resumen de Direcciones y Puertos Locales:

| Servicio | Dirección / URL | Propósito |
|---|---|---|
| **Supabase Studio (Dashboard Web)** | **[http://localhost:54323](http://localhost:54323)** | Panel visual para administrar la BD, tablas y usuarios. |
| **Inbucket (Buzón de Correos & OTPs)** | **[http://localhost:54324](http://localhost:54324)** | Ver los correos y códigos de 6 dígitos enviados a graduandos sin internet. |
| **API REST / Kong Gateway** | **[http://localhost:54321](http://localhost:54321)** | Endpoint base que conectan el Frontend y Backend (`SUPABASE_URL` en `.env`). |
| **PostgreSQL Directo (DBeaver / pgAdmin)** | `localhost:54322` | Host: `127.0.0.1`, Puerto: `54322`, User: `postgres`, Pass: `postgres`, BD: `postgres`. |
| **Supabase Cloud (En la Nube)** | **[https://supabase.com/dashboard](https://supabase.com/dashboard)** | Consola web oficial si utilizas un proyecto alojado en la nube en vez de Docker. |
| **Bóveda Storage (`documentos`)** | **[http://localhost:54323/project/default/storage/buckets/documentos](http://localhost:54323/project/default/storage/buckets/documentos)** | Ver los pergaminos y títulos PDF subidos por los graduandos. |

---

### 2. Iniciar el Sistema Completo (Backend + OCR + Frontend)
Una vez que Supabase esté levantado, arranca todos los servicios con un solo comando:

```bash
python run_system.py
```

- **Frontend Web:** [http://localhost:5173](http://localhost:5173)
- **Backend API & Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Microservicio Flask OCR:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

### 3. Acceso Administrativo y Ministerial (/admin o /gobierno)
Para ingresar al panel institucional de auditoría y cotejo documental:
- URL: **[http://localhost:5173/admin](http://localhost:5173/admin)** *(o [http://localhost:5173/gobierno](http://localhost:5173/gobierno))*
- **Credenciales rápidas para la defensa:**
  - **MPPEU (Taquilla GTU):** `mppeu_agente` / `admin123`
  - **SAREN (Registro Principal):** `saren_admin` / `admin123`
  - **MPPRE (Cancillería / Apostilla):** `mppre_agente` / `admin123`
  - **USM (Secretaría General):** `admin` / `usm2026`
- **Para crear nuevas credenciales personalizadas:**
  ```bash
  python create_admin.py
  ```
  *(O insertando registros en la tabla `admins` desde [Supabase Studio](http://localhost:54323)).*

---

### 4. Bóveda Digital en Supabase Storage & Motor OCR con IA

1. **Custodia Inmediata en Supabase Storage:**
   - Todo documento seleccionado en el escaneador OCR se optimiza y se guarda inmediatamente en el bucket público **`documentos`** bajo la carpeta **`titulos/`**.
   - Para inspeccionar los archivos subidos, ingresa a: **[http://localhost:54323/project/default/storage/buckets/documentos](http://localhost:54323/project/default/storage/buckets/documentos)**.
   - En el panel de administración (**`/admin`**), la mesa de cotejo ministerial cuenta con un **Visor Dual**: visualización de imágenes con zoom/rotación y lector **PDF nativo** en iframe a pantalla completa.

2. **Motor OCR Especializado y Soporte PDF de Ultra Alta Resolución (PyMuPDF + Tesseract Fraktur):**
   - **Soporte Nativo de PDFs:** Soporta diplomas en formato PDF digital o escaneado mediante `pymupdf` (`fitz`), extrayendo el texto vectorial nativo y rasterizando la primera página a 300 DPI para procesamiento OCR.
   - **Doble Pase Tesseract Local (`api/tessdata/`):** Modelos `frk.traineddata` (fuentes góticas solemnes) y `spa.traineddata` (español) integrados en el repositorio sin depender de descargas externas.
   - **Reconocedor Semántico Universal (`AcademicDegreeNER`):** Identifica todas las universidades nacionales (USM, UCV, USB, UCAB, LUZ, ULA, UC, UNEXPO, UNEFA, etc.) y todas las disciplinas de ingeniería, salud, derecho y ciencias sociales sin recurrir a datos estáticos ficticios.
   - **Carga Inmediata de PDF en Cliente:** Eliminado el cuelgue en *"Optimizando resolución"* para PDFs al detectar su estructura vectorial y mostrar la insignia verde de documento listo.

3. **Inspección Forense de Documentos en Portales Ministeriales (MPPEU / MPPRE):**
   - **Botón `Ver Documento`:** Disponible en la tabla de expedientes y en las tarjetas interactivas de ambos ministerios.
   - **Visor Forense Integrado (`MPPEUCotejoModal`):** Permite inspeccionar en vivo el PDF o imagen que el graduando cargó en Supabase Storage (`titulos/...`), con controles de zoom, giro de 90° e impresión oficial.

---

## 🐳 Comandos Clave de Docker y Supabase

| Acción | Comando | Descripción |
|---|---|---|
| **Verificar Docker** | `docker ps` | Comprueba que el daemon de Docker esté activo y lista contenedores. |
| **Iniciar Supabase** | `npx supabase start` | Descarga e inicia todos los contenedores Docker (Postgres, Auth, Studio, Storage, Inbucket). |
| **Consultar Estado** | `npx supabase status` | Muestra URLs locales, llaves `anon` / `service_role` y puertos de conexión. |
| **Ver Correos y OTPs** | Abrir `http://localhost:54324` | Accede a Inbucket para ver los códigos de verificación enviados por email. |
| **Detener Supabase** | `npx supabase stop` | Apaga los contenedores Docker preservando el estado de la base de datos. |
| **Reiniciar Supabase** | `npx supabase restart` | Reinicia todos los contenedores de Supabase. |
| **Resetear Base de Datos** | `npx supabase db reset` | Limpia la base de datos y reaplica todas las migraciones de `supabase/migrations/`. |
| **Nueva Migración** | `npx supabase migration new <nombre>` | Crea un nuevo archivo SQL de migración versionado por fecha. |
| **Ver Logs de Contenedores** | `docker logs -f supabase_db_Proyecto-Tesis-BlockChain` | Inspecciona los registros en tiempo real de la base de datos PostgreSQL. |
| **Ver Logs de Auth** | `docker logs -f supabase_auth_Proyecto-Tesis-BlockChain` | Inspecciona los registros de autenticación OTP y tokens JWT. |

---

## 📖 Documentación Completa del Proyecto

Toda la documentación técnica, manual de arquitectura, descripción detallada de todos los módulos del Frontend, especificación de todos los Endpoints del Backend, Smart Contract en Solidity y guía para la defensa se encuentra en:

👉 **[DOCUMENTACION.md](./DOCUMENTACION.md)**

---

## 🏗️ Estructura del Repositorio

- `api/`: Servidor Backend desarrollado en FastAPI, Web3.py, WebSockets, EasyOCR y PyJWT.
- `blockchain/`: Contrato Inteligente `USMDocumentRegistry.sol` en Solidity 0.8.20 para Ethereum Sepolia.
- `src/`: Código fuente del Frontend en React 19, Vite, Tailwind CSS y Framer Motion.
  - `src/components/`: Componentes modulares (Dashboard, OCR, Pre-validación, PUB, Verificador Blockchain, Panel Gubernamental, etc.).
  - `src/services/api.js`: Cliente centralizado de comunicación con la API.
- `supabase/`: Configuración local de Supabase (`config.toml`) y migraciones SQL versionadas (`migrations/`).
- `run_system.py`: Script de orquestación y arranque unificado de servicios.
- `deploy.py`: Script de compilación y despliegue del contrato inteligente a la red Sepolia.
- `supabase_schema.sql`: Esquema SQL de persistencia y políticas RLS para PostgreSQL en Supabase.
- `DOCUMENTACION.md`: Manual integral de arquitectura, módulos, endpoints y defensa de tesis.
