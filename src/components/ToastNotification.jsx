import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';

const ToastNotification = () => {
  const [notifications, setNotifications] = useState([]);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    // Conectar al WebSocket global de estadísticas
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    const websocket = new WebSocket(`${WS_URL}/ws/stats`);
    let isInitialMessage = true;
    let lastSeenLog = null;

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.audit_log && data.audit_log.length > 0) {
          const latestLog = data.audit_log[0];

          // Omitir el snapshot inicial histórico para no disparar notificación falsa al entrar
          if (isInitialMessage) {
            isInitialMessage = false;
            lastSeenLog = latestLog;
            return;
          }

          if (latestLog === lastSeenLog) return;
          lastSeenLog = latestLog;

          setNotifications(prev => {
            // Evitar duplicados exactos
            if (prev.length > 0 && prev[0].message === latestLog) {
              return prev;
            }

            const newNotif = {
              id: Date.now(),
              message: latestLog
            };

            // Auto-remover después de 5 segundos
            setTimeout(() => {
              removeNotification(newNotif.id);
            }, 5000);

            return [newNotif, ...prev].slice(0, 3); // Máximo 3 visibles
          });
        }
      } catch (e) {
        console.error('Error parseando stats en Toast:', e);
      }
    };

    setWs(websocket);

    return () => {
      if (websocket.readyState === 1) {
        websocket.close();
      }
    };
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

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
                Sistema Gubernamental
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
