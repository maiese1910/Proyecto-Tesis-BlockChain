import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Lock, CheckCircle, FileText, Globe,
  Sparkles, BookOpen, Clock, Cpu, Layers, QrCode, ChevronDown,
  ShieldCheck, Database, Server, Award, Building2
} from 'lucide-react';
import { statsAPI } from '../services/api';
import StudentAuth from './StudentAuth';

const LandingPortal = ({ onStudentLogin }) => {
  // FAQ Accordion State
  const [activeFaq, setActiveFaq] = useState(0);

  // Stats en tiempo real
  const [stats, setStats] = useState({
    usuarios_en_linea: 1,
    graduandos_activos: 1,
    docs_prevalidados: 0,
    titulos_blockchain: 0,
    tiempo_ahorrado_hrs: 0
  });
  const [localDocs, setLocalDocs] = useState([]);
  const [localUsersCount, setLocalUsersCount] = useState(1);

  const refreshLocalData = useCallback(() => {
    try {
      const b = JSON.parse(localStorage.getItem('usm_blockchain_records') || '[]');
      const p = JSON.parse(localStorage.getItem('usm_pub_history') || '[]');
      const u = JSON.parse(localStorage.getItem('usm_all_users') || '[]');
      const reg = JSON.parse(localStorage.getItem('usm_registered_users') || '[]');
      const m = new Map();
      b.forEach(r => r && r.hash && m.set(r.hash.toUpperCase(), r));
      p.forEach(r => {
        if (r && (r.hash || r.blockchainHash)) {
          const k = (r.hash || r.blockchainHash).toUpperCase();
          m.set(k, { ...m.get(k), ...r });
        }
      });
      setLocalDocs(Array.from(m.values()));

      const logged = localStorage.getItem('usm_user');
      const count = Math.max(u.length, reg.length, logged ? 1 : 0, 1);
      setLocalUsersCount(count);
    } catch (_) {
      setLocalDocs([]);
      setLocalUsersCount(1);
    }
  }, []);

  const displayGraduandos = Math.max(stats.graduandos_activos || 0, localUsersCount || 1);
  const displayDocs = Math.max(stats.docs_prevalidados || 0, localDocs.length);
  const displayBlockchain = Math.max(
    stats.titulos_blockchain || 0,
    localDocs.filter(r => (r.status || '').includes('CERTIFICADO') || (r.status || '').includes('APOSTILLADO') || (r.status || '').includes('Verificado') || r.txHash?.startsWith('0x')).length
  );
  const displayHoras = Math.round(displayDocs * 4.5 * 10) / 10;
  const displayOnlineUsers = Math.max(stats.usuarios_en_linea || 1, 1);

  useEffect(() => {
    refreshLocalData();

    const fetchBackendStats = () => {
      statsAPI.getStats()
        .then(res => {
          if (res?.stats) {
            setStats(prev => ({ ...prev, ...res.stats }));
          }
        })
        .catch(() => {});
    };

    fetchBackendStats();
    const interval = setInterval(fetchBackendStats, 4000);

    let channel;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('usm_records_sync');
        channel.onmessage = (event) => {
          if (event.data?.type === 'USER_REGISTERED' || event.data?.type === 'RECORD_ADDED' || event.data?.type === 'RECORD_UPDATED') {
            refreshLocalData();
            fetchBackendStats();
          }
        };
      } catch (_) {}
    }

    const handleStorage = (e) => {
      if (e.key === 'usm_blockchain_records' || e.key === 'usm_pub_history' || e.key === 'usm_all_users' || e.key === 'usm_registered_users') {
        refreshLocalData();
      }
    };
    window.addEventListener('storage', handleStorage);

    const handleCustomUpdate = () => {
      refreshLocalData();
      fetchBackendStats();
    };
    window.addEventListener('usm_records_updated', handleCustomUpdate);

    return () => {
      clearInterval(interval);
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('usm_records_updated', handleCustomUpdate);
    };
  }, [refreshLocalData]);

  const scrollToLogin = () => {
    const el = document.getElementById('login-portal-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const fillStudentDemo = () => {
    const demoUser = {
      id: 'demo-usm-jurado',
      email: 'mauromaiese7@gmail.com',
      nombre: 'Mauro Daniel Maiese Ferreira',
      cedula: 'V-28.315.101',
      carrera: 'Ingeniería en Sistemas',
      semestre: '10mo',
      is_profile_complete: true,
      is_cedula_locked: true,
    };
    localStorage.setItem('usm_user', JSON.stringify(demoUser));
    sessionStorage.setItem('usm_user', JSON.stringify(demoUser));
    onStudentLogin(demoUser);
  };

  const faqItems = [
    {
      q: "¿Cómo garantiza la Blockchain que un título universitario no sea falsificado?",
      a: "El sistema calcula la huella criptográfica inmutable (Hash SHA-256) a partir de los metadatos y firma digital del título. Ese hash se inscribe en la red pública Ethereum (Sepolia). Cualquier alteración de una sola letra o fecha en el documento generará un hash totalmente distinto, alertando de inmediato al auditor."
    },
    {
      q: "¿Qué función cumple el módulo de Inteligencia Artificial (OCR)?",
      a: "Combina Visión Computacional (Gemini Vision 2.5 + pre-procesamiento OpenCV + motor Tesseract WASM) para extraer automáticamente los datos del graduando (Nombre, Cédula, Universidad, Mención, Folio y Fecha) desde el expediente escaneado, eliminando errores de transcripción manual y agilizando el llenado de la Planilla PUB en 95% del tiempo."
    },
    {
      q: "¿Cómo se diferencian el acceso de Graduando y el de Auditor Gubernamental?",
      a: "El sistema aplica el principio de Segregación de Funciones (Separation of Duties - SoD). Los estudiantes solo pueden emitir planillas e inscribir documentos. Únicamente los funcionarios autorizados de USM, MPPEU, SAREN y MPPRE pueden auditar y emitir sellos de verificación institucional."
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
      width: '100%',
      overflowX: 'hidden',
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
        <div
          className="landing-meta-bar"
          style={{
            backgroundColor: 'var(--color-fog-white)',
            borderBottom: '1px solid var(--border)',
            padding: '0.45rem 1.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            gap: '0.5rem',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--color-ink-black)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Building2 size={13} /> UNIVERSIDAD SANTA MARÍA
            </span>
            <span className="landing-meta-subtitle" style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1rem' }}>
              Facultad de Ingeniería y Arquitectura
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 6px rgba(16, 185, 129, 0.7)' }}></span>
              Usuarios en línea: <strong style={{ color: 'var(--color-ink-black)', fontWeight: 600 }}>{displayOnlineUsers}</strong>
            </span>
            <span className="landing-meta-network" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: 'var(--color-ink-black)' }}></span>
              Red Ethereum Sepolia: <strong style={{ color: 'var(--color-ink-black)', fontWeight: 500 }}>En línea</strong>
            </span>
          </div>
        </div>

        {/* Navbar Principal Con Botones Píldora */}
        <div
          className="landing-navbar"
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            padding: '1rem 1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          {/* Logo e Identidad Editorial */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '9999px',
              backgroundColor: 'var(--color-ink-black)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(23, 25, 28, 0.15)'
            }}>
              <Award size={20} color="#ffffff" />
            </div>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)',
                fontWeight: 400,
                margin: 0,
                color: 'var(--color-ink-black)',
                letterSpacing: '-0.02em',
                lineHeight: 1.15
              }}>
                Plataforma de Validación USM
              </h1>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 450 }}>
                Sistema Institucional de Verificación Criptográfica
              </p>
            </div>
          </div>

          {/* Acceso Directo Graduando & Estado en Vivo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-pill)',
              padding: '0.35rem 0.85rem',
              fontSize: '0.78rem',
              color: 'var(--color-ink-black)',
              fontWeight: 500,
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              whiteSpace: 'nowrap',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 6px rgba(16, 185, 129, 0.7)'
              }} />
              <span style={{ fontWeight: 600 }}>{displayOnlineUsers} en línea</span>
            </div>
            <button
              onClick={scrollToLogin}
              className="send-btn"
              style={{
                padding: '0.6rem 1.25rem',
                fontSize: '0.84rem',
              }}
            >
              <User size={15} /> Acceso Graduando USM
            </button>
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION EDITORIAL (SERIF DISPLAY EN PAPEL CÁLIDO) ─── */}
      <section
        className="landing-hero"
        style={{
          padding: '4.5rem 1.75rem 3rem 1.75rem',
          maxWidth: '1240px',
          margin: '0 auto',
          textAlign: 'center',
          position: 'relative'
        }}
      >
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
              padding: '0.45rem 1.15rem',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 4px rgba(23, 25, 28, 0.04)',
              fontSize: 'clamp(0.74rem, 2vw, 0.84rem)',
              fontWeight: 500,
              marginBottom: '1.5rem'
            }}
          >
            <Sparkles size={14} style={{ flexShrink: 0 }} /> Proyecto de Grado — Validación Documental & Web3
          </motion.div>

          {/* Headline: Signifier/Newsreader Serif en Regular 400 */}
          <motion.h1
            variants={itemVariants}
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(1.85rem, 4.5vw, 3.4rem)',
              fontWeight: 400,
              lineHeight: 1.14,
              maxWidth: '920px',
              margin: '0 auto 1.25rem auto',
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
              fontSize: 'clamp(0.95rem, 2.2vw, 1.1rem)',
              color: 'var(--text-secondary)',
              maxWidth: '780px',
              margin: '0 auto 2.5rem auto',
              lineHeight: 1.65,
              fontWeight: 400
            }}
          >
            Sistema integral para la Universidad Santa María: pre-validación mediante Inteligencia Artificial Multimodal (OCR Híbrido), generación automatizada de Planilla PUB e inmutabilidad criptográfica en la Blockchain de Ethereum para auditoría estatal ante MPPEU, SAREN y MPPRE.
          </motion.p>

          {/* ─── ARTEFACTO FLOTANTE: PORTAL DE ACCESO (HERO CARD 24PX) ─── */}
          <motion.div
            id="login-portal-section"
            variants={itemVariants}
            style={{ maxWidth: '580px', margin: '0 auto 3.25rem auto', textAlign: 'left' }}
          >
            <div
              className="glass-panel landing-auth-card"
              style={{
                padding: '2.25rem',
                borderRadius: 'var(--radius-cards)',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-artifact)',
                position: 'relative'
              }}
            >
              <StudentAuth
                onLogin={onStudentLogin}
                onSwitchToDemo={fillStudentDemo}
                embedded={true}
              />
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1.15rem',
            maxWidth: '1040px',
            margin: '0 auto'
          }}
        >
          {/* Card 1: Graduandos */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -6, scale: 1.015 }}
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-cards)',
              boxShadow: 'var(--shadow-subtle)',
              cursor: 'default'
            }}
          >
            <User size={22} color="var(--color-ink-black)" style={{ margin: '0 auto 0.5rem auto' }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9rem', fontWeight: 400, margin: '0 0 0.2rem 0', color: 'var(--color-ink-black)' }}>
              {displayGraduandos}
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 450 }}>Graduandos Registrados</p>
          </motion.div>

          {/* Card 2: Documentos */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -6, scale: 1.015 }}
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-cards)',
              boxShadow: 'var(--shadow-subtle)',
              cursor: 'default'
            }}
          >
            <CheckCircle size={22} color="var(--color-ink-black)" style={{ margin: '0 auto 0.5rem auto' }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9rem', fontWeight: 400, margin: '0 0 0.2rem 0', color: 'var(--color-ink-black)' }}>
              {displayDocs}
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 450 }}>Documentos Pre-validados</p>
          </motion.div>

          {/* Card 3: THE ACCENT CARD (BLUSH PEACH #fbe1d1 con SIENNA BROWN #5d2a1a) */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -6, scale: 1.015 }}
            className="card-peach"
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              borderRadius: 'var(--radius-cards)',
              cursor: 'default'
            }}
          >
            <ShieldCheck size={24} color="var(--color-sienna-brown)" style={{ margin: '0 auto 0.5rem auto' }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9rem', fontWeight: 400, margin: '0 0 0.2rem 0', color: 'var(--color-sienna-brown)' }}>
              {displayBlockchain}
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
              padding: '1.5rem',
              textAlign: 'center',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-cards)',
              boxShadow: 'var(--shadow-subtle)',
              cursor: 'default'
            }}
          >
            <Clock size={22} color="var(--color-ink-black)" style={{ margin: '0 auto 0.5rem auto' }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9rem', fontWeight: 400, margin: '0 0 0.2rem 0', color: 'var(--color-ink-black)' }}>
              {displayHoras.toLocaleString('es-VE')} hrs
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 450 }}>Horas de Trámite Ahorradas</p>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── PASOS DEL FLUJO OPERATIVO (EDITORIAL STEEP) ─── */}
      <section
        className="landing-section"
        style={{
          padding: '4.5rem 1.75rem',
          backgroundColor: '#ffffff',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)'
        }}
      >
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.75rem' }}>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)',
              fontWeight: 400,
              color: 'var(--color-ink-black)',
              marginBottom: '0.6rem',
              letterSpacing: '-0.02em'
            }}>
              Ciclo operativo del trámite académico
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', maxWidth: '600px', margin: '0 auto' }}>
              De la captura del título impreso a la apostilla y auditoría gubernamental en 4 etapas verificadas.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.35rem' }}>
            {[
              { num: '01', title: 'Pre-validación Documental (OCR)', desc: 'Extrae automáticamente nombre, cédula, mención y folio mediante IA Multimodal y Tesseract WASM.', icon: Cpu },
              { num: '02', title: 'Planilla PUB SAREN', desc: 'Calcula aranceles fiscales oficiales y genera la planilla única bancaria lista para liquidación.', icon: FileText },
              { num: '03', title: 'Hash en Blockchain', desc: 'Genera la huella criptográfica SHA-256 registrada de forma permanente en la red Ethereum Sepolia.', icon: Layers },
              { num: '04', title: 'Auditoría Institucional QR', desc: 'Funcionarios de USM, MPPEU, SAREN y MPPRE escanean el código QR seguro para validar la autenticidad en tiempo real.', icon: QrCode },
            ].map((step) => (
              <motion.div
                key={step.num}
                whileHover={{ y: -6, scale: 1.015 }}
                style={{
                  padding: '1.75rem',
                  backgroundColor: 'var(--surface-canvas)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-cards)',
                  boxShadow: 'var(--shadow-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.9rem',
                  cursor: 'default'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.75rem',
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
                  fontSize: '1.18rem',
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
      <section className="landing-section" style={{ padding: '4.5rem 1.75rem', maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.75rem' }}>
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
            fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)',
            fontWeight: 400,
            color: 'var(--color-ink-black)',
            margin: '0 0 0.6rem 0',
            letterSpacing: '-0.02em'
          }}>
            Arquitectura de grado institucional
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', maxWidth: '640px', margin: '0 auto' }}>
            Combinación óptima de computación de visión artificial, APIs serverless en Flask y contratos inteligentes en la red pública descentralizada.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.35rem' }}>
          {[
            { title: 'IA Vision & OCR Híbrido', badge: 'Gemini 2.5 + Tesseract WASM', desc: 'Procesamiento multimodal con pre-procesamiento OpenCV y fallback local en WebAssembly.', icon: Cpu },
            { title: 'Contrato Inteligente', badge: 'Ethereum Sepolia Testnet', desc: 'Registro de hashes SHA-256 en contrato Solidity público, inalterable y auditable mundialmente.', icon: Layers },
            { title: 'Backend Institucional', badge: 'Python Flask 3.0', desc: 'Motor de reconocimiento de entidades nombradas (NER), firma criptográfica y aranceles bancarios.', icon: Server },
            { title: 'Almacenamiento Seguro', badge: 'Supabase PostgreSQL', desc: 'Base de datos encriptada para perfiles universitarios e historial de comprobantes.', icon: Database },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -6, scale: 1.015 }}
              style={{
                padding: '1.75rem',
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                <item.icon size={20} color="var(--color-ink-black)" />
                <span style={{
                  fontSize: '0.73rem',
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
      <section
        className="landing-section"
        style={{
          padding: '4.5rem 1.75rem',
          backgroundColor: '#ffffff',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)'
        }}
      >
        <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '2rem' }}>
          {/* Columna Izquierda: Fundamentación Académica y Legal */}
          <div>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(1.35rem, 3vw, 1.6rem)',
              fontWeight: 400,
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              color: 'var(--color-ink-black)',
              letterSpacing: '-0.01em'
            }}>
              <BookOpen size={20} style={{ flexShrink: 0 }} /> Fundamentación Científica y Marco Legal
            </h2>

            <div style={{
              padding: '1.75rem',
              borderRadius: 'var(--radius-cards)',
              backgroundColor: 'var(--surface-canvas)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-subtle)'
            }}>
              <h3 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.18rem',
                fontWeight: 400,
                color: 'var(--color-ink-black)',
                marginBottom: '0.85rem'
              }}>
                Cumplimiento de la Ley de Simplificación de Trámites
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 1.25rem 0' }}>
                Conforme al Artículo 4 y 7 de la <strong>Ley de Simplificación de Trámites Administrativos</strong>, las instituciones del Estado deben adoptar medios electrónicos para eliminar la exigencia repetitiva de documentos físicos cuando su autenticidad pueda ser validada criptográficamente.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <motion.div whileHover={{ y: -3 }} style={{ backgroundColor: '#ffffff', padding: '1.1rem', borderRadius: 'var(--radius-inputs)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <h4 style={{ color: 'var(--color-ink-black)', fontSize: '0.88rem', margin: '0 0 0.35rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 500 }}>
                    <Lock size={14} /> Inmutabilidad Criptográfica
                  </h4>
                  <p style={{ fontSize: '0.81rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Cualquier alteración matemática invalida automáticamente el código de verificación del título.
                  </p>
                </motion.div>
                <motion.div whileHover={{ y: -3 }} style={{ backgroundColor: '#ffffff', padding: '1.1rem', borderRadius: 'var(--radius-inputs)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <h4 style={{ color: 'var(--color-ink-black)', fontSize: '0.88rem', margin: '0 0 0.35rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 500 }}>
                    <Globe size={14} /> Interoperabilidad Estatal
                  </h4>
                  <p style={{ fontSize: '0.81rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Formato homologado con las normativas de la USM, MPPEU, SAREN y el MPPRE para trámite de apostilla.
                  </p>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Avisos y Novedades USM */}
          <div>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(1.35rem, 3vw, 1.6rem)',
              fontWeight: 400,
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              color: 'var(--color-ink-black)',
              letterSpacing: '-0.01em'
            }}>
              <Clock size={20} style={{ flexShrink: 0 }} /> Novedades y Avisos USM
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
      <section className="landing-section" style={{ padding: '4.5rem 1.75rem', maxWidth: '820px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(1.6rem, 3.5vw, 2rem)',
            fontWeight: 400,
            color: 'var(--color-ink-black)',
            margin: '0 0 0.5rem 0',
            letterSpacing: '-0.02em'
          }}>
            Preguntas frecuentes de la evaluación
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem' }}>
            Respuestas clave estructuradas para la defensa del Proyecto de Tesis USM.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {faqItems.map((item, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <motion.div
                key={idx}
                whileHover={{ y: -2 }}
                style={{
                  borderRadius: 'var(--radius-inputs)',
                  border: '1px solid var(--border)',
                  backgroundColor: '#ffffff',
                  boxShadow: isOpen ? 'var(--shadow-artifact)' : 'var(--shadow-subtle)',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '1.15rem 1.35rem',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-ink-black)',
                    fontWeight: 500,
                    fontSize: '0.95rem',
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
                        padding: '0 1.35rem 1.3rem 1.35rem',
                        color: 'var(--text-secondary)',
                        fontSize: '0.88rem',
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
      <footer
        className="landing-footer"
        style={{
          backgroundColor: 'var(--color-fog-white)',
          borderTop: '1px solid var(--border)',
          padding: '2.75rem 1.75rem 2rem 1.75rem',
          color: 'var(--color-slate-gray)',
          fontSize: '0.84rem'
        }}
      >
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem'
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
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            <span>Ethereum Sepolia Network</span>
            <span>Gemini Vision & Tesseract WASM</span>
            <span>Python Flask 3.0</span>
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
    </div>
  );
};

export default LandingPortal;
