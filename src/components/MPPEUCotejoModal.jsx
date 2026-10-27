import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ShieldCheck, CheckCircle2, AlertOctagon, FileText, User, Building2, Stamp, KeyRound, Check } from 'lucide-react';

const MPPEUCotejoModal = ({ record, onClose, onConfirmCertify, onReject, loading }) => {
  const [checks, setChecks] = useState({
    rectorSignature: true,
    secretarySignature: true,
    watermarkAndSeal: true,
    idCardMatch: true
  });

  const [notes, setNotes] = useState('');

  if (!record) return null;

  const allChecksPassed = Object.values(checks).every(Boolean);

  const toggleCheck = (key) => {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(23, 25, 28, 0.45)',
        backdropFilter: 'blur(8px)',
        zIndex: 1300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem'
      }}
    >
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        style={{
          background: '#ffffff',
          color: 'var(--color-ink-black)',
          borderRadius: 'var(--radius-cards)',
          maxWidth: '920px',
          width: '100%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.2rem 1.6rem',
          background: '#ffffff',
          borderBottom: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'var(--color-fog-white)',
              border: '1px solid var(--border)',
              color: 'var(--color-ink-black)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Building2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--color-ink-black)' }}>
                Mesa de Cotejo Físico-Digital — Taquilla GTU (MPPEU)
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: 'var(--color-slate-gray)' }}>
                Expediente: <strong style={{ color: 'var(--color-ink-black)' }}>{record.solicitudCode || 'GTU-2026-USM-8492'}</strong> · Contrastación del pergamino original vs. extracción OCR
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--color-fog-white)',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              width: 32,
              height: 32,
              color: 'var(--color-slate-gray)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body - 2 Columns */}
        <div style={{
          padding: '1.5rem',
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem',
          background: 'var(--color-fog-white)'
        }}>
          
          {/* Column 1: Expediente Digital (OCR) */}
          <div style={{
            background: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '1.35rem',
            boxShadow: 'var(--shadow-subtle)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--color-ink-black)',
              fontSize: '0.82rem',
              fontWeight: 600,
              marginBottom: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              <FileText size={15} /> 1. Datos Digitales Registrados (OCR + PUB)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.86rem' }}>
              <div style={{ background: 'var(--color-fog-white)', padding: '0.75rem 0.9rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Titular del Título:</span>
                <p style={{ margin: '0.2rem 0 0 0', fontWeight: 600, fontSize: '0.96rem', color: 'var(--color-ink-black)' }}>
                  {record.ownerName}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div style={{ background: 'var(--color-fog-white)', padding: '0.65rem 0.8rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Cédula de Identidad:</span>
                  <p style={{ margin: '0.15rem 0 0 0', fontWeight: 600, color: 'var(--color-ink-black)' }}>{record.cedula}</p>
                </div>
                <div style={{ background: 'var(--color-fog-white)', padding: '0.65rem 0.8rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Institución:</span>
                  <p style={{ margin: '0.15rem 0 0 0', fontWeight: 600, color: 'var(--color-ink-black)' }}>Universidad Santa María</p>
                </div>
              </div>

              <div style={{ background: 'var(--color-fog-white)', padding: '0.75rem 0.9rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Grado / Carrera:</span>
                <p style={{ margin: '0.2rem 0 0 0', fontWeight: 600, color: 'var(--color-ink-black)' }}>
                  {record.documentType || 'Título de Ingeniero de Sistemas'}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
                <div style={{ background: 'var(--color-fog-white)', padding: '0.5rem 0.6rem', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Tomo</span>
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-sienna-brown)' }}>{record.tomo || 'XVIII'}</p>
                </div>
                <div style={{ background: 'var(--color-fog-white)', padding: '0.5rem 0.6rem', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Folio</span>
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-sienna-brown)' }}>{record.folio || '142'}</p>
                </div>
                <div style={{ background: 'var(--color-fog-white)', padding: '0.5rem 0.6rem', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Libro</span>
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-sienna-brown)' }}>{record.libro || '2026'}</p>
                </div>
              </div>

              <div style={{ background: 'var(--color-fog-white)', padding: '0.65rem 0.8rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Hash SHA-256 Preliminar del Expediente:</span>
                <p style={{ margin: '0.15rem 0 0 0', fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--color-slate-gray)', wordBreak: 'break-all' }}>
                  {record.hash}
                </p>
              </div>
            </div>
          </div>

          {/* Column 2: Verificación Física en Taquilla */}
          <div style={{
            background: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '1.35rem',
            boxShadow: 'var(--shadow-subtle)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--color-ink-black)',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginBottom: '1rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                <Stamp size={15} /> 2. Lista de Cotejo Físico (Pergamino Original)
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {[
                  {
                    key: 'rectorSignature',
                    title: 'Firma y Rúbrica del Rector USM',
                    desc: 'Firma manuscrita original en tinta ferrogálica con sello húmedo rectoral.'
                  },
                  {
                    key: 'secretarySignature',
                    title: 'Firma del Secretario General',
                    desc: 'Firma de refrenda del Secretario General y número de registro de acta.'
                  },
                  {
                    key: 'watermarkAndSeal',
                    title: 'Sello Troquelado y Marcas de Seguridad',
                    desc: 'Papel pergamino con fibras fluorescentes y sello seco en relieve de la USM.'
                  },
                  {
                    key: 'idCardMatch',
                    title: 'Cédula de Identidad Física Laminada',
                    desc: 'Coincidencia exacta de nombres, apellidos y número de cédula con el portador.'
                  }
                ].map(item => {
                  const checked = checks[item.key];
                  return (
                    <div
                      key={item.key}
                      onClick={() => toggleCheck(item.key)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.75rem 0.9rem',
                        background: checked ? 'rgba(16, 185, 129, 0.05)' : 'var(--color-fog-white)',
                        border: `1px solid ${checked ? '#10b981' : 'var(--border)'}`,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: '6px',
                        border: `2px solid ${checked ? 'var(--color-ink-black)' : 'var(--color-slate-gray)'}`,
                        backgroundColor: checked ? 'var(--color-ink-black)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '0.1rem'
                      }}>
                        {checked && <Check size={13} color="#ffffff" strokeWidth={3} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '0.86rem', fontWeight: 600, color: 'var(--color-ink-black)' }}>
                          {item.title}
                        </p>
                        <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.76rem', color: 'var(--color-slate-gray)', lineHeight: 1.4 }}>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Notes Input */}
              <div style={{ marginTop: '1rem' }}>
                <label style={{ fontSize: '0.76rem', color: 'var(--color-slate-gray)', display: 'block', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Observaciones del Funcionario de Taquilla (opcional):
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ej: Presentó pergamino en óptimo estado de conservación"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.9rem',
                    background: '#ffffff',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inputs)',
                    color: 'var(--color-ink-black)',
                    fontSize: '0.84rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Actions Bar */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border)'
            }}>
              <button
                onClick={() => onReject(record)}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: '#ffffff',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#b91c1c',
                  borderRadius: 'var(--radius-pill)',
                  fontWeight: 500,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                Rechazar
              </button>

              <button
                onClick={() => onConfirmCertify(record)}
                disabled={!allChecksPassed || loading}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.4rem',
                  background: allChecksPassed ? 'var(--color-ink-black)' : 'var(--color-mist-gray)',
                  color: allChecksPassed ? '#ffffff' : 'var(--color-slate-gray)',
                  border: 'none',
                  borderRadius: 'var(--radius-pill)',
                  fontWeight: 500,
                  fontSize: '0.86rem',
                  cursor: allChecksPassed && !loading ? 'pointer' : 'not-allowed',
                  boxShadow: allChecksPassed ? 'var(--shadow-subtle)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <ShieldCheck size={17} />
                {loading ? 'Anclando a Ethereum Sepolia...' : 'Aprobar Cotejo y Sellar en Blockchain (GTU)'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MPPEUCotejoModal;
