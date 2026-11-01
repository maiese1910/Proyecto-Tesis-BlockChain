import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Turnstile } from '@marsidev/react-turnstile';
import { Mail, KeyRound, ArrowRight, ShieldCheck, User, CreditCard, BookOpen, Lock, RefreshCw, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { authPasswordless } from '../services/supabaseClient';
import { dynamicDataAPI } from '../services/api';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

const PasswordlessLogin = ({ onLogin, onSwitchToAdmin, embedded = false, onSwitchToDemo = null }) => {
  // Estados de navegación: 'email' | 'otp' | 'onboarding'
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  // Datos del usuario autenticado en Supabase
  const [authUser, setAuthUser] = useState(null);

  // Formulario de Onboarding Legal (Cédula Inmutable)
  const [onboardingForm, setOnboardingForm] = useState({
    nombre: '',
    cedula_tipo: 'V',
    cedula_numero: '',
    carrera: '',
    semestre: '10mo',
  });

  const [carreras, setCarreras] = useState([
    'Ingeniería en Sistemas',
    'Ingeniería Civil',
    'Ingeniería Industrial',
    'Ingeniería Eléctrica',
    'Ingeniería Mecánica',
    'Arquitectura',
  ]);

  useEffect(() => {
    dynamicDataAPI.getCarreras()
      .then(data => { if (data.carreras) setCarreras(data.carreras); })
      .catch(() => {});
  }, []);

  const formatCedulaInput = (val) => {
    const raw = val.replace(/\D/g, '');
    return raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // 1. SOLICITAR CÓDIGO OTP (PASSWORDLESS)
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Ingresa una dirección de correo electrónico válida.');
      return;
    }

    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const res = await authPasswordless.sendEmailOtp(email, turnstileToken);
      if (res.demoFallback) {
        setInfoMessage(res.message);
      } else {
        setInfoMessage(`Código de verificación de 6 dígitos enviado a ${email}. Revisa tu bandeja.`);
      }
      setStep('otp');
    } catch (err) {
      setError(err.message || 'No se pudo enviar el código OTP. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // 2. VERIFICAR CÓDIGO OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (otp.length < 6) {
      setError('El código debe contener 6 dígitos.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await authPasswordless.verifyEmailOtp(email, otp);
      if (res.success && res.user) {
        setAuthUser(res.user);

        // Consultar si ya tiene perfil legal completado en public.perfiles
        const profile = await authPasswordless.getProfile(res.user.id);

        if (profile && profile.is_profile_complete && profile.cedula) {
          // Usuario recurrente con cédula ya registrada e inmutable
          localStorage.setItem('usm_user', JSON.stringify(profile));
          onLogin(profile);
        } else {
          // Usuario nuevo o sin datos legales -> ONBOARDING PROGRESIVO
          setOnboardingForm(prev => ({
            ...prev,
            nombre: profile?.nombre || res.user.user_metadata?.nombre || '',
          }));
          setStep('onboarding');
        }
      } else {
        setError('Código inválido o expirado.');
      }
    } catch (err) {
      setError(err.message || 'Error validando el código de seguridad.');
    } finally {
      setLoading(false);
    }
  };

  // 3. COMPLETAR ONBOARDING LEGAL (CÉDULA INMUTABLE)
  const handleSaveOnboarding = async (e) => {
    if (e) e.preventDefault();
    const cleanNombre = onboardingForm.nombre.trim();
    const rawCedula = onboardingForm.cedula_numero.replace(/\D/g, '');

    if (!cleanNombre || cleanNombre.split(' ').length < 2) {
      setError('Ingresa tu nombre y apellido completo tal como aparece en tu documento.');
      return;
    }
    if (rawCedula.length < 6 || rawCedula.length > 9) {
      setError('Ingresa un número de cédula válido (entre 6 y 9 dígitos).');
      return;
    }
    if (!onboardingForm.carrera) {
      setError('Selecciona tu carrera de grado.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await authPasswordless.completeLegalProfile(authUser?.id || 'local-user', {
        email: email || authUser?.email,
        nombre: cleanNombre,
        cedula_tipo: onboardingForm.cedula_tipo,
        cedula_numero: rawCedula,
        carrera: onboardingForm.carrera,
        semestre: onboardingForm.semestre,
      });

      if (res.success && res.profile) {
        localStorage.setItem('usm_user', JSON.stringify(res.profile));
        onLogin(res.profile);
      } else {
        setError('Error al registrar el perfil legal en el servidor.');
      }
    } catch (err) {
      setError(err.message || 'Error al guardar los datos del graduando.');
    } finally {
      setLoading(false);
    }
  };

  const formCardContent = (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: embedded ? '0.5rem 0 0 0' : '2.5rem',
        backgroundColor: embedded ? 'transparent' : '#ffffff',
        border: embedded ? 'none' : '1px solid var(--border)',
        borderRadius: embedded ? '0' : 'var(--radius-cards)',
        boxShadow: embedded ? 'none' : 'var(--shadow-card)'
      }}
    >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.85rem 1rem',
                backgroundColor: 'rgba(185, 28, 28, 0.08)',
                border: '1px solid rgba(185, 28, 28, 0.25)',
                borderRadius: 'var(--radius-inputs)',
                color: '#b91c1c',
                fontSize: '0.85rem',
                marginBottom: '1.4rem'
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </motion.div>
          )}

          {infoMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.85rem 1rem',
                backgroundColor: 'rgba(2, 132, 199, 0.08)',
                border: '1px solid rgba(2, 132, 199, 0.25)',
                borderRadius: 'var(--radius-inputs)',
                color: '#0369a1',
                fontSize: '0.85rem',
                marginBottom: '1.4rem'
              }}
            >
              <Sparkles size={18} style={{ flexShrink: 0 }} />
              <span>{infoMessage}</span>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* ─── PASO 1: CORREO + TURNSTILE INVISIBLE ─── */}
            {step === 'email' && (
              <motion.div
                key="step-email"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
              >
                <div>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 400, color: 'var(--color-ink-black)', margin: 0 }}>
                    Acceso para Graduandos
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '0.35rem' }}>
                    Sin contraseñas vulnerables. Te enviaremos un código de seguridad efímero a tu correo electrónico.
                  </p>
                </div>

                <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    background: 'var(--color-fog-white)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem'
                  }}>
                    <Mail size={18} color="var(--color-slate-gray)" />
                    <input
                      type="email"
                      required
                      placeholder="correo@usm.edu.ve o personal"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="chat-input"
                      style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.85rem 0' }}
                    />
                  </div>

                  {/* Cloudflare Turnstile Invisible */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Turnstile
                      siteKey={TURNSTILE_SITE_KEY}
                      onSuccess={(tok) => setTurnstileToken(tok)}
                      options={{ execution: 'render', appearance: 'interaction-only' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="send-btn"
                    style={{
                      padding: '0.88rem 1.4rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '0.6rem', fontSize: '0.94rem', fontWeight: 600
                    }}
                  >
                    {loading ? <RefreshCw className="animate-spin" size={18} /> : (
                      <>Enviar Código de Seguridad <ArrowRight size={17} /></>
                    )}
                  </button>
                </form>

                {onSwitchToDemo && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={onSwitchToDemo}
                      className="btn-ghost"
                      style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', width: '100%', whiteSpace: 'nowrap' }}
                    >
                      ⚡ Acceso Rápido Demo (Defensa / Jurado)
                    </button>
                  </div>
                )}

                <div style={{ textAlign: 'center', marginTop: '0.8rem', borderTop: '1px solid var(--border)', paddingTop: '1.2rem' }}>
                  <button
                    type="button"
                    onClick={onSwitchToAdmin}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-secondary)',
                      fontSize: '0.84rem', cursor: 'pointer', textDecoration: 'underline'
                    }}
                  >
                    ¿Eres auditor o funcionario ministerial? Iniciar sesión aquí
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─── PASO 2: VERIFICACIÓN OTP ─── */}
            {step === 'otp' && (
              <motion.div
                key="step-otp"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center' }}
              >
                <div>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 400, color: 'var(--color-ink-black)', margin: 0 }}>
                    Introduce el Código OTP
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '0.35rem' }}>
                    Hemos enviado un código de 6 dígitos a <strong>{email}</strong>.
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--color-fog-white)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inputs)', padding: '0.4rem 1rem'
                  }}>
                    <KeyRound size={20} color="var(--color-slate-gray)" style={{ marginRight: '0.5rem' }} />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      inputMode="numeric"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      style={{
                        border: 'none', background: 'transparent', width: '180px',
                        textAlign: 'center', fontSize: '1.5rem', fontWeight: 700,
                        letterSpacing: '0.45em', color: 'var(--color-ink-black)', outline: 'none'
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="send-btn"
                    style={{
                      padding: '0.88rem 1.4rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '0.6rem', fontSize: '0.94rem', fontWeight: 600
                    }}
                  >
                    {loading ? <RefreshCw className="animate-spin" size={18} /> : 'Verificar y Continuar'}
                  </button>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.83rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => { setStep('email'); setOtp(''); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                      ← Cambiar correo
                    </button>
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      style={{ background: 'none', border: 'none', color: 'var(--color-sienna-brown)', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Reenviar código
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ─── PASO 3: ONBOARDING PROGRESIVO (CÉDULA INMUTABLE) ─── */}
            {step === 'onboarding' && (
              <motion.div
                key="step-onboarding"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
              >
                {/* Advertencia Legal Institucional */}
                <div style={{
                  display: 'flex', gap: '0.75rem', padding: '0.85rem 1rem',
                  backgroundColor: 'var(--color-blush-peach)',
                  border: '1px solid rgba(93, 42, 26, 0.25)',
                  borderRadius: 'var(--radius-inputs)',
                  color: 'var(--color-sienna-brown)'
                }}>
                  <Lock size={20} style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                  <div style={{ fontSize: '0.82rem', lineHeight: 1.45 }}>
                    <strong>Registro Legal Definitivo:</strong> Tu Cédula de Identidad quedará anclada de forma inmutable a tus trámites de apostilla y títulos en Blockchain. Verifica que sea exacta.
                  </div>
                </div>

                <div>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 400, color: 'var(--color-ink-black)', margin: 0 }}>
                    Completa tu Perfil de Graduando
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '0.35rem' }}>
                    Este paso se realiza una sola vez para formalizar tu identidad jurídica.
                  </p>
                </div>

                <form onSubmit={handleSaveOnboarding} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  {/* Nombre Completo */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.35rem' }}>
                      Nombre Completo Oficial
                    </label>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      background: 'var(--color-fog-white)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem'
                    }}>
                      <User size={16} color="var(--color-slate-gray)" />
                      <input
                        required
                        placeholder="Ej: Mauro Daniel Maiese Ferreira"
                        value={onboardingForm.nombre}
                        onChange={(e) => setOnboardingForm(p => ({ ...p, nombre: e.target.value }))}
                        className="chat-input"
                        style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.8rem 0' }}
                      />
                    </div>
                  </div>

                  {/* Cédula de Identidad con Toggle V/E */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.35rem' }}>
                      Cédula de Identidad (Inmutable)
                    </label>
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                      {['V', 'E'].map(tipo => (
                        <button
                          key={tipo}
                          type="button"
                          onClick={() => setOnboardingForm(p => ({ ...p, cedula_tipo: tipo }))}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-inputs)',
                            border: '1px solid',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.92rem',
                            minWidth: '48px',
                            borderColor: onboardingForm.cedula_tipo === tipo ? 'var(--color-ink-black)' : 'var(--border)',
                            background: onboardingForm.cedula_tipo === tipo ? 'var(--color-ink-black)' : '#ffffff',
                            color: onboardingForm.cedula_tipo === tipo ? '#ffffff' : 'var(--text-secondary)',
                          }}
                        >
                          {tipo}
                        </button>
                      ))}

                      <div style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem',
                        background: 'var(--color-fog-white)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem'
                      }}>
                        <CreditCard size={16} color="var(--color-slate-gray)" />
                        <input
                          required
                          inputMode="numeric"
                          placeholder="28.315.101"
                          value={onboardingForm.cedula_numero}
                          onChange={(e) => setOnboardingForm(p => ({ ...p, cedula_numero: formatCedulaInput(e.target.value) }))}
                          className="chat-input"
                          style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.8rem 0' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Carrera Universitaria */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.35rem' }}>
                      Carrera de Grado
                    </label>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      background: 'var(--color-fog-white)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem'
                    }}>
                      <BookOpen size={16} color="var(--color-slate-gray)" />
                      <select
                        required
                        value={onboardingForm.carrera}
                        onChange={(e) => setOnboardingForm(p => ({ ...p, carrera: e.target.value }))}
                        className="chat-input"
                        style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.8rem 0', outline: 'none' }}
                      >
                        <option value="">Selecciona tu carrera...</option>
                        {carreras.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Semestre Actual */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.35rem' }}>
                      Semestre
                    </label>
                    <div style={{ display: 'flex', gap: '0.65rem' }}>
                      {['8vo', '9no', '10mo'].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setOnboardingForm(p => ({ ...p, semestre: s }))}
                          style={{
                            flex: 1, padding: '0.65rem', borderRadius: 'var(--radius-inputs)', cursor: 'pointer', fontWeight: 600, fontSize: '0.86rem',
                            background: onboardingForm.semestre === s ? 'var(--color-ink-black)' : '#ffffff',
                            border: `1px solid ${onboardingForm.semestre === s ? 'var(--color-ink-black)' : 'var(--border)'}`,
                            color: onboardingForm.semestre === s ? '#ffffff' : 'var(--text-secondary)',
                          }}
                        >
                          {s} Sem.
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="send-btn"
                    style={{
                      padding: '0.9rem 1.4rem', marginTop: '0.5rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '0.6rem', fontSize: '0.94rem', fontWeight: 600
                    }}
                  >
                    <Lock size={16} />
                    {loading ? 'Vinculando Cédula y Perfil...' : 'Confirmar e Ingresar al Sistema'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
    </motion.div>
  );

  if (embedded) {
    return formCardContent;
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', width: '100%', padding: '1.5rem',
      backgroundColor: 'var(--color-mist-gray)',
    }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, borderRadius: '50%',
              backgroundColor: 'var(--color-ink-black)',
              color: '#ffffff',
              marginBottom: '1rem',
              boxShadow: '0 8px 24px rgba(18, 18, 18, 0.12)'
            }}
          >
            <ShieldCheck size={28} color="#ffffff" />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.95rem',
            fontWeight: 400,
            color: 'var(--color-ink-black)',
            margin: 0,
            letterSpacing: '-0.02em'
          }}>
            Plataforma USM
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.45rem', fontSize: '0.92rem' }}>
            Autenticación Criptográfica Passwordless y Validación de Grado
          </p>
        </div>
        {formCardContent}
      </div>
    </div>
  );
};

export default PasswordlessLogin;

