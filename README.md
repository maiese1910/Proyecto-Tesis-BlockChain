# 🏛️ USM-ApostillaBot
> **Plataforma Descentralizada con Inteligencia Artificial y Blockchain para la Verificación y Tramitación de Documentos Académicos**  
> *Trabajo Especial de Grado — Facultad de Ingeniería, Universidad Santa María (USM)*

---

## 🚀 Inicio Rápido

Para iniciar el servidor completo (Backend FastAPI + Frontend React/Vite) con un solo comando:

```bash
python run_system.py
```

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API & Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

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
- `run_system.py`: Script de orquestación y arranque unificado de servicios.
- `deploy.py`: Script de compilación y despliegue del contrato inteligente a la red Sepolia.
- `supabase_schema.sql`: Esquema SQL de persistencia y políticas RLS para PostgreSQL en Supabase.
- `DOCUMENTACION.md`: Manual integral de arquitectura, módulos, endpoints y defensa de tesis.
