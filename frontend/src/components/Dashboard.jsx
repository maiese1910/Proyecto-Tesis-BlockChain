import React, { useState, useEffect, useRef } from 'react';
import { Users, FileCheck, Clock, Award } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

// Componente que anima un número cuando cambia
const AnimatedNumber = ({ value, suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    const from = prevValue.current;
    const to = value;
    prevValue.current = to;

    const duration = 0.8;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = (now - startTime) / (duration * 1000);
      const progress = Math.min(elapsed, 1);
      // Easing ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      setDisplayValue(parseFloat(current.toFixed(1)));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  return (
    <span>
      {typeof displayValue === 'number' && displayValue % 1 === 0
        ? displayValue.toLocaleString()
        : displayValue}
      {suffix}
    </span>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    graduandos_activos: 0,
    docs_prevalidados: 0,
    tiempo_ahorrado_hrs: 0.0,
    titulos_blockchain: 0,
    audit_log: []
  });
  const [connected, setConnected] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    // Usar el mismo puerto que el backend FastAPI (8000)
    ws.current = new WebSocket('ws://localhost:8000/ws/stats');

    ws.current.onopen = () => setConnected(true);

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setStats(prev => ({ ...prev, ...data }));
      } catch (_) {}
    };

    ws.current.onclose = () => setConnected(false);

    // Mantener viva la conexión con ping cada 20s
    const ping = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send('ping');
      }
    }, 20000);

    return () => {
      clearInterval(ping);
      ws.current?.close();
    };
  }, []);

  const statCards = [
    {
      icon: <Users size={24} color="#38bdf8" />,
      title: "Graduandos Activos",
      value: stats.graduandos_activos,
      suffix: '',
      bg: "rgba(56, 189, 248, 0.1)",
      glow: "rgba(56, 189, 248, 0.3)",
    },
    {
      icon: <FileCheck size={24} color="#10b981" />,
      title: "Documentos Pre-validados",
      value: stats.docs_prevalidados,
      suffix: '',
      bg: "rgba(16, 185, 129, 0.1)",
      glow: "rgba(16, 185, 129, 0.3)",
    },
    {
      icon: <Clock size={24} color="#f59e0b" />,
      title: "Horas Ahorradas",
      value: stats.tiempo_ahorrado_hrs,
      suffix: ' Hrs',
      bg: "rgba(245, 158, 11, 0.1)",
      glow: "rgba(245, 158, 11, 0.3)",
    },
    {
      icon: <Award size={24} color="#a78bfa" />,
      title: "Títulos en Blockchain",
      value: stats.titulos_blockchain,
      suffix: '',
      bg: "rgba(167, 139, 250, 0.1)",
      glow: "rgba(167, 139, 250, 0.3)",
    },
  ];

  return (
    <div className="view-container">
      <div className="dashboard-header">
        <motion.div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            Bienvenido al Portal USM
          </motion.h2>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: connected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${connected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: '20px', padding: '0.3rem 0.8rem', fontSize: '0.8rem',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: connected ? '#10b981' : '#ef4444',
              boxShadow: connected ? '0 0 8px #10b981' : 'none',
              animation: connected ? 'pulseGlow 1.5s infinite alternate' : 'none',
            }} />
            {connected ? 'En vivo' : 'Desconectado'}
          </div>
        </motion.div>
        <p>Plataforma Descentralizada para la Verificación de Documentos y Ejecución de Procesos Administrativos. Exclusivo para Ingeniería (10mo Semestre).</p>
      </div>

      <div className="stats-grid">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            className="stat-card glass-panel"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            style={{ boxShadow: `0 0 20px ${stat.glow}` }}
          >
            <div className="stat-icon" style={{ backgroundColor: stat.bg }}>
              {stat.icon}
            </div>
            <div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{stat.title}</p>
              <h3 style={{ fontSize: "1.8rem", fontWeight: "800" }}>
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="dashboard-content-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        <motion.div
          className="glass-panel"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={20} /> Auditoría en Tiempo Real
          </h3>
          <div className="audit-log-container" style={{ 
            background: 'rgba(0,0,0,0.2)', 
            borderRadius: '12px', 
            padding: '1rem', 
            height: '250px', 
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.9rem'
          }}>
            {stats.audit_log && stats.audit_log.length > 0 ? (
              stats.audit_log.map((log, i) => (
                <div key={i} style={{ 
                  padding: '0.4rem 0', 
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  color: log.includes('ERROR') ? '#f87171' : log.includes('IA') ? '#38bdf8' : '#e2e8f0'
                }}>
                  {log}
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '4rem' }}>Esperando actividad...</p>
            )}
          </div>
        </motion.div>

        <motion.div
          className="glass-panel"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Aviso Académico</h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '0.9rem' }}>
            Este sistema ha sido calibrado específicamente para los requisitos de la Facultad de Ingeniería de la Universidad Santa María.
            <br /><br />
            Utiliza la sección de <strong>Pre-validación</strong> antes de dirigirte a los entes gubernamentales para evitar rechazos
            por formato de planillas o timbres incorrectos.
          </p>
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(167, 139, 250, 0.1)', borderRadius: '12px', border: '1px dashed rgba(167, 139, 250, 0.3)' }}>
            <p style={{ fontSize: '0.8rem', color: '#a78bfa' }}>
              <strong>Tip para la Defensa:</strong> Mantén este panel abierto mientras realizas auditorías en otra pestaña para mostrar la reactividad del sistema al jurado.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
