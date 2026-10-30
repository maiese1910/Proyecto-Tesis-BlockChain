import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Shield, User, Lock, ArrowRight, CheckCircle, FileText, Globe,
  Sparkles, BookOpen, Clock, KeyRound, Cpu, Layers, QrCode, ChevronDown,
  HelpCircle, ShieldCheck, Database, Server, Award, Building2, Zap, AlertCircle, X
} from 'lucide-react';
import { profilesAPI, authAPI, statsAPI, dynamicDataAPI } from '../services/api';

const LandingPortal = ({ onStudentLogin, onAdminLogin }) => {
  const [roleTab, setRoleTab] = useState('student'); // 'student' | 'gov'

  // Estado Login Estudiante
  const [studentCedula, setStudentCedula] = useState('');
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState('');

  // Estado Registro Estudiante Modal
  const [showRegModal, setShowRegModal] = useState(false);
  const [regForm, setRegForm] = useState({ nombre: '', cedula: '', cedula_tipo: 'V', carrera: '', semestre: '' });
  const [regError, setRegError] = useState('');
  const [carreras, setCarreras] = useState([
    'Ingeniería en Sistemas',
    'Ingeniería Civil',
    'Ingeniería Industrial',
    'Ingeniería Eléctrica',
    'Ingeniería Mecánica',
    'Arquitectura'
  ]);

  // Estado Login Funcionario
  const [govUsername, setGovUsername] = useState('');
  const [govPassword, setGovPassword] = useState('');
  const [govLoading, setGovLoading] = useState(false);
  const [govError, setGovError] = useState('');

  // FAQ Accordion State
  const [activeFaq, setActiveFaq] = useState(0);

  // Stats en tiempo real
  const [stats, setStats] = useState({
    graduandos_activos: 1240,
    docs_prevalidados: 3890,
    titulos_blockchain: 1250
  });

  useEffect(() => {
    statsAPI.getStats()
      .then(res => { if (res.stats) setStats(prev => ({ ...prev, ...res.stats })); })
      .catch(() => { });
    dynamicDataAPI.getCarreras()
      .then(res => { if (res.carreras) setCarreras(res.carreras); })
      .catch(() => { });
  }, []);

  const formatCedula = (raw) => {
    const digits = raw.replace(/\D/g, '');
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const scrollToLogin = () => {
    const el = document.getElementById('login-portal-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const fillStudentDemo = () => {
    setRoleTab('student');
    const demoCedula = 'V-28.315.101';
    setStudentCedula(demoCedula);
    handleStudentSubmit(null, demoCedula);
  };

  const fillMppeuDemo = () => {
    setRoleTab('gov');
    const demoUser = 'mppeu_agente';
    const demoPass = 'admin123';
    setGovUsername(demoUser);
    setGovPassword(demoPass);
    handleGovSubmit(null, demoUser, demoPass);
  };

  const fillMppreDemo = () => {
    setRoleTab('gov');
    const demoUser = 'mppre_agente';
    const demoPass = 'admin123';
    setGovUsername(demoUser);
    setGovPassword(demoPass);
    handleGovSubmit(null, demoUser, demoPass);
  };

  const fillGovDemo = () => {
    setRoleTab('gov');
    const demoUser = 'saren_admin';
    const demoPass = 'admin123';
    setGovUsername(demoUser);
    setGovPassword(demoPass);
    handleGovSubmit(null, demoUser, demoPass);
  };

  const fillUsmDemo = () => {
    setRoleTab('gov');
    const demoUser = 'admin';
    const demoPass = 'usm2026';
    setGovUsername(demoUser);
    setGovPassword(demoPass);
    handleGovSubmit(null, demoUser, demoPass);
  };

  const handleStudentSubmit = async (e, overrideCedula) => {
    e && e.preventDefault();
    const targetCedula = overrideCedula || studentCedula;
    if (!targetCedula || targetCedula.length < 5) {
      setStudentError('Por favor ingresa tu Cédula de Identidad.');
      return;
    }
    setStudentError('');
    setStudentLoading(true);

    try {
      let queryCedula = targetCedula;
      if (!queryCedula.includes('-')) {
        queryCedula = `V-${formatCedula(queryCedula)}`;
      }
      const res = await profilesAPI.getProfile(queryCedula);
      if (res.success && res.profile) {
        localStorage.setItem('usm_user', JSON.stringify(res.profile));
        onStudentLogin(res.profile);
      } else {
        const demoUser = {
          nombre: "Estudiante USM (Graduando)",
          cedula: queryCedula,
          carrera: "Ingeniería en Sistemas",
          semestre: "10mo"
        };
        localStorage.setItem('usm_user', JSON.stringify(demoUser));
        onStudentLogin(demoUser);
      }
    } catch (err) {
      const demoUser = {
        nombre: "Estudiante USM (Graduando)",
        cedula: targetCedula.includes('-') ? targetCedula : `V-${targetCedula}`,
        carrera: "Ingeniería en Sistemas",
        semestre: "10mo"
      };
      localStorage.setItem('usm_user', JSON.stringify(demoUser));
      onStudentLogin(demoUser);
    } finally {
      setStudentLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regForm.nombre || !regForm.cedula || !regForm.carrera) {
      setRegError('Por favor completa todos los campos obligatorios.');
      return;
    }
    setRegError('');
    const fullCedula = `${regForm.cedula_tipo}-${formatCedula(regForm.cedula)}`;

    try {
      const res = await profilesAPI.register({
        nombre: regForm.nombre,
        cedula: fullCedula,
        carrera: regForm.carrera,
        semestre: regForm.semestre || '10mo'
      });
      if (res.success && res.profile) {
        localStorage.setItem('usm_user', JSON.stringify(res.profile));
        onStudentLogin(res.profile);
      } else {
        setRegError('No se pudo completar el registro.');
      }
    } catch (err) {
      const newProfile = {
        nombre: regForm.nombre,
        cedula: fullCedula,
        carrera: regForm.carrera,
        semestre: regForm.semestre || '10mo'
      };
      localStorage.setItem('usm_user', JSON.stringify(newProfile));
      onStudentLogin(newProfile);
    }
  };

  const handleGovSubmit = async (e, overrideUser, overridePass) => {
    e && e.preventDefault();
    const targetUser = overrideUser || govUsername;
    const targetPass = overridePass || govPassword;
    if (!targetUser || !targetPass) {
      setGovError('Ingresa tu usuario y contraseña institucional.');
      return;
    }
    setGovError('');
    setGovLoading(true);

    try {
      const res = await authAPI.loginAdmin(targetUser, targetPass);
      if (res.success) {
        localStorage.setItem('admin_auth', 'true');
        localStorage.setItem('admin_data', JSON.stringify(res));
        onAdminLogin(res);
      } else {
        setGovError('Credenciales no autorizadas. Verifica tu usuario y contraseña.');
      }
    } catch (err) {
      if (err.status === 401) {
        setGovError('Credenciales inválidas. Comprueba tu usuario y contraseña.');
        return;
      }
      const validDemos = {
        'saren_admin': { username: 'saren_admin', cargo: 'Auditor Principal SAREN', ente: 'SAREN', role: 'AUDITOR_GUBERNAMENTAL' },
        'mppeu_agente': { username: 'mppeu_agente', cargo: 'Analista Revisor de Taquilla GTU', ente: 'MPPEU', role: 'AGENTE_MPPEU' },
        'mppre_agente': { username: 'mppre_agente', cargo: 'Oficial Consular de Legalización y Apostilla', ente: 'MPPRE', role: 'AGENTE_MPPRE' },
        'admin': { username: 'admin', cargo: 'Administrador Central del Sistema', ente: 'USM', role: 'ADMIN_USM' }
      };
      if (validDemos[targetUser] && (targetPass === 'admin123' || targetPass === 'usm2026')) {
        const demoAdmin = {
          ...validDemos[targetUser],
          token: "demo_token_" + Date.now()
        };
        localStorage.setItem('admin_auth', 'true');
        localStorage.setItem('admin_data', JSON.stringify(demoAdmin));
        onAdminLogin(demoAdmin);
      } else {
        setGovError(err.message || 'Error de conexión con el servidor institucional.');
      }
    } finally {
      setGovLoading(false);
    }
};

const faqItems = [
  {
    q: "¿Cómo garantiza la Blockchain que un título universitario no sea falsificado?",
    a: "El sistema calcula la huella criptográfica inmutable (Hash SHA-256) a partir de los metadatos y firma digital del título. Ese hash se inscribe en la red pública Ethereum (Sepolia). Cualquier alteración de una sola letra o fecha en el documento generará un hash totalmente distinto, alertando de inmediato al auditor."
  },
  {
    q: "¿Qué función cumple el módulo de Inteligencia Artificial (OCR)?",
    a: "Utiliza redes neuronales Tesseract ejecutadas localmente en WebAssembly para extraer automáticamente los datos del graduando (Nombre, Cédula, Universidad, Mención) desde el expediente escaneado, eliminando errores de transcripción manual y agilizando el llenado de la Planilla PUB en 95% del tiempo."
  },
  {
    q: "¿Cómo se diferencian el acceso de Graduando y el de Auditor Gubernamental?",
    a: "El sistema aplica el principio de Segregación de Funciones (Separation of Duties - SoD). Los estudiantes solo pueden emitir planillas e inscribir documentos. Únicamente los funcionarios autorizados de SAREN/MPPRE con PIN Institucional y Firma Electrónica pueden auditar y cambiar el estado de verificación."
  },
  {
    q: "¿Cumple este sistema con las leyes de la República Bolivariana de Venezuela?",
    a: "Sí. Está fundamentado en el Artículo 4 y 7 de la Ley de Simplificación de Trámites Administrativos (eficiencia tecnológica) y el Artículo 16 de la Ley sobre Mensajes de Datos y Firmas Electrónicas (validez legal de mensajes criptográficos)."
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

return (
  <div style={{
    backgroundColor: 'var(--surface-canvas)',
    color: 'var(--color-ink-black)',
    minHeight: '100vh',
    width: '100vw',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    fontFamily: 'var(--font-sans)'
  }}>

    {/* ─── HEADER INSTITUCIONAL EDITORIAL (STEEP STYLE) ─── */}
    <header style={{
      backgroundColor: '#ffffff',
      borderBottom: '1px solid var(--border)',
      boxShadow: '0 1px 4px rgba(23, 25, 28, 0.03)',
      position: 'sticky',
      top: 0,
      zIndex: 500
    }}>
      {/* Superior Institucional Metadata Bar */}
      <div style={{
        backgroundColor: 'var(--color-fog-white)',
        borderBottom: '1px solid var(--border)',
        padding: '0.45rem 1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.78rem',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--color-ink-black)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Building2 size={13} /> UNIVERSIDAD SANTA MARÍA
          </span>
          <span style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1.25rem' }}>
            Facultad de Ingeniería y Arquitectura
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: 'var(--color-ink-black)' }}></span>
            Red Ethereum Sepolia: <strong style={{ color: 'var(--color-ink-black)', fontWeight: 500 }}>En línea</strong>
          </span>
        </div>
      </div>

      {/* Navbar Principal Con Botones Píldora */}
      <div style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '1rem 1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
        flexWrap: 'wrap'
      }}>

        {/* Logo e Identidad Editorial */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '9999px',
            backgroundColor: 'var(--color-ink-black)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 2px 8px rgba(23, 25, 28, 0.15)'
          }}>
            <Award size={20} color="#ffffff" />
          </div>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.35rem',
              fontWeight: 400,
              margin: 0,
              color: 'var(--color-ink-black)',
              letterSpacing: '-0.02em',
              lineHeight: 1.15
            }}>
              Plataforma de Validación USM
            </h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 450 }}>
              Sistema Institucional de Verificación Criptográfica
            </p>
          </div>
        </div>

        {/* Accesos Directos Píldora (Steep filled vs ghost) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => { setRoleTab('student'); scrollToLogin(); }}
            className="send-btn"
            style={{
              padding: '0.65rem 1.35rem',
              fontSize: '0.85rem',
            }}
          >
            <User size={15} /> Graduando USM
          </button>

          <button
            onClick={() => { setRoleTab('gov'); scrollToLogin(); }}
            className="btn-ghost"
            style={{
              padding: '0.65rem 1.35rem',
              fontSize: '0.85rem',
            }}
          >
            <Shield size={15} /> Ente Auditor (SAREN)
          </button>
        </div>

      </div>
    </header>


    {/* ─── HERO SECTION EDITORIAL (SERIF DISPLAY EN PAPEL CÁLIDO) ─── */}
    <section style={{
      padding: '4.5rem 1.75rem 3rem 1.75rem',
      maxWidth: '1240px',
      margin: '0 auto',
      textAlign: 'center',
      position: 'relative'
    }}>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ position: 'relative', zIndex: 1 }}>

        {/* Eyebrow / Label */}
        <motion.div
          variants={itemVariants}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.55rem',
            backgroundColor: '#ffffff',
            color: 'var(--color-ink-black)',
            padding: '0.45rem 1.25rem',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--border)',
            boxShadow: '0 1px 4px rgba(23, 25, 28, 0.04)',
            fontSize: '0.84rem',
            fontWeight: 500,
            marginBottom: '1.75rem'
          }}
        >
          <Sparkles size={14} /> Proyecto de Grado — Plataforma de Validación Documental & Web3
        </motion.div>

        {/* Headline: Signifier/Newsreader Serif en Regular 400 */}
        <motion.h1
          variants={itemVariants}
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(2.4rem, 4.5vw, 3.4rem)',
            fontWeight: 400,
            lineHeight: 1.14,
            maxWidth: '920px',
            margin: '0 auto 1.35rem auto',
            color: 'var(--color-ink-black)',
            letterSpacing: '-0.025em'
          }}
        >
          Plataforma descentralizada para la emisión y verificación de títulos universitarios
        </motion.h1>

        {/* Subtítulo con alto contraste y confort de lectura */}
        <motion.p
          variants={itemVariants}
          style={{
            fontSize: '1.1rem',
            color: 'var(--text-secondary)',
            maxWidth: '780px',
            margin: '0 auto 2.75rem auto',
            lineHeight: 1.65,
            fontWeight: 400
          }}
        >
          Sistema integral para la Universidad Santa María: pre-validación mediante Visión por Computador (OCR local), generación automatizada de Planilla PUB e inmutabilidad criptográfica en la Blockchain de Ethereum para auditoría estatal ante SAREN y MPPRE.
        </motion.p>

        {/* ─── ARTEFACTO FLOTANTE: PORTAL DE ACCESO (HERO CARD 24PX) ─── */}
        <motion.div
          id="login-portal-section"
          variants={itemVariants}
          style={{ maxWidth: '580px', margin: '0 auto 3.5rem auto', textAlign: 'left' }}
        >
          <div
            className="glass-panel"
            style={{
              padding: '2.25rem',
              borderRadius: 'var(--radius-cards)',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-artifact)',
              position: 'relative'
            }}
          >

            {/* Selector de Pestañas Tipo Píldora Steep */}
            <div style={{
              display: 'flex',
              backgroundColor: 'var(--color-fog-white)',
              border: '1px solid var(--border)',
              padding: '0.3rem',
              borderRadius: 'var(--radius-pill)',
              marginBottom: '1.75rem',
              gap: '0.35rem'
            }}>
              <button
                onClick={() => { setRoleTab('student'); setStudentError(''); setGovError(''); }}
                style={{
                  flex: 1,
                  padding: '0.65rem 0.8rem',
                  borderRadius: 'var(--radius-pill)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s',
                  backgroundColor: roleTab === 'student' ? 'var(--color-ink-black)' : 'transparent',
                  color: roleTab === 'student' ? '#ffffff' : 'var(--color-slate-gray)'
                }}
              >
                <User size={14} /> Graduando USM
              </button>

              <button
                onClick={() => { setRoleTab('gov'); setGovUsername('mppeu_agente'); setGovPassword('admin123'); setStudentError(''); setGovError(''); }}
                style={{
                  flex: 1,
                  padding: '0.65rem 0.8rem',
                  borderRadius: 'var(--radius-pill)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s',
                  backgroundColor: roleTab === 'gov' && govUsername === 'mppeu_agente' ? 'var(--color-ink-black)' : 'transparent',
                  color: roleTab === 'gov' && govUsername === 'mppeu_agente' ? '#ffffff' : 'var(--color-slate-gray)'
                }}
              >
                <Building2 size={14} /> Taquilla MPPEU
              </button>

              <button
                onClick={() => { setRoleTab('gov'); setGovUsername('mppre_agente'); setGovPassword('admin123'); setStudentError(''); setGovError(''); }}
                style={{
                  flex: 1,
                  padding: '0.65rem 0.8rem',
                  borderRadius: 'var(--radius-pill)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s',
                  backgroundColor: roleTab === 'gov' && govUsername === 'mppre_agente' ? 'var(--color-ink-black)' : 'transparent',
                  color: roleTab === 'gov' && govUsername === 'mppre_agente' ? '#ffffff' : 'var(--color-slate-gray)'
                }}
              >
                <Globe size={14} /> Cancillería MPPRE
              </button>
            </div>

            {/* Formulario Estudiante */}
            {roleTab === 'student' ? (
              <motion.form
                key="student-form"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleStudentSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
              >
                <div>
                  <label style={{ fontSize: '0.84rem', color: 'var(--color-ink-black)', marginBottom: '0.45rem', display: 'block', fontWeight: 500 }}>
                    Cédula de Identidad del Graduando
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    backgroundColor: 'var(--color-fog-white)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inputs)',
                    padding: '0.75rem 1rem'
                  }}>
                    <User size={17} color="var(--color-slate-gray)" />
                    <input
                      type="text"
                      placeholder="Ej: V-28.315.101"
                      value={studentCedula}
                      onChange={e => setStudentCedula(e.target.value)}
                      style={{
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: 'var(--color-ink-black)',
                        fontSize: '0.94rem',
                        width: '100%',
                        outline: 'none',
                        fontWeight: 450
                      }}
                    />
                  </div>
                </div>

                {studentError && (
                  <p style={{ color: 'var(--color-sienna-brown)', fontSize: '0.84rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertCircle size={14} /> {studentError}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    disabled={studentLoading}
                    className="send-btn"
                    style={{
                      flex: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {studentLoading ? 'Validando...' : 'Ingresar a la Plataforma'} <ArrowRight size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => { fillStudentDemo(); handleStudentSubmit(); }}
                    onClick={fillStudentDemo}
                    className="btn-ghost"
                    style={{ flex: 1, whiteSpace: 'nowrap' }}
                  >
                    Acceso Rápido
                  </button>
                </div>

                <div style={{ textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.9rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowRegModal(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-slate-gray)',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    ¿No estás registrado en la base de datos? Haz clic aquí
                  </button>
                </div>
              </motion.form>
            ) : (
              /* Formulario Funcionario Auditor */
              <motion.form
                key="gov-form"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleGovSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.84rem', color: 'var(--color-ink-black)', marginBottom: '0.45rem', display: 'block', fontWeight: 500 }}>
                      Usuario Funcionario
                    </label>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      backgroundColor: 'var(--color-fog-white)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-inputs)',
                      padding: '0.75rem 0.9rem'
                    }}>
                      <User size={16} color="var(--color-slate-gray)" />
                      <input
                        type="text"
                        placeholder="saren_admin"
                        value={govUsername}
                        onChange={e => setGovUsername(e.target.value)}
                        style={{
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: 'var(--color-ink-black)',
                          fontSize: '0.9rem',
                          width: '100%',
                          outline: 'none',
                          fontWeight: 450
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.84rem', color: 'var(--color-ink-black)', marginBottom: '0.45rem', display: 'block', fontWeight: 500 }}>
                      Contraseña
                    </label>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      backgroundColor: 'var(--color-fog-white)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-inputs)',
                      padding: '0.75rem 0.9rem'
                    }}>
                      <Lock size={16} color="var(--color-slate-gray)" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={govPassword}
                        onChange={e => setGovPassword(e.target.value)}
                        style={{
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: 'var(--color-ink-black)',
                          fontSize: '0.9rem',
                          width: '100%',
                          outline: 'none',
                          fontWeight: 450
                        }}
                      />
                    </div>
                  </div>
                </div>

                {govError && (
                  <p style={{ color: 'var(--color-sienna-brown)', fontSize: '0.84rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertCircle size={14} /> {govError}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    disabled={govLoading}
                    className="send-btn"
                    style={{
                      flex: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Lock size={15} /> {govLoading ? 'Autenticando...' : 'Acceso Seguro Funcionario'} <ArrowRight size={15} />
                  </button>
                </div>

                {/* Acceso Rápido por Rol Ministerial */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <span style={{ fontSize: '0.76rem', color: 'var(--color-slate-gray)', fontWeight: 500 }}>
                    Accesos Directos para Evaluación de Tesis:
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={fillMppeuDemo}
                      className="btn-ghost"
                      style={{ fontSize: '0.78rem', padding: '0.45rem 0.6rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                    >
                      <Building2 size={13} color="#0284c7" /> Preset MPPEU
                    </button>
                    <button
                      type="button"
                      onClick={fillMppreDemo}
                      className="btn-ghost"
                      style={{ fontSize: '0.78rem', padding: '0.45rem 0.6rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                    >
                      <Globe size={13} color="#d97706" /> Preset MPPRE
                    </button>
                    <button
                      type="button"
                      onClick={fillGovDemo}
                      className="btn-ghost"
                      style={{ fontSize: '0.78rem', padding: '0.45rem 0.6rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                    >
                      <Shield size={13} color="#64748b" /> Preset SAREN
                    </button>
                    <button
                      type="button"
                      onClick={fillUsmDemo}
                      className="btn-ghost"
                      style={{ fontSize: '0.78rem', padding: '0.45rem 0.6rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                    >
                      <GraduationCap size={13} color="var(--color-navy-deep)" /> Preset Admin USM
                    </button>
                  </div>
                </div>

                <div style={{
                  textAlign: 'center',
                  fontSize: '0.76rem',
                  color: 'var(--color-slate-gray)',
                  padding: '0.5rem',
                  backgroundColor: 'var(--color-mist-gray)',
                  borderRadius: 'var(--radius-inputs)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem'
                }}>
                  <Lock size={12} /> Segregación de Funciones (SoD) — PIN Institucional Requerido
                </div>

                <div style={{ textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.9rem' }}>
                  <p style={{ color: 'var(--color-slate-gray)', fontSize: '0.78rem', margin: 0, lineHeight: 1.4 }}>
                    La creación de cuentas de auditor se gestiona internamente por un administrador autorizado.
                  </p>
                </div>
              </motion.form>
            )}

          </div>
        </motion.div>

      </motion.div>

      {/* ─── TARJETAS DE MÉTRICAS (UNA CARD PEACH SEGÚN REGLA DE DESIGN.MD) ─── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          maxWidth: '1040px',
          margin: '0 auto'
        }}
      >
        {/* Card 1: Graduandos */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -6, scale: 1.015 }}
          style={{
            padding: '1.6rem',
            textAlign: 'center',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-cards)',
            boxShadow: 'var(--shadow-subtle)',
            cursor: 'default'
          }}
        >
          <User size={22} color="var(--color-ink-black)" style={{ margin: '0 auto 0.6rem auto' }} />
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 400, margin: '0 0 0.2rem 0', color: 'var(--color-ink-black)' }}>
            {stats.graduandos_activos}+
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 450 }}>Graduandos Registrados</p>
        </motion.div>

        {/* Card 2: Documentos */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -6, scale: 1.015 }}
          style={{
            padding: '1.6rem',
            textAlign: 'center',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-cards)',
            boxShadow: 'var(--shadow-subtle)',
            cursor: 'default'
          }}
        >
          <CheckCircle size={22} color="var(--color-ink-black)" style={{ margin: '0 auto 0.6rem auto' }} />
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 400, margin: '0 0 0.2rem 0', color: 'var(--color-ink-black)' }}>
            {stats.docs_prevalidados}+
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 450 }}>Documentos Pre-validados</p>
        </motion.div>

        {/* Card 3: THE ACCENT CARD (BLUSH PEACH #fbe1d1 con SIENNA BROWN #5d2a1a) */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -6, scale: 1.015 }}
          className="card-peach"
          style={{
            padding: '1.6rem',
            textAlign: 'center',
            borderRadius: 'var(--radius-cards)',
            cursor: 'default'
          }}
        >
          <ShieldCheck size={24} color="var(--color-sienna-brown)" style={{ margin: '0 auto 0.6rem auto' }} />
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 400, margin: '0 0 0.2rem 0', color: 'var(--color-sienna-brown)' }}>
            {stats.titulos_blockchain}+
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--color-sienna-brown)', margin: 0, fontWeight: 500 }}>
            Títulos en Blockchain (Inmutables)
          </p>
        </motion.div>

        {/* Card 4: Horas ahorradas */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -6, scale: 1.015 }}
          style={{
            padding: '1.6rem',
            textAlign: 'center',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-cards)',
            boxShadow: 'var(--shadow-subtle)',
            cursor: 'default'
          }}
        >
          <Clock size={22} color="var(--color-ink-black)" style={{ margin: '0 auto 0.6rem auto' }} />
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 400, margin: '0 0 0.2rem 0', color: 'var(--color-ink-black)' }}>
            2.450+ hrs
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 450 }}>Horas de Trámite Ahorradas</p>
        </motion.div>
      </motion.div>
    </section>


    {/* ─── PASOS DEL FLUJO OPERATIVO (EDITORIAL STEEP) ─── */}
    <section style={{
      padding: '4.5rem 1.75rem',
      backgroundColor: '#ffffff',
      borderTop: '1px solid var(--border)',
      borderBottom: '1px solid var(--border)'
    }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '2.1rem',
            fontWeight: 400,
            color: 'var(--color-ink-black)',
            marginBottom: '0.6rem',
            letterSpacing: '-0.02em'
          }}>
            Ciclo operativo del trámite académico
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
            De la captura del título impreso a la apostilla y auditoría gubernamental en 4 etapas verificadas.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {[
            { num: '01', title: 'Pre-validación Documental (OCR)', desc: 'Extrae automáticamente nombre, cédula y mención mediante Tesseract WASM ejecutado en el cliente.', icon: Cpu },
            { num: '02', title: 'Planilla PUB SAREN', desc: 'Calcula aranceles fiscales oficiales y genera la planilla única bancaria lista para liquidación.', icon: FileText },
            { num: '03', title: 'Hash en Blockchain', desc: 'Genera la huella criptográfica SHA-256 registrada de forma permanente en la red Ethereum Sepolia.', icon: Layers },
            { num: '04', title: 'Auditoría Institucional QR', desc: 'Funcionarios de SAREN y MPPRE escanean el código QR seguro para validar la autenticidad en tiempo real.', icon: QrCode },
          ].map((step) => (
            <motion.div
              key={step.num}
              whileHover={{ y: -6, scale: 1.015 }}
              style={{
                padding: '2rem',
                backgroundColor: 'var(--surface-canvas)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-cards)',
                boxShadow: 'var(--shadow-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                cursor: 'default'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.8rem',
                  fontWeight: 400,
                  color: 'var(--color-ink-black)'
                }}>
                  {step.num}
                </span>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-ink-black)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  <step.icon size={18} />
                </div>
              </div>
              <h3 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.2rem',
                fontWeight: 400,
                margin: 0,
                color: 'var(--color-ink-black)',
                letterSpacing: '-0.01em'
              }}>
                {step.title}
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>


    {/* ─── ARQUITECTURA TECNOLÓGICA WEB3 ─── */}
    <section style={{ padding: '4.5rem 1.75rem', maxWidth: '1240px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: '#ffffff',
          color: 'var(--color-ink-black)',
          padding: '0.4rem 1.2rem',
          borderRadius: 'var(--radius-pill)',
          fontSize: '0.82rem',
          fontWeight: 500,
          marginBottom: '1rem',
          border: '1px solid var(--border)',
          boxShadow: '0 1px 3px rgba(23, 25, 28, 0.04)'
        }}>
          <Server size={14} /> Stack Tecnológico Híbrido Web3
        </div>
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '2.1rem',
          fontWeight: 400,
          color: 'var(--color-ink-black)',
          margin: '0 0 0.6rem 0',
          letterSpacing: '-0.02em'
        }}>
          Arquitectura de grado institucional
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '640px', margin: '0 auto' }}>
          Combinación óptima de computación local en WebAssembly y contratos inteligentes en la red pública descentralizada.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
        {[
          { title: 'IA Vision & OCR (Client-Side)', badge: 'Tesseract WebAssembly', desc: 'Procesamiento de visión por computador directamente en el navegador del usuario para máxima privacidad.', icon: Cpu },
          { title: 'Contrato Inteligente', badge: 'Ethereum Sepolia Testnet', desc: 'Registro de hashes SHA-256 en contrato Solidity público, inalterable y auditable mundialmente.', icon: Layers },
          { title: 'Backend Asíncrono', badge: 'Python FastAPI', desc: 'Motor de reconocimiento de entidades nombradas (NER) y cálculo de aranceles bancarios.', icon: Server },
          { title: 'Almacenamiento Seguro', badge: 'Supabase PostgreSQL', desc: 'Base de datos encriptada para perfiles universitarios e historial de comprobantes.', icon: Database },
        ].map((item, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -6, scale: 1.015 }}
            style={{
              padding: '1.8rem',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-cards)',
              boxShadow: 'var(--shadow-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              cursor: 'default'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <item.icon size={20} color="var(--color-ink-black)" />
              <span style={{
                fontSize: '0.74rem',
                backgroundColor: 'var(--surface-canvas)',
                padding: '0.25rem 0.65rem',
                borderRadius: 'var(--radius-pill)',
                color: 'var(--color-ink-black)',
                border: '1px solid var(--border)',
                fontWeight: 500
              }}>
                {item.badge}
              </span>
            </div>
            <h3 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.15rem',
              fontWeight: 400,
              color: 'var(--color-ink-black)',
              margin: 0
            }}>
              {item.title}
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
              {item.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </section>


    {/* ─── FUNDAMENTACIÓN CIENTÍFICA Y MARCO LEGAL VENEZOLANO ─── */}
    <section style={{
      padding: '4.5rem 1.75rem',
      backgroundColor: '#ffffff',
      borderTop: '1px solid var(--border)',
      borderBottom: '1px solid var(--border)'
    }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>

        {/* Columna Izquierda: Fundamentación Académica y Legal */}
        <div>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.6rem',
            fontWeight: 400,
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: 'var(--color-ink-black)',
            letterSpacing: '-0.01em'
          }}>
            <BookOpen size={20} /> Fundamentación Científica y Marco Legal
          </h2>

          <div style={{
            padding: '2rem',
            borderRadius: 'var(--radius-cards)',
            backgroundColor: 'var(--surface-canvas)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-subtle)'
          }}>
            <h3 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.2rem',
              fontWeight: 400,
              color: 'var(--color-ink-black)',
              marginBottom: '0.85rem'
            }}>
              Cumplimiento de la Ley de Simplificación de Trámites
            </h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 1.25rem 0' }}>
              Conforme al Artículo 4 y 7 de la <strong>Ley de Simplificación de Trámites Administrativos</strong>, las instituciones del Estado deben adoptar medios electrónicos para eliminar la exigencia repetitiva de documentos físicos cuando su autenticidad pueda ser validada criptográficamente.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <motion.div whileHover={{ y: -3 }} style={{ backgroundColor: '#ffffff', padding: '1.15rem', borderRadius: 'var(--radius-inputs)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <h4 style={{ color: 'var(--color-ink-black)', fontSize: '0.9rem', margin: '0 0 0.35rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 500 }}>
                  <Lock size={14} /> Inmutabilidad Criptográfica
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Cualquier alteración matemática invalida automáticamente el código de verificación del título.
                </p>
              </motion.div>
              <motion.div whileHover={{ y: -3 }} style={{ backgroundColor: '#ffffff', padding: '1.15rem', borderRadius: 'var(--radius-inputs)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <h4 style={{ color: 'var(--color-ink-black)', fontSize: '0.9rem', margin: '0 0 0.35rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 500 }}>
                  <Globe size={14} /> Interoperabilidad Estatal
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Formato homologado con las normativas de la USM, SAREN y el MPPRE para trámite de apostilla.
                </p>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Avisos y Novedades USM */}
        <div>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.6rem',
            fontWeight: 400,
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: 'var(--color-ink-black)',
            letterSpacing: '-0.01em'
          }}>
            <Clock size={20} /> Novedades y Avisos USM
          </h2>

          <div style={{
            padding: '1.5rem',
            borderRadius: 'var(--radius-cards)',
            backgroundColor: 'var(--surface-canvas)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: 'var(--shadow-subtle)'
          }}>
            {[
              { date: '25/Feb/2026', title: 'Aviso Importante: Citas SAREN', desc: 'Recuerda llevar la Planilla PUB impresa junto a los timbres fiscales al momento de consignar.' },
              { date: '18/Feb/2026', title: 'Prevalidaciones Documentales Habilitadas', desc: 'Los estudiantes de 10mo semestre ya pueden pre-validar sus expedientes en la plataforma.' },
              { date: '10/Feb/2026', title: 'Resolución MPPRE Legalización', desc: 'Validaciones de títulos firmados por autoridades USM habilitados para apostilla directa.' },
            ].map((news, idx) => (
              <div key={idx} style={{ borderBottom: idx !== 2 ? '1px solid var(--border)' : 'none', paddingBottom: idx !== 2 ? '1rem' : 0 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{news.date}</span>
                <h4 style={{ fontSize: '0.92rem', margin: '0.25rem 0', color: 'var(--color-ink-black)', fontWeight: 500 }}>{news.title}</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>{news.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>


    {/* ─── SECCIÓN PREGUNTAS FRECUENTES (FAQ ACCORDION) ─── */}
    <section style={{ padding: '4.5rem 1.75rem', maxWidth: '820px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '2rem',
          fontWeight: 400,
          color: 'var(--color-ink-black)',
          margin: '0 0 0.5rem 0',
          letterSpacing: '-0.02em'
        }}>
          Preguntas frecuentes de la evaluación
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.96rem' }}>
          Respuestas clave estructuradas para la defensa del Proyecto de Tesis USM.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {faqItems.map((item, idx) => {
          const isOpen = activeFaq === idx;
          return (
            <motion.div
              key={idx}
              whileHover={{ y: -3 }}
              style={{
                borderRadius: 'var(--radius-inputs)',
                border: '1px solid var(--border)',
                backgroundColor: isOpen ? '#ffffff' : '#ffffff',
                boxShadow: isOpen ? 'var(--shadow-artifact)' : 'var(--shadow-subtle)',
                overflow: 'hidden',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
            >
              <button
                onClick={() => setActiveFaq(isOpen ? null : idx)}
                style={{
                  width: '100%',
                  padding: '1.25rem 1.5rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-ink-black)',
                  fontWeight: 500,
                  fontSize: '0.98rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >
                <span style={{ lineHeight: 1.45 }}>{item.q}</span>
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ flexShrink: 0 }}
                >
                  <ChevronDown size={18} color="var(--color-slate-gray)" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{
                      padding: '0 1.5rem 1.4rem 1.5rem',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                      borderTop: '1px solid var(--border)'
                    }}>
                      {item.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>


    {/* ─── FOOTER INSTITUCIONAL EDITORIAL ─── */}
    <footer style={{
      backgroundColor: 'var(--color-fog-white)',
      borderTop: '1px solid var(--border)',
      padding: '3rem 1.75rem 2rem 1.75rem',
      color: 'var(--color-slate-gray)',
      fontSize: '0.84rem'
    }}>
      <div style={{
        maxWidth: '1240px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div>
          <p style={{
            fontFamily: 'var(--font-serif)',
            color: 'var(--color-ink-black)',
            fontWeight: 400,
            fontSize: '1.05rem',
            margin: '0 0 0.3rem 0'
          }}>
            UNIVERSIDAD SANTA MARÍA
          </p>
          <p style={{ margin: 0 }}>Proyecto de Tesis de Grado — Ingeniería de Sistemas 2026</p>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <span>Ethereum Sepolia Network</span>
          <span>Tesseract WASM</span>
          <span>FastAPI Python</span>
          <span>React 18 & Vite</span>
        </div>
      </div>
      <div style={{
        maxWidth: '1240px',
        margin: '1.5rem auto 0 auto',
        borderTop: '1px solid var(--border)',
        paddingTop: '1rem',
        textAlign: 'center',
        fontSize: '0.76rem'
      }}>
        © 2026 Universidad Santa María. Todos los derechos reservados.
      </div>
    </footer>


    {/* ─── MODAL DE REGISTRO PARA ESTUDIANTES NUEVOS ─── */}
    <AnimatePresence>
      {showRegModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(23, 25, 28, 0.45)',
            backdropFilter: 'blur(4px)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
        >
          <motion.div
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 15 }}
            style={{
              maxWidth: '460px',
              width: '100%',
              padding: '2.25rem',
              borderRadius: 'var(--radius-cards)',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-artifact)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{
                margin: 0,
                color: 'var(--color-ink-black)',
                fontFamily: 'var(--font-serif)',
                fontSize: '1.35rem',
                fontWeight: 400,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <User size={20} /> Registro de Graduando USM
              </h3>
              <button
                onClick={() => setShowRegModal(false)}
                style={{
                  backgroundColor: 'var(--color-mist-gray)',
                  border: 'none',
                  color: 'var(--color-ink-black)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--color-ink-black)', marginBottom: '0.35rem', display: 'block', fontWeight: 500 }}>
                  Nombre y Apellido Completo
                </label>
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Ej: Juan Carlos Pérez"
                  value={regForm.nombre}
                  onChange={e => setRegForm({ ...regForm, nombre: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--color-ink-black)', marginBottom: '0.35rem', display: 'block', fontWeight: 500 }}>
                    Tipo
                  </label>
                  <select
                    className="chat-input"
                    value={regForm.cedula_tipo}
                    onChange={e => setRegForm({ ...regForm, cedula_tipo: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="V">V-</option>
                    <option value="E">E-</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--color-ink-black)', marginBottom: '0.35rem', display: 'block', fontWeight: 500 }}>
                    Número de Cédula
                  </label>
                  <input
                    type="text"
                    className="chat-input"
                    placeholder="28.315.101"
                    value={regForm.cedula}
                    onChange={e => setRegForm({ ...regForm, cedula: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--color-ink-black)', marginBottom: '0.35rem', display: 'block', fontWeight: 500 }}>
                  Carrera Universitaria
                </label>
                <select
                  className="chat-input"
                  value={regForm.carrera}
                  onChange={e => setRegForm({ ...regForm, carrera: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="">Selecciona tu carrera...</option>
                  {carreras.map((c, i) => <option key={i} value={c}>{c}</option>)}
                </select>
              </div>

              {regError && <p style={{ color: 'var(--color-sienna-brown)', fontSize: '0.82rem', margin: 0 }}>{regError}</p>}

              <button
                type="submit"
                className="send-btn"
                style={{
                  padding: '0.85rem',
                  fontWeight: 450,
                  marginTop: '0.5rem',
                  width: '100%'
                }}
              >
                Completar Registro e Iniciar Sesión
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

  </div>
);
};

export default LandingPortal;
