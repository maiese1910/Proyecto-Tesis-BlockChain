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
  const sessionId = useRef(
    sessionStorage.getItem('usm_session_id') || 
    (() => {
      const id = Math.random().toString(36).substring(2, 10);
      sessionStorage.setItem('usm_session_id', id);
      return id;
    })()
  ).current;
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
      icon: <Activity size={22} color="var(--color-ink-black)" />,
      title: "Usuarios en Línea",
      value: stats.usuarios_en_linea || 1,
      suffix: '',
      isAccent: false,
    },
    {
      icon: <FileCheck size={22} color="var(--color-ink-black)" />,
      title: "Documentos Pre-validados",
      value: stats.docs_prevalidados,
      suffix: '',
      isAccent: false,
    },
    {
      icon: <Clock size={22} color="var(--color-ink-black)" />,
      title: "Horas Ahorradas",
      value: stats.tiempo_ahorrado_hrs,
      suffix: ' Hrs',
      isAccent: false,
    },
    {
      icon: <Award size={22} color="var(--color-sienna-brown)" />,
      title: "Títulos en Blockchain",
      value: stats.titulos_blockchain,
      suffix: '',
      isAccent: true,
    },
  ];

  return (
    <div className="view-container">
      <div className="dashboard-header">
        <motion.div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <motion.h2 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            Bienvenido al Portal USM
          </motion.h2>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.45rem',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-pill)',
            padding: '0.3rem 0.85rem',
            fontSize: '0.78rem',
            color: 'var(--color-ink-black)',
            fontWeight: 500,
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            whiteSpace: 'nowrap',
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              backgroundColor: connected ? 'var(--color-ink-black)' : 'var(--color-slate-gray)',
            }} />
            {wsConnected ? 'WebSocket en vivo' : connected ? 'En vivo' : 'Desconectado'}
          </div>
        </motion.div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.02rem', lineHeight: 1.55 }}>
          Plataforma Descentralizada para la Verificación de Documentos y Ejecución de Procesos Administrativos. Exclusivo para Ingeniería (10mo Semestre).
        </p>
      </div>

      <div className="stats-grid">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            className={`stat-card ${stat.isAccent ? 'card-peach' : ''}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ y: -6, scale: 1.015 }}
            style={stat.isAccent ? {
              backgroundColor: 'var(--color-blush-peach)',
              color: 'var(--color-sienna-brown)',
              border: '1px solid rgba(93, 42, 26, 0.15)'
            } : {}}
          >
            <div
              className="stat-icon"
              style={{
                backgroundColor: stat.isAccent ? '#ffffff' : 'var(--color-mist-gray)',
                border: stat.isAccent ? '1px solid rgba(93, 42, 26, 0.15)' : 'none'
              }}
            >
              {stat.icon}
            </div>
            <div>
              <p style={{
                color: stat.isAccent ? 'var(--color-sienna-brown)' : 'var(--text-secondary)',
                fontSize: "0.85rem",
                margin: '0 0 0.2rem 0',
                fontWeight: stat.isAccent ? 500 : 450
              }}>
                {stat.title}
              </p>
              <h3 style={{
                fontSize: "1.9rem",
                fontWeight: "400",
                fontFamily: "var(--font-serif)",
                color: stat.isAccent ? 'var(--color-sienna-brown)' : 'var(--color-ink-black)',
                margin: 0
              }}>
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="dashboard-content-grid">
        <motion.div
          className="glass-panel"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
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
            <Activity size={18} color="var(--color-ink-black)" /> Feed de Actividad en Vivo
          </h3>
          <div className="audit-log-container" style={{ 
            backgroundColor: 'var(--color-fog-white)', 
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-inputs)', 
            padding: '1.15rem', 
            height: '280px', 
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.84rem'
          }}>
            {stats.audit_log && stats.audit_log.length > 0 ? (
              <AnimatePresence initial={false}>
                {stats.audit_log.slice().reverse().map((log, i) => (
                  <motion.div 
                    key={log + i}
                    initial={{ opacity: 0, y: 4, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    whileHover={{ x: 4, backgroundColor: '#ffffff' }}
                    style={{ 
                      padding: '0.55rem 0.5rem', 
                      borderRadius: '8px',
                      borderBottom: '1px solid var(--border)',
                      color: log.includes('ERROR') ? 'var(--color-sienna-brown)' : 'var(--color-ink-black)',
                      display: 'flex',
                      gap: '0.6rem',
                      alignItems: 'flex-start',
                      wordBreak: 'break-word',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <span style={{ color: 'var(--color-slate-gray)', opacity: 0.8, flexShrink: 0 }}>❯</span>
                    <span>{log}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
                <Activity size={28} color="var(--color-slate-gray)" style={{ marginBottom: '0.75rem' }} />
                <p style={{ color: 'var(--color-slate-gray)', fontSize: '0.88rem' }}>Esperando actividad en el ecosistema...</p>
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
