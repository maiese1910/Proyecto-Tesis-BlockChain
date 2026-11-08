import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, User, CreditCard, Mail, Phone, Calendar, BookOpen,
  ShieldCheck, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Save, RefreshCw
} from 'lucide-react';
import { authPasswordless } from '../services/supabaseClient';
import { dynamicDataAPI } from '../services/api';
import { checkPasswordRules, isPasswordValid } from './StudentAuth';

const StudentProfileModal = ({ isOpen, onClose, user, onProfileUpdated }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    fecha_nacimiento: '',
    carrera: 'Ingeniería en Sistemas',
    semestre: '10mo',
    new_password: '',
    confirm_password: '',
  });
  const [changePassword, setChangePassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [carreras, setCarreras] = useState([
    'Ingeniería en Sistemas',
    'Ingeniería Civil',
    'Ingeniería Industrial',
    'Ingeniería Eléctrica',
    'Ingeniería Mecánica',
    'Arquitectura',
  ]);

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        nombre: user.nombre || '',
        telefono: user.telefono || '',
        fecha_nacimiento: user.fecha_nacimiento || '',
        carrera: user.carrera || 'Ingeniería en Sistemas',
        semestre: user.semestre || '10mo',
        new_password: '',
        confirm_password: '',
      });
      setChangePassword(false);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, user]);

  useEffect(() => {
    dynamicDataAPI.getCarreras()
      .then(res => { if (res?.carreras) setCarreras(res.carreras); })
      .catch(() => {});
  }, []);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanNombre = (formData.nombre || '').trim();
    if (!cleanNombre || cleanNombre.split(' ').length < 2) {
      setError('Ingresa tu nombre y apellido completo.');
      return;
    }

    if (formData.telefono && formData.telefono.replace(/\D/g, '').length < 10) {
      setError('El número de teléfono debe tener al menos 10 dígitos.');
      return;
    }

    if (changePassword && formData.new_password) {
      if (!isPasswordValid(formData.new_password)) {
        setError('La nueva contraseña debe cumplir todos los requisitos de seguridad (8+ caracteres, mayúscula, minúscula, número y símbolo).');
        return;
      }
      if (formData.new_password !== formData.confirm_password) {
        setError('Las contraseñas no coinciden.');
        return;
      }
    }

    setLoading(true);
    try {
      const updates = {
        nombre: cleanNombre,
        telefono: (formData.telefono || '').trim(),
        fecha_nacimiento: formData.fecha_nacimiento || '',
        carrera: formData.carrera || 'Ingeniería en Sistemas',
        semestre: formData.semestre || '10mo',
      };
      if (changePassword && formData.new_password) {
        updates.new_password = formData.new_password.trim();
      }

      const res = await authPasswordless.updateStudentProfile(user, updates);
      if (res.success && res.profile) {
        setSuccess('Perfil académico actualizado correctamente.');
        if (onProfileUpdated) {
          onProfileUpdated(res.profile);
        }
        setTimeout(() => {
          onClose();
        }, 900);
      }
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el perfil.');
    } finally {
      setLoading(false);
    }
  };

  const pwdRules = checkPasswordRules(formData.new_password);

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: 'rgba(18, 18, 18, 0.55)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '540px',
            maxHeight: '90vh',
            overflowY: 'auto',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-cards)',
            border: '1px solid var(--border)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
            padding: '1.75rem',
          }}
        >
          {/* Encabezado */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: 'var(--color-sienna-brown)',
                backgroundColor: 'var(--color-blush-peach)', padding: '0.2rem 0.65rem',
                borderRadius: 'var(--radius-pills)', marginBottom: '0.4rem'
              }}>
                <ShieldCheck size={12} /> Expediente Académico USM
              </span>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', fontWeight: 400, color: 'var(--color-ink-black)', margin: 0 }}>
                Mi Perfil de Graduando
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'var(--color-fog-white)', border: '1px solid var(--border)',
                borderRadius: '50%', width: 34, height: 34, display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                color: 'var(--color-slate-gray)'
              }}
              aria-label="Cerrar modal"
            >
              <X size={16} />
            </button>
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.75rem 1rem', borderRadius: 'var(--radius-inputs)',
              backgroundColor: 'rgba(185, 28, 28, 0.08)', border: '1px solid rgba(185, 28, 28, 0.25)',
              color: '#b91c1c', fontSize: '0.83rem', marginBottom: '1rem'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.75rem 1rem', borderRadius: 'var(--radius-inputs)',
              backgroundColor: 'rgba(22, 163, 74, 0.08)', border: '1px solid rgba(22, 163, 74, 0.25)',
              color: '#15803d', fontSize: '0.83rem', marginBottom: '1rem'
            }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Datos Inmutables: Cédula y Correo */}
            <div style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--color-fog-white)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-inputs)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.75rem'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CreditCard size={12} /> Cédula Legal (Inmutable)
                </span>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-ink-black)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {user.cedula || 'No asignada'}
                  <Lock size={12} color="var(--color-sienna-brown)" title="Dato protegido e inmutable" />
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Mail size={12} /> Correo Vinculado
                </span>
                <div style={{ fontSize: '0.86rem', fontWeight: 500, color: 'var(--color-ink-black)', marginTop: '0.2rem', wordBreak: 'break-all' }}>
                  {user.email || 'Graduando USM'}
                </div>
              </div>
            </div>

            {/* Nombre Completo */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                Nombre Completo Oficial
              </label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.65rem',
                backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-inputs)', padding: '0.2rem 0.85rem'
              }}>
                <User size={15} color="var(--color-slate-gray)" />
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData(p => ({ ...p, nombre: e.target.value }))}
                  className="chat-input"
                  style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.7rem 0', fontSize: '0.88rem' }}
                />
              </div>
            </div>

            {/* Carrera y Semestre */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                  Carrera Universitaria
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-inputs)', padding: '0.2rem 0.8rem'
                }}>
                  <BookOpen size={15} color="var(--color-slate-gray)" />
                  <select
                    value={formData.carrera}
                    onChange={(e) => setFormData(p => ({ ...p, carrera: e.target.value }))}
                    className="chat-input"
                    style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.7rem 0', fontSize: '0.86rem', cursor: 'pointer' }}
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
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-inputs)', padding: '0.2rem 0.8rem'
                }}>
                  <ShieldCheck size={15} color="var(--color-slate-gray)" />
                  <select
                    value={formData.semestre}
                    onChange={(e) => setFormData(p => ({ ...p, semestre: e.target.value }))}
                    className="chat-input"
                    style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.7rem 0', fontSize: '0.86rem', cursor: 'pointer' }}
                  >
                    <option value="10mo">10mo Semestre (Graduando)</option>
                    <option value="Egresado">Egresado / Titulado</option>
                    <option value="9no">9no Semestre (Pre-Grado)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Teléfono y Fecha de Nacimiento */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                  Teléfono de Contacto
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-inputs)', padding: '0.2rem 0.8rem'
                }}>
                  <Phone size={15} color="var(--color-slate-gray)" />
                  <input
                    type="tel"
                    placeholder="0414-1234567"
                    value={formData.telefono}
                    onChange={(e) => setFormData(p => ({ ...p, telefono: e.target.value }))}
                    className="chat-input"
                    style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.7rem 0', fontSize: '0.86rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.3rem' }}>
                  Fecha de Nacimiento
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-inputs)', padding: '0.2rem 0.8rem'
                }}>
                  <Calendar size={15} color="var(--color-slate-gray)" />
                  <input
                    type="date"
                    value={formData.fecha_nacimiento}
                    onChange={(e) => setFormData(p => ({ ...p, fecha_nacimiento: e.target.value }))}
                    className="chat-input"
                    style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.7rem 0', fontSize: '0.86rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Sección opcional de cambio de contraseña */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.85rem' }}>
              <button
                type="button"
                onClick={() => setChangePassword(!changePassword)}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: 'var(--color-sienna-brown)', fontSize: '0.82rem',
                  fontWeight: 600, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', gap: '0.4rem'
                }}
              >
                <Lock size={14} />
                {changePassword ? 'Cancelar cambio de contraseña' : '¿Deseas cambiar tu contraseña de acceso?'}
              </button>

              {changePassword && (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.25rem' }}>
                        Nueva Contraseña
                      </label>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-inputs)', padding: '0.15rem 0.75rem'
                      }}>
                        <Lock size={14} color="var(--color-slate-gray)" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Mínimo 8 caracteres"
                          value={formData.new_password}
                          onChange={(e) => setFormData(p => ({ ...p, new_password: e.target.value }))}
                          className="chat-input"
                          style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.6rem 0', fontSize: '0.84rem' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-slate-gray)', padding: 0 }}
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.25rem' }}>
                        Confirmar Contraseña
                      </label>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-inputs)', padding: '0.15rem 0.75rem'
                      }}>
                        <Lock size={14} color="var(--color-slate-gray)" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Repite la contraseña"
                          value={formData.confirm_password}
                          onChange={(e) => setFormData(p => ({ ...p, confirm_password: e.target.value }))}
                          className="chat-input"
                          style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.6rem 0', fontSize: '0.84rem' }}
                        />
                      </div>
                    </div>
                  </div>

                  {formData.new_password && (
                    <div style={{
                      padding: '0.55rem 0.75rem',
                      backgroundColor: 'var(--color-fog-white)',
                      borderRadius: 'var(--radius-inputs)',
                      border: '1px solid var(--border)',
                      fontSize: '0.72rem',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '0.2rem'
                    }}>
                      <span style={{ color: pwdRules.hasMinLength ? '#16a34a' : '#64748b' }}>✓ 8+ caracteres</span>
                      <span style={{ color: pwdRules.hasUpper ? '#16a34a' : '#64748b' }}>✓ 1 Mayúscula</span>
                      <span style={{ color: pwdRules.hasLower ? '#16a34a' : '#64748b' }}>✓ 1 Minúscula</span>
                      <span style={{ color: pwdRules.hasNumber ? '#16a34a' : '#64748b' }}>✓ 1 Número</span>
                      <span style={{ color: pwdRules.hasSpecial ? '#16a34a' : '#64748b' }}>✓ 1 Símbolo (!@#)</span>
                      <span style={{ color: (formData.confirm_password && formData.confirm_password === formData.new_password) ? '#16a34a' : '#64748b' }}>
                        ✓ Coinciden
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botones de Acción */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost"
                style={{ padding: '0.7rem 1.2rem', fontSize: '0.86rem' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="send-btn"
                style={{
                  padding: '0.7rem 1.35rem',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                {loading ? <RefreshCw className="animate-spin" size={15} /> : <Save size={15} />}
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StudentProfileModal;

