import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, ShieldCheck, MapPin } from 'lucide-react';
import { blockchainAPI } from '../services/api';
import DigitalCertificate from './DigitalCertificate';
import ApostilleCertificate from './ApostilleCertificate';

const TrackingTimeline = ({ user }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCertHash, setActiveCertHash] = useState(null);
  const [activeApostilleRecord, setActiveApostilleRecord] = useState(null);
  const [requestingApostille, setRequestingApostille] = useState(false);

  const handleRequestApostille = async (record) => {
    if (!record?.hash) return;
    setRequestingApostille(true);
    try {
      const res = await blockchainAPI.mppreApostilleRecord(record.hash, {
        auditor_username: 'mppre_consular',
        auditor_cargo: 'Oficial Consular de Legalización y Apostilla',
        auditor_ente: 'MPPRE'
      });
      if (res.success) {
        const updated = {
          ...record,
          status: 'APOSTILLADO_MPPRE',
          mppreVerified: true,
          apostilleNumber: res.apostilleNumber,
          mppreOfficer: 'Oficial Consular (MPPRE)'
        };
        setRecords(prev => prev.map(r => r.hash === record.hash ? updated : r));
        setActiveApostilleRecord(updated);
      }
    } catch (err) {
      console.error('Error solicitando apostilla:', err);
      alert('Error al solicitar la Apostilla: ' + (err.message || 'Error de conexión'));
    } finally {
      setRequestingApostille(false);
    }
  };
  
  useEffect(() => {
    const fetchRecords = async () => {
      if (!user?.cedula) return;
      try {
        const data = await blockchainAPI.getRecordsByCedula(user.cedula);
        if (data.success) {
          setRecords(data.records);
        }
      } catch (err) {
        console.error("Error fetching user records:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
    const interval = setInterval(fetchRecords, 10000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.92rem' }}>
          Consultando estatus de trámites en la red...
        </p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
        <Clock size={32} color="var(--color-slate-gray)" style={{ margin: '0 auto 0.75rem auto' }} />
        <p style={{ color: 'var(--color-ink-black)', fontWeight: 500, margin: '0 0 0.35rem 0' }}>
          No tienes trámites registrados aún
        </p>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: 0 }}>
          Dirígete a "Planilla Única Bancaria (PUB)" o "Motor OCR" para comenzar tu proceso de legalización.
        </p>
      </div>
    );
  }

  // Tomamos el último registro como el trámite activo
  const latestRecord = records[0];
  const isMppeuDone = Boolean(latestRecord?.mppeuVerified || (latestRecord?.status || '').includes('CERTIFICADO_MPPEU') || (latestRecord?.status || '').includes('APOSTILLADO_MPPRE') || (latestRecord?.status || '').includes('Verificado'));
  const isMppreDone = Boolean(latestRecord?.mppreVerified || (latestRecord?.status || '').includes('APOSTILLADO_MPPRE'));
  const hashDisplay = latestRecord?.hash ? latestRecord.hash.substring(0, 10) : 'N/A';
  const docTypeDisplay = latestRecord?.documentType || 'Título Universitario USM';
  const solicitudDisplay = latestRecord?.solicitudCode || 'GTU-2026-USM-8492';
  const apostilleDisplay = latestRecord?.apostilleNumber || 'APO-VE-2026-PENDIENTE';
  const timestampDisplay = latestRecord?.timestamp ? new Date(latestRecord.timestamp).toLocaleString('es-VE') : 'N/A';

  const steps = [
    {
      title: "Etapa 1: Carga OCR y Solicitud GTU (Egresado)",
      desc: `Expediente emitido (${solicitudDisplay}) con hash SHA-256 preliminar`,
      status: "completed",
      icon: <CheckCircle size={17} />
    },
    {
      title: "Etapa 2: Cotejo en Taquilla y Anclaje Blockchain (MPPEU)",
      desc: isMppeuDone ? `Certificado con sello digital GTU (Tx: ${latestRecord?.txHash ? latestRecord.txHash.substring(0, 10) + '...' : 'Sepolia'})` : "Presenta tu título original en la taquilla de la Zona Educativa / MPPEU",
      status: isMppeuDone ? "completed" : "current",
      icon: isMppeuDone ? <CheckCircle size={17} /> : <Clock size={17} />
    },
    {
      title: "Etapa 3: Emisión de Apostilla 100% Digital (MPPRE)",
      desc: isMppreDone ? `Apostilla de La Haya N° ${apostilleDisplay} emitida y validada on-chain` : isMppeuDone ? "Trámite 100% digital en Cancillería (sin asistencia presencial)" : "Se habilitará automáticamente tras el cotejo en el MPPEU",
      status: isMppreDone ? "completed" : isMppeuDone ? "current" : "upcoming",
      icon: <MapPin size={17} />
    }
  ];

  return (
    <div className="glass-panel">
      {activeCertHash && (
        <DigitalCertificate docHash={activeCertHash} onClose={() => setActiveCertHash(null)} />
      )}
      {activeApostilleRecord && (
        <ApostilleCertificate record={activeApostilleRecord} onClose={() => setActiveApostilleRecord(null)} />
      )}

      <h3 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '1.25rem',
        fontWeight: 400,
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        color: 'var(--color-ink-black)'
      }}>
        <Clock size={18} color="var(--color-ink-black)" /> Tracking de Trámite Híbrido (MPPEU / MPPRE)
      </h3>
      
      {/* Banner de Trámite con estilo Steep */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        style={{
          marginBottom: '1.5rem',
          padding: '1.1rem 1.25rem',
          backgroundColor: 'var(--color-fog-white)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-inputs)',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <p style={{ fontWeight: 600, fontSize: '0.96rem', color: 'var(--color-ink-black)', margin: 0 }}>
                Trámite: {docTypeDisplay}
              </p>
              <span style={{ fontSize: '0.74rem', background: '#e2e8f0', color: '#334155', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                {solicitudDisplay}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
              Última actualización: {timestampDisplay} · Hash: {hashDisplay}...
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {isMppeuDone && (
              <button
                onClick={() => setActiveCertHash(latestRecord.hash)}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Certificado GTU
              </button>
            )}

            {isMppeuDone && !isMppreDone && (
              <button
                disabled={requestingApostille}
                onClick={() => handleRequestApostille(latestRecord)}
                style={{
                  background: 'var(--color-ink-black)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: requestingApostille ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                {requestingApostille ? 'Tramitando...' : '⚡ Solicitar Apostilla MPPRE (100% Digital)'}
              </button>
            )}

            {isMppreDone && (
              <button
                onClick={() => setActiveApostilleRecord(latestRecord)}
                style={{
                  background: 'var(--color-blush-peach)',
                  color: 'var(--color-sienna-brown)',
                  border: '1px solid rgba(93, 42, 26, 0.25)',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Apostilla de La Haya
              </button>
            )}

            <span style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              padding: '0.25rem 0.75rem',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: isMppreDone ? 'var(--color-blush-peach)' : isMppeuDone ? '#e0f2fe' : '#ffffff',
              color: isMppreDone ? 'var(--color-sienna-brown)' : isMppeuDone ? '#0369a1' : 'var(--color-ink-black)',
              border: isMppreDone ? '1px solid rgba(93, 42, 26, 0.2)' : isMppeuDone ? '1px solid #bae6fd' : '1px solid var(--border)'
            }}>
              {isMppreDone ? 'Apostillado 100%' : isMppeuDone ? 'Certificado MPPEU' : 'En Cotejo MPPEU'}
            </span>
          </div>
        </div>
      </motion.div>

      <div className="timeline" style={{ marginLeft: '0.75rem', marginTop: '1.25rem', borderLeft: '2px solid var(--border)' }}>
        {steps.map((step, idx) => {
          let iconColor = 'var(--color-slate-gray)';
          let iconBg = 'var(--color-mist-gray)';
          let iconBorder = 'var(--border)';
          let isCurrent = step.status === 'current';
          let isDone = step.status === 'completed';
          
          if (isDone) {
            iconColor = '#ffffff';
            iconBg = 'var(--color-ink-black)';
            iconBorder = 'var(--color-ink-black)';
          } else if (isCurrent) {
            iconColor = 'var(--color-sienna-brown)';
            iconBg = 'var(--color-blush-peach)';
            iconBorder = 'rgba(93, 42, 26, 0.3)';
          }

          return (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              whileHover={{ x: 5 }}
              style={{
                display: 'flex',
                gap: '1.15rem',
                marginBottom: '1.35rem',
                position: 'relative',
                cursor: 'default',
                padding: '0.35rem 0.5rem',
                borderRadius: '8px',
                transition: 'background-color 0.2s ease'
              }}
            >
              {/* Línea conectora */}
              {idx !== steps.length - 1 && (
                <div style={{
                  position: 'absolute',
                  left: '21px',
                  top: '36px',
                  bottom: '-16px',
                  width: '2px',
                  background: isDone ? 'var(--color-ink-black)' : 'var(--border)',
                  zIndex: 0
                }} />
              )}
              
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: iconBg,
                color: iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
                border: `1px solid ${iconBorder}`,
                boxShadow: isCurrent ? '0 0 0 3px rgba(251, 225, 209, 0.4)' : 'none',
                flexShrink: 0
              }}>
                {step.icon}
              </div>
              
              <div style={{ paddingTop: '0.2rem' }}>
                <h4 style={{
                  margin: 0,
                  fontSize: '0.94rem',
                  fontWeight: 500,
                  color: step.status === 'upcoming' ? 'var(--color-slate-gray)' : 'var(--color-ink-black)'
                }}>
                  {step.title}
                </h4>
                <p style={{
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  marginTop: '0.2rem',
                  margin: 0,
                  lineHeight: 1.4
                }}>
                  {step.desc}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default TrackingTimeline;
