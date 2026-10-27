import React, { useState, useEffect } from 'react';
import { Award, User, CreditCard, BookOpen, ArrowRight, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { profilesAPI, dynamicDataAPI } from '../services/api';

const LoginRegister = ({ onLogin }) => {
  const [mode, setMode] = useState('welcome'); // welcome | register | login
  const [form, setForm] = useState({ nombre: '', cedula: '', cedula_tipo: 'V', carrera: '', semestre: '' });
  const [error, setError] = useState('');

  // Auto-formatea el número de cédula con puntos (28315101 → 28.315.101)
  const formatCedula = (raw) => {
    const digits = raw.replace(/\D/g, '');
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const [carreras, setCarreras] = useState([
    'Ingeniería en Sistemas', 'Ingeniería Civil', 'Ingeniería Industrial',
    'Ingeniería Eléctrica', 'Ingeniería Mecánica', 'Arquitectura',
  ]);

  // Cargar carreras dinámicamente desde el servidor
  useEffect(() => {
    dynamicDataAPI.getCarreras()
      .then(data => { if (data.carreras) setCarreras(data.carreras); })
      .catch(() => {});
  }, []);

  const [loginCedula, setLoginCedula] = useState('');
  const [loading, setLoading] = useState(false);

  const validateAndRegister = async () => {
    if (!form.nombre.trim() || form.nombre.trim().split(' ').length < 2)
      return setError('Ingresa tu nombre completo (nombre y apellido).');
    const cedulaCompleta = `${form.cedula_tipo}-${form.cedula}`;
    if (!form.cedula || form.cedula.replace(/\./g, '').length < 6)
      return setError('Ingresa un número de cédula válido.');
    if (!form.carrera) return setError('Selecciona tu carrera.');
    if (!form.semestre) return setError('Selecciona tu semestre actual.');
    setError('');
    setLoading(true);

    const user = {
      nombre: form.nombre.trim(),
      cedula: cedulaCompleta,
      carrera: form.carrera,
      semestre: form.semestre
    };

    try {
      const data = await profilesAPI.register(user);
      if (data.success) {
        localStorage.setItem('usm_user', JSON.stringify(user));
        onLogin(user);
      } else {
        setError('Error al crear perfil en la nube.');
      }
    } catch (err) {
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!loginCedula || loginCedula.length < 6) return setError('Ingresa una cédula válida.');
    setError('');
    setLoading(true);

    try {
      let queryCedula = loginCedula;
      if (!queryCedula.includes('-')) {
        queryCedula = `V-${formatCedula(queryCedula)}`;
      }

      const data = await profilesAPI.getProfile(queryCedula);

      if (data.success && data.profile) {
        localStorage.setItem('usm_user', JSON.stringify(data.profile));
        onLogin(data.profile);
      } else {
        setError('Perfil no encontrado. Verifica tu cédula o regístrate.');
      }
    } catch (err) {
      setError(err.message || 'Error al conectar con la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', minHeight: '100dvh', width: '100vw', padding: '1.5rem',
      backgroundColor: 'var(--surface-canvas)',
      overflow: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {/* Header Institucional Steep */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 58, height: 58, borderRadius: '50%',
              backgroundColor: 'var(--color-ink-black)',
              color: '#ffffff',
              marginBottom: '1rem',
              boxShadow: 'var(--shadow-button)'
            }}
          >
            <Award size={28} color="#ffffff" />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.85rem',
            fontWeight: 400,
            color: 'var(--color-ink-black)',
            margin: 0,
            letterSpacing: '-0.02em'
          }}>
            Plataforma USM
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem', fontSize: '0.92rem' }}>
            Sistema Descentralizado de Validación Documental
          </p>
        </div>

        <motion.div
          className="glass-panel"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '2.5rem',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-cards)',
            boxShadow: 'var(--shadow-artifact)'
          }}
        >

          {/* ── Bienvenida ────────────────────────────────────────── */}
          {mode === 'welcome' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.35rem',
                fontWeight: 400,
                textAlign: 'center',
                marginBottom: '0.5rem',
                color: 'var(--color-ink-black)'
              }}>
                ¿Cómo deseas continuar?
              </h2>
              <button
                className="send-btn"
                style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontSize: '0.94rem' }}
                onClick={() => setMode('register')}
              >
                <User size={18} /> Crear Perfil de Graduando <ArrowRight size={16} />
              </button>
              <button
                className="btn-ghost"
                onClick={() => {
                  const stored = localStorage.getItem('usm_user');
                  if (stored) {
                    onLogin(JSON.parse(stored));
                  } else {
                    setMode('login');
                  }
                }}
                style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontSize: '0.94rem' }}
              >
                <Shield size={18} /> Ya tengo un perfil registrado
              </button>
            </div>
          )}

          {/* ── Registro ──────────────────────────────────────────── */}
          {mode === 'register' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <h2 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.35rem',
                fontWeight: 400,
                color: 'var(--color-ink-black)',
                margin: 0
              }}>
                Crear Perfil de Graduando
              </h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--color-fog-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem' }}>
                <span style={{ color: 'var(--color-slate-gray)' }}><User size={16} /></span>
                <input
                  className="chat-input"
                  style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.8rem 0' }}
                  placeholder="Nombre completo (ej: Juan Pérez)"
                  value={form.nombre}
                  onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                />
              </div>

              {/* Campo de cédula con toggle V/E */}
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                {['V', 'E'].map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, cedula_tipo: tipo }))}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-inputs)',
                      border: '1px solid',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: '0.95rem',
                      transition: 'all 0.2s',
                      minWidth: '50px',
                      borderColor: form.cedula_tipo === tipo ? 'var(--color-ink-black)' : 'var(--border)',
                      background: form.cedula_tipo === tipo ? 'var(--color-ink-black)' : '#ffffff',
                      color: form.cedula_tipo === tipo ? '#ffffff' : 'var(--text-secondary)',
                    }}
                  >
                    {tipo}
                  </button>
                ))}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--color-fog-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem' }}>
                  <CreditCard size={16} color="var(--color-slate-gray)" />
                  <input
                    className="chat-input"
                    style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.8rem 0' }}
                    placeholder="Número de cédula"
                    value={form.cedula}
                    onChange={e => setForm(p => ({ ...p, cedula: formatCedula(e.target.value) }))}
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--color-fog-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem' }}>
                <BookOpen size={16} color="var(--color-slate-gray)" />
                <select
                  className="chat-input"
                  style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.8rem 0' }}
                  value={form.carrera}
                  onChange={e => setForm(p => ({ ...p, carrera: e.target.value }))}
                >
                  <option value="">Selecciona tu carrera...</option>
                  {carreras.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {['8vo', '9no', '10mo'].map(s => (
                  <button
                    key={s}
                    onClick={() => setForm(p => ({ ...p, semestre: s }))}
                    style={{
                      flex: 1, padding: '0.65rem', borderRadius: 'var(--radius-inputs)', cursor: 'pointer', fontWeight: 500, fontSize: '0.86rem', transition: 'all 0.2s',
                      background: form.semestre === s ? 'var(--color-ink-black)' : '#ffffff',
                      border: `1px solid ${form.semestre === s ? 'var(--color-ink-black)' : 'var(--border)'}`,
                      color: form.semestre === s ? '#ffffff' : 'var(--text-secondary)',
                    }}
                  >
                    {s} Sem.
                  </button>
                ))}
              </div>

              {error && <p style={{ color: 'var(--color-sienna-brown)', fontSize: '0.84rem', fontWeight: 500, margin: 0 }}>{error}</p>}

              <button className="send-btn" style={{ padding: '0.85rem', marginTop: '0.5rem' }} onClick={validateAndRegister} disabled={loading}>
                {loading ? 'Guardando...' : 'Crear Perfil e Iniciar Sesión'}
              </button>
              <button onClick={() => { setMode('welcome'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.86rem', textDecoration: 'underline' }}>
                Volver al Inicio
              </button>
            </div>
          )}

          {/* ── Login ─────────────────────────────────────────────── */}
          {mode === 'login' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', textAlign: 'center' }}>
              <h2 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.35rem',
                fontWeight: 400,
                color: 'var(--color-ink-black)',
                margin: 0
              }}>
                Acceder a mi Perfil
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                Ingresa tu número de cédula para recuperar tus datos de la nube.
              </p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--color-fog-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-inputs)', padding: '0.2rem 1rem', marginTop: '0.5rem' }}>
                <CreditCard size={16} color="var(--color-slate-gray)" />
                <input
                  className="chat-input"
                  style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.8rem 0' }}
                  placeholder="Ej: V-28.123.456 o 28123456"
                  value={loginCedula}
                  onChange={e => setLoginCedula(e.target.value)}
                />
              </div>

              {error && <p style={{ color: 'var(--color-sienna-brown)', fontSize: '0.84rem', margin: 0 }}>{error}</p>}
              <button className="send-btn" style={{ padding: '0.85rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onClick={handleLogin} disabled={loading}>
                <Shield size={16} /> {loading ? 'Buscando...' : 'Acceder a mi perfil'}
              </button>
              <button onClick={() => { setMode('welcome'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.86rem', textDecoration: 'underline' }}>
                ← Volver
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default LoginRegister;
