import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, CheckCheck, Mail, AlertTriangle, CheckCircle2, Info, X, Save } from 'lucide-react';
import { notificationsAPI, authAPI } from '../services/api';

const NotificationBell = ({ role = 'student', cedula = '', ente = '', adminData = null, onAdminEmailUpdated = null }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [adminEmailInput, setAdminEmailInput] = useState(adminData?.email || '');
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    if (adminData?.email) setAdminEmailInput(adminData.email);
  }, [adminData?.email]);

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

  const handleSaveAdminEmail = async (e) => {
    e.preventDefault();
    const clean = (adminEmailInput || '').trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setEmailFeedback('Ingresa un correo válido.');
      return;
    }
    setSavingEmail(true);
    setEmailFeedback('');
    try {
      const res = await authAPI.updateAdminEmail(clean, ente || adminData?.ente || 'MPPEU', adminData?.token);
      if (res?.success) {
        if (onAdminEmailUpdated) onAdminEmailUpdated(clean);
        setEmailFeedback(`✓ Vinculado a alertas de ${ente || 'GTU/MPPRE'}`);
        setTimeout(() => setEmailFeedback(''), 3500);
      } else {
        setEmailFeedback(res?.error || 'No se pudo vincular el correo.');
      }
    } catch (err) {
      setEmailFeedback(err?.message || 'Error guardando correo.');
    } finally {
      setSavingEmail(false);
    }
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
            width: 'min(380px, 92vw)',
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

          {/* Vinculación individual de correo por cada Auditor GTU / MPPRE */}
          {role === 'admin' && (
            <form
              onSubmit={handleSaveAdminEmail}
              style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--border)',
                background: '#fffaf7',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
              }}
            >
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-sienna-brown)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Mail size={12} /> Mi correo vinculado para alertas ({adminData?.username || 'auditor'} · {ente || 'MPPEU'}):
              </label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  type="email"
                  value={adminEmailInput}
                  onChange={(e) => setAdminEmailInput(e.target.value)}
                  placeholder="tu.correo@ministerio.gob.ve"
                  style={{
                    flex: 1,
                    padding: '0.42rem 0.65rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '0.78rem',
                    background: '#ffffff',
                    color: 'var(--color-ink-black)',
                  }}
                />
                <button
                  type="submit"
                  disabled={savingEmail}
                  style={{
                    padding: '0.42rem 0.75rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--color-ink-black)',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Save size={12} /> {savingEmail ? '...' : 'Vincular'}
                </button>
              </div>
              {emailFeedback && (
                <span style={{ fontSize: '0.71rem', color: emailFeedback.startsWith('✓') ? '#047857' : '#b91c1c', fontWeight: 600 }}>
                  {emailFeedback}
                </span>
              )}
            </form>
          )}

          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {items.length === 0 ? (
              <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--color-slate-gray)', fontSize: '0.82rem' }}>
                No hay notificaciones nuevas todavía. Cuando ocurra un cambio en los expedientes, aparecerá aquí y se enviará a los correos vinculados.
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
