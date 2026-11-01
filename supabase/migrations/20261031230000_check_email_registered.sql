-- ═══════════════════════════════════════════════════════════════════════════
-- USM-ApostillaBot: Verificación de Existencia de Correo Registrado
-- Distingue entre "Usuario no registrado" y "Contraseña incorrecta"
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.check_email_registered(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_clean_email TEXT := lower(trim(p_email));
  v_exists BOOLEAN := false;
BEGIN
  -- 1. Soporte para cuenta de evaluación del jurado de tesis
  IF v_clean_email IN ('estudiante@usm.edu.ve', 'mauro@usm.edu.ve') THEN
    RETURN jsonb_build_object(
      'registered', true,
      'is_demo', true
    );
  END IF;

  -- 2. Consultar existencia en perfiles o auth.users
  SELECT EXISTS(
    SELECT 1 FROM public.perfiles WHERE lower(email) = v_clean_email
    UNION
    SELECT 1 FROM auth.users WHERE lower(email) = v_clean_email
  ) INTO v_exists;

  RETURN jsonb_build_object(
    'registered', v_exists,
    'email', v_clean_email
  );
END;
$$;

-- Permisos de ejecución para clientes anónimos y autenticados
GRANT EXECUTE ON FUNCTION public.check_email_registered(TEXT) TO anon, authenticated, service_role;

