-- ═══════════════════════════════════════════════════════════════════════════
-- Migración: Columnas completas en records (Módulos 1-5) y endurecimiento RLS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE records ADD COLUMN IF NOT EXISTS account_cedula TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS account_owner TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS account_email TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS estado TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS municipio TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS sede_taquilla TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS sede_direccion TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS sede_horario TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS country_destiny TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS motivo_apostille TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS saren_verified BOOLEAN DEFAULT false;
ALTER TABLE records ADD COLUMN IF NOT EXISTS pub_code TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS pub_hash TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS banco_receptor TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS monto_arancel TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS form_data JSONB;

-- Restringir tabla admins exclusivamente a service_role (no exponer credenciales a anon)
DROP POLICY IF EXISTS "Allow all for service role" ON admins;
CREATE POLICY "Admins solo service_role"
  ON admins
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

