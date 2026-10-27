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
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(6px)',
        zIndex: 1300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <motion.div
        initial={{ y: 25, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 25, opacity: 0, scale: 0.97 }}
        style={{
          background: '#0f172a',
          color: '#ffffff',
          borderRadius: '16px',
          maxWidth: '920px',
          width: '100%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
          border: '1px solid #1e293b',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.1rem 1.5rem',
          background: '#090d16',
          borderBottom: '1px solid #1e293b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              background: '#0284c7',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Building2 size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                Mesa de Cotejo Físico-Digital — Taquilla GTU (MPPEU)
              </h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#94a3b8' }}>
                Expediente: <strong style={{ color: '#38bdf8' }}>{record.solicitudCode || 'GTU-2026-USM-8492'}</strong> · Contrastación del pergamino original vs. extracción OCR
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body - 2 Columns */}
        <div style={{
          padding: '1.5rem',
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem'
        }}>
          
          {/* Column 1: Expediente Digital (OCR) */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '1.25rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#38bdf8',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <FileText size={16} /> 1. Datos Digitales Registrados (OCR + PUB)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.86rem' }}>
              <div style={{ background: '#090d16', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Titular del Título:</span>
                <p style={{ margin: '0.2rem 0 0 0', fontWeight: 600, fontSize: '0.98rem', color: '#ffffff' }}>
                  {record.ownerName}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div style={{ background: '#090d16', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Cédula de Identidad:</span>
                  <p style={{ margin: '0.15rem 0 0 0', fontWeight: 600, color: '#38bdf8' }}>{record.cedula}</p>
                </div>
                <div style={{ background: '#090d16', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Institución:</span>
                  <p style={{ margin: '0.15rem 0 0 0', fontWeight: 600, color: '#ffffff' }}>Universidad Santa María</p>
                </div>
              </div>

              <div style={{ background: '#090d16', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Grado / Carrera:</span>
                <p style={{ margin: '0.2rem 0 0 0', fontWeight: 600, color: '#f8fafc' }}>
                  {record.documentType || 'Título de Ingeniero de Sistemas'}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
                <div style={{ background: '#090d16', padding: '0.5rem 0.6rem', borderRadius: '8px', border: '1px solid #1e293b', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Tomo</span>
                  <p style={{ margin: 0, fontWeight: 700, color: '#fbbf24' }}>{record.tomo || 'XVIII'}</p>
                </div>
                <div style={{ background: '#090d16', padding: '0.5rem 0.6rem', borderRadius: '8px', border: '1px solid #1e293b', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Folio</span>
                  <p style={{ margin: 0, fontWeight: 700, color: '#fbbf24' }}>{record.folio || '142'}</p>
                </div>
                <div style={{ background: '#090d16', padding: '0.5rem 0.6rem', borderRadius: '8px', border: '1px solid #1e293b', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Libro</span>
                  <p style={{ margin: 0, fontWeight: 700, color: '#fbbf24' }}>{record.libro || '2026'}</p>
                </div>
              </div>

              <div style={{ background: '#090d16', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Hash SHA-256 Preliminar del Expediente:</span>
                <p style={{ margin: '0.15rem 0 0 0', fontFamily: 'monospace', fontSize: '0.72rem', color: '#a78bfa', wordBreak: 'break-all' }}>
                  {record.hash}
                </p>
              </div>
            </div>
          </div>

          {/* Column 2: Verificación Física en Taquilla */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#34d399',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '1rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <Stamp size={16} /> 2. Lista de Cotejo Físico (Pergamino Original)
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
                        background: checked ? 'rgba(16, 185, 129, 0.1)' : '#090d16',
                        border: `1px solid ${checked ? 'rgba(16, 185, 129, 0.35)' : '#1e293b'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: '4px',
                        border: `2px solid ${checked ? '#10b981' : '#64748b'}`,
                        backgroundColor: checked ? '#10b981' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '0.1rem'
                      }}>
                        {checked && <Check size={14} color="#ffffff" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '0.86rem', fontWeight: 600, color: checked ? '#ffffff' : '#94a3b8' }}>
                          {item.title}
                        </p>
                        <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Notes Input */}
              <div style={{ marginTop: '0.9rem' }}>
                <label style={{ fontSize: '0.76rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
                  Observaciones del Funcionario de Taquilla (opcional):
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ej: Presentó pergamino en óptimo estado de conservación"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    background: '#090d16',
                    border: '1px solid #1e293b',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.82rem',
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
              borderTop: '1px solid #334155'
            }}>
              <button
                onClick={() => onReject(record)}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.82rem',
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
                  padding: '0.75rem 1.25rem',
                  background: allChecksPassed
                    ? 'linear-gradient(135deg, #0284c7, #0ea5e9)'
                    : '#334155',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: allChecksPassed && !loading ? 'pointer' : 'not-allowed',
                  opacity: allChecksPassed && !loading ? 1 : 0.6,
                  boxShadow: allChecksPassed ? '0 4px 14px rgba(2, 132, 199, 0.4)' : 'none'
                }}
              >
                <ShieldCheck size={18} />
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
