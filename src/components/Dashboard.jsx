import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Users, FileCheck, Clock, Award, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TrackingTimeline from './TrackingTimeline';
import { statsAPI, WS_URL } from '../services/api';

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

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState({
    usuarios_en_linea: 1,
    docs_prevalidados: 0,
    tiempo_ahorrado_hrs: 0.0,
    titulos_blockchain: 0,
    audit_log: []
  });
  const [connected, setConnected] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const sessionId = useRef(Math.random().toString(36).substring(2, 10)).current;
  const logEndRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const pollingRef = useRef(null);

  // Auto-scroll para el audit log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [stats.audit_log]);

  // ── Fetch HTTP (fallback / initial load) ──────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const data = await statsAPI.getStats(sessionId);
      if (data.stats) {
        setStats(prev => ({ ...prev, ...data.stats }));
      }
      setConnected(true);
    } catch (error) {
      console.warn('Stats fetch error:', error);
      setConnected(false);
    }
  }, [sessionId]);

  // ── WebSocket connection ──────────────────────────────────────────────
  const connectWebSocket = useCallback(() => {
    // Limpiar reconexión pendiente
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    // No reconectar si ya hay una conexión activa
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(`${WS_URL}/ws/stats`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Conectado a stats en tiempo real');
        setWsConnected(true);
        setConnected(true);

        // Parar el polling HTTP si el WS está vivo
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setStats(prev => ({ ...prev, ...data }));
          setConnected(true);
        } catch (e) {
          console.warn('[WS] Error parsing message:', e);
        }
      };

      ws.onclose = () => {
        console.log('[WS] Desconectado, reconectando en 3s...');
        setWsConnected(false);
        wsRef.current = null;

        // Iniciar polling como fallback inmediato
        if (!pollingRef.current) {
          pollingRef.current = setInterval(fetchStats, 5000);
        }

        // Reconectar WebSocket en 3 segundos
        reconnectTimerRef.current = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (err) => {
        console.warn('[WS] Error:', err);
        ws.close();
      };
    } catch (e) {
      console.warn('[WS] No se pudo crear WebSocket:', e);
      // Fallback a polling si el WebSocket no es soportado
      if (!pollingRef.current) {
        pollingRef.current = setInterval(fetchStats, 5000);
      }
    }
  }, [fetchStats]);

  useEffect(() => {
    // Hacer un fetch inmediato para data inicial
    fetchStats();

    // Intentar conectar WebSocket
    connectWebSocket();

    // Iniciar polling como fallback por si el WS tarda
    pollingRef.current = setInterval(fetchStats, 5000);

    return () => {
      // Cleanup
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchStats, connectWebSocket]);

  const statCards = [
    {
      icon: <Activity size={24} color="#10b981" />,
      title: "Usuarios en Línea",
      value: stats.usuarios_en_linea || 1,
      suffix: '',
      bg: "rgba(16, 185, 129, 0.1)",
      glow: "rgba(16, 185, 129, 0.3)",
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
        <motion.div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            Bienvenido al Portal USM
          </motion.h2>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            background: connected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${connected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: '20px', padding: '0.25rem 0.7rem', fontSize: '0.75rem',
            whiteSpace: 'nowrap',
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: connected ? '#10b981' : '#ef4444',
              boxShadow: connected ? '0 0 8px #10b981' : 'none',
              animation: connected ? 'pulseGlow 1.5s infinite alternate' : 'none',
            }} />
            {wsConnected ? 'WebSocket en vivo' : connected ? 'En vivo' : 'Desconectado'}
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

      <div className="dashboard-content-grid">
        <motion.div
          className="glass-panel"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} color="var(--primary)" /> Feed de Actividad en Vivo
          </h3>
          <div className="audit-log-container" style={{ 
            background: 'rgba(0,0,0,0.3)', 
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '12px', 
            padding: '1rem', 
            height: '280px', 
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.85rem'
          }}>
            {stats.audit_log && stats.audit_log.length > 0 ? (
              <AnimatePresence initial={false}>
                {stats.audit_log.slice().reverse().map((log, i) => (
                  <motion.div 
                    key={log + i}
                    initial={{ opacity: 0, x: -20, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    style={{ 
                      padding: '0.6rem 0', 
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      color: log.includes('ERROR') ? '#f87171' : log.includes('IA') ? '#38bdf8' : '#e2e8f0',
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'flex-start',
                      wordBreak: 'break-word',
                    }}
                  >
                    <span style={{ color: 'var(--primary)', opacity: 0.7, flexShrink: 0 }}>❯</span>
                    <span>{log}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                <Activity size={32} style={{ marginBottom: '1rem' }} />
                <p style={{ color: 'var(--text-muted)' }}>Esperando actividad en el ecosistema...</p>
              </div>
            )}
            <div ref={logEndRef} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <TrackingTimeline user={user} />
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
