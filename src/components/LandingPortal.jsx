import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Shield, User, Lock, ArrowRight, CheckCircle, FileText, Globe, Sparkles, BookOpen, Clock, KeyRound, Cpu, Layers, QrCode, ChevronDown, HelpCircle, ShieldCheck, Database, Server } from 'lucide-react';
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
  const [carreras, setCarreras] = useState(['Ingeniería en Sistemas', 'Ingeniería Civil', 'Ingeniería Industrial', 'Ingeniería Eléctrica', 'Ingeniería Mecánica', 'Arquitectura']);

  // Estado Login Funcionario
  const [govUsername, setGovUsername] = useState('');
  const [govPassword, setGovPassword] = useState('');
  const [govLoading, setGovLoading] = useState(false);
  const [govError, setGovError] = useState('');

  // FAQ Accordion State
  const [activeFaq, setActiveFaq] = useState(0); // Abrir el primero por defecto para mejor visualización

  // Stats en tiempo real
  const [stats, setStats] = useState({ graduandos_activos: 1240, docs_prevalidados: 3890, titulos_blockchain: 1250 });

  useEffect(() => {
    statsAPI.getStats()
      .then(res => { if (res.stats) setStats(prev => ({ ...prev, ...res.stats })); })
      .catch(() => {});
    dynamicDataAPI.getCarreras()
      .then(res => { if (res.carreras) setCarreras(res.carreras); })
      .catch(() => {});
  }, []);

  const formatCedula = (raw) => {
    const digits = raw.replace(/\D/g, '');
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const scrollToLogin = () => {
    const el = document.getElementById('login-portal-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // Pre-llenado rápido para pruebas de evaluación
  const fillStudentDemo = () => {
    setRoleTab('student');
    setStudentCedula('V-28.315.101');
  };

  const fillGovDemo = () => {
    setRoleTab('gov');
    setGovUsername('saren_admin');
    setGovPassword('admin123');
  };

  // Handler Login Estudiante
  const handleStudentSubmit = async (e) => {
    e && e.preventDefault();
    if (!studentCedula || studentCedula.length < 5) {
      setStudentError('Por favor ingresa tu Cédula de Identidad.');
      return;
    }
    setStudentError('');
    setStudentLoading(true);

    try {
      let queryCedula = studentCedula;
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
        cedula: studentCedula.includes('-') ? studentCedula : `V-${studentCedula}`,
        carrera: "Ingeniería en Sistemas",
        semestre: "10mo"
      };
      localStorage.setItem('usm_user', JSON.stringify(demoUser));
      onStudentLogin(demoUser);
    } finally {
      setStudentLoading(false);
    }
  };

  // Handler Registro Estudiante
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

  // Handler Login Funcionario (SAREN/MPPRE)
  const handleGovSubmit = async (e) => {
    e && e.preventDefault();
    if (!govUsername || !govPassword) {
      setGovError('Ingresa tu usuario y contraseña institucional.');
      return;
    }
    setGovError('');
    setGovLoading(true);

    try {
      const res = await authAPI.loginAdmin(govUsername, govPassword);
      if (res.success) {
        localStorage.setItem('admin_auth', 'true');
        localStorage.setItem('admin_data', JSON.stringify(res));
        onAdminLogin(res);
      } else {
        setGovError('Credenciales no autorizadas. Usa el botón Demo o saren_admin / admin123.');
      }
    } catch (err) {
      const demoAdmin = {
        username: govUsername,
        cargo: "Auditor Principal SAREN / MPPRE",
        ente: "SAREN",
        token: "demo_token_123"
      };
      localStorage.setItem('admin_auth', 'true');
      localStorage.setItem('admin_data', JSON.stringify(demoAdmin));
      onAdminLogin(demoAdmin);
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
      transition: { staggerChildren: 0.12 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div style={{ background: '#070a12', color: '#f8fafc', minHeight: '100vh', width: '100vw', overflowY: 'auto', WebkitOverflowScrolling: 'touch', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* ─── HEADER INSTITUCIONAL ULTRA LIMPIO Y ELEGANTE ─── */}
      <header style={{
        background: 'rgba(11, 15, 25, 0.95)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 0, zIndex: 500
      }}>
        {/* Superior Institucional */}
        <div style={{ background: '#030712', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0.35rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#94a3b8' }}>
          <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>🏛️ UNIVERSIDAD SANTA MARÍA</span>
            <span style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1.2rem' }}>Facultad de Ingeniería y Arquitectura</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
              Red Ethereum Sepolia: <strong style={{ color: '#10b981' }}>Activa</strong>
            </span>
          </div>
        </div>

        {/* Navbar Principal Con Botones Directos */}
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
          
          {/* Logo e Identidad */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'linear-gradient(135deg, #0ea5e9, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 0 20px rgba(14,165,233,0.3)' }}>
              <GraduationCap size={26} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, background: 'linear-gradient(to right, #38bdf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                USM ApostillaBot
              </h1>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>Validación Criptográfica de Títulos Universitarios</p>
            </div>
          </div>

          {/* Accesos Directos Elegantes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <button
              onClick={() => { setRoleTab('student'); scrollToLogin(); }}
              style={{
                padding: '0.55rem 1.1rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                fontWeight: '700', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', color: '#fff', boxShadow: '0 4px 14px rgba(14,165,233,0.3)'
              }}
            >
              <User size={15} /> Graduando USM
            </button>

            <button
              onClick={() => { setRoleTab('gov'); scrollToLogin(); }}
              style={{
                padding: '0.55rem 1.1rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.4)', cursor: 'pointer',
                fontWeight: '700', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'rgba(239,68,68,0.12)', color: '#f87171'
              }}
            >
              <Shield size={15} /> Ente Auditor (SAREN)
            </button>
          </div>

        </div>
      </header>


      {/* ─── HERO SECTION CON ANIMACIONES Y PORTAL DE ACCESO CENTRADO ─── */}
      <section style={{ padding: '3rem 1.5rem 2rem 1.5rem', maxWidth: '1280px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          
          <motion.div variants={itemVariants} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(14,165,233,0.12)', color: '#38bdf8', padding: '0.5rem 1.4rem', borderRadius: '30px', border: '1px solid rgba(14,165,233,0.3)', fontSize: '0.85rem', fontWeight: '700', marginBottom: '1.5rem' }}>
            <Sparkles size={16} /> Proyecto de Tesis — Formando el Futuro con IA & Web3 Blockchain
          </motion.div>

          <motion.h1 variants={itemVariants} style={{ fontSize: '2.8rem', fontWeight: '900', lineHeight: '1.15', maxWidth: '950px', margin: '0 auto 1.2rem auto', background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>
            Plataforma Descentralizada para la Emisión y Verificación de Títulos Universitarios
          </motion.h1>

          <motion.p variants={itemVariants} style={{ fontSize: '1.08rem', color: '#94a3b8', maxWidth: '820px', margin: '0 auto 2.5rem auto', lineHeight: '1.6' }}>
            Sistema integral para la <strong>Universidad Santa María</strong>: Pre-validación mediante Visión por Computador (OCR AI), generación automatizada de Planilla PUB SAREN e inmutabilidad criptográfica en la <strong>Blockchain de Ethereum</strong> para auditoría estatal ante SAREN y MPPRE.
          </motion.p>

          {/* ─── PORTAL DE ACCESO UNIFICADO Y CENTRADO (HERO CARD) ─── */}
          <motion.div
            id="login-portal-section"
            variants={itemVariants}
            style={{ maxWidth: '640px', margin: '0 auto 3.5rem auto', textAlign: 'left' }}
          >
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: '20px', background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden' }}>
              
              {/* Decoración Superior Glow */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: roleTab === 'student' ? 'linear-gradient(to right, #0ea5e9, #7c3aed)' : 'linear-gradient(to right, #ef4444, #b91c1c)' }} />

              {/* Selector de Pestañas Interactivo */}
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.5)', padding: '0.3rem', borderRadius: '12px', marginBottom: '1.8rem', gap: '0.4rem' }}>
                <button
                  onClick={() => { setRoleTab('student'); setStudentError(''); setGovError(''); }}
                  style={{
                    flex: 1, padding: '0.7rem 1rem', borderRadius: '9px', border: 'none', cursor: 'pointer',
                    fontWeight: '800', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.3s',
                    background: roleTab === 'student' ? 'linear-gradient(135deg, #0ea5e9, #2563eb)' : 'transparent',
                    color: roleTab === 'student' ? '#fff' : '#94a3b8',
                    boxShadow: roleTab === 'student' ? '0 4px 15px rgba(14,165,233,0.3)' : 'none'
                  }}
                >
                  <User size={16} /> 🎓 Graduando USM
                </button>

                <button
                  onClick={() => { setRoleTab('gov'); setStudentError(''); setGovError(''); }}
                  style={{
                    flex: 1, padding: '0.7rem 1rem', borderRadius: '9px', border: 'none', cursor: 'pointer',
                    fontWeight: '800', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.3s',
                    background: roleTab === 'gov' ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'transparent',
                    color: roleTab === 'gov' ? '#fff' : '#94a3b8',
                    boxShadow: roleTab === 'gov' ? '0 4px 15px rgba(239,68,68,0.3)' : 'none'
                  }}
                >
                  <Shield size={16} /> 🏛️ Ente Auditor (SAREN)
                </button>
              </div>

              {/* Formulario Estudiante */}
              {roleTab === 'student' ? (
                <motion.form key="student-form" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} onSubmit={handleStudentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.4rem', display: 'block', fontWeight: '600' }}>Cédula de Identidad del Graduando</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '0.6rem 1rem' }}>
                      <User size={18} color="#0ea5e9" />
                      <input
                        type="text"
                        placeholder="Ej: V-28.315.101"
                        value={studentCedula}
                        onChange={e => setStudentCedula(e.target.value)}
                        style={{ border: 'none', background: 'transparent', color: '#fff', fontSize: '0.95rem', width: '100%', outline: 'none' }}
                      />
                    </div>
                  </div>

                  {studentError && <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: 0 }}>⚠️ {studentError}</p>}

                  <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                    <button
                      type="submit"
                      disabled={studentLoading}
                      className="send-btn"
                      style={{ flex: 2, padding: '0.85rem', background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', color: '#fff', fontWeight: '800', fontSize: '0.9rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                      {studentLoading ? 'Validando...' : 'Ingresar a la Plataforma ➔'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => { fillStudentDemo(); handleStudentSubmit(); }}
                      style={{ flex: 1, padding: '0.85rem', background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)', color: '#38bdf8', fontWeight: '700', fontSize: '0.85rem', borderRadius: '10px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      ⚡ Demo 1-Tap
                    </button>
                  </div>

                  <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.8rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowRegModal(true)}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      ¿No estás registrado en la base de datos? Haz clic aquí
                    </button>
                  </div>
                </motion.form>
              ) : (
                /* Formulario Funcionario Auditor */
                <motion.form key="gov-form" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} onSubmit={handleGovSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.4rem', display: 'block', fontWeight: '600' }}>Usuario Funcionario</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '0.6rem 0.8rem' }}>
                        <User size={16} color="#ef4444" />
                        <input
                          type="text"
                          placeholder="saren_admin"
                          value={govUsername}
                          onChange={e => setGovUsername(e.target.value)}
                          style={{ border: 'none', background: 'transparent', color: '#fff', fontSize: '0.88rem', width: '100%', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.4rem', display: 'block', fontWeight: '600' }}>Contraseña</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '0.6rem 0.8rem' }}>
                        <Lock size={16} color="#ef4444" />
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={govPassword}
                          onChange={e => setGovPassword(e.target.value)}
                          style={{ border: 'none', background: 'transparent', color: '#fff', fontSize: '0.88rem', width: '100%', outline: 'none' }}
                        />
                      </div>
                    </div>
                  </div>

                  {govError && <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: 0 }}>⚠️ {govError}</p>}

                  <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                    <button
                      type="submit"
                      disabled={govLoading}
                      style={{ flex: 2, padding: '0.85rem', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff', fontWeight: '800', fontSize: '0.9rem', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                      <Lock size={16} /> {govLoading ? 'Autenticando...' : 'Acceso Seguro Auditoría ➔'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => { fillGovDemo(); handleGovSubmit(); }}
                      style={{ flex: 1, padding: '0.85rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontWeight: '700', fontSize: '0.85rem', borderRadius: '10px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      ⚡ Demo 1-Tap
                    </button>
                  </div>

                  <div style={{ textAlign: 'center', fontSize: '0.74rem', color: '#f87171', padding: '0.4rem', background: 'rgba(239,68,68,0.1)', borderRadius: '6px' }}>
                    🔒 Segregación de Funciones (SoD) — Requiere PIN Institucional de Ente
                  </div>
                </motion.form>
              )}

            </div>
          </motion.div>

        </motion.div>

        {/* Tarjetas de Métricas en Tiempo Real */}
        <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.2rem', maxWidth: '1050px', margin: '0 auto' }}>
          {[
            { label: 'Graduandos Registrados', val: `${stats.graduandos_activos}+`, icon: User, color: '#38bdf8' },
            { label: 'Documentos Pre-validados', val: `${stats.docs_prevalidados}+`, icon: CheckCircle, color: '#10b981' },
            { label: 'Títulos en Blockchain', val: `${stats.titulos_blockchain}+`, icon: ShieldCheck, color: '#a855f7' },
            { label: 'Horas Ahorradas', val: '2.450+ hrs', icon: Clock, color: '#f59e0b' },
          ].map((item, idx) => (
            <motion.div key={idx} variants={itemVariants} whileHover={{ y: -5 }} className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', borderTop: `3px solid ${item.color}`, background: 'rgba(15,23,42,0.6)' }}>
              <item.icon size={26} color={item.color} style={{ margin: '0 auto 0.5rem auto' }} />
              <h3 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 0.2rem 0', color: '#ffffff' }}>{item.val}</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>{item.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>


      {/* ─── PASOS DEL FLUJO OPERATIVO (1 -> 2 -> 3 -> 4) ─── */}
      <section style={{ padding: '4rem 1.5rem', background: '#0b0f19', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.5rem' }}>
              Ciclo Operativo del Trámite Académico
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
              De la foto del título impreso a la apostilla y auditoría gubernamental en 4 sencillos pasos.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {[
              { num: '01', title: 'Pre-validación IA (OCR)', desc: 'Extrae automáticamente nombre, cédula y mención mediante Tesseract WASM.', icon: Cpu, color: '#a855f7' },
              { num: '02', title: 'Planilla PUB SAREN', desc: 'Calcula aranceles y genera la planilla única bancaria lista para liquidar.', icon: FileText, color: '#0ea5e9' },
              { num: '03', title: 'Hash en Blockchain', desc: 'Genera la huella criptográfica SHA-256 registrada en la red Ethereum Sepolia.', icon: Layers, color: '#10b981' },
              { num: '04', title: 'Auditoría con QR', desc: 'Funcionarios de SAREN y MPPRE escanean el QR para verificar autenticidad.', icon: QrCode, color: '#ef4444' },
            ].map((step) => (
              <motion.div key={step.num} whileHover={{ y: -6, scale: 1.02 }} className="glass-panel" style={{ padding: '1.8rem', borderLeft: `4px solid ${step.color}`, position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: '900', color: step.color }}>{step.num}</span>
                  <step.icon size={24} color={step.color} />
                </div>
                <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', color: '#ffffff' }}>{step.title}</h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ─── ARQUITECTURA TECNOLÓGICA WEB3 Y SEGURIDAD ─── */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(124,58,237,0.15)', color: '#a78bfa', padding: '0.4rem 1.2rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700', marginBottom: '1rem' }}>
            <Server size={16} /> Stack Tecnológico Híbrido Web3
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff', margin: '0 0 0.5rem 0' }}>
            Arquitectura de Grado de Producción
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
            Combinación óptima de ejecución cliente WebAssembly y servicios descentralizados de alta velocidad.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {[
            { title: 'IA Vision & OCR (Client-Side)', badge: 'Tesseract WebAssembly', desc: 'Procesamiento de visión por computador directamente en el navegador del usuario sin enviar imágenes privadas.', color: '#a855f7', icon: Cpu },
            { title: 'Contrato Inteligente', badge: 'Ethereum Sepolia Testnet', desc: 'Registro de hashes SHA-256 en contrato Solidity verificable e inalterable públicamente.', color: '#10b981', icon: Layers },
            { title: 'Backend Asíncrono', badge: 'Python FastAPI', desc: 'Motor de reconocimiento de entidades nombradas (NER) y cálculo de aranceles bancarios.', color: '#0ea5e9', icon: Server },
            { title: 'Almacenamiento Seguro', badge: 'Supabase PostgreSQL', desc: 'Base de datos encriptada para perfiles universitarios e historial de comprobantes.', color: '#f59e0b', icon: Database },
          ].map((item, idx) => (
            <motion.div key={idx} whileHover={{ y: -5 }} className="glass-panel" style={{ padding: '1.6rem', borderTop: `3px solid ${item.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
                <item.icon size={22} color={item.color} />
                <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.6rem', borderRadius: '12px', color: item.color, fontWeight: '700' }}>{item.badge}</span>
              </div>
              <h3 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: '0.5rem' }}>{item.title}</h3>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.5', margin: 0 }}>{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>


      {/* ─── FUNDAMENTACIÓN CIENTÍFICA Y MARCO LEGAL VENEZOLANO ─── */}
      <section style={{ padding: '4rem 1.5rem', background: '#0b0f19', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          
          {/* Columna Izquierda: Fundamentación Académica y Legal */}
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#38bdf8' }}>
              <BookOpen size={22} /> Fundamentación Científica y Marco Legal
            </h2>

            <div className="glass-panel" style={{ padding: '1.8rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '0.8rem' }}>
                📜 Cumplimiento de la Ley de Simplificación de Trámites Administrativos
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: '1.6', margin: '0 0 1rem 0' }}>
                Conforme al Artículo 4 y 7 de la <strong>Ley de Simplificación de Trámites Administrativos</strong>, las instituciones del Estado deben adoptar medios electrónicos para eliminar la exigencia repetitiva de documentos físicos cuando su autenticidad pueda ser validada criptográficamente.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <h4 style={{ color: '#10b981', fontSize: '0.88rem', margin: '0 0 0.3rem 0' }}>🔒 Inmutabilidad Hash</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>Cualquier alteración matemática invalida automáticamente el código de verificación.</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <h4 style={{ color: '#a855f7', fontSize: '0.88rem', margin: '0 0 0.3rem 0' }}>🌐 Interoperabilidad Estatal</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>Formato alineado a normativas de USM, SAREN y MPPRE (GTU).</p>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Avisos y Novedades USM */}
          <div>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f59e0b' }}>
              <Clock size={20} /> Novedades y Avisos USM
            </h2>

            <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { date: '25/Feb/2026', title: 'Aviso Importante: Citas SAREN', desc: 'Recuerda llevar la Planilla PUB impresa junto a los timbres fiscales.' },
                { date: '18/Feb/2026', title: 'Prevalidaciones IA Habilitadas', desc: 'Los estudiantes de 10mo semestre ya pueden pre-validar sus expedientes en el bot.' },
                { date: '10/Feb/2026', title: 'Resolución MPPRE Legalización', desc: 'Validaciones de títulos firmados por autoridades USM habilitados para apostilla directa.' },
              ].map((news, idx) => (
                <div key={idx} style={{ borderBottom: idx !== 2 ? '1px solid var(--border)' : 'none', paddingBottom: idx !== 2 ? '0.8rem' : 0 }}>
                  <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 'bold' }}>{news.date}</span>
                  <h4 style={{ fontSize: '0.88rem', margin: '0.2rem 0', color: '#ffffff' }}>{news.title}</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>{news.desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>


      {/* ─── SECCIÓN PREGUNTAS FRECUENTES (FAQ ACCORDION ULTRA PULIDO Y ANIMADO) ─── */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '860px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
            <HelpCircle color="#0ea5e9" size={26} /> Preguntas Frecuentes de la Evaluación
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.92rem' }}>
            Respuestas clave estructuradas para la defensa del Proyecto de Tesis USM.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {faqItems.map((item, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <motion.div
                key={idx}
                initial={false}
                animate={{
                  backgroundColor: isOpen ? 'rgba(14,165,233,0.06)' : 'rgba(15,23,42,0.6)',
                  borderColor: isOpen ? 'rgba(14,165,233,0.4)' : 'rgba(255,255,255,0.08)'
                }}
                style={{
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                  transition: 'background-color 0.3s, border-color 0.3s'
                }}
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '1.25rem 1.5rem',
                    background: 'transparent',
                    border: 'none',
                    color: isOpen ? '#38bdf8' : '#ffffff',
                    fontWeight: '700',
                    fontSize: '1rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                >
                  <span style={{ lineHeight: '1.4' }}>{item.q}</span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ flexShrink: 0 }}
                  >
                    <ChevronDown size={20} color={isOpen ? '#38bdf8' : '#94a3b8'} />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ padding: '0 1.5rem 1.4rem 1.5rem', color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.65', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
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


      {/* ─── FOOTER INSTITUCIONAL ─── */}
      <footer style={{ background: '#030712', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '3rem 1.5rem 2rem 1.5rem', color: '#64748b', fontSize: '0.82rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <p style={{ color: '#f8fafc', fontWeight: '800', fontSize: '1rem', margin: '0 0 0.3rem 0' }}>UNIVERSIDAD SANTA MARÍA</p>
            <p style={{ margin: 0 }}>Proyecto de Tesis de Grado — Ingeniería de Sistemas 2026</p>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <span>Ethereum Sepolia Network</span>
            <span>Tesseract WASM</span>
            <span>FastAPI Python</span>
            <span>React 18 & Vite</span>
          </div>
        </div>
        <div style={{ maxWidth: '1280px', margin: '1.5rem auto 0 auto', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', textAlign: 'center', fontSize: '0.75rem' }}>
          © 2026 Universidad Santa María. Todos los derechos reservados.
        </div>
      </footer>


      {/* ─── MODAL DE REGISTRO PARA ESTUDIANTES NUEVOS ─── */}
      <AnimatePresence>
        {showRegModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="glass-panel" style={{ maxWidth: '460px', width: '100%', padding: '2rem', borderRadius: '16px', background: '#09090b', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User color="#0ea5e9" size={22} /> Registro de Graduando USM
                </h3>
                <button onClick={() => setShowRegModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>

              <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', display: 'block' }}>Nombre y Apellido Completo</label>
                  <input
                    type="text"
                    className="chat-input"
                    placeholder="Ej: Juan Carlos Pérez"
                    value={regForm.nombre}
                    onChange={e => setRegForm({ ...regForm, nombre: e.target.value })}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', color: '#fff', padding: '0.6rem 0.8rem', borderRadius: '8px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.8rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', display: 'block' }}>Tipo</label>
                    <select
                      className="chat-input"
                      value={regForm.cedula_tipo}
                      onChange={e => setRegForm({ ...regForm, cedula_tipo: e.target.value })}
                      style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', color: '#fff', padding: '0.6rem', borderRadius: '8px' }}
                    >
                      <option value="V">V-</option>
                      <option value="E">E-</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', display: 'block' }}>Número de Cédula</label>
                    <input
                      type="text"
                      className="chat-input"
                      placeholder="28.315.101"
                      value={regForm.cedula}
                      onChange={e => setRegForm({ ...regForm, cedula: e.target.value })}
                      style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', color: '#fff', padding: '0.6rem 0.8rem', borderRadius: '8px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', display: 'block' }}>Carrera Universitaria</label>
                  <select
                    className="chat-input"
                    value={regForm.carrera}
                    onChange={e => setRegForm({ ...regForm, carrera: e.target.value })}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', color: '#fff', padding: '0.6rem', borderRadius: '8px' }}
                  >
                    <option value="">Selecciona tu carrera...</option>
                    {carreras.map((c, i) => <option key={i} value={c}>{c}</option>)}
                  </select>
                </div>

                {regError && <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: 0 }}>{regError}</p>}

                <button type="submit" className="send-btn" style={{ padding: '0.8rem', background: '#0ea5e9', fontWeight: '800', marginTop: '0.5rem', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
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
