import React, { useState, useEffect, useRef } from 'react';

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

import GovernmentLoginPortal from './components/GovernmentLoginPortal';

import ToastNotification from './components/ToastNotification';

import WalletConnect from './components/WalletConnect';

import { dynamicDataAPI, statsAPI } from './services/api';

import { supabase, authPasswordless } from './services/supabaseClient';



function App() {

  const [user, setUser] = useState(() => {

    try {

      if (typeof window !== 'undefined') {

        const isRecovery = window.location.hash.includes('type=recovery') || window.location.search.includes('action=reset-password');

        if (isRecovery) return null;

        const stored = localStorage.getItem('usm_user') || sessionStorage.getItem('usm_user');

        return stored ? JSON.parse(stored) : null;

      }

      return null;

    } catch (_) {

      return null;

    }

  });



  const [adminUser, setAdminUser] = useState(() => {

    try {

      if (typeof window !== 'undefined') {

        const isAdminAuth = localStorage.getItem('admin_auth') === 'true';

        const storedAdmin = localStorage.getItem('admin_data');

        return (isAdminAuth && storedAdmin) ? JSON.parse(storedAdmin) : null;

      }

      return null;

    } catch (_) {

      return null;

    }

  });



  const [activeTab, setActiveTab] = useState('dashboard');

  const [pubInitialData, setPubInitialData] = useState(null);

  const [verifyHashInput, setVerifyHashInput] = useState('');

  const mainContentRef = useRef(null);



  // Garantizar que la ventana y la sección principal siempre estén arriba al cambiar usuario o pestaña

  useEffect(() => {

    window.scrollTo(0, 0);

    document.documentElement.scrollTop = 0;

    document.body.scrollTop = 0;

    if (mainContentRef.current) {

      mainContentRef.current.scrollTop = 0;

    }

  }, [user, activeTab]);



  // Limpieza de documentos de prueba y recuperación de sesión
  useEffect(() => {
    try {
      const CLEANUP_KEY = 'usm_storage_cleanup_v4';
      if (localStorage.getItem(CLEANUP_KEY) !== 'done') {
        localStorage.removeItem('usm_blockchain_records');
        localStorage.removeItem('usm_pub_history');
        localStorage.removeItem('usm_solicitudes_gtu');
        localStorage.removeItem('usm_active_tramite_hash');
        sessionStorage.removeItem('usm_active_tramite_hash');

        try {
          Object.keys(localStorage).forEach(k => {
            if (k.startsWith('usm_doc_image_') || k.startsWith('usm_raw_doc_')) {
              localStorage.removeItem(k);
            }
          });
        } catch (_) {}

        localStorage.setItem(CLEANUP_KEY, 'done');
      }
    } catch (_) {}

    const isRecovery = window.location.hash.includes('type=recovery') || window.location.search.includes('action=reset-password');

    if (!isRecovery) {

      const storedUser = localStorage.getItem('usm_user') || sessionStorage.getItem('usm_user');

      if (storedUser) {

        try { setUser(JSON.parse(storedUser)); } catch (_) {}

      }

    } else {

      localStorage.removeItem('usm_user');

      sessionStorage.removeItem('usm_user');

      setUser(null);

    }



    const isAdminAuth = localStorage.getItem('admin_auth') === 'true';

    const storedAdmin = localStorage.getItem('admin_data');

    if (isAdminAuth && storedAdmin) {

      try { setAdminUser(JSON.parse(storedAdmin)); } catch (_) {}

    }



    // Escuchar autenticación automática de Supabase ÚNICAMENTE cuando proviene de un Magic Link en la URL

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {

      if (event === 'PASSWORD_RECOVERY' || window.location.hash.includes('type=recovery') || window.location.search.includes('action=reset-password')) {

        return;

      }



      const isMagicLinkInUrl = window.location.hash.includes('access_token') && !window.location.hash.includes('type=recovery');



      if (isMagicLinkInUrl && event === 'SIGNED_IN' && session?.user) {

        let profile = await authPasswordless.getProfile(session.user.id);

        if (!profile) {

          profile = {

            id: session.user.id,

            email: session.user.email,

            nombre: session.user.user_metadata?.nombre || 'Graduando USM',

            cedula: session.user.user_metadata?.cedula || 'V-28.315.101',

            telefono: session.user.user_metadata?.telefono || '',

            fecha_nacimiento: session.user.user_metadata?.fecha_nacimiento || '',

            carrera: session.user.user_metadata?.carrera || 'Ingeniería en Sistemas',

            semestre: session.user.user_metadata?.semestre || '10mo',

            is_profile_complete: true,

            is_cedula_locked: true,

          };

        }

        localStorage.setItem('usm_user', JSON.stringify(profile));

        sessionStorage.setItem('usm_user', JSON.stringify(profile));

        setUser(profile);

        window.history.replaceState(null, '', window.location.pathname);

      }

    });



    return () => {

      authListener?.subscription?.unsubscribe();

    };

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



  const handleStudentLogin = (userData) => {

    if (!userData) return;

    try {

      localStorage.setItem('usm_user', JSON.stringify(userData));

      sessionStorage.setItem('usm_user', JSON.stringify(userData));

    } catch (_) {}

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    document.documentElement.scrollTop = 0;

    document.body.scrollTop = 0;

    setUser(userData);

  };



  const handleStudentLogout = async () => {

    localStorage.removeItem('usm_user');

    sessionStorage.removeItem('usm_user');

    setUser(null);

    setActiveTab('dashboard');

    try {

      await authPasswordless.signOut();

    } catch (_) {}

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



  const currentPath = window.location.pathname.toLowerCase();

  const isGovUrl = currentPath === '/admin' || currentPath === '/gobierno' || currentPath.startsWith('/admin/') || searchParams.get('portal') === 'gobierno' || searchParams.get('portal') === 'admin';



  // 1. RUTA GUBERNAMENTAL AISLADA (ACCESIBLE EXCLUSIVAMENTE POR URL /admin O /gobierno)

  if (isGovUrl) {

    if (adminUser) {

      return (

        <div className="app-layout" style={{ background: 'var(--color-mist-gray)', minHeight: '100vh', color: 'var(--color-ink-black)' }}>

          <ToastNotification />

          <div style={{ width: '100%', maxWidth: '100vw', height: '100vh', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

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

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <WalletConnect />
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

            </div>

            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, padding: '1.5rem', backgroundColor: 'var(--color-mist-gray)' }}>

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



    // Si NO ha iniciado sesión y entró por URL gubernamental -> Mostrar Login Gubernamental

    return <GovernmentLoginPortal onAdminLogin={(adminData) => setAdminUser(adminData)} />;

  }



  // 2. PORTAL PÚBLICO DEL GRADUANDO USM (SI NO ESTÁ LOGUEADO)

  if (!user) {

    return <LandingPortal onStudentLogin={handleStudentLogin} />;

  }



  // 3. SI ES ESTUDIANTE LOGUEADO -> MOSTRAR PLATAFORMA DE GRADUANDO USM

  const renderContent = () => {

    switch (activeTab) {

      case 'dashboard':

        return <Dashboard user={user} onNavigate={setActiveTab} onVerifyHash={handleVerifyHashInApp} />;

      case 'ocr':

        return <OCRExtractor user={user} onDataExtracted={handleOcrDataExtracted} onNavigate={setActiveTab} />;

      case 'prevalidation':

        return <PreValidation user={user} onNavigate={setActiveTab} onVerifyHash={handleVerifyHashInApp} />;

      case 'survival':

        return <SurvivalGuide />;

      case 'pub':

        return <PUBForm user={user} initialData={pubInitialData} onVerifyHash={handleVerifyHashInApp} onNavigate={setActiveTab} />;

      case 'history':

        return <HistoryPanel user={user} onVerifyHash={handleVerifyHashInApp} />;

      case 'blockchain':

        return <BlockchainVerifier initialHash={verifyHashInput} />;

      case 'chat':

        return (

          <div className="view-container" style={{ padding: '2rem 0' }}>

            <ChatBotWidget user={user} onNavigate={setActiveTab} />

          </div>

        );

      case 'forms':

        return <OfficialFormsPanel user={user} />;

      default:

        return <Dashboard user={user} onNavigate={setActiveTab} onVerifyHash={handleVerifyHashInApp} />;

    }

  };



  return (

    <div className="app-layout">

      <ToastNotification />

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleStudentLogout}
        onUpdateUser={(updatedProfile) => {
          setUser(updatedProfile);
          try {
            localStorage.setItem('usm_user', JSON.stringify(updatedProfile));
            sessionStorage.setItem('usm_user', JSON.stringify(updatedProfile));
          } catch (_) {}
        }}
      />

      <div className="main-content" ref={mainContentRef}>

        {renderContent()}

      </div>

      <Analytics />

    </div>

  );

}



export default App;

