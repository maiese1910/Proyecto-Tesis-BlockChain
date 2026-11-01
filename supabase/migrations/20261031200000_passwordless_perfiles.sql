-- ═══════════════════════════════════════════════════════════════════════════
-- USM-ApostillaBot: Migración de Autenticación Passwordless y Perfiles Inmutables
-- Arquitectura de Onboarding Progresivo con Supabase Auth (auth.users)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Tabla de Perfiles vinculada al UUID de auth.users
CREATE TABLE IF NOT EXISTS public.perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre TEXT,
  cedula_tipo TEXT CHECK (cedula_tipo IN ('V', 'E')),
  cedula_numero TEXT,
  cedula TEXT UNIQUE, -- Formato canónico: V-28.315.101
  carrera TEXT,
  semestre TEXT,
  is_profile_complete BOOLEAN DEFAULT FALSE,
  is_cedula_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar Row Level Security (RLS) Estricto
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Política de Lectura: El usuario solo puede consultar su propio perfil
DROP POLICY IF EXISTS "Usuarios leen su propio perfil" ON public.perfiles;
CREATE POLICY "Usuarios leen su propio perfil"
  ON public.perfiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Política de Inserción: Permitir al usuario crear su perfil si el trigger no existiese
DROP POLICY IF EXISTS "Usuarios insertan su propio perfil" ON public.perfiles;
CREATE POLICY "Usuarios insertan su propio perfil"
  ON public.perfiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Política de Actualización: El usuario solo actualiza su propio perfil
DROP POLICY IF EXISTS "Usuarios actualizan su propio perfil" ON public.perfiles;
CREATE POLICY "Usuarios actualizan su propio perfil"
  ON public.perfiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política de Servicio: Acceso total para backend con service_role
DROP POLICY IF EXISTS "Service role gestiona perfiles" ON public.perfiles;
CREATE POLICY "Service role gestiona perfiles"
  ON public.perfiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Trigger Automático: Crear perfil esqueleto al emitirse el usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Blindaje Criptográfico de Inmutabilidad de Cédula
CREATE OR REPLACE FUNCTION public.enforce_cedula_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la cédula ya estaba registrada y bloqueada, impedir cualquier alteración
  IF OLD.is_cedula_locked = TRUE AND (OLD.cedula IS DISTINCT FROM NEW.cedula) THEN
    RAISE EXCEPTION 'Operación denegada por seguridad: La Cédula de Identidad es inmutable tras su registro legal.';
  END IF;

  -- Si se está asignando la cédula por primera vez, marcar como bloqueada y completa
  IF NEW.cedula IS NOT NULL AND (OLD.cedula IS NULL OR OLD.cedula = '') THEN
    NEW.is_cedula_locked := TRUE;
    NEW.is_profile_complete := TRUE;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_cedula_profile_update ON public.perfiles;
CREATE TRIGGER on_cedula_profile_update
  BEFORE UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cedula_immutability();

