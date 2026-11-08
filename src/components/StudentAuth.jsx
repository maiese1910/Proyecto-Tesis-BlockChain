import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Turnstile } from '@marsidev/react-turnstile';
import {
  Mail, Lock, KeyRound, User, CreditCard, BookOpen, ArrowRight,
  ShieldCheck, AlertCircle, Eye, EyeOff, Sparkles, CheckCircle2,
  RefreshCw, ChevronLeft, HelpCircle, Phone, Calendar
} from 'lucide-react';
import { authPasswordless, supabase } from '../services/supabaseClient';
import { dynamicDataAPI, profilesAPI } from '../services/api';
import { securityGuard } from '../services/securityGuard';

const syncUserRegistration = (profile) => {
  if (!profile) return;
  try {
    const list = JSON.parse(localStorage.getItem('usm_all_users') || '[]');
    const cleanCed = (profile.cedula || '').replace(/\D/g, '');
    if (!list.some(u => (u.cedula || '').replace(/\D/g, '') === cleanCed)) {
      list.push(profile);
      localStorage.setItem('usm_all_users', JSON.stringify(list));
    }
  } catch (_) {}

  try {
    profilesAPI.register({
      nombre: profile.nombre,
      cedula: profile.cedula,
      carrera: profile.carrera || 'Ingeniería en Sistemas',
      semestre: profile.semestre || '10mo'
    }).catch(() => {});
  } catch (_) {}

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const ch = new BroadcastChannel('usm_records_sync');
      ch.postMessage({ type: 'USER_REGISTERED', user: profile });
      ch.close();
    } catch (_) {}
  }
};

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

/**
 * Validador estricto de complejidad de contraseña:
 * - Mínimo 8 caracteres
 * - Al menos 1 letra mayúscula
 * - Al menos 1 letra minúscula
 * - Al menos 1 número
 * - Al menos 1 caracter especial
 */
export const checkPasswordRules = (pwd) => {
  const p = pwd || '';
  return {
    hasUpper: /[A-Z]/.test(p),
    hasLower: /[a-z]/.test(p),
    hasNumber: /[0-9]/.test(p),
    hasSpecial: /[^A-Za-z0-9]/.test(p),
    hasMinLength: p.length >= 8,
  };
};

export const isPasswordValid = (pwd) => {
  const r = checkPasswordRules(pwd);
  return r.hasUpper && r.hasLower && r.hasNumber && r.hasSpecial && r.hasMinLength;
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SISTEMA COMPLETO DE AUTENTICACIÓN ESTUDIANTIL USM
 * ═══════════════════════════════════════════════════════════════════════════
 * Vistas soportadas:
 * - 'login': Iniciar Sesión con Correo y Contraseña
 * - 'register': Registro Completo de Nuevos Graduandos con Cédula Inmutable
 * - 'forgot': Recuperación de Contraseña ("Olvidé mi clave")
 * - 'otp_email' / 'otp_code': Acceso Passwordless con Código OTP de 6 dígitos
 * - 'onboarding': Registro de Cédula Inmutable para usuarios nuevos vía OTP
 */
const StudentAuth = ({ onLogin, onSwitchToDemo, embedded = false }) => {
  const [view, setView] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (hash.includes('type=recovery') || search.includes('action=reset-password')) {
        return 'reset_password';
      }
    }
    return 'login';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Estados de Formulario de Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Estados de Formulario de Registro (con Teléfono, Fecha de Nacimiento, Carrera y Semestre)
  const [regForm, setRegForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nombre: '',
    cedula_tipo: 'V',
    cedula_numero: '',
    telefono: '',
    fecha_nacimiento: '',
    carrera: 'Ingeniería en Sistemas',
    semestre: '10mo',
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Estados de Formulario Olvidé Clave (Cédula + Correo)
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCedulaTipo, setForgotCedulaTipo] = useState('V');
  const [forgotCedulaNum, setForgotCedulaNum] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotRecoveryCode, setForgotRecoveryCode] = useState('');

  // Estados de Restablecimiento de Nueva Contraseña (Recovery)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Estados de Formulario OTP (Cédula + Correo)
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCedulaTipo, setOtpCedulaTipo] = useState('V');
  const [otpCedulaNum, setOtpCedulaNum] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [otpUser, setOtpUser] = useState(null);

  // Alerta especial de "Usuario no registrado -> Sugerir registro"
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);

  // Estados de Ciberseguridad (Rate Limiting y Prevención de Fuerza Bruta)
  const [lockoutSeconds, setLockoutSeconds] = useState(securityGuard.getLoginLockoutStatus().remainingSeconds);
  const [otpCooldown, setOtpCooldown] = useState(securityGuard.getOtpCooldown());
  const [forgotCooldown, setForgotCooldown] = useState(securityGuard.getForgotCooldown());

  // Reloj de cuenta regresiva para Rate Limiting y Cooldowns
  useEffect(() => {
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      setForgotCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Carreras Universitarias Dinámicas
  const [carreras, setCarreras] = useState([
    'Ingeniería en Sistemas',
    'Ingeniería Civil',
    'Ingeniería Industrial',
    'Ingeniería Eléctrica',
    'Ingeniería Mecánica',
    'Arquitectura',
  ]);

  // Detectar enlace de restablecimiento de contraseña en URL o evento Supabase
  useEffect(() => {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (hash.includes('type=recovery') || search.includes('action=reset-password')) {
      setView('reset_password');
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('reset_password');
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    dynamicDataAPI.getCarreras()
      .then(res => { if (res.carreras) setCarreras(res.carreras); })
      .catch(() => {});
  }, []);

  const formatCedulaInput = (val) => {
    const raw = (val || '').replace(/\D/g, '');
    return raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const clearFeedback = () => {
    setError(null);
    setSuccessMsg(null);
    setShowRegisterPrompt(false);
    setForgotSent(false);
  };

  // 1. INICIAR SESIÓN CON CORREO Y CONTRASEÑA
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (lockoutSeconds > 0) {
      setError(`Acceso bloqueado por múltiples intentos fallidos. Por seguridad, espera ${lockoutSeconds} segundos.`);
      return;
    }
    const cleanEmail = (loginEmail || '').trim().toLowerCase();
    const cleanPassword = (loginPassword || '').trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Por favor ingresa tu correo y contraseña.');
      return;
    }
    clearFeedback();
    setLoading(true);

    try {
      const res = await authPasswordless.signInWithPassword(cleanEmail, cleanPassword);
      if (res.success && res.profile) {
        securityGuard.resetLoginFailures();
        localStorage.setItem('usm_user', JSON.stringify(res.profile));
        sessionStorage.setItem('usm_user', JSON.stringify(res.profile));
        onLogin(res.profile);
      } else {
        setError('No se pudo verificar la sesión. Intenta de nuevo.');
      }
    } catch (err) {
      if (err.code === 'USER_NOT_REGISTERED' || err.message?.includes('no se encuentra registrado')) {
        setError('El usuario no se encuentra registrado en el sistema. Debes registrarte primero.');
        setShowRegisterPrompt(true);
      } else {
        // Registrar intento fallido de contraseña y calcular bloqueo
        const failureStatus = securityGuard.recordLoginFailure();
        if (failureStatus.isLocked) {
          setLockoutSeconds(failureStatus.remainingSeconds);
          setError(`Demasiados intentos fallidos (5/5). El acceso ha sido bloqueado temporalmente por 60 segundos para mitigar ataques de fuerza bruta.`);
        } else {
          setError(`${err.message} (Intentos restantes antes de bloqueo: ${failureStatus.attemptsLeft})`);
        }
        setShowRegisterPrompt(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // Componente visual de requisitos de seguridad de contraseña
  const renderPasswordRulesIndicator = (pwd, confirmPwd = null) => {
    const rules = checkPasswordRules(pwd);
    return (
      <div style={{
        marginTop: '0.4rem',
        padding: '0.65rem 0.85rem',
        backgroundColor: 'var(--color-fog-white)',
        borderRadius: 'var(--radius-inputs)',
        border: '1px solid var(--border)',
        fontSize: '0.74rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem'
      }}>
        <span style={{ fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.15rem' }}>
          Requisitos mínimos de la contraseña:
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.25rem' }}>
          <span style={{ color: rules.hasMinLength ? '#16a34a' : '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {rules.hasMinLength ? <CheckCircle2 size={13} color="#16a34a" /> : <span style={{ width: 12, height: 12, borderRadius: '50%', border: '1.5px solid #94a3b8', display: 'inline-block' }} />}
            Mínimo 8 caracteres
          </span>
          <span style={{ color: rules.hasUpper ? '#16a34a' : '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {rules.hasUpper ? <CheckCircle2 size={13} color="#16a34a" /> : <span style={{ width: 12, height: 12, borderRadius: '50%', border: '1.5px solid #94a3b8', display: 'inline-block' }} />}
            1 Letra Mayúscula (A-Z)
          </span>
          <span style={{ color: rules.hasLower ? '#16a34a' : '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {rules.hasLower ? <CheckCircle2 size={13} color="#16a34a" /> : <span style={{ width: 12, height: 12, borderRadius: '50%', border: '1.5px solid #94a3b8', display: 'inline-block' }} />}
            1 Letra Minúscula (a-z)
          </span>
          <span style={{ color: rules.hasNumber ? '#16a34a' : '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {rules.hasNumber ? <CheckCircle2 size={13} color="#16a34a" /> : <span style={{ width: 12, height: 12, borderRadius: '50%', border: '1.5px solid #94a3b8', display: 'inline-block' }} />}
            1 Número (0-9)
          </span>
          <span style={{ color: rules.hasSpecial ? '#16a34a' : '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {rules.hasSpecial ? <CheckCircle2 size={13} color="#16a34a" /> : <span style={{ width: 12, height: 12, borderRadius: '50%', border: '1.5px solid #94a3b8', display: 'inline-block' }} />}
            1 Carácter especial (!@#$...)
          </span>
          {confirmPwd !== null && (
            <span style={{ color: (confirmPwd && confirmPwd === pwd) ? '#16a34a' : '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {(confirmPwd && confirmPwd === pwd) ? <CheckCircle2 size={13} color="#16a34a" /> : <span style={{ width: 12, height: 12, borderRadius: '50%', border: '1.5px solid #94a3b8', display: 'inline-block' }} />}
              Las contraseñas coinciden
            </span>
          )}
        </div>
      </div>
    );
  };

  // 2. REGISTRARSE (NUEVO GRADUANDO CON CÉDULA INMUTABLE, TELÉFONO Y FECHA DE NACIMIENTO)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const cleanNombre = regForm.nombre.trim();
    const rawCedula = regForm.cedula_numero.replace(/\D/g, '');

    if (!cleanNombre || cleanNombre.split(' ').length < 2) {
      setError('Ingresa tu nombre y apellido completo (según documento de identidad).');
      return;
    }
    if (rawCedula.length < 6 || rawCedula.length > 9) {
      setError('El número de cédula no es válido (entre 6 y 9 dígitos).');
      return;
    }
    if (!regForm.email || !regForm.email.includes('@')) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    if (!regForm.telefono || regForm.telefono.replace(/\D/g, '').length < 10) {
      setError('Ingresa un número de teléfono válido (ej: 0414-1234567).');
      return;
    }
    if (!regForm.fecha_nacimiento) {
      setError('Por favor indica tu fecha de nacimiento.');
      return;
    }
    if (!isPasswordValid(regForm.password)) {
      setError('La contraseña debe tener al menos 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial.');
      return;
    }
    if (regForm.password !== regForm.confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    clearFeedback();
    setLoading(true);

    try {
      const res = await authPasswordless.signUpWithPassword({
        email: regForm.email,
        password: regForm.password,
        nombre: cleanNombre,
        cedula_tipo: regForm.cedula_tipo,
        cedula_numero: rawCedula,
        telefono: regForm.telefono,
        fecha_nacimiento: regForm.fecha_nacimiento,
        carrera: regForm.carrera || 'Ingeniería en Sistemas',
        semestre: regForm.semestre || '10mo',
      });

      if (res.success && res.profile) {
        syncUserRegistration(res.profile);
        localStorage.setItem('usm_user', JSON.stringify(res.profile));
        onLogin(res.profile);
      } else {
        setError('Error al registrar la cuenta.');
      }
    } catch (err) {
      setError(err.message || 'Error registrando cuenta de graduando.');
    } finally {
      setLoading(false);
    }
  };

  // 3. RECUPERAR CONTRASEÑA (OLVIDÉ MI CLAVE - REQUIERE CÉDULA Y CORREO)
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (forgotCooldown > 0) {
      setError(`Por favor espera ${forgotCooldown} segundos antes de solicitar otro enlace o código.`);
      return;
    }
    const cleanEmail = (forgotEmail || '').trim().toLowerCase();
    const rawCedula = forgotCedulaNum.replace(/\D/g, '');
    const fullCedula = `${forgotCedulaTipo}-${formatCedulaInput(rawCedula)}`;

    if (rawCedula.length < 6 || rawCedula.length > 9) {
      setError('Por favor ingresa un número de cédula válido (entre 6 y 9 dígitos).');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Ingresa una dirección de correo válida.');
      return;
    }
    clearFeedback();
    setLoading(true);

    try {
      // 1. Validar si el usuario existe y si cédula y correo coinciden exactamente
      const verifyRes = await authPasswordless.verifyCedulaEmail(cleanEmail, fullCedula);
      if (verifyRes.status === 'not_found') {
        setError(verifyRes.message || 'El usuario no se encuentra registrado en el sistema. Debes crear tu cuenta primero.');
        setShowRegisterPrompt(true);
        return;
      }
      if (verifyRes.status === 'mismatch') {
        setError(verifyRes.message || 'Los datos no coinciden. La Cédula no corresponde al correo electrónico.');
        return;
      }

      // 2. Coincidencia confirmada: enviar enlace y código de recuperación
      const res = await authPasswordless.resetPassword(cleanEmail);
      setSuccessMsg(res.message);
      setForgotCooldown(securityGuard.setForgotCooldown());
      setForgotSent(true);
    } catch (err) {
      setError(err.message || 'Error al procesar la recuperación de contraseña.');
    } finally {
      setLoading(false);
    }
  };

  // 3.1. RESTABLECER CON CÓDIGO DE 6 DÍGITOS DIRECTAMENTE
  const handleRecoveryWithCodeSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = (forgotEmail || '').trim().toLowerCase();
    const cleanCode = (forgotRecoveryCode || '').trim();

    if (!cleanCode || cleanCode.length < 6) {
      setError('Por favor ingresa el código de 6 dígitos recibido.');
      return;
    }
    if (!isPasswordValid(newPassword)) {
      setError('La nueva contraseña debe tener mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }
    clearFeedback();
    setLoading(true);

    try {
      // Verificar OTP de recuperación
      await authPasswordless.verifyRecoveryCode(cleanEmail, cleanCode);
      // Actualizar a la nueva contraseña en Backend, LocalStorage y Supabase
      const res = await authPasswordless.updatePassword(newPassword, cleanEmail);
      setSuccessMsg('¡Contraseña actualizada con éxito! Ingresando a tu expediente...');

      let profile = res?.profile || await authPasswordless.findRegisteredProfile(cleanEmail);
      if (!profile) {
        const { data: { user } } = await supabase.auth.getUser();
        profile = user ? await authPasswordless.getProfile(user.id, cleanEmail) : null;
      }

      if (profile) {
        localStorage.setItem('usm_user', JSON.stringify(profile));
        sessionStorage.setItem('usm_user', JSON.stringify(profile));
        setTimeout(() => onLogin(profile), 1200);
      } else {
        setTimeout(() => setView('login'), 1500);
      }
    } catch (err) {
      setError(err.message || 'Código de recuperación inválido o expirado.');
    } finally {
      setLoading(false);
    }
  };

  // 3.1. GUARDAR NUEVA CONTRASEÑA TRAS RECUPERACIÓN (RECOVERY)
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!isPasswordValid(newPassword)) {
      setError('La nueva contraseña debe tener mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }
    clearFeedback();
    setLoading(true);

    try {
      const cleanEmail = (forgotEmail || loginEmail || '').trim().toLowerCase();
      const res = await authPasswordless.updatePassword(newPassword, cleanEmail);
      setSuccessMsg('¡Contraseña actualizada con éxito! Ingresando a tu expediente...');

      // Limpiar el hash de la URL
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }

      // Obtener el perfil activo
      let profile = res?.profile || (cleanEmail ? await authPasswordless.findRegisteredProfile(cleanEmail) : null);
      if (!profile) {
        const { data: { user } } = await supabase.auth.getUser();
        profile = user ? await authPasswordless.getProfile(user.id, cleanEmail) : null;
      }

      if (profile) {
        localStorage.setItem('usm_user', JSON.stringify(profile));
        sessionStorage.setItem('usm_user', JSON.stringify(profile));
        setTimeout(() => onLogin(profile), 1200);
      } else {
        setTimeout(() => setView('login'), 1500);
      }
    } catch (err) {
      setError(err.message || 'Error al actualizar contraseña.');
    } finally {
      setLoading(false);
    }
  };

  // 4. SOLICITAR CÓDIGO OTP (REQUIERE CÉDULA Y CORREO REGISTRADO)
  const handleSendOtpSubmit = async (e) => {
    e.preventDefault();
    if (otpCooldown > 0) {
      setError(`Por favor espera ${otpCooldown} segundos antes de solicitar otro código de seguridad.`);
      return;
    }
    const cleanEmail = (otpEmail || '').trim().toLowerCase();
    const rawCedula = otpCedulaNum.replace(/\D/g, '');
    const fullCedula = `${otpCedulaTipo}-${formatCedulaInput(rawCedula)}`;

    if (rawCedula.length < 6 || rawCedula.length > 9) {
      setError('Por favor ingresa un número de cédula válido (entre 6 y 9 dígitos).');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Ingresa tu correo para recibir el código.');
      return;
    }
    clearFeedback();
    setLoading(true);

    try {
      // 1. Validar si el usuario existe y si cédula y correo coinciden exactamente
      const verifyRes = await authPasswordless.verifyCedulaEmail(cleanEmail, fullCedula);
      if (verifyRes.status === 'not_found') {
        setError(verifyRes.message || 'El usuario no se encuentra registrado en el sistema. Debes registrarte primero.');
        setShowRegisterPrompt(true);
        return;
      }
      if (verifyRes.status === 'mismatch') {
        setError(verifyRes.message || 'Los datos no coinciden. La Cédula de Identidad no corresponde al correo electrónico ingresado.');
        return;
      }

      // 2. Coincidencia confirmada: enviar código OTP seguro
      const res = await authPasswordless.sendEmailOtp(cleanEmail, turnstileToken);
      setSuccessMsg(res.message);
      setOtpCooldown(securityGuard.setOtpCooldown());
      setView('otp_code');
    } catch (err) {
      setError(err.message || 'Error enviando código de seguridad.');
    } finally {
      setLoading(false);
    }
  };

  // 5. VERIFICAR CÓDIGO OTP
  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    if (otpCode.length < 6) {
      setError('El código debe contener 6 dígitos.');
      return;
    }
    clearFeedback();
    setLoading(true);

    try {
      const res = await authPasswordless.verifyEmailOtp(otpEmail, otpCode);
      if (res.success && res.user) {
        setOtpUser(res.user);

        // Consultar si ya tiene cédula legal registrada (Backend / LocalStorage / Supabase)
        const profile = await authPasswordless.getProfile(res.user.id, otpEmail);
        if (profile && profile.is_profile_complete && profile.cedula) {
          localStorage.setItem('usm_user', JSON.stringify(profile));
          sessionStorage.setItem('usm_user', JSON.stringify(profile));
          onLogin(profile);
        } else {
          // Ir a Onboarding Progresivo
          setRegForm(prev => ({
            ...prev,
            email: otpEmail,
            nombre: profile?.nombre || res.user.user_metadata?.nombre || '',
          }));
          setView('onboarding');
        }
      } else {
        setError('Código inválido o expirado.');
      }
    } catch (err) {
      setError(err.message || 'Error validando código de seguridad.');
    } finally {
      setLoading(false);
    }
  };

  // 6. COMPLETAR ONBOARDING PROGRESIVO DE CÉDULA INMUTABLE
  const handleCompleteOnboarding = async (e) => {
    e.preventDefault();
    const cleanNombre = regForm.nombre.trim();
    const rawCedula = regForm.cedula_numero.replace(/\D/g, '');

    if (!cleanNombre || cleanNombre.split(' ').length < 2) {
      setError('Ingresa tu nombre y apellido completo.');
      return;
    }
    if (rawCedula.length < 6 || rawCedula.length > 9) {
      setError('Ingresa un número de cédula válido.');
      return;
    }
    if (!regForm.telefono || regForm.telefono.replace(/\D/g, '').length < 10) {
      setError('Ingresa un número de teléfono válido (ej: 0414-1234567).');
      return;
    }
    if (!regForm.fecha_nacimiento) {
      setError('Por favor indica tu fecha de nacimiento.');
      return;
    }

    clearFeedback();
    setLoading(true);

    try {
      const res = await authPasswordless.completeLegalProfile(otpUser?.id || 'local-user', {
        email: otpEmail || otpUser?.email,
        nombre: cleanNombre,
        cedula_tipo: regForm.cedula_tipo,
        cedula_numero: rawCedula,
        telefono: regForm.telefono,
        fecha_nacimiento: regForm.fecha_nacimiento,
        carrera: regForm.carrera || 'Ingeniería en Sistemas',
        semestre: regForm.semestre || '10mo',
      });

      if (res.success && res.profile) {
        syncUserRegistration(res.profile);
        localStorage.setItem('usm_user', JSON.stringify(res.profile));
        onLogin(res.profile);
      } else {
        setError('No se pudo guardar el perfil legal.');
      }
    } catch (err) {
      setError(err.message || 'Error al guardar los datos del graduando.');
    } finally {
      setLoading(false);
    }
  };

  // RENDER PRINCIPAL DE LA TARJETA
  return (
    <div style={{ width: '100%' }}>
      {/* Mensajes de Alerta / Éxito */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '0.8rem 1rem', borderRadius: 'var(--radius-inputs)',
            backgroundColor: 'rgba(185, 28, 28, 0.08)', border: '1px solid rgba(185, 28, 28, 0.25)',
            color: '#b91c1c', fontSize: '0.84rem', marginBottom: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
          {showRegisterPrompt && (
            <div style={{ marginTop: '0.6rem', borderTop: '1px dashed rgba(185, 28, 28, 0.3)', paddingTop: '0.5rem', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => { clearFeedback(); setView('register'); }}
                style={{
                  background: 'none', border: 'none', color: 'var(--color-ink-black)',
                  fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline'
                }}
              >
                ¿Deseas crear tu cuenta ahora? Regístrate aquí →
              </button>
            </div>
          )}
        </motion.div>
      )}

      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            padding: '0.8rem 1rem', borderRadius: 'var(--radius-inputs)',
            backgroundColor: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.25)',
            color: '#0284c7', fontSize: '0.84rem', marginBottom: '1.25rem'
          }}
        >
          <Sparkles size={16} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {/* ════════════════════════════════════════════════════════════════════
            VISTA 1: INICIAR SESIÓN CON CLAVE (PREDETERMINADA)
           ════════════════════════════════════════════════════════════════════ */}
        {view === 'login' && (
          <motion.div
            key="login-view"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}
          >
            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 400, color: 'var(--color-ink-black)', margin: 0 }}>
                Acceso para Graduandos
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                Ingresa con tu correo institucional y contraseña oficial.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* Campo Correo */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.35rem' }}>
                  Correo Electrónico
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem'
                }}>
                  <Mail size={16} color="var(--color-slate-gray)" />
                  <input
                    type="email"
                    required
                    placeholder="correo@usm.edu.ve o personal"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="chat-input"
                    style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0' }}
                  />
                </div>
              </div>

              {/* Campo Contraseña */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-ink-black)' }}>
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => { clearFeedback(); setView('forgot'); }}
                    style={{ background: 'none', border: 'none', color: 'var(--color-sienna-brown)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem'
                }}>
                  <Lock size={16} color="var(--color-slate-gray)" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Tu contraseña secreta"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="chat-input"
                    style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-slate-gray)' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Botón de Entrada */}
              <button
                type="submit"
                disabled={loading || lockoutSeconds > 0}
                className="send-btn"
                style={{
                  padding: '0.88rem 1.4rem', marginTop: '0.3rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '0.6rem', fontSize: '0.94rem', fontWeight: 600,
                  opacity: lockoutSeconds > 0 ? 0.6 : 1,
                  cursor: lockoutSeconds > 0 ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? (
                  <RefreshCw className="animate-spin" size={17} />
                ) : lockoutSeconds > 0 ? (
                  <>Bloqueado por seguridad ({lockoutSeconds}s)</>
                ) : (
                  <>Iniciar Sesión <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            {/* Alternativas de Acceso */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.83rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>¿No tienes una cuenta aún?</span>
                <button
                  type="button"
                  onClick={() => { clearFeedback(); setView('register'); }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-ink-black)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Regístrate aquí
                </button>
              </div>

              {/* Acceso Passwordless con OTP */}
              <button
                type="button"
                onClick={() => { clearFeedback(); setView('otp_email'); }}
                style={{
                  padding: '0.65rem 0.9rem',
                  borderRadius: 'var(--radius-inputs)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--color-fog-white)',
                  color: 'var(--color-ink-black)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                }}
              >
                <KeyRound size={15} color="var(--color-sienna-brown)" />
                Acceder sin contraseña mediante código OTP
              </button>

              {/* Botón Demo para Defensa de Grado */}
              {onSwitchToDemo && (
                <button
                  type="button"
                  onClick={onSwitchToDemo}
                  className="btn-ghost"
                  style={{
                    padding: '0.55rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    border: '1px dashed var(--border)',
                    width: '100%',
                    justifyContent: 'center',
                  }}
                  title="Acceso directo de 1 clic para la evaluación del jurado de tesis"
                >
                  ⚡ Acceso Rápido Modo Jurado (Defensa de Grado)
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            VISTA 2: REGISTRO DE NUEVO GRADUANDO CON CÉDULA INMUTABLE
           ════════════════════════════════════════════════════════════════════ */}
        {view === 'register' && (
          <motion.div
            key="register-view"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => { clearFeedback(); setView('login'); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-slate-gray)', padding: 0 }}
                >
                  <ChevronLeft size={18} />
                </button>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 400, color: 'var(--color-ink-black)', margin: 0 }}>
                  Crear Cuenta de Graduando
                </h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                Tu Cédula de Identidad quedará vinculada de forma inmutable a tus trámites de apostilla y títulos en Blockchain.
              </p>
            </div>

            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Nombre Completo */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                  Nombre Completo Oficial
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem'
                }}>
                  <User size={16} color="var(--color-slate-gray)" />
                  <input
                    required
                    placeholder="Ej: Juan Alberto Pérez Rodríguez"
                    value={regForm.nombre}
                    onChange={(e) => setRegForm(p => ({ ...p, nombre: e.target.value }))}
                    className="chat-input"
                    style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0' }}
                  />
                </div>
              </div>

              {/* Cédula con Toggle V/E */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                  Cédula de Identidad (Legal e Inmutable)
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {['V', 'E'].map(tipo => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setRegForm(p => ({ ...p, cedula_tipo: tipo }))}
                      style={{
                        padding: '0.7rem 0.85rem',
                        borderRadius: 'var(--radius-inputs)',
                        border: '1px solid',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        borderColor: regForm.cedula_tipo === tipo ? 'var(--color-ink-black)' : 'var(--border)',
                        backgroundColor: regForm.cedula_tipo === tipo ? 'var(--color-ink-black)' : '#ffffff',
                        color: regForm.cedula_tipo === tipo ? '#ffffff' : 'var(--text-secondary)',
                      }}
                    >
                      {tipo}
                    </button>
                  ))}

                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem',
                    backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem'
                  }}>
                    <CreditCard size={16} color="var(--color-slate-gray)" />
                    <input
                      required
                      inputMode="numeric"
                      placeholder="28.315.101"
                      value={regForm.cedula_numero}
                      onChange={(e) => setRegForm(p => ({ ...p, cedula_numero: formatCedulaInput(e.target.value) }))}
                      className="chat-input"
                      style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0' }}
                    />
                  </div>
                </div>
              </div>

              {/* Correo Electrónico */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                  Correo Electrónico
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem'
                }}>
                  <Mail size={16} color="var(--color-slate-gray)" />
                  <input
                    type="email"
                    required
                    placeholder="correo@usm.edu.ve o personal"
                    value={regForm.email}
                    onChange={(e) => setRegForm(p => ({ ...p, email: e.target.value }))}
                    className="chat-input"
                    style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0' }}
                  />
                </div>
              </div>

              {/* Teléfono y Fecha de Nacimiento en 2 columnas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                    Teléfono de Contacto
                  </label>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.65rem',
                    backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inputs)', padding: '0.2rem 0.8rem'
                  }}>
                    <Phone size={15} color="var(--color-slate-gray)" />
                    <input
                      type="tel"
                      required
                      placeholder="0414-1234567"
                      value={regForm.telefono}
                      onChange={(e) => setRegForm(p => ({ ...p, telefono: e.target.value }))}
                      className="chat-input"
                      style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                    Fecha de Nacimiento
                  </label>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.65rem',
                    backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inputs)', padding: '0.2rem 0.8rem'
                  }}>
                    <Calendar size={15} color="var(--color-slate-gray)" />
                    <input
                      type="date"
                      required
                      value={regForm.fecha_nacimiento}
                      onChange={(e) => setRegForm(p => ({ ...p, fecha_nacimiento: e.target.value }))}
                      className="chat-input"
                      style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Carrera Universitaria y Semestre / Nivel Académico en 2 columnas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                    Carrera Universitaria
                  </label>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.65rem',
                    backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inputs)', padding: '0.2rem 0.8rem'
                  }}>
                    <BookOpen size={15} color="var(--color-slate-gray)" />
                    <select
                      value={regForm.carrera}
                      onChange={(e) => setRegForm(p => ({ ...p, carrera: e.target.value }))}
                      className="chat-input"
                      style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0', fontSize: '0.88rem', cursor: 'pointer' }}
                    >
                      {carreras.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                    Nivel Académico
                  </label>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.65rem',
                    backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inputs)', padding: '0.2rem 0.8rem'
                  }}>
                    <ShieldCheck size={15} color="var(--color-slate-gray)" />
                    <select
                      value={regForm.semestre}
                      onChange={(e) => setRegForm(p => ({ ...p, semestre: e.target.value }))}
                      className="chat-input"
                      style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0', fontSize: '0.88rem', cursor: 'pointer' }}
                    >
                      <option value="10mo">10mo Semestre (Graduando)</option>
                      <option value="Egresado">Egresado / Titulado</option>
                      <option value="9no">9no Semestre (Pre-Grado)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contraseña y Repetir Contraseña en 2 columnas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                    Contraseña
                  </label>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.65rem',
                    backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inputs)', padding: '0.2rem 0.8rem'
                  }}>
                    <Lock size={15} color="var(--color-slate-gray)" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      placeholder="Mínimo 8 caracteres"
                      value={regForm.password}
                      onChange={(e) => setRegForm(p => ({ ...p, password: e.target.value }))}
                      className="chat-input"
                      style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0', fontSize: '0.88rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-slate-gray)', padding: 0 }}
                    >
                      {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                    Repetir Contraseña
                  </label>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.65rem',
                    backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inputs)', padding: '0.2rem 0.8rem'
                  }}>
                    <Lock size={15} color="var(--color-slate-gray)" />
                    <input
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Repite la contraseña"
                      value={regForm.confirmPassword}
                      onChange={(e) => setRegForm(p => ({ ...p, confirmPassword: e.target.value }))}
                      className="chat-input"
                      style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0', fontSize: '0.88rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-slate-gray)', padding: 0 }}
                    >
                      {showRegConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Indicador en tiempo real de reglas de seguridad */}
              {renderPasswordRulesIndicator(regForm.password, regForm.confirmPassword)}

              <button
                type="submit"
                disabled={loading}
                className="send-btn"
                style={{
                  padding: '0.88rem 1.4rem', marginTop: '0.4rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '0.6rem', fontSize: '0.94rem', fontWeight: 600
                }}
              >
                {loading ? <RefreshCw className="animate-spin" size={17} /> : 'Crear Perfil e Ingresar'}
              </button>
            </form>

            <div style={{ textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.9rem' }}>
              <button
                type="button"
                onClick={() => { clearFeedback(); setView('login'); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.83rem', cursor: 'pointer' }}
              >
                ¿Ya tienes cuenta registrada? <strong style={{ color: 'var(--color-ink-black)', textDecoration: 'underline' }}>Inicia sesión aquí</strong>
              </button>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            VISTA 3: RECUPERAR CONTRASEÑA ("OLVIDÉ MI CLAVE")
           ════════════════════════════════════════════════════════════════════ */}
        {view === 'forgot' && (
          <motion.div
            key="forgot-view"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => { clearFeedback(); setView('login'); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-slate-gray)', padding: 0 }}
                >
                  <ChevronLeft size={18} />
                </button>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 400, color: 'var(--color-ink-black)', margin: 0 }}>
                  Recuperar Contraseña
                </h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                {forgotSent
                  ? 'Hemos enviado las instrucciones. Puedes hacer clic en el enlace de tu correo o ingresar el código de 6 dígitos aquí mismo:'
                  : 'Ingresa tu cédula y correo registrado para recibir el enlace y código de restablecimiento.'}
              </p>
            </div>

            {forgotSent ? (
              <form onSubmit={handleRecoveryWithCodeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Código de Recuperación (6 Dígitos) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                    Código de Recuperación (6 Dígitos)
                  </label>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem'
                  }}>
                    <KeyRound size={16} color="var(--color-slate-gray)" />
                    <input
                      required
                      maxLength={6}
                      inputMode="numeric"
                      placeholder="Ej: 761686"
                      value={forgotRecoveryCode}
                      onChange={(e) => setForgotRecoveryCode(e.target.value.replace(/\D/g, ''))}
                      className="chat-input"
                      style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0', letterSpacing: '2px', fontWeight: 700 }}
                    />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Revisa la bandeja en <a href="http://localhost:54324" target="_blank" rel="noreferrer" style={{ color: 'var(--color-usm-blue)', textDecoration: 'underline' }}>Mailpit (localhost:54324)</a>
                  </p>
                </div>

                {/* Nueva Contraseña */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                    Nueva Contraseña
                  </label>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem'
                  }}>
                    <Lock size={16} color="var(--color-slate-gray)" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      placeholder="Mínimo 8 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="chat-input"
                      style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-slate-gray)' }}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirmar Nueva Contraseña */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                    Confirmar Nueva Contraseña
                  </label>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem'
                  }}>
                    <Lock size={16} color="var(--color-slate-gray)" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      placeholder="Repite la contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="chat-input"
                      style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0' }}
                    />
                  </div>
                </div>

                {/* Indicador de Reglas de Contraseña */}
                {renderPasswordRulesIndicator(newPassword, confirmPassword)}

                <button
                  type="submit"
                  disabled={loading}
                  className="send-btn"
                  style={{
                    padding: '0.88rem 1.4rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '0.6rem', fontSize: '0.94rem', fontWeight: 600, marginTop: '0.3rem'
                  }}
                >
                  {loading ? <RefreshCw className="animate-spin" size={17} /> : 'Guardar Nueva Contraseña e Ingresar'}
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.82rem' }}>
                  <button
                    type="button"
                    onClick={() => setForgotSent(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-usm-blue)', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    ← Modificar correo / cédula
                  </button>
                  <button
                    type="button"
                    onClick={handleForgotSubmit}
                    disabled={loading}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    Reenviar código
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                {/* Cédula de Identidad con Toggle V/E */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                    Cédula de Identidad Registrada
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {['V', 'E'].map(tipo => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setForgotCedulaTipo(tipo)}
                        style={{
                          padding: '0.7rem 0.85rem',
                          borderRadius: 'var(--radius-inputs)',
                          border: '1px solid',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.88rem',
                          borderColor: forgotCedulaTipo === tipo ? 'var(--color-ink-black)' : 'var(--border)',
                          backgroundColor: forgotCedulaTipo === tipo ? 'var(--color-ink-black)' : '#ffffff',
                          color: forgotCedulaTipo === tipo ? '#ffffff' : 'var(--text-secondary)',
                        }}
                      >
                        {tipo}
                      </button>
                    ))}

                    <div style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem',
                      backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem'
                    }}>
                      <CreditCard size={16} color="var(--color-slate-gray)" />
                      <input
                        required
                        inputMode="numeric"
                        placeholder="28.315.101"
                        value={forgotCedulaNum}
                        onChange={(e) => setForgotCedulaNum(formatCedulaInput(e.target.value))}
                        className="chat-input"
                        style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Correo Electrónico Registrado */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                    Correo Electrónico Vinculado
                  </label>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem'
                  }}>
                    <Mail size={16} color="var(--color-slate-gray)" />
                    <input
                      type="email"
                      required
                      placeholder="correo@usm.edu.ve o personal"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="chat-input"
                      style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || forgotCooldown > 0}
                  className="send-btn"
                  style={{
                    padding: '0.88rem 1.4rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '0.6rem', fontSize: '0.94rem', fontWeight: 600,
                    opacity: forgotCooldown > 0 ? 0.6 : 1,
                    cursor: forgotCooldown > 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? (
                    <RefreshCw className="animate-spin" size={17} />
                  ) : forgotCooldown > 0 ? (
                    `Reenviar enlace en (${forgotCooldown}s)`
                  ) : (
                    'Enviar Código y Enlace de Recuperación'
                  )}
                </button>

                <div style={{ textAlign: 'center', marginTop: '0.2rem' }}>
                  <button
                    type="button"
                    onClick={() => setForgotSent(true)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-usm-blue)', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    ¿Ya tienes tu código de 6 dígitos? Ingresar código aquí →
                  </button>
                </div>
              </form>
            )}

            <div style={{ textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.9rem' }}>
              <button
                type="button"
                onClick={() => { clearFeedback(); setView('login'); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.83rem', cursor: 'pointer' }}
              >
                ← Volver al inicio de sesión
              </button>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            VISTA 3.1: ESTABLECER NUEVA CONTRASEÑA TRAS ENLACE DE RECUPERACIÓN
           ════════════════════════════════════════════════════════════════════ */}
        {view === 'reset_password' && (
          <motion.div
            key="reset-password-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  backgroundColor: 'var(--color-blush-peach)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-sienna-brown)'
                }}>
                  <KeyRound size={17} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 400, color: 'var(--color-ink-black)', margin: 0 }}>
                  Establecer Nueva Contraseña
                </h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                Ingresa tu nueva clave de acceso para tu expediente académico USM.
              </p>
            </div>

            <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                  Nueva Contraseña
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem'
                }}>
                  <Lock size={16} color="var(--color-slate-gray)" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="chat-input"
                    style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-slate-gray)' }}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                  Confirmar Nueva Contraseña
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem'
                }}>
                  <Lock size={16} color="var(--color-slate-gray)" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Repite la contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="chat-input"
                    style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0' }}
                  />
                </div>
              </div>

              {/* Indicador en tiempo real de reglas de seguridad */}
              {renderPasswordRulesIndicator(newPassword, confirmPassword)}

              <button
                type="submit"
                disabled={loading}
                className="send-btn"
                style={{
                  padding: '0.88rem 1.4rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '0.6rem', fontSize: '0.94rem', fontWeight: 600, marginTop: '0.3rem'
                }}
              >
                {loading ? <RefreshCw className="animate-spin" size={17} /> : 'Guardar Nueva Contraseña e Ingresar'}
              </button>
            </form>

            <div style={{ textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.9rem' }}>
              <button
                type="button"
                onClick={() => { clearFeedback(); setView('login'); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.83rem', cursor: 'pointer' }}
              >
                ← Cancelar y volver al inicio
              </button>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            VISTA 4: ACCESO PASSWORDLESS CON OTP (SOLICITUD DE CORREO)
           ════════════════════════════════════════════════════════════════════ */}
        {view === 'otp_email' && (
          <motion.div
            key="otp-email-view"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => { clearFeedback(); setView('login'); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-slate-gray)', padding: 0 }}
                >
                  <ChevronLeft size={18} />
                </button>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 400, color: 'var(--color-ink-black)', margin: 0 }}>
                  Acceso Passwordless (OTP)
                </h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                Accede de forma moderna sin contraseñas. Te enviaremos un código de seguridad de 6 dígitos.
              </p>
            </div>

            <form onSubmit={handleSendOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* Cédula de Identidad con Toggle V/E */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                  Cédula de Identidad Registrada
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {['V', 'E'].map(tipo => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setOtpCedulaTipo(tipo)}
                      style={{
                        padding: '0.7rem 0.85rem',
                        borderRadius: 'var(--radius-inputs)',
                        border: '1px solid',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        borderColor: otpCedulaTipo === tipo ? 'var(--color-ink-black)' : 'var(--border)',
                        backgroundColor: otpCedulaTipo === tipo ? 'var(--color-ink-black)' : '#ffffff',
                        color: otpCedulaTipo === tipo ? '#ffffff' : 'var(--text-secondary)',
                      }}
                    >
                      {tipo}
                    </button>
                  ))}

                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem',
                    backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem'
                  }}>
                    <CreditCard size={16} color="var(--color-slate-gray)" />
                    <input
                      required
                      inputMode="numeric"
                      placeholder="28.315.101"
                      value={otpCedulaNum}
                      onChange={(e) => setOtpCedulaNum(formatCedulaInput(e.target.value))}
                      className="chat-input"
                      style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0' }}
                    />
                  </div>
                </div>
              </div>

              {/* Correo Electrónico Registrado */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                  Correo Electrónico Vinculado
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem'
                }}>
                  <Mail size={16} color="var(--color-slate-gray)" />
                  <input
                    type="email"
                    required
                    placeholder="correo@usm.edu.ve o personal"
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    className="chat-input"
                    style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0' }}
                  />
                </div>
              </div>

              {/* Cloudflare Turnstile */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Turnstile
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={(tok) => setTurnstileToken(tok)}
                  options={{ execution: 'render', appearance: 'interaction-only' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCooldown > 0}
                className="send-btn"
                style={{
                  padding: '0.88rem 1.4rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '0.6rem', fontSize: '0.94rem', fontWeight: 600,
                  opacity: otpCooldown > 0 ? 0.6 : 1,
                  cursor: otpCooldown > 0 ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? (
                  <RefreshCw className="animate-spin" size={17} />
                ) : otpCooldown > 0 ? (
                  `Reenviar código en (${otpCooldown}s)`
                ) : (
                  <>Enviar Código de Seguridad <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <div style={{ textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.9rem' }}>
              <button
                type="button"
                onClick={() => { clearFeedback(); setView('login'); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.83rem', cursor: 'pointer' }}
              >
                ← Volver a inicio con contraseña
              </button>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            VISTA 5: INTRODUCIR CÓDIGO OTP (6 DÍGITOS)
           ════════════════════════════════════════════════════════════════════ */}
        {view === 'otp_code' && (
          <motion.div
            key="otp-code-view"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', textAlign: 'center' }}
          >
            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 400, color: 'var(--color-ink-black)', margin: 0 }}>
                Introduce el Código de 6 Dígitos
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: '0.35rem' }}>
                Código enviado a <strong>{otpEmail}</strong>.
              </p>
              <div style={{
                marginTop: '0.6rem', padding: '0.6rem 0.8rem',
                backgroundColor: 'var(--color-mist-gray)', borderRadius: 'var(--radius-inputs)',
                fontSize: '0.78rem', color: 'var(--text-secondary)', textAlign: 'left',
                border: '1px solid var(--border)', lineHeight: 1.4
              }}>
                💡 <strong>¿Cómo ingresar?</strong>
                <ul style={{ margin: '0.3rem 0 0 1.1rem', padding: 0 }}>
                  <li><strong>Opción 1:</strong> Escribe el código de 6 dígitos enviado a tu correo (en local consulta <a href="http://localhost:54324" target="_blank" rel="noreferrer" style={{ color: 'var(--color-sienna-brown)', fontWeight: 600, textDecoration: 'underline' }}>Mailpit :54324</a>).</li>
                  <li><strong>Opción 2:</strong> Haz clic directamente en el enlace del correo para entrar sin escribir nada.</li>
                  <li><strong>Modo Demo Jurado:</strong> Ingresa el código <strong style={{ color: 'var(--color-ink-black)' }}>123456</strong> para probar al instante.</li>
                </ul>
              </div>
            </div>

            <form onSubmit={handleVerifyOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-inputs)', padding: '0.5rem 1rem'
              }}>
                <KeyRound size={20} color="var(--color-slate-gray)" style={{ marginRight: '0.5rem' }} />
                <input
                  type="text"
                  required
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  style={{
                    border: 'none', background: 'transparent', width: '170px',
                    textAlign: 'center', fontSize: '1.6rem', fontWeight: 700,
                    letterSpacing: '0.4em', color: 'var(--color-ink-black)', outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="send-btn"
                style={{
                  padding: '0.88rem 1.4rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '0.6rem', fontSize: '0.94rem', fontWeight: 600
                }}
              >
                {loading ? <RefreshCw className="animate-spin" size={17} /> : 'Verificar y Continuar'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', marginTop: '0.3rem' }}>
                <button
                  type="button"
                  onClick={() => { clearFeedback(); setView('otp_email'); setOtpCode(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  ← Cambiar correo
                </button>
                <button
                  type="button"
                  onClick={handleSendOtpSubmit}
                  style={{ background: 'none', border: 'none', color: 'var(--color-sienna-brown)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Reenviar código
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            VISTA 6: ONBOARDING LEGAL DE CÉDULA INMUTABLE
           ════════════════════════════════════════════════════════════════════ */}
        {view === 'onboarding' && (
          <motion.div
            key="onboarding-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}
          >
            <div style={{
              display: 'flex', gap: '0.75rem', padding: '0.85rem 1rem',
              backgroundColor: 'var(--color-blush-peach)', border: '1px solid rgba(93, 42, 26, 0.25)',
              borderRadius: 'var(--radius-inputs)', color: 'var(--color-sienna-brown)'
            }}>
              <Lock size={18} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <div style={{ fontSize: '0.81rem', lineHeight: 1.45 }}>
                <strong>Registro Legal Definitivo:</strong> Tu Cédula quedará enlazada de forma inmutable a tus trámites ministeriales y firma de títulos en Blockchain.
              </div>
            </div>

            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 400, color: 'var(--color-ink-black)', margin: 0 }}>
                Completa tu Perfil de Graduando
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: '0.25rem' }}>
                Paso obligatorio de formalización de identidad antes de ingresar.
              </p>
            </div>

            <form onSubmit={handleCompleteOnboarding} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                  Nombre Completo Oficial
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem'
                }}>
                  <User size={16} color="var(--color-slate-gray)" />
                  <input
                    required
                    placeholder="Ej: Mauro Daniel Maiese Ferreira"
                    value={regForm.nombre}
                    onChange={(e) => setRegForm(p => ({ ...p, nombre: e.target.value }))}
                    className="chat-input"
                    style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                  Cédula de Identidad (Inmutable)
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {['V', 'E'].map(tipo => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setRegForm(p => ({ ...p, cedula_tipo: tipo }))}
                      style={{
                        padding: '0.7rem 0.85rem',
                        borderRadius: 'var(--radius-inputs)',
                        border: '1px solid',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        borderColor: regForm.cedula_tipo === tipo ? 'var(--color-ink-black)' : 'var(--border)',
                        backgroundColor: regForm.cedula_tipo === tipo ? 'var(--color-ink-black)' : '#ffffff',
                        color: regForm.cedula_tipo === tipo ? '#ffffff' : 'var(--text-secondary)',
                      }}
                    >
                      {tipo}
                    </button>
                  ))}

                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem',
                    backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem'
                  }}>
                    <CreditCard size={16} color="var(--color-slate-gray)" />
                    <input
                      required
                      inputMode="numeric"
                      placeholder="28.315.101"
                      value={regForm.cedula_numero}
                      onChange={(e) => setRegForm(p => ({ ...p, cedula_numero: formatCedulaInput(e.target.value) }))}
                      className="chat-input"
                      style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0' }}
                    />
                  </div>
                </div>
              </div>

              {/* Teléfono y Fecha de Nacimiento en 2 columnas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                    Teléfono de Contacto
                  </label>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.65rem',
                    backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inputs)', padding: '0.2rem 0.8rem'
                  }}>
                    <Phone size={15} color="var(--color-slate-gray)" />
                    <input
                      type="tel"
                      required
                      placeholder="0414-1234567"
                      value={regForm.telefono}
                      onChange={(e) => setRegForm(p => ({ ...p, telefono: e.target.value }))}
                      className="chat-input"
                      style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                    Fecha de Nacimiento
                  </label>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.65rem',
                    backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inputs)', padding: '0.2rem 0.8rem'
                  }}>
                    <Calendar size={15} color="var(--color-slate-gray)" />
                    <input
                      type="date"
                      required
                      value={regForm.fecha_nacimiento}
                      onChange={(e) => setRegForm(p => ({ ...p, fecha_nacimiento: e.target.value }))}
                      className="chat-input"
                      style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Carrera Universitaria y Nivel Académico en 2 columnas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                    Carrera Universitaria
                  </label>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.65rem',
                    backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inputs)', padding: '0.2rem 0.8rem'
                  }}>
                    <BookOpen size={15} color="var(--color-slate-gray)" />
                    <select
                      value={regForm.carrera}
                      onChange={(e) => setRegForm(p => ({ ...p, carrera: e.target.value }))}
                      className="chat-input"
                      style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0', fontSize: '0.88rem', cursor: 'pointer' }}
                    >
                      {carreras.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                    Nivel Académico
                  </label>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.65rem',
                    backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inputs)', padding: '0.2rem 0.8rem'
                  }}>
                    <ShieldCheck size={15} color="var(--color-slate-gray)" />
                    <select
                      value={regForm.semestre}
                      onChange={(e) => setRegForm(p => ({ ...p, semestre: e.target.value }))}
                      className="chat-input"
                      style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0', fontSize: '0.88rem', cursor: 'pointer' }}
                    >
                      <option value="10mo">10mo Semestre (Graduando)</option>
                      <option value="Egresado">Egresado / Titulado</option>
                      <option value="9no">9no Semestre (Pre-Grado)</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="send-btn"
                style={{
                  padding: '0.88rem 1.4rem', marginTop: '0.4rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '0.6rem', fontSize: '0.94rem', fontWeight: 600
                }}
              >
                <Lock size={16} />
                {loading ? 'Vinculando y Asegurando Perfil...' : 'Confirmar Cédula e Ingresar'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentAuth;

