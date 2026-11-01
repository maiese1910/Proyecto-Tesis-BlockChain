-- ═══════════════════════════════════════════════════════════════════════════
-- USM-ApostillaBot — Schema SQL para Supabase
-- Ejecutar en el SQL Editor de Supabase (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Tabla: profiles (ya debería existir, recrear si no) ───────────────────
CREATE TABLE IF NOT EXISTS profiles (
  cedula TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  carrera TEXT NOT NULL,
  semestre TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Tabla: admins ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,  -- Almacena hash bcrypt, NO texto plano
  cargo TEXT DEFAULT 'Administrador',
  ente TEXT DEFAULT 'USM',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Tabla: records (registros blockchain) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash TEXT UNIQUE NOT NULL,
  owner_name TEXT NOT NULL,
  cedula TEXT NOT NULL,
  document_type TEXT NOT NULL,
  tx_hash TEXT,
  status TEXT DEFAULT 'Pendiente de Auditoría',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Tabla: stats (estadísticas persistentes del Dashboard) ─────────────────
CREATE TABLE IF NOT EXISTS stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar contadores iniciales
INSERT INTO stats (key, value) VALUES
  ('graduandos_activos', 0),
  ('docs_prevalidados', 0),
  ('tiempo_ahorrado_hrs', 0),
  ('titulos_blockchain', 0)
ON CONFLICT (key) DO NOTHING;

-- ─── Tabla: audit_logs (registro de auditoría en tiempo real) ───────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Tabla: checklist_items (requisitos SAREN dinámicos) ────────────────────
CREATE TABLE IF NOT EXISTS checklist_items (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  pregunta TEXT NOT NULL,
  pista TEXT NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar checklist por defecto
INSERT INTO checklist_items (label, pregunta, pista, orden) VALUES
  ('Título Original con firma del Rector y Secretario General',
   '📋 **Requisito 1 de 5 — Título Original**\n\n¿Tienes el título físico **firmado** por el Rector y el Secretario General de la USM? Adjunta una foto con el 📎 o responde **sí / no**.',
   '🔴 **Error detectado en el Título.**\nDirígete a Control de Estudios USM (Módulo 4) para solicitar uno corregido antes de continuar.', 1),
  ('Validación del GTU (Sello o QR del MPPEU)',
   '📋 **Requisito 2 de 5 — Legalización GTU**\n\n¿Tienes el sello del **Ministerio de Educación (MPPEU/GTU)**? Adjunta la foto del sello o responde **sí / no**.',
   '🔴 **Falta la validación del GTU.**\nTramítalo en la Zona Educativa de tu estado. Sin este sello el SAREN rechazará tu documento.', 2),
  ('Planilla Única Bancaria (PUB) pagada',
   '📋 **Requisito 3 de 5 — Pago de Aranceles (PUB)**\n\n¿Tienes la **Planilla Única Bancaria (PUB)** con el pago de aranceles completado? Adjunta el comprobante o responde **sí / no**.',
   '🔴 **Falta la PUB pagada.**\nDescarga el formato en el módulo de Planillas de esta app, llévalo al banco indicado y regresa con el sello.', 3),
  ('Timbres Fiscales Regionales (denominación correcta)',
   '📋 **Requisito 4 de 5 — Timbres Fiscales**\n\n¿Tienes los **timbres fiscales regionales** de la denominación exacta? (Normalmente 0.5 UT). Responde **sí / no**.',
   '🔴 **Timbres insuficientes o incorrectos.**\nDirígete a una farmacia autorizada cerca del Registro. Confirma la denominación exacta el mismo día.', 4),
  ('Copia de Cédula laminada y vigente',
   '📋 **Requisito 5 de 5 — Copia de Cédula**\n\n¿Tienes una copia **legible** de tu cédula de identidad **laminada** y **vigente**? Responde **sí / no**.',
   '🔴 **Cédula vencida o copia ilegible.**\nEl SAREN no acepta cédulas vencidas. Renuévala en el SAIME antes de continuar.', 5)
ON CONFLICT DO NOTHING;

-- ─── Tabla: guias_logistica (guías dinámicas de supervivencia) ──────────────
CREATE TABLE IF NOT EXISTS guias_logistica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ente TEXT NOT NULL,
  location TEXT NOT NULL,
  warning TEXT,
  image_url TEXT DEFAULT '',
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Tabla: planillas (documentos descargables) ─────────────────────────────
CREATE TABLE IF NOT EXISTS planillas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  url TEXT NOT NULL,
  categoria TEXT DEFAULT '',
  orden INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar planillas por defecto
INSERT INTO planillas (nombre, url, categoria, orden) VALUES
  ('Planilla de Solicitud de Grado.pdf', '#', 'Grado', 1),
  ('Formato Fondo Negro.pdf', '#', 'Grado', 2),
  ('Planilla Solvencia de Biblioteca.pdf', '#', 'Grado', 3),
  ('Planilla Única Bancaria (PUB).pdf', '#', 'SAREN', 4)
ON CONFLICT DO NOTHING;

-- ─── Tabla: carreras (dinámicas) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carreras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT UNIQUE NOT NULL,
  activa BOOLEAN DEFAULT true
);

INSERT INTO carreras (nombre) VALUES
  ('Ingeniería en Sistemas'),
  ('Ingeniería Civil'),
  ('Ingeniería Industrial'),
  ('Ingeniería Eléctrica'),
  ('Ingeniería Mecánica'),
  ('Arquitectura')
ON CONFLICT (nombre) DO NOTHING;

-- ─── Tabla: pub_fields (campos PUB dinámicos) ──────────────────────────────
CREATE TABLE IF NOT EXISTS pub_fields (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  placeholder TEXT,
  pregunta TEXT NOT NULL,
  ayuda TEXT NOT NULL,
  validacion_regex TEXT DEFAULT '',
  validacion_mensaje TEXT DEFAULT '',
  orden INT NOT NULL DEFAULT 0
);

-- ─── Row Level Security (RLS) ──────────────────────────────────────────────
-- Habilitar RLS pero permitir acceso desde el service role key
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE guias_logistica ENABLE ROW LEVEL SECURITY;
ALTER TABLE planillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE carreras ENABLE ROW LEVEL SECURITY;
ALTER TABLE pub_fields ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para el backend (usando service role o anon key)
-- En producción, usar service_role key para operaciones del backend
CREATE POLICY "Allow all for service role" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON admins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON stats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON checklist_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON guias_logistica FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON planillas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON carreras FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON pub_fields FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ Schema completo. Ejecutar este script en Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════
