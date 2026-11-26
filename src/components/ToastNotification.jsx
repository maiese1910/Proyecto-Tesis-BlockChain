import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { statsAPI } from '../services/api';

const ToastNotification = () => {
  const [notifications, setNotifications] = useState([]);
  const lastSeenLogRef = useRef(null);
  const initializedRef = useRef(false);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const pushToast = (message) => {
    if (!message || message === lastSeenLogRef.current) return;
    lastSeenLogRef.current = message;
    setNotifications(prev => {
      if (prev.length > 0 && prev[0].message === message) return prev;
      const newNotif = { id: Date.now() + Math.random(), message };
      setTimeout(() => removeNotification(newNotif.id), 5000);
      return [newNotif, ...prev].slice(0, 3);
    });
  };

  useEffect(() => {
    let active = true;

    // 1. Escuchar eventos locales en tiempo real (OCR, PUB, Cotejo MPPEU, Apostilla MPPRE)
    const handleLocalRecordEvent = (e) => {
      const rec = e?.detail;
      if (!rec) return;
      if (rec.status === 'APOSTILLADO_MPPRE' || rec.mppreVerified) {
        pushToast(`Apostilla Electrónica MPPRE emitida para ${rec.ownerName || 'tu expediente'}.`);
      } else if (rec.status === 'CERTIFICADO_MPPEU' || rec.mppeuVerified) {
        pushToast(`Legalización GTU (MPPEU) certificada on-chain para ${rec.solicitudCode || 'tu título'}.`);
      } else if (rec.sarenVerified || rec.paymentReference) {
        pushToast(`Planilla PUB SAREN liquidada (${rec.pubCode || rec.paymentReference}).`);
      } else if (rec.solicitudCode) {
        pushToast(`Solicitud GTU ${rec.solicitudCode} registrada en tu expediente.`);
      }
    };
    window.addEventListener('usm_records_updated', handleLocalRecordEvent);

    // 2. Escuchar sincronización entre pestañas vía BroadcastChannel
    let channel = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('usm_records_sync');
        channel.onmessage = (event) => {
          const rec = event.data?.record;
          if (rec && (event.data?.type === 'RECORD_UPDATED' || event.data?.type === 'RECORD_ADDED')) {
            handleLocalRecordEvent({ detail: rec });
          }
        };
      } catch (_) {}
    }

    // 3. Polling HTTP ligero (compatible con Flask y Vercel Serverless, sin WebSocket roto)
    const pollStats = async () => {
      try {
        const res = await statsAPI.getStats();
        const auditLog = res?.stats?.audit_log || res?.audit_log;
        if (!active || !Array.isArray(auditLog) || auditLog.length === 0) return;
        const latestLog = auditLog[0];
        if (!initializedRef.current) {
          initializedRef.current = true;
          lastSeenLogRef.current = latestLog;
          return;
        }
        pushToast(latestLog);
      } catch (_) {
        // Silencioso en modo offline
      }
    };

    pollStats();
    const intervalId = setInterval(pollStats, 30000);

    return () => {
      active = false;
      clearInterval(intervalId);
      window.removeEventListener('usm_records_updated', handleLocalRecordEvent);
      if (channel) {
        try { channel.close(); } catch (_) {}
      }
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      <AnimatePresence>
        {notifications.map(notif => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            style={{
              background: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-inputs)',
              padding: '1rem',
              boxShadow: 'var(--shadow-hover)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.85rem',
              maxWidth: '350px',
              borderLeft: '4px solid var(--color-sienna-brown)'
            }}
          >
            <div style={{ color: 'var(--color-sienna-brown)', background: 'var(--color-blush-peach)', padding: '0.4rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
              <Bell size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-ink-black)', marginBottom: '0.2rem' }}>
                Sistema Institucional USM
              </p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {notif.message}
              </p>
            </div>
            <button
              onClick={() => removeNotification(notif.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex'
              }}
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastNotification;
