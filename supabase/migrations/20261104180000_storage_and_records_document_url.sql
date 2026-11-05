-- ═══════════════════════════════════════════════════════════════════════════
-- Migración: Soporte de Almacenamiento de Documentos y Cotejo Ministerial
-- Bucket 'documentos' en Supabase Storage y columna 'document_url' en records
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Ampliar tabla records para almacenar URL del pergamino y campos GTU
ALTER TABLE records ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS solicitud_code TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS tomo TEXT DEFAULT 'XVIII';
ALTER TABLE records ADD COLUMN IF NOT EXISTS folio TEXT DEFAULT '142';
ALTER TABLE records ADD COLUMN IF NOT EXISTS libro TEXT DEFAULT 'Grados 2026';
ALTER TABLE records ADD COLUMN IF NOT EXISTS mppeu_verified BOOLEAN DEFAULT false;
ALTER TABLE records ADD COLUMN IF NOT EXISTS mppre_verified BOOLEAN DEFAULT false;
ALTER TABLE records ADD COLUMN IF NOT EXISTS mppeu_officer TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS mppeu_date TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS mppre_officer TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS mppre_date TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS apostille_number TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Asegurar existencia del bucket 'documentos' en storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];

-- 3. Políticas de acceso público a storage.objects para el bucket 'documentos'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public Access to Documentos' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Public Access to Documentos" ON storage.objects
      FOR SELECT USING (bucket_id = 'documentos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public Upload Documentos' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Public Upload Documentos" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'documentos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public Update Documentos' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Public Update Documentos" ON storage.objects
      FOR UPDATE USING (bucket_id = 'documentos');
  END IF;
END $$;

