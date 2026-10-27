import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, ShieldCheck, MapPin } from 'lucide-react';
import { blockchainAPI } from '../services/api';

const TrackingTimeline = ({ user }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
          Dirígete a "Planilla Única Bancaria (PUB)" para comenzar tu proceso de legalización.
        </p>
      </div>
    );
  }

  // Tomamos el último registro como el trámite activo
  const latestRecord = records[0];
  const isVerified = latestRecord?.status === "Verificado por SAREN/MPPRE";
  const hashDisplay = latestRecord?.hash ? latestRecord.hash.substring(0, 10) : 'N/A';
  const docTypeDisplay = latestRecord?.documentType || 'Documento';
  const timestampDisplay = latestRecord?.timestamp ? new Date(latestRecord.timestamp).toLocaleString('es-VE') : 'N/A';

  const steps = [
    { title: "Prevalidación Documental", desc: "Verificación digital de sellos y firmas", status: "completed", icon: <CheckCircle size={17} /> },
    { title: "Planilla PUB", desc: "Cálculo y pago de aranceles registrado", status: "completed", icon: <CheckCircle size={17} /> },
    { title: "Registro Blockchain", desc: `Hash: ${hashDisplay}...`, status: "completed", icon: <ShieldCheck size={17} /> },
    { title: "Auditoría Gubernamental", desc: "Validación por SAREN o MPPRE", status: isVerified ? "completed" : "current", icon: isVerified ? <CheckCircle size={17} /> : <Clock size={17} /> },
    { title: "Apostilla de La Haya", desc: "Certificación internacional completada", status: isVerified ? "current" : "upcoming", icon: <MapPin size={17} /> }
  ];

  return (
    <div className="glass-panel">
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
        <Clock size={18} color="var(--color-ink-black)" /> Tracking de Trámite Activo
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <p style={{ fontWeight: 500, fontSize: '0.94rem', color: 'var(--color-ink-black)', margin: 0 }}>
              Trámite: {docTypeDisplay}
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Última actualización: {timestampDisplay}
            </p>
          </div>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 500,
            padding: '0.25rem 0.75rem',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: isVerified ? 'var(--color-blush-peach)' : '#ffffff',
            color: isVerified ? 'var(--color-sienna-brown)' : 'var(--color-ink-black)',
            border: isVerified ? '1px solid rgba(93, 42, 26, 0.2)' : '1px solid var(--border)'
          }}>
            {isVerified ? 'Verificado On-Chain' : 'En Curso'}
          </span>
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
