import React, { useState } from 'react';
import { GraduationCap, User, CreditCard, BookOpen, ArrowRight, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

const LoginRegister = ({ onLogin }) => {
  const [mode, setMode] = useState('welcome'); // welcome | register | login
  const [form, setForm] = useState({ nombre: '', cedula: '', cedula_tipo: 'V', carrera: '', semestre: '' });
  const [error, setError] = useState('');

  // Auto-formatea el número de cédula con puntos (28315101 → 28.315.101)
  const formatCedula = (raw) => {
    const digits = raw.replace(/\D/g, '');
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const carreras = [
    'Ingeniería en Sistemas', 'Ingeniería Civil', 'Ingeniería Industrial',
    'Ingeniería Eléctrica', 'Ingeniería Mecánica', 'Arquitectura',
  ];

  const validateAndRegister = () => {
    if (!form.nombre.trim() || form.nombre.trim().split(' ').length < 2)
      return setError('Ingresa tu nombre completo (nombre y apellido).');
    const cedulaCompleta = `${form.cedula_tipo}-${form.cedula}`;
    if (!form.cedula || form.cedula.replace(/\./g, '').length < 6)
      return setError('Ingresa un número de cédula válido.');
    if (!form.carrera) return setError('Selecciona tu carrera.');
    if (!form.semestre) return setError('Selecciona tu semestre actual.');
    setError('');

    const user = {
      nombre: form.nombre.trim(),
      cedula: cedulaCompleta,
      carrera: form.carrera,
      semestre: form.semestre,
      registradoEn: new Date().toLocaleDateString('es-VE'),
    };
    localStorage.setItem('usm_user', JSON.stringify(user));
    onLogin(user);
  };

  const handleLogin = () => {
    const stored = localStorage.getItem('usm_user');
    if (!stored) return setError('No hay ningún perfil registrado. Crea uno primero.');
    onLogin(JSON.parse(stored));
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', width: '100vw', padding: '2rem',
      background: 'radial-gradient(circle at 20% 50%, rgba(14,165,233,0.12), transparent 40%), radial-gradient(circle at 80% 30%, rgba(124,58,237,0.12), transparent 40%)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: '480px' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 72, height: 72, borderRadius: '20px', background: 'linear-gradient(135deg, #0ea5e9, #7c3aed)', marginBottom: '1.5rem', boxShadow: '0 0 30px rgba(14,165,233,0.4)' }}
          >
            <GraduationCap size={36} color="white" />
          </motion.div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, background: 'linear-gradient(to right, #38bdf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            USM Validation Platform
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Plataforma Descentralizada — Ingeniería 10mo Semestre
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '2.5rem' }}>

          {/* ── Bienvenida ────────────────────────────────────────── */}
          {mode === 'welcome' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>¿Cómo deseas continuar?</h2>
              <button
                className="send-btn"
                style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontSize: '1rem' }}
                onClick={() => setMode('register')}
              >
                <User size={20} /> Crear Perfil de Graduando <ArrowRight size={18} />
              </button>
              <button
                onClick={() => setMode('login')}
                style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontSize: '1rem', transition: 'all 0.2s' }}
              >
                <Shield size={20} /> Ya tengo un perfil registrado
              </button>
            </motion.div>
          )}

          {/* ── Registro ──────────────────────────────────────────── */}
          {mode === 'register' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <h2 style={{ marginBottom: '0.5rem' }}>Crear Perfil</h2>

              {[{ icon: <User size={16} />, placeholder: 'Nombre completo (ej: Juan Pérez)', key: 'nombre' }].map(f => (
                <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.2rem 1rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{f.icon}</span>
                  <input
                    className="chat-input"
                    style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.8rem 0' }}
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  />
                </div>
              ))}

              {/* Campo de cédula con toggle V/E */}
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                {/* Botones de nacionalidad */}
                {['V', 'E'].map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, cedula_tipo: tipo }))}
                    style={{
                      padding: '0.8rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid',
                      cursor: 'pointer',
                      fontWeight: '700',
                      fontSize: '1rem',
                      transition: 'all 0.2s',
                      minWidth: '52px',
                      borderColor: form.cedula_tipo === tipo ? 'rgba(14,165,233,0.6)' : 'var(--border)',
                      background: form.cedula_tipo === tipo ? 'rgba(14,165,233,0.15)' : 'rgba(255,255,255,0.05)',
                      color: form.cedula_tipo === tipo ? 'var(--primary)' : 'var(--text-muted)',
                    }}
                  >
                    {tipo}
                  </button>
                ))}
                {/* Input solo numérico */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.2rem 1rem' }}>
                  <CreditCard size={16} color="var(--text-muted)" />
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
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '-0.5rem' }}>
                Tu cédula quedará como: <strong style={{ color: 'var(--primary)' }}>{form.cedula_tipo}-{form.cedula || '0.000.000'}</strong>
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.2rem 1rem' }}>
                <BookOpen size={16} color="var(--text-muted)" />
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

              <div style={{ display: 'flex', gap: '1rem' }}>
                {['8vo', '9no', '10mo'].map(s => (
                  <button
                    key={s}
                    onClick={() => setForm(p => ({ ...p, semestre: s }))}
                    style={{
                      flex: 1, padding: '0.7rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', transition: 'all 0.2s',
                      background: form.semestre === s ? 'rgba(14,165,233,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${form.semestre === s ? 'rgba(14,165,233,0.5)' : 'var(--border)'}`,
                      color: form.semestre === s ? 'var(--primary)' : 'var(--text-muted)',
                    }}
                  >
                    {s} Sem.
                  </button>
                ))}
              </div>

              {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: '500' }}>⚠️ {error}</p>}

              <button className="send-btn" style={{ padding: '1rem', marginTop: '0.5rem' }} onClick={validateAndRegister}>
                Crear Perfil y Entrar →
              </button>
              <button onClick={() => { setMode('welcome'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}>
                ← Volver
              </button>
            </motion.div>
          )}

          {/* ── Login ─────────────────────────────────────────────── */}
          {mode === 'login' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', textAlign: 'center' }}>
              <h2>Acceder a mi Perfil</h2>
              <p style={{ color: 'var(--text-muted)' }}>Recuperaremos tu perfil guardado en este dispositivo.</p>
              {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>⚠️ {error}</p>}
              <button className="send-btn" style={{ padding: '1rem' }} onClick={handleLogin}>
                <Shield size={18} /> Acceder a mi perfil
              </button>
              <button onClick={() => { setMode('welcome'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                ← Volver
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default LoginRegister;
