# Contexto y Rol del Asistente

Eres un Arquitecto de Software y Experto en Seguridad (DevSecOps) especializado en Next.js (App Router), Tailwind CSS y Supabase. 

Actualmente tengo un proyecto en desarrollo con la siguiente pila tecnológica:
- **Frontend/Backend:** Next.js
- **Estilos:** Tailwind CSS
- **Base de Datos y Autenticación:** Supabase (entorno local con Docker)

**Estado actual:** Tengo un sistema de inicio de sesión y registro funcional, pero es un prototipo muy básico (tradicional, con usuario y contraseña).

**El Objetivo:** Quiero transformar este login básico en un sistema moderno, sin contraseñas (Passwordless/OTP), altamente seguro y con una excelente experiencia de usuario (UX). Este sistema debe superar en arquitectura a portales gubernamentales anticuados (como el del SAREN de Venezuela, que usa múltiples captchas intrusivos, preguntas de seguridad débiles y obliga a usar la Cédula desde el primer paso).

Queremos un flujo moderno de **"Onboarding Progresivo"**:
1. Acceso inicial solo con Correo + OTP (o Magic Link) + Captcha invisible (Cloudflare Turnstile).
2. Middleware que detecte si el usuario es nuevo.
3. Si es nuevo, redirección obligatoria a una pantalla para completar datos legales (Cédula de Identidad, Nombres) antes de permitir el acceso al sistema (Dashboard).

---

# Tareas Requeridas

A continuación, te proporcionaré los archivos de mi código actual. Por favor, ejecuta las siguientes tareas en orden:

## Tarea 1: Evaluación del Código Actual (Auditoría)
Analiza mi código y genera un reporte breve indicando:
- ¿Qué vulnerabilidades de seguridad o malas prácticas existen en mi implementación actual?
- ¿Qué partes del código actual pueden reutilizarse y cuáles deben eliminarse para pasar a un modelo *Passwordless*?

## Tarea 2: Reporte de Brechas (Gap Analysis)
Lista exactamente qué elementos faltan en mi repositorio para alcanzar el objetivo planteado. Considera:
- Configuración de Supabase Auth local.
- Triggers/Funciones SQL para la sincronización entre `auth.users` y la tabla pública `perfiles`.
- Integración de Turnstile.
- Lógica de enrutamiento y protección de rutas (Middleware).

## Tarea 3: Plan de Acción Óptimo y Gratuito
Diseña un plan técnico paso a paso para que yo pueda codificar esta modernización. El plan debe ser 100% aplicable a mi entorno local (Docker/Supabase) y preparado para producción en plataformas gratuitas (ej. Vercel + Supabase Cloud).

El plan debe incluir:
1. **Script SQL:** El código exacto para crear la tabla `perfiles` (con validación de Cédula única) y el *Trigger* que se dispara al crear un usuario en Supabase.
2. **Componente de Login:** Cómo refactorizar el formulario de Next.js y Tailwind para usar OTP de Supabase e integrar de forma invisible `@marsidev/react-turnstile`.
3. **Middleware:** El código del `middleware.ts` de Next.js para proteger las rutas privadas y forzar la redirección al formulario de "Completar Cédula" si falta ese dato en el perfil.
4. **Flujo de Cédula:** Lógica para que la inserción de la Cédula sea inmutable una vez guardada.

Por favor, sé directo, proporciona fragmentos de código claros y asegúrate de aprovechar al máximo las capacidades de Server Components y Server Actions de Next.js.