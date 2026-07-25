import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import LoginRegister from './components/LoginRegister';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PreValidation from './components/PreValidation';
import SurvivalGuide from './components/SurvivalGuide';
import ChatBotWidget from './components/ChatBotWidget';
import PUBForm from './components/PUBForm';
import BlockchainVerifier from './components/BlockchainVerifier';
import HistoryPanel from './components/HistoryPanel';
import OCRExtractor from './components/OCRExtractor';
import OfficialFormsPanel from './components/OfficialFormsPanel';
import ToastNotification from './components/ToastNotification';
import { dynamicDataAPI, statsAPI } from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pubInitialData, setPubInitialData] = useState(null);

  // Intentar recuperar sesión guardada al cargar
  useEffect(() => {
    const stored = localStorage.getItem('usm_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch (_) {}
    }
  }, []);

  // Latido periódico para incrementar el tiempo ahorrado por uso activo
  useEffect(() => {
    if (!user) return;
    
    // Ejecutar un heartbeat inicial
    statsAPI.heartbeat().catch(() => {});
    
    const interval = setInterval(async () => {
      try {
        await statsAPI.heartbeat();
      } catch (err) {
        console.warn('Heartbeat error:', err);
      }
    }, 20000); // Cada 20 segundos
    
    return () => clearInterval(interval);
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('usm_user');
    setUser(null);
    setActiveTab('dashboard');
  };

  const handleOcrDataExtracted = (extractedFields) => {
    const mapped = {};
    if (extractedFields.nombre_completo?.value) mapped.nombre_completo = extractedFields.nombre_completo.value;
    if (extractedFields.cedula?.value) mapped.cedula = extractedFields.cedula.value;
    if (extractedFields.institucion?.value) mapped.institucion = extractedFields.institucion.value;
    if (extractedFields.carrera?.value) mapped.tramite = `Registro de Título en ${extractedFields.carrera.value}`;
    setPubInitialData(mapped);
    setActiveTab('pub');
  };

  // Si la URL tiene un hash, significa que se escaneó un código QR.
  // Mostramos directamente el verificador sin pedir login.
  const searchParams = new URLSearchParams(window.location.search);
  const verifyHash = searchParams.get('hash');

  if (verifyHash) {
    return (
      <div className="app-layout">
        <div className="main-content" style={{ width: '100%', margin: '0 auto', maxWidth: '800px', padding: '2rem' }}>
          <BlockchainVerifier initialHash={verifyHash} />
        </div>
      </div>
    );
  }

  // Si no hay sesión y no se está verificando un QR, mostrar pantalla de login
  if (!user) {
    return <LoginRegister onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={user} />;
      case 'ocr':
        return <OCRExtractor user={user} onDataExtracted={handleOcrDataExtracted} />;
      case 'prevalidation':
        return <PreValidation />;
      case 'survival':
        return <SurvivalGuide />;
      case 'pub':
        return <PUBForm user={user} initialData={pubInitialData} />;
      case 'history':
        return <HistoryPanel user={user} />;
      case 'blockchain':
        return <BlockchainVerifier />;
      case 'chat':
        return (
          <div className="view-container" style={{ padding: '2rem 0' }}>
            <ChatBotWidget user={user} />
          </div>
        );
      case 'forms':
        return <OfficialFormsPanel user={user} />;
      default:
        return <Dashboard user={user} />;
    }
  };

  return (
    <div className="app-layout">
      <ToastNotification />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout} />
      <div className="main-content">
        {renderContent()}
      </div>
      <Analytics />
    </div>
  );
}

export default App;
