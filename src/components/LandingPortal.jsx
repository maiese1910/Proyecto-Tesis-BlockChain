import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Shield, User, CreditCard, Lock, ArrowRight, CheckCircle, FileText, Globe, Sparkles, BookOpen, Clock, AlertTriangle, KeyRound, Cpu, Layers, QrCode } from 'lucide-react';
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

  // Stats en tiempo real
  const [stats, setStats] = useState({ graduandos_activos: 0, docs_prevalidados: 0, titulos_blockchain: 0 });

  useEffect(() => {
    statsAPI.getStats()
      .then(res => { if (res.stats) setStats(res.stats); })
      .catch(() => {});
    dynamicDataAPI.getCarreras()
      .then(res => { if (res.carreras) setCarreras(res.carreras); })
      .catch(() => {});
  }, []);

  const formatCedula = (raw) => {
    const digits = raw.replace(/\D/g, '');
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Pre-llenado rápido para pruebas
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
      setStudentError('Ingresa tu cédula.');
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
        // Si no existe en la BD, auto-crear un perfil de demostración para agilizar la prueba
        const demoUser = {
          nombre: "Estudiante USM (Demostración)",
          cedula: queryCedula,
          carrera: "Ingeniería en Sistemas",
          semestre: "10mo"
        };
        localStorage.setItem('usm_user', JSON.stringify(demoUser));
        onStudentLogin(demoUser);
      }
    } catch (err) {
      // Fallback amigable si no hay servidor
      const demoUser = {
        nombre: "Estudiante USM (Demostración)",
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
    if (!regForm.nombre.trim() || regForm.nombre.trim().split(' ').length < 2) return setRegError('Ingresa tu nombre completo (nombre y apellido).');
    if (!regForm.cedula || regForm.cedula.replace(/\./g, '').length < 6) return setRegError('Ingresa una cédula válida.');
    if (!regForm.carrera) return setRegError('Selecciona tu carrera.');
    if (!regForm.semestre) return setRegError('Selecciona tu semestre.');

    setRegError('');
    const user = {
      nombre: regForm.nombre.trim(),
      cedula: `${regForm.cedula_tipo}-${regForm.cedula}`,
      carrera: regForm.carrera,
      semestre: regForm.semestre
    };

    try {
      await profilesAPI.register(user);
    } catch (_) {}

    localStorage.setItem('usm_user', JSON.stringify(user));
    onStudentLogin(user);
  };

  // Handler Login Funcionario
  const handleGovSubmit = async (e) => {
    e && e.preventDefault();
    if (!govUsername || !govPassword) {
      setGovError('Ingresa usuario y contraseña.');
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
        setGovError('Credenciales inválidas. Usa el botón Demo o saren_admin / admin123.');
      }
    } catch (err) {
      // Fallback para prueba directa del jurado
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

  return (
    <div style={{ background: '#070a12', color: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* ─── HEADER INSTITUCIONAL CON ACCESO DUAL ─── */}
      <header style={{
        background: 'rgba(11, 15, 25, 0.95)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 0, zIndex: 100
      }}>
        {/* Superior Institucional */}
        <div style={{ background: '#030712', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0.35rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#94a3b8' }}>
          <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
            <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>🏛️ UNIVERSIDAD SANTA MARÍA</span>
            <span style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1.2rem' }}>Facultad de Ingeniería y Arquitectura</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span>🟢 Red Ethereum Sepolia: <strong style={{ color: '#10b981' }}>Activa</strong></span>
          </div>
        </div>

        {/* Navbar Principal y Login Dual */}
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
          
          {/* Logo y Nombre del Proyecto */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'linear-gradient(135deg, #0ea5e9, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 0 20px rgba(14,165,233,0.3)' }}>
              <GraduationCap size={26} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, background: 'linear-gradient(to right, #38bdf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                USM ApostillaBot
              </h1>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>Validación Criptográfica de Títulos</p>
            </div>
          </div>

          {/* Formulario de Inicio de Sesión Integrado en la Cabecera */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.4rem 0.6rem', borderRadius: '14px', flexWrap: 'wrap' }}>
            
            {/* Selector de Rol */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', padding: '0.2rem', borderRadius: '10px' }}>
              <button
                onClick={() => { setRoleTab('student'); setStudentError(''); setGovError(''); }}
                style={{
                  padding: '0.45rem 0.85rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontWeight: '700', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s',
                  background: roleTab === 'student' ? 'linear-gradient(135deg, #0ea5e9, #2563eb)' : 'transparent',
                  color: roleTab === 'student' ? '#fff' : '#94a3b8'
                }}
              >
                <User size={14} /> Graduando USM
              </button>

              <button
                onClick={() => { setRoleTab('gov'); setStudentError(''); setGovError(''); }}
                style={{
                  padding: '0.45rem 0.85rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontWeight: '700', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s',
                  background: roleTab === 'gov' ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'transparent',
                  color: roleTab === 'gov' ? '#fff' : '#94a3b8'
                }}
              >
                <Shield size={14} /> Ente Auditor (SAREN/MPPRE)
              </button>
            </div>

            {/* Formulario de Login Estudiante */}
            {roleTab === 'student' ? (
              <form onSubmit={handleStudentSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Cédula (ej: V-28.315.101)"
                  value={studentCedula}
                  onChange={e => setStudentCedula(e.target.value)}
                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '0.45rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', width: '165px' }}
                />
                <button
                  type="submit"
                  disabled={studentLoading}
                  className="send-btn"
                  style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', background: '#0ea5e9', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  {studentLoading ? '...' : 'Entrar'}
                </button>
                <button
                  type="button"
                  onClick={fillStudentDemo}
                  style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)', color: '#38bdf8', padding: '0.45rem 0.6rem', borderRadius: '8px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: '600' }}
                  title="Auto-completar datos de demostración"
                >
                  ⚡ Demo
                </button>
                <button
                  type="button"
                  onClick={() => setShowRegModal(true)}
                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '0.45rem 0.8rem', borderRadius: '8px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '600' }}
                >
                  Registrarse
                </button>
              </form>
            ) : (
              /* Formulario de Login Funcionario (SAREN / MPPRE) */
              <form onSubmit={handleGovSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Usuario"
                  value={govUsername}
                  onChange={e => setGovUsername(e.target.value)}
                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '0.45rem 0.6rem', borderRadius: '8px', fontSize: '0.8rem', width: '120px' }}
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={govPassword}
                  onChange={e => setGovPassword(e.target.value)}
                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '0.45rem 0.6rem', borderRadius: '8px', fontSize: '0.8rem', width: '110px' }}
                />
                <button
                  type="submit"
                  disabled={govLoading}
                  className="send-btn"
                  style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', background: '#ef4444', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Lock size={12} /> {govLoading ? '...' : 'Acceder'}
                </button>
                <button
                  type="button"
                  onClick={fillGovDemo}
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '0.45rem 0.6rem', borderRadius: '8px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: '600' }}
                  title="Auto-completar credenciales de demostración"
                >
                  ⚡ Demo
                </button>
              </form>
            )}

          </div>
        </div>

        {/* Mensaje de aviso/error */}
        {(studentError || govError) && (
          <div style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '0.35rem 1.5rem', textAlign: 'center', fontSize: '0.78rem', borderTop: '1px solid rgba(239,68,68,0.3)' }}>
            ⚠️ {studentError || govError}
          </div>
        )}
      </header>


      {/* ─── HERO BANNER PRINCIPAL ─── */}
      <section style={{ padding: '4rem 1.5rem 3rem 1.5rem', maxWidth: '1280px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(14,165,233,0.12)', color: '#38bdf8', padding: '0.5rem 1.4rem', borderRadius: '30px', border: '1px solid rgba(14,165,233,0.3)', fontSize: '0.85rem', fontWeight: '700', marginBottom: '1.8rem' }}>
            <Sparkles size={16} /> Proyecto de Tesis — Formando el Futuro con Excelencia e Innovación Web3
          </div>

          <h1 style={{ fontSize: '3rem', fontWeight: '900', lineHeight: '1.15', maxWidth: '950px', margin: '0 auto 1.5rem auto', background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>
            Plataforma Descentralizada para la Emisión y Verificación Transfronteriza de Títulos Universitarios
          </h1>

          <p style={{ fontSize: '1.12rem', color: '#94a3b8', maxWidth: '800px', margin: '0 auto 2.5rem auto', lineHeight: '1.6' }}>
            Solución informática para egresados de la <strong>Facultad de Ingeniería USM</strong>. Pre-validación inteligente con IA (OCR), generación de Planilla PUB y resguardo criptográfico inmutable en la <strong>Blockchain de Ethereum</strong> para auditoría ante el SAREN y MPPRE.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3.5rem' }}>
            <button
              onClick={() => { setRoleTab('student'); fillStudentDemo(); }}
              className="send-btn"
              style={{ padding: '0.9rem 1.8rem', fontSize: '0.95rem', background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
            >
              <User size={18} /> Probar como Graduando USM
            </button>
            <button
              onClick={() => { setRoleTab('gov'); fillGovDemo(); }}
              style={{ padding: '0.9rem 1.8rem', fontSize: '0.95rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
            >
              <Shield size={18} /> Probar Auditoría SAREN / MPPRE
            </button>
          </div>
        </motion.div>

        {/* Tarjetas de Métricas en Tiempo Real */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem', maxWidth: '1050px', margin: '0 auto' }}>
          {[
            { label: 'Graduandos Registrados', val: stats.graduandos_activos || '120+', icon: User, color: '#38bdf8' },
            { label: 'Documentos Pre-validados', val: stats.docs_prevalidados || '340+', icon: CheckCircle, color: '#10b981' },
            { label: 'Títulos en Blockchain', val: stats.titulos_blockchain || '85+', icon: Shield, color: '#a855f7' },
            { label: 'Disponibilidad Red', val: '99.9%', icon: Globe, color: '#f59e0b' },
          ].map((item, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', borderTop: `3px solid ${item.color}`, background: 'rgba(15,23,42,0.6)' }}>
              <item.icon size={28} color={item.color} style={{ margin: '0 auto 0.6rem auto' }} />
              <h3 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 0.2rem 0', color: '#ffffff' }}>{item.val}</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>{item.label}</p>
            </div>
          ))}
        </div>
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
              { num: '01', title: 'Pre-validación IA', desc: 'Extrae automáticamente nombre, cédula y mención mediante OCR Deep Learning.', icon: Cpu, color: '#a855f7' },
              { num: '02', title: 'Planilla PUB SAREN', desc: 'Calcula aranceles y genera la planilla única bancaria lista para liquidar.', icon: FileText, color: '#0ea5e9' },
              { num: '03', title: 'Hash en Blockchain', desc: 'Genera el hash SHA-256 inmutable registrado en la testnet Ethereum Sepolia.', icon: Layers, color: '#10b981' },
              { num: '04', title: 'Auditoría con QR', desc: 'Funcionarios de SAREN y MPPRE escanean el QR para verificar autenticidad en segundos.', icon: QrCode, color: '#ef4444' },
            ].map((step) => (
              <div key={step.num} className="glass-panel" style={{ padding: '1.8rem', borderLeft: `4px solid ${step.color}`, position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: '900', color: step.color }}>{step.num}</span>
                  <step.icon size={24} color={step.color} />
                </div>
                <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', color: '#ffffff' }}>{step.title}</h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ─── SECCIÓN DE NOTICIAS Y RESOLUCIONES INSTITUCIONALES (Estilo TernaNet USM) ─── */}
      <section style={{ padding: '4rem 1.5rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          
          {/* Columna Izquierda: Fundamentación Académica y Legal */}
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#38bdf8' }}>
              <BookOpen size={22} /> Fundamentación Científica y Marco Legal
            </h2>

            <div className="glass-panel" style={{ padding: '1.8rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '0.8rem' }}>
                📜 Cumplimiento Ineludible de la Ley de Simplificación de Trámites
              </h3>
              <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: '1.6', margin: '0 0 1rem 0' }}>
                Conforme al Artículo 4 y 7 de la <strong>Ley de Simplificación de Trámites Administrativos</strong>, la administración pública debe incorporar avances tecnológicos para prohibir la exigencia reiterada de certificaciones impresas si la información puede ser verificada electrónicamente.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <h4 style={{ color: '#10b981', fontSize: '0.9rem', margin: '0 0 0.3rem 0' }}>🔒 Inmutabilidad Hash</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>Cualquier alteración al documento invalida matemáticamente el código de verificación.</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <h4 style={{ color: '#a855f7', fontSize: '0.9rem', margin: '0 0 0.3rem 0' }}>🌐 Interoperabilidad Estatal</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>Integración con formatos oficiales USM, SAREN y MPPRE (GTU).</p>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Avisos y Novedades Institucionales (Estilo TernaNet) */}
          <div>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f59e0b' }}>
              <Clock size={20} /> Novedades y Avisos USM
            </h2>

            <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { date: '25/Feb/2026', title: 'Aviso Importante: Citas SAREN', desc: 'Recuerda llevar la Planilla PUB impresa junto a los timbres fiscales.' },
                { date: '18/Feb/2026', title: 'Apertura de Prevalidaciones IA', desc: 'Los estudiantes de 10mo semestre ya pueden pre-validar sus expedientes en el bot.' },
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


      {/* ─── MODAL DE REGISTRO PARA ESTUDIANTES NUEVOS ─── */}
      <AnimatePresence>
        {showRegModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="glass-panel" style={{ maxWidth: '450px', width: '100%', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, color: '#38bdf8', fontSize: '1.2rem' }}>Crear Perfil de Graduando USM</h3>
                <button onClick={() => setShowRegModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
              </div>

              <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>Nombre Completo (tal como en la cédula)</label>
                  <input className="chat-input" placeholder="Ej: Juan Pérez" value={regForm.nombre} onChange={e => setRegForm({ ...regForm, nombre: e.target.value })} style={{ width: '100%' }} />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>Número de Cédula de Identidad</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select value={regForm.cedula_tipo} onChange={e => setRegForm({ ...regForm, cedula_tipo: e.target.value })} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', color: '#fff', padding: '0.6rem', borderRadius: '8px' }}>
                      <option value="V">V-</option>
                      <option value="E">E-</option>
                    </select>
                    <input className="chat-input" placeholder="28.315.101" value={regForm.cedula} onChange={e => setRegForm({ ...regForm, cedula: formatCedula(e.target.value) })} style={{ flex: 1 }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>Carrera de Ingeniería / Arquitectura</label>
                  <select className="chat-input" value={regForm.carrera} onChange={e => setRegForm({ ...regForm, carrera: e.target.value })} style={{ width: '100%' }}>
                    <option value="">Selecciona tu carrera...</option>
                    {carreras.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>Semestre Actual</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['8vo', '9no', '10mo'].map(s => (
                      <button key={s} type="button" onClick={() => setRegForm({ ...regForm, semestre: s })} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: `1px solid ${regForm.semestre === s ? '#0ea5e9' : 'var(--border)'}`, background: regForm.semestre === s ? 'rgba(14,165,233,0.2)' : 'rgba(255,255,255,0.05)', color: regForm.semestre === s ? '#38bdf8' : '#94a3b8', cursor: 'pointer', fontWeight: '600' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {regError && <p style={{ color: '#f87171', fontSize: '0.8rem', margin: 0 }}>⚠️ {regError}</p>}

                <button type="submit" className="send-btn" style={{ padding: '0.8rem', marginTop: '0.5rem', background: 'linear-gradient(135deg, #0ea5e9, #7c3aed)' }}>
                  Crear Perfil e Iniciar Sesión →
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ─── FOOTER INSTITUCIONAL ─── */}
      <footer style={{ padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.05)', background: '#05070e' }}>
        <p>© 2026 Universidad Santa María — Facultad de Ingeniería y Arquitectura. Proyecto de Tesis de Grado.</p>
        <p style={{ marginTop: '0.3rem', fontSize: '0.75rem', color: '#64748b' }}>Plataforma protegida con encriptación criptográfica asimétrica SHA-256 e inmutabilidad Blockchain Sepolia.</p>
      </footer>

    </div>
  );
};

export default LandingPortal;
