-- ==============================================================================
-- SEMILLAS INICIALES (SEED DATA) - USM-APOSTILLABOT
-- ==============================================================================

-- Credenciales Administrativas por Ente Ministerial
INSERT INTO admins (username, password, cargo, ente) VALUES
  ('mppeu_agente', 'admin123', 'Analista Revisor de Taquilla GTU', 'MPPEU'),
  ('saren_admin', 'admin123', 'Registrador Principal / Protocolización', 'SAREN'),
  ('mppre_agente', 'admin123', 'Oficial Consular de Legalización y Apostilla', 'MPPRE'),
  ('admin', 'usm2026', 'Administrador Central del Sistema', 'USM')
ON CONFLICT (username) DO UPDATE SET
  password = EXCLUDED.password,
  cargo = EXCLUDED.cargo,
  ente = EXCLUDED.ente;

