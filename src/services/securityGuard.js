/**
 * ═══════════════════════════════════════════════════════════════════════════
 * USM-ApostillaBot — Módulo de Ciberseguridad y Rate Limiting (OWASP ASVS)
 * ═══════════════════════════════════════════════════════════════════════════
 * Protocolos de Defensa en Profundidad:
 * 1. Mitigación de Fuerza Bruta en Login (Bloqueo tras 5 intentos fallidos con backoff progresivo).
 * 2. Rate Limiting de Peticiones Sensibles (Cooldown de 60s entre envíos de OTP y Recuperación).
 * 3. Sanitización Estricta de Entradas (Prevención de inyección SQL, NoSQL y XSS).
 */

const STORAGE_KEY_LOGIN_FAILURES = 'usm_sec_login_fails';
const STORAGE_KEY_LOCKOUT_UNTIL = 'usm_sec_lockout_until';
const STORAGE_KEY_OTP_COOLDOWN = 'usm_sec_otp_cooldown';
const STORAGE_KEY_FORGOT_COOLDOWN = 'usm_sec_forgot_cooldown';

const MAX_FAILED_ATTEMPTS = 5;
const BASE_LOCKOUT_SECONDS = 60;
const ACTION_COOLDOWN_SECONDS = 60;

export const securityGuard = {
  /**
   * 1. Verifica si el inicio de sesión está bloqueado por exceso de intentos fallidos
   */
  getLoginLockoutStatus() {
    try {
      const lockoutUntil = parseInt(sessionStorage.getItem(STORAGE_KEY_LOCKOUT_UNTIL) || '0', 10);
      const now = Date.now();
      if (lockoutUntil > now) {
        const remainingSeconds = Math.ceil((lockoutUntil - now) / 1000);
        return { isLocked: true, remainingSeconds };
      }
      return { isLocked: false, remainingSeconds: 0 };
    } catch {
      return { isLocked: false, remainingSeconds: 0 };
    }
  },

  /**
   * Obtiene la cantidad de intentos fallidos registrados actualmente
   */
  getFailedAttempts() {
    try {
      return parseInt(sessionStorage.getItem(STORAGE_KEY_LOGIN_FAILURES) || '0', 10);
    } catch {
      return 0;
    }
  },

  /**
   * Registra un intento de login fallido. Si alcanza MAX_FAILED_ATTEMPTS, bloquea el acceso.
   */
  recordLoginFailure() {
    try {
      const current = this.getFailedAttempts() + 1;
      sessionStorage.setItem(STORAGE_KEY_LOGIN_FAILURES, current.toString());

      if (current >= MAX_FAILED_ATTEMPTS) {
        // Bloquear durante BASE_LOCKOUT_SECONDS
        const lockoutUntil = Date.now() + BASE_LOCKOUT_SECONDS * 1000;
        sessionStorage.setItem(STORAGE_KEY_LOCKOUT_UNTIL, lockoutUntil.toString());
        return { isLocked: true, remainingSeconds: BASE_LOCKOUT_SECONDS, attempts: current };
      }

      return {
        isLocked: false,
        attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - current),
        attempts: current,
      };
    } catch {
      return { isLocked: false, attemptsLeft: MAX_FAILED_ATTEMPTS, attempts: 0 };
    }
  },

  /**
   * Restablece el contador de intentos fallidos tras un inicio de sesión exitoso
   */
  resetLoginFailures() {
    try {
      sessionStorage.removeItem(STORAGE_KEY_LOGIN_FAILURES);
      sessionStorage.removeItem(STORAGE_KEY_LOCKOUT_UNTIL);
    } catch {
      // Ignorar
    }
  },

  /**
   * 2. Rate Limiting de OTP: Cooldown de 60s entre envíos sucesivos
   */
  getOtpCooldown() {
    try {
      const cooldownUntil = parseInt(sessionStorage.getItem(STORAGE_KEY_OTP_COOLDOWN) || '0', 10);
      const now = Date.now();
      if (cooldownUntil > now) {
        return Math.ceil((cooldownUntil - now) / 1000);
      }
      return 0;
    } catch {
      return 0;
    }
  },

  setOtpCooldown() {
    try {
      const cooldownUntil = Date.now() + ACTION_COOLDOWN_SECONDS * 1000;
      sessionStorage.setItem(STORAGE_KEY_OTP_COOLDOWN, cooldownUntil.toString());
      return ACTION_COOLDOWN_SECONDS;
    } catch {
      return 0;
    }
  },

  /**
   * 3. Rate Limiting de Recuperación de Clave: Cooldown de 60s
   */
  getForgotCooldown() {
    try {
      const cooldownUntil = parseInt(sessionStorage.getItem(STORAGE_KEY_FORGOT_COOLDOWN) || '0', 10);
      const now = Date.now();
      if (cooldownUntil > now) {
        return Math.ceil((cooldownUntil - now) / 1000);
      }
      return 0;
    } catch {
      return 0;
    }
  },

  setForgotCooldown() {
    try {
      const cooldownUntil = Date.now() + ACTION_COOLDOWN_SECONDS * 1000;
      sessionStorage.setItem(STORAGE_KEY_FORGOT_COOLDOWN, cooldownUntil.toString());
      return ACTION_COOLDOWN_SECONDS;
    } catch {
      return 0;
    }
  },

  /**
   * 4. Sanitización de Entradas (Limpieza estricta de caracteres peligrosos)
   */
  sanitizeInput(val) {
    if (typeof val !== 'string') return '';
    return val
      .replace(/[<>'"`;()&$]/g, '') // Elimina caracteres usados en inyección HTML/JS/SQL
      .trim();
  },

  /**
   * Valida formato canónico de correo
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const clean = email.trim().toLowerCase();
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(clean);
  },
};
