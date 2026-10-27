import React, { useState } from 'react';
import { Shield, KeyRound, Lock, User } from 'lucide-react';
import GovernmentPanel from './components/GovernmentPanel';
import AdminDashboard from './components/AdminDashboard';
import ToastNotification from './components/ToastNotification';
import { authAPI } from './services/api';

const AdminLogin = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return setError('Ingresa usuario y contraseña.');
    setError('');
    setLoading(true);

    try {
      const data = await authAPI.loginAdmin(username, password);
      if (data.success) {
        onLogin(data);
      } else {
        setError('Credenciales inválidas. Acceso denegado.');
      }
    } catch (err) {
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', minHeight: '100dvh', width: '100vw', padding: '1.5rem',
      background: 'var(--color-mist-gray)',
      color: 'var(--color-ink-black)',
      overflow: 'auto',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        padding: '2.5rem 2rem',
        textAlign: 'center',
        background: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-cards)',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--color-fog-white)',
          border: '1px solid var(--border)',
          color: 'var(--color-ink-black)',
          marginBottom: '1.25rem'
        }}>
          <Shield size={24} />
        </div>
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 400,
          fontSize: '1.75rem',
          margin: '0 0 0.5rem 0',
          color: 'var(--color-ink-black)'
        }}>
          Acceso a Auditoría
        </h2>
        <p style={{
          color: 'var(--color-slate-gray)',
          fontSize: '0.86rem',
          lineHeight: 1.5,
          margin: '0 0 1.8rem 0'
        }}>
          Segregación de Funciones (SoD) — Plataforma Ministerial de Fiscalización MPPEU / MPPRE
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-slate-gray)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Usuario Funcionario
            </label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: 'var(--color-fog-white)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-inputs)',
              padding: '0.65rem 1rem'
            }}>
              <User size={18} color="var(--color-slate-gray)" />
              <input
                type="text"
                className="chat-input"
                placeholder="ej: mppre_agente o mppeu_agente"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ border: 'none', background: 'transparent', flex: 1, padding: 0, color: 'var(--color-ink-black)', outline: 'none', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-slate-gray)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Contraseña Institucional
            </label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: 'var(--color-fog-white)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-inputs)',
              padding: '0.65rem 1rem'
            }}>
              <KeyRound size={18} color="var(--color-slate-gray)" />
              <input
                type="password"
                className="chat-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ border: 'none', background: 'transparent', flex: 1, padding: 0, color: 'var(--color-ink-black)', outline: 'none', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {error && (
            <div style={{
              background: 'var(--color-blush-peach)',
              color: 'var(--color-sienna-brown)',
              border: '1px solid rgba(93, 42, 26, 0.2)',
              padding: '0.65rem 0.9rem',
              borderRadius: '12px',
              fontSize: '0.82rem',
              fontWeight: 500
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'var(--color-ink-black)',
              color: '#ffffff',
              padding: '0.85rem 1.5rem',
              marginTop: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              border: 'none',
              borderRadius: 'var(--radius-pill)',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              fontSize: '0.92rem',
              boxShadow: 'var(--shadow-subtle)',
              transition: 'all 0.2s ease'
            }}
          >
            <Lock size={16} /> {loading ? 'Validando credenciales...' : 'Iniciar Sesión Segura'}
          </button>

          <p style={{
            color: 'var(--color-slate-gray)',
            fontSize: '0.76rem',
            margin: '0.8rem 0 0',
            lineHeight: 1.5,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem'
          }}>
            <Lock size={12} color="var(--color-slate-gray)" /> Acceso criptográfico protegido por Tokens de Autorización Ministerial.
          </p>
        </form>
      </div>
    </div>
  );
};

const AdminApp = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('admin_auth') === 'true';
  });
  const [adminData, setAdminData] = useState(() => {
    const stored = localStorage.getItem('admin_data');
    return stored ? JSON.parse(stored) : null;
  });

  const handleLogin = (data) => {
    localStorage.setItem('admin_auth', 'true');
    localStorage.setItem('admin_data', JSON.stringify(data));
    setAdminData(data);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_auth');
    localStorage.removeItem('admin_data');
    setAdminData(null);
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <div className="app-layout" style={{ background: 'var(--color-mist-gray)', minHeight: '100vh', color: 'var(--color-ink-black)' }}>
      <ToastNotification />
      <div style={{ width: '100vw', height: '100vh', height: '100dvh', display: 'flex', flexDirection: 'column' }}>
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
              Panel de Auditoría Gubernamental — {adminData?.ente || 'Gobierno'}
            </h1>
            {adminData && (
              <span style={{
                background: 'var(--color-blush-peach)',
                color: 'var(--color-sienna-brown)',
                border: '1px solid rgba(93, 42, 26, 0.15)',
                padding: '0.2rem 0.75rem',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.78rem',
                fontWeight: 500
              }}>
                {adminData.cargo || 'Funcionario'} ({adminData.username})
              </span>
            )}
          </div>
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
              boxShadow: 'var(--shadow-subtle)',
              transition: 'all 0.2s ease'
            }}
          >
            Cerrar Sesión Auditoría
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem', backgroundColor: 'var(--color-mist-gray)' }}>
          {(adminData?.ente === 'USM') ? (
            <AdminDashboard adminData={adminData} />
          ) : (
            <GovernmentPanel adminData={adminData} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminApp;
