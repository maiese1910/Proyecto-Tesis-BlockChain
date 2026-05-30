import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, ShieldCheck, MapPin } from 'lucide-react';

const TrackingTimeline = ({ user }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchRecords = async () => {
      if (!user?.cedula) return;
      try {
        const response = await fetch(`${API_URL}/blockchain/records/cedula/${user.cedula}`);
        const data = await response.json();
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
    return <div style={{ color: 'var(--text-muted)' }}>Cargando estatus de trámites...</div>;
  }

  if (records.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>No tienes trámites registrados en la Blockchain aún.</p>
        <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Dirígete a "Llenar Planilla PUB" para comenzar.</p>
      </div>
    );
  }

  // Tomamos el último registro como el trámite activo
  const latestRecord = records[0];
  const isVerified = latestRecord.status === "Verificado por SAREN/MPPRE";

  const steps = [
    { title: "Prevalidación Documental", desc: "Verificación IA de requisitos", status: "completed", icon: <CheckCircle size={20} /> },
    { title: "Planilla PUB", desc: "Pago de aranceles procesado", status: "completed", icon: <CheckCircle size={20} /> },
    { title: "Registro Blockchain", desc: `Hash: ${latestRecord.hash.substring(0, 10)}...`, status: "completed", icon: <ShieldCheck size={20} /> },
    { title: "Auditoría Gubernamental", desc: "Verificación por ente jurídico", status: isVerified ? "completed" : "current", icon: isVerified ? <CheckCircle size={20} /> : <Clock size={20} /> },
    { title: "Listo para Apostilla", desc: "Documento liberado internacionalmente", status: isVerified ? "current" : "upcoming", icon: <MapPin size={20} /> }
  ];

  return (
    <div className="glass-panel" style={{ marginTop: '1.5rem' }}>
      <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
        <Clock size={22} /> Tracking de Trámite Activo
      </h3>
      
      <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
        <p style={{ fontWeight: '600', marginBottom: '0.3rem' }}>Trámite: {latestRecord.documentType}</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Actualizado: {new Date(latestRecord.timestamp).toLocaleString()}</p>
      </div>

      <div className="timeline" style={{ marginLeft: '1rem', marginTop: '1.5rem' }}>
        {steps.map((step, idx) => {
          let color = 'var(--text-muted)';
          let bgColor = 'rgba(255,255,255,0.05)';
          
          if (step.status === 'completed') {
            color = 'var(--success)';
            bgColor = 'rgba(16, 185, 129, 0.1)';
          } else if (step.status === 'current') {
            color = 'var(--primary)';
            bgColor = 'rgba(124, 58, 237, 0.1)';
          }

          return (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', position: 'relative' }}
            >
              {/* Línea conectora */}
              {idx !== steps.length - 1 && (
                <div style={{ position: 'absolute', left: '17px', top: '35px', bottom: '-15px', width: '2px', background: step.status === 'completed' ? 'var(--success)' : 'rgba(255,255,255,0.1)', zIndex: 0 }} />
              )}
              
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: bgColor, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, border: `2px solid ${color}` }}>
                {step.icon}
              </div>
              
              <div style={{ paddingTop: '0.3rem' }}>
                <h4 style={{ margin: 0, color: step.status === 'upcoming' ? 'var(--text-muted)' : 'var(--text-main)' }}>{step.title}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{step.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default TrackingTimeline;
