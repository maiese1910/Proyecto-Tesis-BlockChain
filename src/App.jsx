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
  const [verifyHashInput, setVerifyHashInput] = useState('');

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

  const handleVerifyHashInApp = (hashToVerify) => {
    if (!hashToVerify) return;
    setVerifyHashInput(hashToVerify);
    setActiveTab('blockchain');
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
                Panel de Auditoría Gubernamental — {adminUser?.ente || 'Gobierno'}
              </h1>
              {adminUser && (
                <span style={{
                  background: 'var(--color-blush-peach)',
                  color: 'var(--color-sienna-brown)',
                  border: '1px solid rgba(93, 42, 26, 0.15)',
                  padding: '0.2rem 0.75rem',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.78rem',
                  fontWeight: 500
                }}>
                  {adminUser.cargo || 'Funcionario'} ({adminUser.username})
                </span>
              )}
            </div>
            <button
              onClick={handleAdminLogout}
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
            {adminUser?.ente === 'USM' ? (
              <AdminDashboard adminData={adminUser} />
            ) : (
              <GovernmentPanel adminData={adminUser} />
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
        return <OCRExtractor user={user} onDataExtracted={handleOcrDataExtracted} onNavigate={setActiveTab} />;
      case 'prevalidation':
        return <PreValidation />;
      case 'survival':
        return <SurvivalGuide />;
      case 'pub':
        return <PUBForm user={user} initialData={pubInitialData} onVerifyHash={handleVerifyHashInApp} />;
      case 'history':
        return <HistoryPanel user={user} onVerifyHash={handleVerifyHashInApp} />;
      case 'blockchain':
        return <BlockchainVerifier initialHash={verifyHashInput} />;
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
