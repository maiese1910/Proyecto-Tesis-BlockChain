import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Shield } from 'lucide-react';
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
import LandingPortal from './components/LandingPortal';
import GovernmentPanel from './components/GovernmentPanel';
import AdminDashboard from './components/AdminDashboard';
import ToastNotification from './components/ToastNotification';
import { dynamicDataAPI, statsAPI } from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pubInitialData, setPubInitialData] = useState(null);

  // Intentar recuperar sesión guardada al cargar (estudiante o admin)
  useEffect(() => {
    const storedUser = localStorage.getItem('usm_user');
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch (_) {}
    }

    const isAdminAuth = localStorage.getItem('admin_auth') === 'true';
    const storedAdmin = localStorage.getItem('admin_data');
    if (isAdminAuth && storedAdmin) {
      try { setAdminUser(JSON.parse(storedAdmin)); } catch (_) {}
    }
  }, []);

  // Latido periódico para incrementar el tiempo ahorrado por uso activo
  useEffect(() => {
    if (!user) return;
    statsAPI.heartbeat().catch(() => {});
    const interval = setInterval(async () => {
      try { await statsAPI.heartbeat(); } catch (err) {}
    }, 20000);
    return () => clearInterval(interval);
  }, [user]);

  const handleStudentLogout = () => {
    localStorage.removeItem('usm_user');
    setUser(null);
    setActiveTab('dashboard');
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('admin_auth');
    localStorage.removeItem('admin_data');
    setAdminUser(null);
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

  // Si la URL tiene un hash, se escaneó un QR.
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

  // 1. SI ES FUNCIONARIO GUBERNAMENTAL LOGUEADO -> MOSTRAR PANEL GUBERNAMENTAL / AUDITORÍA
  if (adminUser) {
    return (
      <div className="app-layout" style={{ background: '#020617' }}>
        <ToastNotification />
        <div style={{ width: '100vw', height: '100vh', height: '100dvh', display: 'flex', flexDirection: 'column' }}>
          <div className="admin-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
              <Shield size={24} color="#ef4444" />
              <h1 style={{ fontSize: '1.2rem', color: '#f8fafc', margin: 0 }}>Panel de Auditoría Gubernamental — {adminUser?.ente || 'Gobierno'}</h1>
              {adminUser && (
                <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600' }}>
                  {adminUser.cargo || 'Funcionario'} ({adminUser.username})
                </span>
              )}
            </div>
            <button onClick={handleAdminLogout} style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              Cerrar Sesión Auditoría
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
            {(adminUser?.ente === 'USM' || adminUser?.ente === 'GTU') ? (
              <AdminDashboard adminData={adminUser} />
            ) : (
              <GovernmentPanel />
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. SI NO HAY SESIÓN (NI ESTUDIANTE NI ADMIN) -> MOSTRAR LANDING PORTAL UNIFICADO
  if (!user && !adminUser) {
    return (
      <LandingPortal
        onStudentLogin={(userData) => setUser(userData)}
        onAdminLogin={(adminData) => setAdminUser(adminData)}
      />
    );
  }

  // 3. SI ES ESTUDIANTE LOGUEADO -> MOSTRAR PLATAFORMA DE GRADUANDO USM
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
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleStudentLogout} />
      <div className="main-content">
        {renderContent()}
      </div>
      <Analytics />
    </div>
  );
}

export default App;
