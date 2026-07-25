import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Shield, User, CreditCard, Lock, ArrowRight, CheckCircle, FileText, Globe, Sparkles, BookOpen, Clock, AlertTriangle, KeyRound } from 'lucide-react';
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

  // Handler Login Estudiante
  const handleStudentSubmit = async (e) => {
    e && e.preventDefault();
    if (!studentCedula || studentCedula.length < 6) {
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
        setStudentError('Cédula no encontrada. Haz clic en "Registrarse".');
      }
    } catch (err) {
      setStudentError(err.message || 'Error al verificar cédula.');
    } finally {
      setStudentLoading(false);
    }
  };

  // Handler Registro Estudiante
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regForm.nombre.trim() || regForm.nombre.trim().split(' ').length < 2) return setRegError('Ingresa tu nombre completo.');
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
      const res = await profilesAPI.register(user);
      if (res.success) {
        localStorage.setItem('usm_user', JSON.stringify(user));
        onStudentLogin(user);
      }
    } catch (err) {
      setRegError(err.message || 'Error al registrar.');
    }
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
        setGovError('Credenciales inválidas.');
      }
    } catch (err) {
      setGovError(err.message || 'Error de autenticación.');
    } finally {
      setGovLoading(false);
    }
  };

  return (
    <div style={{ background: '#090d16', color: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* ─── HEADER / BARRA SUPERIOR CON ACCESO DUAL ─── */}
      <header style={{
        background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'sticky', top: 0, zIndex: 100
      }}>
        {/* Barra superior institucional */}
        <div style={{ background: '#020617', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0.4rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>🏛️ UNIVERSIDAD SANTA MARÍA</span>
            <span>Facultad de Ingeniería y Arquitectura</span>
            <span>Sistema Descentralizado Web3</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span>🟢 Red Ethereum Sepolia: <strong style={{ color: '#10b981' }}>Operativa</strong></span>
          </div>
        </div>

        {/* Navbar con selector de rol e inicio de sesión en cabecera */}
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
          
          {/* Logo Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: '12px', background: 'linear-gradient(135deg, #0ea5e9, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <GraduationCap size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, background: 'linear-gradient(to right, #38bdf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                USM ApostillaBot
              </h1>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>Plataforma de Validación Blockchain</p>
            </div>
          </div>

          {/* Formulario de Inicio de Sesión Integrado en la Cabecera */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.4rem 0.6rem', borderRadius: '12px', flexWrap: 'wrap' }}>
            
            {/* Selector de Rol */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '0.2rem', borderRadius: '8px' }}>
              <button
                onClick={() => { setRoleTab('student'); setStudentError(''); setGovError(''); }}
                style={{
                  padding: '0.4rem 0.8rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  fontWeight: '600', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: roleTab === 'student' ? 'linear-gradient(135deg, #0ea5e9, #2563eb)' : 'transparent',
                  color: roleTab === 'student' ? '#fff' : 'var(--text-muted)'
                }}
              >
                <User size={13} /> Estudiante USM
              </button>

              <button
                onClick={() => { setRoleTab('gov'); setStudentError(''); setGovError(''); }}
                style={{
                  padding: '0.4rem 0.8rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  fontWeight: '600', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: roleTab === 'gov' ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'transparent',
                  color: roleTab === 'gov' ? '#fff' : 'var(--text-muted)'
                }}
              >
                <Shield size={13} /> Ente Gubernamental
              </button>
            </div>

            {/* Formulario de Login Estudiante */}
            {roleTab === 'student' ? (
              <form onSubmit={handleStudentSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Cédula (ej: V-28.123.456)"
                  value={studentCedula}
                  onChange={e => setStudentCedula(e.target.value)}
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: '#fff', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', width: '170px' }}
                />
                <button
                  type="submit"
                  disabled={studentLoading}
                  className="send-btn"
                  style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', background: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  {studentLoading ? '...' : 'Entrar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRegModal(true)}
                  style={{ background: 'transparent', border: '1px solid rgba(14,165,233,0.4)', color: '#38bdf8', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '600' }}
                >
                  Registrarse
                </button>
              </form>
            ) : (
              /* Formulario de Login Funcionario (SAREN / MPPRE) */
              <form onSubmit={handleGovSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Usuario Funcionario"
                  value={govUsername}
                  onChange={e => setGovUsername(e.target.value)}
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: '#fff', padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', width: '130px' }}
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={govPassword}
                  onChange={e => setGovPassword(e.target.value)}
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: '#fff', padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', width: '110px' }}
                />
                <button
                  type="submit"
                  disabled={govLoading}
                  className="send-btn"
                  style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', background: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Lock size={12} /> {govLoading ? '...' : 'Auditoría'}
                </button>
              </form>
            )}

          </div>
        </div>

        {/* Mensajes de error en la barra */}
        {(studentError || govError) && (
          <div style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '0.3rem 1.5rem', textAlign: 'center', fontSize: '0.78rem', borderTop: '1px solid rgba(239,68,68,0.3)' }}>
            ⚠️ {studentError || govError}
          </div>
        )}
      </header>


      {/* ─── HERO BANNER PRINCIPAL ─── */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '1280px', margin: '0 auto', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(14,165,233,0.1)', color: '#38bdf8', padding: '0.4rem 1.2rem', borderRadius: '20px', border: '1px solid rgba(14,165,233,0.3)', fontSize: '0.85rem', fontWeight: '600', marginBottom: '1.5rem' }}>
            <Sparkles size={16} /> Formando el Futuro con Excelencia e Innovación Web3
          </div>

          <h1 style={{ fontSize: '2.8rem', fontWeight: '900', lineHeight: '1.2', maxWidth: '900px', margin: '0 auto 1.5rem auto', background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Plataforma Descentralizada de Emisión y Verificación Transfronteriza de Títulos Universitarios
          </h1>

          <p style={{ fontSize: '1.1rem', color: '#94a3b8', maxWidth: '750px', margin: '0 auto 2.5rem auto', lineHeight: '1.6' }}>
            Ecosistema informático para graduandos de la <strong>Facultad de Ingeniería USM</strong>. Permite la prevalidación de expedientes mediante Inteligencia Artificial (OCR), la generación de la Planilla PUB y la inmutabilidad de registros en la <strong>Blockchain de Ethereum</strong> ante el SAREN y MPPRE.
          </p>
        </motion.div>

        {/* Métricas en tiempo real estilo TernaNet / Portal USM */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem', maxWidth: '1000px', margin: '0 auto 3rem auto' }}>
          {[
            { label: 'Graduandos Registrados', val: stats.graduandos_activos || '120+', icon: User, color: '#38bdf8' },
            { label: 'Documentos Pre-validados', val: stats.docs_prevalidados || '340+', icon: CheckCircle, color: '#10b981' },
            { label: 'Títulos en Blockchain', val: stats.titulos_blockchain || '85+', icon: Shield, color: '#a855f7' },
            { label: 'Disponibilidad Red', val: '99.9%', icon: Globe, color: '#f59e0b' },
          ].map((item, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', borderTop: `3px solid ${item.color}` }}>
              <item.icon size={28} color={item.color} style={{ margin: '0 auto 0.6rem auto' }} />
              <h3 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 0.2rem 0', color: '#ffffff' }}>{item.val}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{item.label}</p>
            </div>
          ))}
        </div>
      </section>


      {/* ─── SECCIÓN DE NOTICIAS Y RESOLUCIONES INSTITUCIONALES (Estilo TernaNet USM) ─── */}
      <section style={{ background: '#0f172a', padding: '3.5rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          
          {/* Columna Izquierda: Información del Programa de Tesis */}
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#38bdf8' }}>
              <BookOpen size={22} /> Acerca de la Plataforma e Innovación Tecnológica
            </h2>

            <div className="glass-panel" style={{ padding: '1.8rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '0.8rem' }}>
                🚀 Soberanía Digital del Historial Académico
              </h3>
              <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: '1.6', margin: '0 0 1rem 0' }}>
                El sistema sustituye la dependencia de validaciones manuales por un protocolo criptográfico inmutable. Al graduarte en la USM, tu título es procesado con un hash criptográfico SHA-256 e indexado en la testnet de Ethereum Sepolia.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <h4 style={{ color: '#10b981', fontSize: '0.9rem', margin: '0 0 0.3rem 0' }}>🤖 Motor OCR & IA</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Modelos CRAFT + CRNN para la lectura e inserción directa de notas y títulos.</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <h4 style={{ color: '#a855f7', fontSize: '0.9rem', margin: '0 0 0.3rem 0' }}>🔗 Verificación QR Instantánea</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Cualquier ente (SAREN/MPPRE/Empresas) valida la autenticidad escaneando el código QR.</p>
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
                { date: '25/Feb/2026', title: 'Aviso Importante: Citas SAREN', desc: 'Recuerda llevar la Planilla PUB impresa a doble cara junto a los timbres fiscales.' },
                { date: '18/Feb/2026', title: 'Apertura de Prevalidaciones IA', desc: 'Los estudiantes de 10mo semestre ya pueden pre-validar sus expedientes en el bot.' },
                { date: '10/Feb/2026', title: 'Resolución MPPRE Legalización', desc: 'Validaciones de títulos firmados por autoridades USM habilitados para apostilla directa.' },
              ].map((news, idx) => (
                <div key={idx} style={{ borderBottom: idx !== 2 ? '1px solid var(--border)' : 'none', paddingBottom: idx !== 2 ? '0.8rem' : 0 }}>
                  <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 'bold' }}>{news.date}</span>
                  <h4 style={{ fontSize: '0.88rem', margin: '0.2rem 0', color: '#ffffff' }}>{news.title}</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>{news.desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>


      {/* ─── MODAL DE REGISTRO PARA ESTUDIANTES NUEVOS ─── */}
      <AnimatePresence>
        {showRegModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="glass-panel" style={{ maxWidth: '450px', width: '100%', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, color: '#38bdf8', fontSize: '1.2rem' }}>Crear Perfil de Graduando USM</h3>
                <button onClick={() => setShowRegModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
              </div>

              <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Nombre Completo (tal como en la cédula)</label>
                  <input className="chat-input" placeholder="Ej: Juan Pérez" value={regForm.nombre} onChange={e => setRegForm({ ...regForm, nombre: e.target.value })} style={{ width: '100%' }} />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Número de Cédula de Identidad</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select value={regForm.cedula_tipo} onChange={e => setRegForm({ ...regForm, cedula_tipo: e.target.value })} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: '#fff', padding: '0.6rem', borderRadius: '8px' }}>
                      <option value="V">V-</option>
                      <option value="E">E-</option>
                    </select>
                    <input className="chat-input" placeholder="28.315.101" value={regForm.cedula} onChange={e => setRegForm({ ...regForm, cedula: formatCedula(e.target.value) })} style={{ flex: 1 }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Carrera de Ingeniería / Arquitectura</label>
                  <select className="chat-input" value={regForm.carrera} onChange={e => setRegForm({ ...regForm, carrera: e.target.value })} style={{ width: '100%' }}>
                    <option value="">Selecciona tu carrera...</option>
                    {carreras.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Semestre Actual</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['8vo', '9no', '10mo'].map(s => (
                      <button key={s} type="button" onClick={() => setRegForm({ ...regForm, semestre: s })} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: `1px solid ${regForm.semestre === s ? '#0ea5e9' : 'var(--border)'}`, background: regForm.semestre === s ? 'rgba(14,165,233,0.2)' : 'rgba(255,255,255,0.05)', color: regForm.semestre === s ? '#38bdf8' : 'var(--text-muted)', cursor: 'pointer', fontWeight: '600' }}>
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
      <footer style={{ padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <p>© 2026 Universidad Santa María — Facultad de Ingeniería y Arquitectura. Proyecto de Tesis de Grado.</p>
        <p style={{ marginTop: '0.3rem', fontSize: '0.75rem' }}>Plataforma protegida con encriptación criptográfica asimétrica SHA-256 e inmutabilidad Blockchain Sepolia.</p>
      </footer>

    </div>
  );
};

export default LandingPortal;
