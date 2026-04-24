import React, { useState, useEffect } from 'react';
import LoginRegister from './components/LoginRegister';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PreValidation from './components/PreValidation';
import SurvivalGuide from './components/SurvivalGuide';
import ChatBotWidget from './components/ChatBotWidget';
import PUBForm from './components/PUBForm';
import BlockchainVerifier from './components/BlockchainVerifier';

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Intentar recuperar sesión guardada al cargar
  useEffect(() => {
    const stored = localStorage.getItem('usm_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch (_) {}
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('usm_user');
    setUser(null);
    setActiveTab('dashboard');
  };

  // Si no hay sesión, mostrar pantalla de login
  if (!user) {
    return <LoginRegister onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={user} />;
      case 'prevalidation':
        return <PreValidation />;
      case 'survival':
        return <SurvivalGuide />;
      case 'pub':
        return <PUBForm user={user} />;
      case 'blockchain':
        return <BlockchainVerifier />;
      case 'chat':
        return (
          <div className="view-container" style={{ padding: '2rem 0' }}>
            <ChatBotWidget user={user} />
          </div>
        );
      case 'forms':
        return (
          <div className="view-container">
            <div className="dashboard-header">
              <h2>Planillas y Formularios</h2>
              <p>Descarga directa de los formatos exactos requeridos por la Facultad de Ingeniería.</p>
            </div>
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {['Planilla de Solicitud de Grado.pdf', 'Formato Fondo Negro.pdf', 'Planilla Solvencia de Biblioteca.pdf', 'Planilla Única Bancaria (PUB).pdf'].map((doc, i) => (
                <div key={i} className="result-item" style={{ borderLeftColor: 'var(--primary)', cursor: 'pointer' }}>
                  <span>📄</span>
                  <span>{doc}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--primary)' }}>Descargar</span>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return <Dashboard user={user} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout} />
      <div className="main-content">
        {renderContent()}
      </div>
    </div>
  );
}

export default App;
