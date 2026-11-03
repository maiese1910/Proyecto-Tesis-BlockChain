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
  const [connected, setConnected] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [localDocs, setLocalDocs] = useState([]);

  const getStatusWeight = (status) => {
    if (!status) return 0;
    const s = String(status).toUpperCase();
    if (s.includes('APOSTILL')) return 50;
    if (s.includes('CERTIFICAD')) return 40;
    if (s.includes('VERIFICAD')) return 30;
    if (s.includes('COTEJO')) return 20;
    if (s.includes('SOLICITUD') || s.includes('EMITID')) return 10;
    if (s.includes('RECHAZ')) return 5;
    return 15;
  };

  const refreshLocalDocs = useCallback(() => {
    try {
      const b = JSON.parse(localStorage.getItem('usm_blockchain_records') || '[]');
      const p = JSON.parse(localStorage.getItem('usm_pub_history') || '[]');
      const m = new Map();

      const mergeItem = (r) => {
        if (!r || !r.hash) return;
        const k = r.hash.toUpperCase();
        if (!m.has(k)) {
          m.set(k, { ...r });
        } else {
          const cur = m.get(k);
          const wCur = getStatusWeight(cur.status);
          const wNew = getStatusWeight(r.status);
          const chosenStatus = wNew >= wCur ? r.status : cur.status;
          m.set(k, {
            ...cur,
            ...r,
            status: chosenStatus,
            mppeuVerified: Boolean(cur.mppeuVerified || r.mppeuVerified || chosenStatus.includes('CERTIFICADO') || chosenStatus.includes('APOSTILLADO')),
            mppreVerified: Boolean(cur.mppreVerified || r.mppreVerified || chosenStatus.includes('APOSTILLADO')),
            apostilleNumber: r.apostilleNumber || cur.apostilleNumber || null,
            txHash: (r.txHash && !r.txHash.includes('PENDIENTE')) ? r.txHash : (cur.txHash || r.txHash)
          });
        }
      };

      const CANONICAL_INIT_RECORDS = [
        {
          hash: "0x7F9A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E9F0A",
          ownerName: "MAURO DANIEL MAIESE FERREIRA",
          cedula: "V-28.315.101",
          documentType: "Título de Ingeniero de Sistemas — USM",
          txHash: "0x4b7891a2bc3456def0123456789abcdef0123456789abcdef0123456789abcd1",
          status: "CERTIFICADO_MPPEU",
          timestamp: "2026-10-24T14:32:00Z",
          solicitudCode: "GTU-2026-USM-8492",
          mppeuVerified: true,
          mppreVerified: false,
          mppeuOfficer: "Lic. Carlos Mendoza (Analista GTU)",
          tomo: "XVIII",
          folio: "245",
          libro: "Grados 2026"
        },
        {
          hash: "0x1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B",
          ownerName: "VALENTINA SOFÍA RODRÍGUEZ SILVA",
          cedula: "V-27.890.432",
          documentType: "Título de Ingeniera Civil — USM",
          txHash: "0x9876543210abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          status: "APOSTILLADO_MPPRE",
          timestamp: "2026-10-20T09:12:00Z",
          solicitudCode: "GTU-2026-USM-5120",
          mppeuVerified: true,
          mppreVerified: true,
          mppeuOfficer: "Lic. Carlos Mendoza (Analista GTU)",
          mppreOfficer: "Dr. Fernando Morales (Cancillería)",
          apostilleNumber: "APO-VE-2026-004812",
          tomo: "XIV",
          folio: "112",
          libro: "Grados 2026"
        },
        {
          hash: "0x5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F",
          ownerName: "ALEJANDRO JOSÉ HERNÁNDEZ PEÑA",
          cedula: "V-29.456.789",
          documentType: "Título de Ingeniero Industrial — USM",
          txHash: "0xPENDIENTE_COTEJO",
          status: "PENDIENTE_COTEJO_MPPEU",
          timestamp: "2026-10-26T16:00:00Z",
          solicitudCode: "GTU-2026-USM-9304",
          mppeuVerified: false,
          mppreVerified: false,
          tomo: "XXI",
          folio: "089",
          libro: "Grados 2026"
        }
      ];

      if (b.length === 0 && p.length === 0) {
        try {
          localStorage.setItem('usm_blockchain_records', JSON.stringify(CANONICAL_INIT_RECORDS));
        } catch (_) {}
        CANONICAL_INIT_RECORDS.forEach(mergeItem);
      } else {
        b.forEach(mergeItem);
        p.forEach(mergeItem);
      }

      const sortedDocs = Array.from(m.values()).sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0));
      setLocalDocs(sortedDocs);
    } catch (_) {
      setLocalDocs([]);
    }
  }, []);
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
      if (data?.stats) {
        setStats(prev => ({ ...prev, ...data.stats }));
      }
      setConnected(true);
    } catch (error) {
      console.warn('Stats fetch error:', error);
      setConnected(true);
    }
  }, [sessionId]);

  // ── WebSocket connection (solo en desarrollo local) ───────────────────
  const connectWebSocket = useCallback(() => {
    if (typeof window === 'undefined' || (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')) {
      return;
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(`${WS_URL}/ws/stats`);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        setConnected(true);
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
        } catch (_) {}
      };

      ws.onclose = () => {
        setWsConnected(false);
        wsRef.current = null;
        if (!pollingRef.current) {
          pollingRef.current = setInterval(fetchStats, 4000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (_) {
      if (!pollingRef.current) {
        pollingRef.current = setInterval(fetchStats, 4000);
      }
    }
  }, [fetchStats]);

  useEffect(() => {
    // Hacer un fetch inmediato para data inicial
    fetchStats();

    // Intentar conectar WebSocket solo en local
    connectWebSocket();

    // Polling HTTP continuo cada 4 segundos
    pollingRef.current = setInterval(fetchStats, 4000);

    refreshLocalDocs();

    let channel;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('usm_records_sync');
        channel.onmessage = () => {
          refreshLocalDocs();
          fetchStats();
        };
      } catch (_) {}
    }

    const handleStorage = (e) => {
      if (e.key === 'usm_blockchain_records' || e.key === 'usm_pub_history') {
        refreshLocalDocs();
      }
    };
    window.addEventListener('storage', handleStorage);

    const handleCustomUpdate = () => {
      refreshLocalDocs();
      fetchStats();
    };
    window.addEventListener('usm_records_updated', handleCustomUpdate);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('usm_records_updated', handleCustomUpdate);
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

  const BASE_DOCS = 3890;
  const BASE_BLOCKCHAIN = 1250;
  const BASE_HORAS = 2450;

  const dynamicLocalDocs = localDocs.length;
  const dynamicBcDocs = localDocs.filter(r => (r.status || '').includes('CERTIFICADO') || (r.status || '').includes('APOSTILLADO') || (r.status || '').includes('Verificado')).length;

  const displayDocsCount = (stats.docs_prevalidados && stats.docs_prevalidados >= BASE_DOCS)
    ? stats.docs_prevalidados + dynamicLocalDocs
    : BASE_DOCS + Math.max(stats.docs_prevalidados || 0, dynamicLocalDocs);

  const displayBlockchainCount = (stats.titulos_blockchain && stats.titulos_blockchain >= BASE_BLOCKCHAIN)
    ? stats.titulos_blockchain + dynamicBcDocs
    : BASE_BLOCKCHAIN + Math.max(stats.titulos_blockchain || 0, dynamicBcDocs);

  const displayHoras = (stats.tiempo_ahorrado_hrs && stats.tiempo_ahorrado_hrs >= BASE_HORAS)
    ? Math.round((stats.tiempo_ahorrado_hrs + dynamicLocalDocs * 4.5) * 10) / 10
    : Math.round((BASE_HORAS + Math.max(stats.tiempo_ahorrado_hrs || 0, dynamicLocalDocs * 4.5)) * 10) / 10;

  const displayOnlineUsers = Math.max(stats.usuarios_en_linea || 1, 1);

  const DEFAULT_ECOSYSTEM_EVENTS = [
    `[12:04:18] SISTEMA: Nodo USM-ApostillaBot activo y sincronizado con GTU / MPPEU.`,
    `[11:30:00] BLOCKCHAIN: Anclaje inmutable verificado en Ethereum Sepolia para Mauro Daniel Maiese Ferreira.`,
    `[10:15:22] APOSTILLA: Trámite GTU-2026-USM-5120 apostillado exitosamente por MPPRE (APO-VE-2026-004812).`,
    `[09:42:10] COTEJO: Firma rectoral de pergamino verificada en taquilla por Lic. Carlos Mendoza (Analista GTU).`,
    `[08:50:33] OCR VISION: Digitalización forense de título completada para Valentina Sofía Rodríguez Silva.`
  ];

  const localLogs = localDocs.slice(0, 5).map(r => `[${new Date(r.createdAt || r.timestamp || Date.now()).toLocaleTimeString()}] SOLICITUD: Trámite ${r.solicitudCode || 'GTU-2026'} registrado para ${r.ownerName || r.nombre || 'Graduando'}.`);

  const displayAuditLogs = (stats.audit_log && stats.audit_log.length > 0)
    ? [...localLogs, ...stats.audit_log]
    : [...localLogs, ...DEFAULT_ECOSYSTEM_EVENTS];

  const statCards = [
    {
      icon: <Activity size={22} color="var(--color-ink-black)" />,
      title: "Usuarios en Línea",
      value: displayOnlineUsers,
      suffix: '',
      isAccent: false,
    },
    {
      icon: <FileCheck size={22} color="var(--color-ink-black)" />,
      title: "Documentos Pre-validados",
      value: displayDocsCount,
      suffix: '',
      isAccent: false,
    },
    {
      icon: <Clock size={22} color="var(--color-ink-black)" />,
      title: "Horas Ahorradas",
      value: displayHoras,
      suffix: ' Hrs',
      isAccent: false,
    },
    {
      icon: <Award size={22} color="var(--color-sienna-brown)" />,
      title: "Títulos en Blockchain",
      value: displayBlockchainCount,
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
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-pill)',
            padding: '0.35rem 0.85rem',
            fontSize: '0.78rem',
            color: 'var(--color-ink-black)',
            fontWeight: 500,
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            whiteSpace: 'nowrap',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 6px rgba(16, 185, 129, 0.7)'
            }} />
            <span style={{ fontWeight: 600 }}>En vivo</span>
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
            {displayAuditLogs && displayAuditLogs.length > 0 ? (
              <AnimatePresence initial={false}>
                {displayAuditLogs.slice().reverse().map((log, i) => (
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
