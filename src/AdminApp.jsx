import React, { useState } from 'react';
import { Shield, KeyRound, Lock } from 'lucide-react';
import GovernmentPanel from './components/GovernmentPanel';
import AdminDashboard from './components/AdminDashboard';
import ToastNotification from './components/ToastNotification';
import { authAPI } from './services/api';

const AdminLogin = ({ onLogin }) => {
  const [mode, setMode] = useState('login'); // login | register
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [cargo, setCargo] = useState('');
  const [ente, setEnte] = useState('');
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

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username || !password || !cargo || !ente) return setError('Todos los campos son obligatorios.');
    setError('');
    setLoading(true);

    try {
      const data = await authAPI.registerAdmin({ username, password, cargo, ente });
      if (data.success) {
        onLogin({ username, cargo, ente, token: data.token });
      } else {
        setError('Error al registrar.');
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
      height: '100vh', width: '100vw', padding: '2rem',
      background: 'radial-gradient(circle at 50% 50%, rgba(220,38,38,0.1), transparent 60%), #0f172a',
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '3rem 2rem', textAlign: 'center', border: '1px solid rgba(220,38,38,0.3)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: 'rgba(220,38,38,0.1)', color: '#ef4444', marginBottom: '1.5rem' }}>
          <Shield size={32} />
        </div>
        <h2 style={{ marginBottom: '0.5rem', color: '#f8fafc' }}>{mode === 'login' ? 'Acceso Restringido' : 'Registro Gubernamental'}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Panel Gubernamental de Auditoría</p>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 1rem' }}>
              <UserIcon color="var(--text-muted)" />
              <input type="text" className="chat-input" placeholder="Usuario Funcionario" value={username} onChange={(e) => setUsername(e.target.value)} style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.5rem 0' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 1rem' }}>
              <KeyRound size={20} color="var(--text-muted)" />
              <input type="password" className="chat-input" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.5rem 0' }} />
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '0.5rem 0' }}>{error}</p>}
            <button type="submit" disabled={loading} className="send-btn" style={{ background: '#ef4444', color: 'white', padding: '1rem', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Lock size={18} /> {loading ? 'Validando...' : 'Iniciar Sesión Segura'}
            </button>
            <button type="button" onClick={() => setMode('register')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              ¿Nuevo funcionario? Crear cuenta
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 1rem' }}>
              <input type="text" className="chat-input" placeholder="Usuario (Ej: jcarlos)" value={username} onChange={(e) => setUsername(e.target.value)} style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.5rem 0' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 1rem' }}>
              <input type="password" className="chat-input" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.5rem 0' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 1rem' }}>
              <select className="chat-input" value={ente} onChange={e => setEnte(e.target.value)} style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.5rem 0', color: ente ? 'white' : 'var(--text-muted)' }}>
                <option value="">Seleccione el Ente...</option>
                <option value="SAREN">SAREN</option>
                <option value="MPPRE">MPPRE</option>
                <option value="GTU">GTU</option>
                <option value="USM">USM</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 1rem' }}>
              <input type="text" className="chat-input" placeholder="Cargo (Ej: Registrador Principal)" value={cargo} onChange={(e) => setCargo(e.target.value)} style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.5rem 0' }} />
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '0.5rem 0' }}>{error}</p>}
            <button type="submit" disabled={loading} className="send-btn" style={{ background: '#ef4444', color: 'white', padding: '1rem', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Shield size={18} /> {loading ? 'Registrando...' : 'Registrar Funcionario'}
            </button>
            <button type="button" onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              ← Volver al login
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// Helper User icon since we didn't import it at the top to avoid clutter
const UserIcon = ({ color }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

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
    <div className="app-layout" style={{ background: '#020617' }}>
      <ToastNotification />
      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem 2rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Shield size={24} color="#ef4444" />
            <h1 style={{ fontSize: '1.2rem', color: '#f8fafc', margin: 0 }}>Panel de Control — {adminData?.ente || 'Gobierno'}</h1>
            {adminData && (
              <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600' }}>
                {adminData.cargo || 'Funcionario'} ({adminData.username})
              </span>
            )}
          </div>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>
            Cerrar Sesión
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>
          {(adminData?.ente === 'USM' || adminData?.ente === 'GTU') ? (
            <AdminDashboard adminData={adminData} />
          ) : (
            <GovernmentPanel />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminApp;
