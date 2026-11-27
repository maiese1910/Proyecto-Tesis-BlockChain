import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, CheckCheck, Mail, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { notificationsAPI } from '../services/api';

const NotificationBell = ({ role = 'student', cedula = '', ente = '' }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const containerRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await notificationsAPI.getNotifications({ role, cedula, ente });
      if (res?.success && Array.isArray(res.notifications)) {
        setItems(res.notifications);
        setUnreadCount(Number(res.unreadCount || 0));
        setEmailConfigured(Boolean(res.emailConfigured));
      }
    } catch (_) {}
  }, [role, cedula, ente]);

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 12000);
    window.addEventListener('usm_records_updated', loadNotifications);
    let ch = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        ch = new BroadcastChannel('usm_records_sync');
        ch.onmessage = () => loadNotifications();
      } catch (_) {}
    }
    return () => {
      clearInterval(timer);
      window.removeEventListener('usm_records_updated', loadNotifications);
      if (ch) ch.close();
    };
  }, [loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markRead({ role, cedula, ente });
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (_) {}
  };

  const renderIcon = (sev) => {
    if (sev === 'success') return <CheckCircle2 size={15} color="#059669" style={{ flexShrink: 0, marginTop: 2 }} />;
    if (sev === 'danger') return <AlertTriangle size={15} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />;
    if (sev === 'warning') return <AlertTriangle size={15} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />;
    return <Info size={15} color="#0284c7" style={{ flexShrink: 0, marginTop: 2 }} />;
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={() => { setOpen((p) => !p); loadNotifications(); }}
        aria-label="Centro de Notificaciones"
        title="Notificaciones de expedientes y correo"
        style={{
          position: 'relative',
          background: '#ffffff',
          border: '1px solid var(--border)',
          color: 'var(--color-ink-black)',
          borderRadius: 'var(--radius-pill)',
          padding: '0.45rem 0.8rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          boxShadow: 'var(--shadow-subtle)',
        }}
      >
        <Bell size={15} />
        <span style={{ display: 'inline' }}>Alertas</span>
        {unreadCount > 0 && (
          <span style={{
            background: '#dc2626',
            color: '#ffffff',
            borderRadius: '999px',
            minWidth: '18px',
            height: '18px',
            padding: '0 5px',
            fontSize: '0.68rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 'min(360px, 90vw)',
            background: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            boxShadow: '0 20px 45px rgba(23, 25, 28, 0.16)',
            zIndex: 9500,
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '0.85rem 1rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--color-fog-white)',
          }}>
            <div>
              <strong style={{ fontSize: '0.88rem', color: 'var(--color-ink-black)', display: 'block' }}>
                Notificaciones {role === 'admin' ? `(${ente || 'GTU/MPPRE'})` : 'de Mi Expediente'}
              </strong>
              <span style={{ fontSize: '0.71rem', color: emailConfigured ? '#047857' : 'var(--color-slate-gray)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <Mail size={11} /> {emailConfigured ? 'Alertas por Correo Activas' : 'Alertas In-App Activas'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  style={{ background: 'none', border: 'none', color: 'var(--color-sienna-brown)', fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  <CheckCheck size={13} /> Leídas
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-slate-gray)', cursor: 'pointer', padding: 2 }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {items.length === 0 ? (
              <div style={{ padding: '1.6rem 1rem', textAlign: 'center', color: 'var(--color-slate-gray)', fontSize: '0.82rem' }}>
                No hay notificaciones nuevas todavía. Cuando ocurra un cambio en tus documentos, aparecerá aquí y se notificará por correo.
              </div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: '0.8rem 1rem',
                    borderBottom: '1px solid var(--border)',
                    background: n.read ? '#ffffff' : 'rgba(251, 225, 209, 0.28)',
                    display: 'flex',
                    gap: '0.65rem',
                    alignItems: 'flex-start',
                  }}
                >
                  {renderIcon(n.severity)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-ink-black)' }}>{n.title}</div>
                    <div style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', marginTop: '0.15rem', lineHeight: 1.4 }}>{n.message}</div>
                    <div style={{ fontSize: '0.69rem', color: 'var(--color-slate-gray)', marginTop: '0.25rem' }}>
                      {n.solicitudCode ? `${n.solicitudCode} · ` : ''}{new Date(n.createdAt).toLocaleString('es-VE')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
