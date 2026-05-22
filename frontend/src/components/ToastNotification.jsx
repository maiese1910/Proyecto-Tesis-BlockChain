import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';

const ToastNotification = () => {
  const [notifications, setNotifications] = useState([]);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    // Conectar al WebSocket global de estadísticas
    const websocket = new WebSocket('ws://localhost:8000/ws/stats');
    let lastLogCount = 0;

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.audit_log && data.audit_log.length > 0) {
          // Detectar nuevos logs comparando tamaños si es la primera vez, 
          // o simplemente revisando si hay logs diferentes.
          // Para simplificar, mostraremos el último log si es nuevo.
          const latestLog = data.audit_log[0];
          
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
              background: 'var(--surface)',
              border: '1px solid rgba(124, 58, 237, 0.4)',
              borderRadius: '12px',
              padding: '1rem',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
              maxWidth: '350px',
              borderLeft: '4px solid var(--primary)'
            }}
          >
            <div style={{ color: 'var(--primary)', marginTop: '2px' }}>
              <Bell size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                Sistema Gubernamental
              </p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                {notif.message}
              </p>
            </div>
            <button 
              onClick={() => removeNotification(notif.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
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
