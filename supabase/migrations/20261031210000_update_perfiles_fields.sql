-- Agregar campos de teléfono y fecha de nacimiento a la tabla de perfiles
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

