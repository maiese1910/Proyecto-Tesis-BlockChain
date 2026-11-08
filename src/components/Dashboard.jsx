import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileCheck, Clock, Award, Activity, Calculator, ArrowRight,
  Building2, Globe, Coins, Sparkles, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TrackingTimeline from './TrackingTimeline';
import { statsAPI, blockchainAPI, WS_URL } from '../services/api';

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

// Tarifario referencial oficial para la Calculadora de Aranceles (USM / SAREN / MPPEU / MPPRE)
const DOCUMENT_TARIFFS = {
  titulo: {
    label: 'Título Universitario (Pergamino Original)',
    utSaren: 15,
    utTimbres: 10,
    eurMppre: 8.5,
    traditionalDays: 22,
    blockchainHours: 48,
    savedQueueHours: 4.5,
  },
  notas: {
    label: 'Notas Certificadas de Pregrado',
    utSaren: 10,
    utTimbres: 8,
    eurMppre: 8.5,
    traditionalDays: 18,
    blockchainHours: 36,
    savedQueueHours: 4.0,
  },
  acta: {
    label: 'Acta de Grado Original',
    utSaren: 8,
    utTimbres: 6,
    eurMppre: 8.5,
    traditionalDays: 15,
    blockchainHours: 24,
    savedQueueHours: 3.5,
  },
  pensum: {
    label: 'Pensum y Programas Sinópticos',
    utSaren: 12,
    utTimbres: 10,
    eurMppre: 8.5,
    traditionalDays: 25,
    blockchainHours: 48,
    savedQueueHours: 5.0,
  },
  fondo_negro: {
    label: 'Autenticación de Fondo Negro',
    utSaren: 8,
    utTimbres: 5,
    eurMppre: 8.5,
    traditionalDays: 14,
    blockchainHours: 24,
    savedQueueHours: 3.0,
  },
};

const UT_VALUE_BS = 9.0; // Valor referencial UT
const BCV_EUR_RATE = 46.8; // Tasa referencial oficial BCV (Bs./EUR)

const Dashboard = ({ user, onNavigate, onVerifyHash }) => {
  const [stats, setStats] = useState({
    usuarios_en_linea: 1,
    docs_prevalidados: 0,
    tiempo_ahorrado_hrs: 0.0,
    titulos_blockchain: 0,
    audit_log: []
  });
  const [localDocs, setLocalDocs] = useState([]);
  const [selectedFeedFilter, setSelectedFeedFilter] = useState('ALL');

  // Estados de la Calculadora Interactiva de Trámite y Aranceles
  const [calcDocType, setCalcDocType] = useState('titulo');
  const [calcQty, setCalcQty] = useState(1);
  const [calcRegimen, setCalcRegimen] = useState('haya'); // 'haya' | 'consular'

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

  const refreshLocalDocs = useCallback(async () => {
    try {
      const b = JSON.parse(localStorage.getItem('usm_blockchain_records') || '[]');
      const p = JSON.parse(localStorage.getItem('usm_pub_history') || '[]');
      const m = new Map();

      const mergeItem = (r) => {
        if (!r || !(r.hash || r.blockchainHash)) return;
        const hashVal = r.hash || r.blockchainHash;
        const k = hashVal.toUpperCase();
        if (!m.has(k)) {
          m.set(k, { ...r, hash: hashVal });
        } else {
          const cur = m.get(k);
          const wCur = getStatusWeight(cur.status);
          const wNew = getStatusWeight(r.status);
          const chosenStatus = wNew >= wCur ? r.status : cur.status;
          const stStr = String(chosenStatus || '').toUpperCase();
          const rTx = String(r.txHash || r.tx_hash || '');
          const curTx = String(cur.txHash || cur.tx_hash || '');
          const chosenTx = (rTx && !rTx.includes('PENDIENTE'))
            ? rTx
            : ((curTx && !curTx.includes('PENDIENTE')) ? curTx : (rTx || curTx || '0xPENDIENTE_COTEJO'));

          m.set(k, {
            ...cur,
            ...r,
            hash: hashVal,
            status: chosenStatus || 'PENDIENTE_COTEJO_MPPEU',
            mppeuVerified: Boolean(cur.mppeuVerified || r.mppeuVerified || stStr.includes('CERTIFICADO') || stStr.includes('APOSTILLADO')),
            mppreVerified: Boolean(cur.mppreVerified || r.mppreVerified || stStr.includes('APOSTILLADO')),
            apostilleNumber: r.apostilleNumber || cur.apostilleNumber || null,
            txHash: chosenTx
          });
        }
      };

      b.forEach(mergeItem);
      p.forEach(mergeItem);

      if (user?.cedula) {
        try {
          const res = await blockchainAPI.getRecordsByCedula(user.cedula);
          if (res?.success && Array.isArray(res.records)) {
            res.records.forEach(mergeItem);
          }
        } catch (_) {}
      }

      const sortedDocs = Array.from(m.values()).sort(
        (a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0)
      );

      const userCedClean = (user?.cedula || '').replace(/\D/g, '');
      const userNameNorm = (user?.nombre || user?.ownerName || '').toLowerCase().trim();
      const userEmailNorm = (user?.email || '').toLowerCase().trim();

      const userDocs = sortedDocs.filter(r => {
        if (!r) return false;
        const rCed = (r.cedula || r.formData?.cedula || '').replace(/\D/g, '');
        const rAccCed = (r.accountCedula || r.account_cedula || '').replace(/\D/g, '');
        if (userCedClean && (rCed === userCedClean || rAccCed === userCedClean)) {
          return true;
        }
        const rAccName = (r.accountNombre || r.account_nombre || '').toLowerCase().trim();
        if (userNameNorm && rAccName && (rAccName.includes(userNameNorm) || userNameNorm.includes(rAccName))) {
          return true;
        }
        const rAccEmail = (r.accountEmail || r.account_email || '').toLowerCase().trim();
        if (userEmailNorm && rAccEmail && userEmailNorm === rAccEmail) {
          return true;
        }
        const rName = (r.ownerName || r.owner_name || r.nombre || r.formData?.nombre_completo || '').toLowerCase().trim();
        if (userNameNorm && rName && (rName.includes(userNameNorm) || userNameNorm.includes(rName))) {
          return true;
        }
        return false;
      });

      setLocalDocs(userDocs);
    } catch (_) {
      setLocalDocs([]);
    }
  }, [user]);

  const sessionId = useRef(
    sessionStorage.getItem('usm_session_id') ||
    (() => {
      const id = Math.random().toString(36).substring(2, 10);
      sessionStorage.setItem('usm_session_id', id);
      return id;
    })()
  ).current;
  const logContainerRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const pollingRef = useRef(null);

  const fetchStats = useCallback(async () => {
    try {
      const data = await statsAPI.getStats(sessionId);
      if (data?.stats) {
        setStats(prev => ({ ...prev, ...data.stats }));
      }
    } catch (_) {}
  }, [sessionId]);

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
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setStats(prev => ({ ...prev, ...data }));
        } catch (_) {}
      };

      ws.onclose = () => {
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
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    fetchStats();
    connectWebSocket();
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
  }, [fetchStats, connectWebSocket, refreshLocalDocs]);

  const displayDocsCount = localDocs.length;
  const displayBlockchainCount = localDocs.filter(r =>
    (r.status || '').includes('CERTIFICADO') ||
    (r.status || '').includes('APOSTILLADO') ||
    (r.status || '').includes('Verificado') ||
    (r.txHash && String(r.txHash).startsWith('0x') && !String(r.txHash).includes('PENDIENTE'))
  ).length;
  const displayHoras = Math.round(displayDocsCount * 4.5 * 10) / 10;
  const displayOnlineUsers = Math.max(stats.usuarios_en_linea || 1, 1);

  // Construir bitácora detallada de eventos para los trámites del usuario
  const filteredDocsForFeed = selectedFeedFilter === 'ALL'
    ? localDocs
    : localDocs.filter(r => (r.solicitudCode || r.hash) === selectedFeedFilter);

  const detailedLogs = [];
  filteredDocsForFeed.forEach(r => {
    const timeStr = new Date(r.createdAt || r.timestamp || Date.now()).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    const code = r.solicitudCode || 'GTU-2026-USM';
    const docName = r.documentType || r.tramite || 'Título Universitario';
    const st = String(r.status || '').toUpperCase();

    detailedLogs.push(`[${timeStr}] [ESTACIÓN 1 - USM] Expediente ${code} (${docName}) digitalizado con Hash SHA-256: ${(r.hash || '').slice(0, 14)}...`);
    if (r.solicitudCode || r.sarenVerified) {
      detailedLogs.push(`[${timeStr}] [ESTACIÓN 2 - SAREN] Planilla Única Bancaria (${code}) generada y vinculada a Cédula ${r.cedula || user?.cedula}.`);
    }
    if (r.mppeuVerified || st.includes('CERTIFICADO') || st.includes('APOSTILLADO')) {
      detailedLogs.push(`[${timeStr}] [ESTACIÓN 3 - MPPEU] Sello Electrónico GTU acreditado y transacción anclada en Sepolia (${(r.txHash || '0xSepolia').slice(0, 14)}...).`);
    }
    if (st === 'PENDIENTE_APOSTILLA_MPPRE') {
      detailedLogs.push(`[${timeStr}] [ESTACIÓN 4 - MPPRE] Solicitud de Apostilla radicada ante Cancillería para ${r.countryDestiny || r.country_destiny || 'Exterior'}.`);
    }
    if (r.mppreVerified || st.includes('APOSTILLADO')) {
      detailedLogs.push(`[${timeStr}] [ESTACIÓN 4 - MPPRE] Apostilla de La Haya N° ${r.apostilleNumber || 'APO-VE-2026'} emitida y sellada en Blockchain.`);
    }
  });

  const displayAuditLogs = detailedLogs.length > 0
    ? detailedLogs
    : (user?.nombre
      ? [`[${new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}] SESIÓN ACTIVA: Bienvenido al portal USM, ${user.nombre} (${user.cedula || 'Graduando'}). Tu expediente personal está listo.`]
      : []);

  // Cálculos de la Calculadora Interactiva de Aranceles y Tiempos
  const selectedTariff = DOCUMENT_TARIFFS[calcDocType] || DOCUMENT_TARIFFS.titulo;
  const qty = Math.max(1, Math.min(10, Number(calcQty) || 1));
  const totalUtSaren = selectedTariff.utSaren * qty;
  const totalUtTimbres = selectedTariff.utTimbres * qty;
  const totalBsSarenTimbres = (totalUtSaren + totalUtTimbres) * UT_VALUE_BS;
  const mppreMultiplier = calcRegimen === 'haya' ? 1 : 1.35;
  const totalEurMppre = +(selectedTariff.eurMppre * mppreMultiplier * qty).toFixed(2);
  const totalBsMppre = +(totalEurMppre * BCV_EUR_RATE).toFixed(2);
  const grandTotalBs = +(totalBsSarenTimbres + totalBsMppre).toFixed(2);
  const grandTotalEur = +(grandTotalBs / BCV_EUR_RATE).toFixed(2);
  const totalSavedQueueHours = +(selectedTariff.savedQueueHours * qty).toFixed(1);

  const statCards = [
    {
      icon: <Activity size={22} color="var(--color-ink-black)" />,
      title: 'Usuarios en Línea',
      value: displayOnlineUsers,
      suffix: '',
      isAccent: false,
    },
    {
      icon: <FileCheck size={22} color="var(--color-ink-black)" />,
      title: 'Mis Documentos Pre-validados',
      value: displayDocsCount,
      suffix: '',
      isAccent: false,
    },
    {
      icon: <Clock size={22} color="var(--color-ink-black)" />,
      title: 'Mis Horas Ahorradas',
      value: displayHoras,
      suffix: ' Hrs',
      isAccent: false,
    },
    {
      icon: <Award size={22} color="var(--color-sienna-brown)" />,
      title: 'Mis Títulos en Blockchain',
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
            Bienvenido al Portal USM{user?.nombre ? `, ${user.nombre.split(' ')[0]}` : ''}
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
            <span style={{ fontWeight: 600 }}>Expediente en vivo · {user?.cedula || 'USM'}</span>
          </div>
        </motion.div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.55 }}>
          Plataforma Descentralizada para la Verificación de Documentos y Ejecución de Procesos Administrativos ({user?.carrera || 'Ingeniería'} — {user?.semestre || '10mo Semestre'}).
        </p>
      </div>

      {/* 4 Tarjetas de Métricas */}
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
                fontSize: '0.84rem',
                margin: '0 0 0.2rem 0',
                fontWeight: stat.isAccent ? 500 : 450
              }}>
                {stat.title}
              </p>
              <h3 style={{
                fontSize: '1.9rem',
                fontWeight: '400',
                fontFamily: 'var(--font-serif)',
                color: stat.isAccent ? 'var(--color-sienna-brown)' : 'var(--color-ink-black)',
                margin: 0
              }}>
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Grid Principal: Feed Personal + Tracking de 4 Estaciones */}
      <div className="dashboard-content-grid">
        <motion.div
          className="glass-panel"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <h3 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.25rem',
              fontWeight: 400,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              color: 'var(--color-ink-black)'
            }}>
              <Activity size={18} color="var(--color-ink-black)" /> Bitácora de Mi Expediente
            </h3>

            {localDocs.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Filter size={13} color="var(--color-slate-gray)" />
                <select
                  value={selectedFeedFilter}
                  onChange={(e) => setSelectedFeedFilter(e.target.value)}
                  style={{
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.76rem',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--color-fog-white)',
                    color: 'var(--color-ink-black)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <option value="ALL">Todos mis trámites ({localDocs.length})</option>
                  {localDocs.map((d, idx) => (
                    <option key={d.hash || idx} value={d.solicitudCode || d.hash}>
                      {d.solicitudCode || `Trámite ${idx + 1}`} — {(d.documentType || 'Título').slice(0, 22)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div
            ref={logContainerRef}
            className="audit-log-container"
            style={{
              backgroundColor: 'var(--color-fog-white)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-inputs)',
              padding: '1.1rem',
              height: '310px',
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.82rem'
            }}
          >
            {displayAuditLogs && displayAuditLogs.length > 0 ? (
              <AnimatePresence initial={false}>
                {displayAuditLogs.slice().reverse().map((log, i) => (
                  <motion.div
                    key={log + i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ x: 4, backgroundColor: '#ffffff' }}
                    style={{
                      padding: '0.55rem 0.5rem',
                      borderRadius: '8px',
                      borderBottom: '1px solid var(--border)',
                      color: log.includes('MPPRE') || log.includes('MPPEU') ? 'var(--color-sienna-brown)' : 'var(--color-ink-black)',
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
                <p style={{ color: 'var(--color-slate-gray)', fontSize: '0.88rem' }}>Esperando actividad en tu expediente...</p>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
        >
          <TrackingTimeline user={user} onNavigate={onNavigate} onVerifyHash={onVerifyHash} />
        </motion.div>
      </div>

      {/* ─── CALCULADORA INTERACTIVA DE ARANCELES, TIEMPOS Y LEGALIZACIÓN (USM / SAREN / MPPEU / MPPRE) ─── */}
      <motion.div
        className="glass-panel"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        style={{ marginTop: '1.5rem' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.05em', color: 'var(--color-sienna-brown)',
              backgroundColor: 'var(--color-blush-peach)', padding: '0.2rem 0.65rem',
              borderRadius: 'var(--radius-pill)', marginBottom: '0.4rem'
            }}>
              <Calculator size={12} /> Simulador Financiero y Operativo
            </span>
            <h3 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.35rem',
              fontWeight: 400,
              margin: 0,
              color: 'var(--color-ink-black)'
            }}>
              Calculadora de Aranceles Fiscales y Tiempo de Apostilla
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
              Estima al instante los derechos de Registro Principal (SAREN), timbres fiscales, tasa consular (MPPRE) y el ahorro de tiempo frente al trámite presencial tradicional.
            </p>
          </div>

          {onNavigate && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => onNavigate('ocr')}
                className="btn-ghost"
                style={{ padding: '0.55rem 0.95rem', fontSize: '0.8rem' }}
              >
                1. Escanear Documento (OCR)
              </button>
              <button
                type="button"
                onClick={() => onNavigate('pub')}
                className="send-btn"
                style={{ padding: '0.55rem 1rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                2. Liquidar Planilla PUB <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Controles del Simulador */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.25rem',
          padding: '1rem',
          backgroundColor: 'var(--color-fog-white)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-inputs)'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.35rem' }}>
              Tipo de Documento Académico
            </label>
            <select
              value={calcDocType}
              onChange={(e) => setCalcDocType(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: '#ffffff',
                color: 'var(--color-ink-black)',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              {Object.entries(DOCUMENT_TARIFFS).map(([key, item]) => (
                <option key={key} value={key}>{item.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.35rem' }}>
              Cantidad de Ejemplares ({qty})
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <input
                type="range"
                min="1"
                max="10"
                value={qty}
                onChange={(e) => setCalcQty(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--color-ink-black)', cursor: 'pointer' }}
              />
              <span style={{
                minWidth: '38px',
                textAlign: 'center',
                padding: '0.45rem 0.6rem',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.86rem'
              }}>
                {qty}
              </span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.35rem' }}>
              Régimen Internacional del País Destino
            </label>
            <select
              value={calcRegimen}
              onChange={(e) => setCalcRegimen(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: '#ffffff',
                color: 'var(--color-ink-black)',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <option value="haya">Convenio de La Haya (Apostilla Electrónica)</option>
              <option value="consular">No Miembro (Legalización Consular MPPRE)</option>
            </select>
          </div>
        </div>

        {/* Resultados de la Calculadora en 4 tarjetas */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem'
        }}>
          <div style={{
            padding: '1rem 1.15rem',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-inputs)'
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Building2 size={14} /> Arancel SAREN + Timbres
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', color: 'var(--color-ink-black)', marginTop: '0.25rem' }}>
              Bs. {totalBsSarenTimbres.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              {totalUtSaren} UT Registro + {totalUtTimbres} UT Timbres Fiscales
            </div>
          </div>

          <div style={{
            padding: '1rem 1.15rem',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-inputs)'
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Globe size={14} /> Tasa Consular MPPRE
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', color: 'var(--color-ink-black)', marginTop: '0.25rem' }}>
              Bs. {totalBsMppre.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Ref. € {totalEurMppre.toFixed(2)} BCV ({calcRegimen === 'haya' ? 'Apostilla Haya' : 'Legalización'})
            </div>
          </div>

          <div style={{
            padding: '1rem 1.15rem',
            backgroundColor: 'var(--color-blush-peach)',
            border: '1px solid rgba(93, 42, 26, 0.2)',
            borderRadius: 'var(--radius-inputs)',
            color: 'var(--color-sienna-brown)'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Coins size={14} /> Total Estimado a Liquidar
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 600, marginTop: '0.25rem' }}>
              Bs. {grandTotalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.74rem', opacity: 0.9, marginTop: '0.15rem' }}>
              Equivalente aprox: € {grandTotalEur.toFixed(2)} (Gas Sepolia: 0.00 ETH p/estudiante)
            </div>
          </div>

          <div style={{
            padding: '1rem 1.15rem',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-inputs)'
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Sparkles size={14} color="#10b981" /> Optimización de Tiempo
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', color: '#047857', marginTop: '0.25rem' }}>
              ~{selectedTariff.blockchainHours} hrs vs. {selectedTariff.traditionalDays} días
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Ahorro directo: <strong>{totalSavedQueueHours} hrs</strong> de fila presencial
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
