import React, { useState, useEffect, useCallback } from 'react';
import { Shield, ArrowLeftRight } from 'lucide-react';
import GovernmentPanel from './components/GovernmentPanel';
import AdminDashboard from './components/AdminDashboard';
import GovernmentLoginPortal from './components/GovernmentLoginPortal';
import ToastNotification from './components/ToastNotification';
import WalletConnect from './components/WalletConnect';
import NotificationBell from './components/NotificationBell';

const isAdminJwtValid = (token) => {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length === 3) {
    try {
      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
      const payload = JSON.parse(atob(padded));
      if (payload?.exp && payload.exp * 1000 <= Date.now()) {
        return false;
      }
    } catch (_) {
      return false;
    }
  }
  return true;
};

const readActiveAdminSession = () => {
  try {
    if (typeof window === 'undefined') return null;
    // Exigir sesión activa en la pestaña actual (sessionStorage) y purgar sesiones persistentes antiguas de localStorage
    const isSessionAuth = sessionStorage.getItem('usm_admin_session') === 'true';
    if (!isSessionAuth) {
      localStorage.removeItem('admin_auth');
      localStorage.removeItem('admin_data');
      return null;
    }
    const raw = sessionStorage.getItem('admin_data');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !isAdminJwtValid(parsed.token)) {
      sessionStorage.removeItem('usm_admin_session');
      sessionStorage.removeItem('admin_data');
      localStorage.removeItem('admin_auth');
      localStorage.removeItem('admin_data');
      return null;
    }
    return parsed;
  } catch (_) {
    return null;
  }
};

const AdminApp = () => {
  const [adminData, setAdminData] = useState(() => readActiveAdminSession());
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(readActiveAdminSession()));
  // Vista activa del auditor (GTU-MPPEU o Cancillería-MPPRE):
  // 'bandeja' -> GovernmentPanel (Cotejo GTU / Apostilla MPPRE / IA / Lotes)
  // 'config_bitacora' -> AdminDashboard (Bitácora CSV/PDF + Cotejo Rápido + Checklist/Planillas/Guías)
  const [adminViewMode, setAdminViewMode] = useState('bandeja');

  const handleLogout = useCallback(() => {
    try {
      sessionStorage.removeItem('usm_admin_session');
      sessionStorage.removeItem('admin_data');
      localStorage.removeItem('admin_auth');
      localStorage.removeItem('admin_data');
    } catch (_) {}
    setAdminData(null);
    setIsAuthenticated(false);
    if (typeof window !== 'undefined' && window.location.pathname !== '/admin') {
      window.history.replaceState(null, '', '/admin');
    }
  }, []);

  const handleLogin = (data) => {
    try {
      sessionStorage.setItem('usm_admin_session', 'true');
      sessionStorage.setItem('admin_data', JSON.stringify(data));
      localStorage.removeItem('admin_auth');
      localStorage.removeItem('admin_data');
    } catch (_) {}
    setAdminData(data);
    setIsAuthenticated(true);
    setAdminViewMode('bandeja');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (window.location.pathname !== '/admin') {
        window.history.replaceState(null, '', '/admin');
      }
    }
  };

  // Redirección limpia a /admin y cierre automático ante expiración/401 de token ministerial
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isAuthenticated || !adminData) {
      if (window.location.pathname !== '/admin') {
        window.history.replaceState(null, '', '/admin');
      }
      window.scrollTo(0, 0);
    }
    const onUnauthorized = () => handleLogout();
    window.addEventListener('usm_admin_unauthorized', onUnauthorized);
    return () => window.removeEventListener('usm_admin_unauthorized', onUnauthorized);
  }, [isAuthenticated, adminData, handleLogout]);

  if (!isAuthenticated || !adminData || !isAdminJwtValid(adminData.token)) {
    return <GovernmentLoginPortal onAdminLogin={handleLogin} />;
  }

  const showConfigBitacora = adminViewMode === 'config_bitacora';
  const enteLabel = adminData?.ente === 'MPPRE'
    ? 'MPPRE (Cancillería — Apostilla de La Haya)'
    : 'MPPEU (Taquilla GTU — Gestión de Trámites Universitarios)';

  return (
    <div className="app-layout" style={{ background: 'var(--color-mist-gray)', minHeight: '100vh', color: 'var(--color-ink-black)' }}>
      <ToastNotification />
      <div style={{ width: '100vw', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="admin-header" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid var(--border)', padding: '0.9rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              backgroundColor: 'var(--color-fog-white)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-ink-black)'
            }}>
              <Shield size={18} />
            </div>
            <h1 style={{
              fontSize: '1.22rem',
              fontFamily: 'var(--font-serif)',
              fontWeight: 400,
              color: 'var(--color-ink-black)',
              margin: 0
            }}>
              {showConfigBitacora
                ? `Bitácora de Auditoría y Configuración Ministerial — ${enteLabel}`
                : `Panel de Auditoría Ministerial — ${enteLabel}`}
            </h1>
            <span style={{
              background: 'var(--color-blush-peach)',
              color: 'var(--color-sienna-brown)',
              border: '1px solid rgba(93, 42, 26, 0.15)',
              padding: '0.2rem 0.75rem',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.78rem',
              fontWeight: 600
            }}>
              {adminData.cargo || 'Auditor Ministerial'} ({adminData.username})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setAdminViewMode(prev => prev === 'bandeja' ? 'config_bitacora' : 'bandeja')}
              style={{
                background: 'var(--color-fog-white)',
                border: '1px solid var(--border)',
                color: 'var(--color-sienna-brown)',
                padding: '0.45rem 0.9rem',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <ArrowLeftRight size={14} />
              {showConfigBitacora ? 'Volver a Bandeja GTU / MPPRE' : 'Bitácora CSV/PDF y Configuración'}
            </button>
            <NotificationBell
              role="admin"
              ente={adminData?.ente || 'MPPEU'}
              adminData={adminData}
              onAdminEmailUpdated={(newEmail) => {
                const updated = { ...adminData, email: newEmail };
                setAdminData(updated);
                try { sessionStorage.setItem('admin_data', JSON.stringify(updated)); } catch (_) {}
              }}
            />
            <WalletConnect />
            <button
              onClick={handleLogout}
              style={{
                background: '#ffffff',
                border: '1px solid var(--border)',
                color: 'var(--color-ink-black)',
                padding: '0.45rem 1rem',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.82rem',
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: 'var(--shadow-subtle)'
              }}
            >
              Cerrar Sesión Auditoría
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '1.5rem', backgroundColor: 'var(--color-mist-gray)' }}>
          {showConfigBitacora ? (
            <AdminDashboard adminData={adminData} onSwitchToMinisterial={() => setAdminViewMode('bandeja')} />
          ) : (
            <GovernmentPanel adminData={adminData} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminApp;
