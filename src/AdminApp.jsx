import React, { useState } from 'react';
import { Shield, Building2, ArrowLeftRight } from 'lucide-react';
import GovernmentPanel from './components/GovernmentPanel';
import AdminDashboard from './components/AdminDashboard';
import GovernmentLoginPortal from './components/GovernmentLoginPortal';
import ToastNotification from './components/ToastNotification';
import WalletConnect from './components/WalletConnect';

const AdminApp = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('admin_auth') === 'true';
  });
  const [adminData, setAdminData] = useState(() => {
    try {
      const stored = localStorage.getItem('admin_data');
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  });
  // Permite al Rectorado USM alternar entre su panel rectoral (Estación 1 + Config + Bitácora) y la bandeja interministerial (4 Estaciones)
  const [adminViewMode, setAdminViewMode] = useState('rectorado');

  const handleLogin = (data) => {
    localStorage.setItem('admin_auth', 'true');
    localStorage.setItem('admin_data', JSON.stringify(data));
    setAdminData(data);
    setIsAuthenticated(true);
    setAdminViewMode(data?.ente === 'USM' ? 'rectorado' : 'ministerial');
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_auth');
    localStorage.removeItem('admin_data');
    setAdminData(null);
    setIsAuthenticated(false);
  };

  if (!isAuthenticated || !adminData) {
    return <GovernmentLoginPortal onAdminLogin={handleLogin} />;
  }

  const isUsmAdmin = adminData?.ente === 'USM';
  const showRectorado = isUsmAdmin && adminViewMode === 'rectorado';

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
              fontSize: '1.25rem',
              fontFamily: 'var(--font-serif)',
              fontWeight: 400,
              color: 'var(--color-ink-black)',
              margin: 0
            }}>
              {showRectorado
                ? 'Rectorado y Secretaría General — Universidad Santa María (Estación 1)'
                : `Panel de Auditoría Interministerial — ${adminData?.ente || 'Gobierno'}`}
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
              {adminData.cargo || 'Funcionario'} ({adminData.username})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {isUsmAdmin && (
              <button
                type="button"
                onClick={() => setAdminViewMode(prev => prev === 'rectorado' ? 'ministerial' : 'rectorado')}
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
                {showRectorado ? 'Ver Bandeja 4 Estaciones (MPPEU/SAREN/MPPRE)' : 'Volver a Rectorado USM'}
              </button>
            )}
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
          {showRectorado ? (
            <AdminDashboard adminData={adminData} onSwitchToMinisterial={() => setAdminViewMode('ministerial')} />
          ) : (
            <GovernmentPanel adminData={adminData} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminApp;
