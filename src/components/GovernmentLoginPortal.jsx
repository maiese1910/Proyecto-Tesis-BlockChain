import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Building2, Globe, Lock, ArrowRight, AlertCircle,
  CheckCircle2, UserCheck, KeyRound, Eye, EyeOff, RefreshCw,
  FileSearch, Stamp, Layers, ChevronDown, Bell, BookOpen,
  Wallet, FileSpreadsheet, ArrowLeft, ShieldCheck
} from 'lucide-react';
import { authAPI, statsAPI, blockchainAPI } from '../services/api';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PORTAL DE ACCESO E INFORMACIÓN OPERATIVA MINISTERIAL (/admin)
 * ═══════════════════════════════════════════════════════════════════════════
 * Unificado visualmente con el Steep Design System del resto de la plataforma
 * (superficie cálida #f2f3f5, tarjetas blancas 24px, acentos Blush Peach / Sienna Brown
 * y tipografía editorial Newsreader + Inter), con guía de uso y FAQ exclusivos para
 * auditores de GTU (MPPEU) y Cancillería (MPPRE).
 */
const GovernmentLoginPortal = ({ onAdminLogin }) => {
  const [selectedEnte, setSelectedEnte] = useState('mppeu'); // 'mppeu' | 'mppre'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [activeFaq, setActiveFaq] = useState(0);

  // Métricas reales de la bandeja ministerial y estado de red Sepolia
  const [blockchainOnline, setBlockchainOnline] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(1);
  const [trayStats, setTrayStats] = useState({
    totalExpedientes: 0,
    pendientesGtu: 0,
    pendientesMppre: 0,
    selladosSepolia: 0,
  });

  const entesConfig = {
    mppeu: {
      code: 'MPPEU',
      name: 'MPPEU — Taquilla GTU',
      subtitle: 'Ministerio del Poder Popular para la Educación Universitaria',
      role: 'Analista Revisor de Gestión de Trámites Universitarios (Estación 2)',
      icon: Building2,
      placeholderUser: 'ej: mppeu_agente',
      demoUser: 'mppeu_agente',
      demoPass: 'admin123',
    },
    mppre: {
      code: 'MPPRE',
      name: 'MPPRE — Cancillería',
      subtitle: 'Ministerio del Poder Popular para Relaciones Exteriores',
      role: 'Oficial Consular de Legalización y Apostilla de La Haya (Estación 4)',
      icon: Globe,
      placeholderUser: 'ej: mppre_agente',
      demoUser: 'mppre_agente',
      demoPass: 'admin123',
    },
  };

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const t = setInterval(() => {
      setLockoutSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [lockoutSeconds]);

  const refreshAdminLandingStats = useCallback(async () => {
    const merged = new Map();
    const ingest = (r) => {
      if (!r || !(r.hash || r.blockchainHash)) return;
      const k = String(r.hash || r.blockchainHash).toUpperCase();
      merged.set(k, { ...(merged.get(k) || {}), ...r });
    };

    try {
      const localBc = JSON.parse(localStorage.getItem('usm_blockchain_records') || '[]');
      const localPub = JSON.parse(localStorage.getItem('usm_pub_history') || '[]');
      localBc.forEach(ingest);
      localPub.forEach(ingest);
    } catch (_) {}

    try {
      const res = await blockchainAPI.getAllRecords();
      if (Array.isArray(res?.records)) {
        res.records.forEach(ingest);
      }
    } catch (_) {}

    const list = Array.from(merged.values());
    let pendientesGtu = 0;
    let pendientesMppre = 0;
    let selladosSepolia = 0;

    list.forEach((r) => {
      const st = String(r.status || '').toUpperCase();
      const isRechazado = st.includes('RECHAZ');
      const isApostillado = Boolean(r.mppreVerified || st.includes('APOSTILLAD'));
      const isMppeuOk = Boolean(r.mppeuVerified || st.includes('CERTIFICADO') || isApostillado);

      if (!isRechazado && !isMppeuOk) {
        pendientesGtu += 1;
      } else if (!isRechazado && isMppeuOk && !isApostillado) {
        pendientesMppre += 1;
      }
      if (
        isMppeuOk ||
        isApostillado ||
        (r.txHash && String(r.txHash).startsWith('0x') && !String(r.txHash).includes('PENDIENTE'))
      ) {
        selladosSepolia += 1;
      }
    });

    setTrayStats({
      totalExpedientes: list.length,
      pendientesGtu,
      pendientesMppre,
      selladosSepolia,
    });

    try {
      const stRes = await statsAPI.getStats();
      if (stRes?.stats?.usuarios_en_linea) {
        setOnlineUsers(Math.max(1, Number(stRes.stats.usuarios_en_linea)));
      }
      if (typeof stRes?.blockchain_connected === 'boolean') {
        setBlockchainOnline(stRes.blockchain_connected);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    refreshAdminLandingStats();
    const timer = setInterval(refreshAdminLandingStats, 8000);
    return () => clearInterval(timer);
  }, [refreshAdminLandingStats]);

  const scrollToLogin = () => {
    const el = document.getElementById('admin-login-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectEnte = (key) => {
    setSelectedEnte(key);
    setError('');
  };

  const authenticateWithCredentials = async (userVal, passVal, enteKey = selectedEnte) => {
    if (lockoutSeconds > 0) {
      setError(`Acceso bloqueado temporalmente por seguridad. Espera ${lockoutSeconds} segundos.`);
      return;
    }
    const cleanUser = (userVal || '').trim();
    const cleanPass = (passVal || '').trim();
    if (!cleanUser || !cleanPass) {
      setError('Por favor ingresa tu identificador de funcionario y tu clave ministerial.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await authAPI.loginAdmin(cleanUser, cleanPass);
      if (res && (res.token || res.access_token || res.success)) {
        const cfg = entesConfig[enteKey] || entesConfig.mppeu;
        const adminPayload = {
          username: res.username || cleanUser,
          ente: res.ente || cfg.code,
          cargo: res.cargo || cfg.role,
          email: res.email || '',
          token: res.token || res.access_token,
        };
        setFailedAttempts(0);
        sessionStorage.setItem('usm_admin_session', 'true');
        sessionStorage.setItem('admin_data', JSON.stringify(adminPayload));
        localStorage.removeItem('admin_auth');
        localStorage.removeItem('admin_data');
        onAdminLogin(adminPayload);
      } else {
        setError('Credenciales no autorizadas. Verifica tu usuario y contraseña institucional.');
      }
    } catch (err) {
      const nextFails = failedAttempts + 1;
      setFailedAttempts(nextFails);
      if (nextFails >= 5) {
        setLockoutSeconds(45);
        setFailedAttempts(0);
        setError('Demasiados intentos fallidos (5/5). Acceso bloqueado por 45 segundos para proteger el portal ministerial.');
      } else if (err.status === 401 || err.status === 403) {
        setError(`Acceso denegado: usuario o clave incorrectos. (Intentos restantes: ${5 - nextFails})`);
      } else {
        setError(err.message || 'No se pudo establecer conexión con el servidor de autenticación ministerial.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    authenticateWithCredentials(username, password, selectedEnte);
  };

  const handleQuickDemo = (enteKey) => {
    const cfg = entesConfig[enteKey];
    setSelectedEnte(enteKey);
    setUsername(cfg.demoUser);
    setPassword(cfg.demoPass);
    authenticateWithCredentials(cfg.demoUser, cfg.demoPass, enteKey);
  };

  const currentEnte = entesConfig[selectedEnte];
  const CurrentIcon = currentEnte.icon;

  const adminSteps = [
    {
      num: '01',
      title: 'Inspección Visual y Forense del Título',
      desc: 'Abre el pergamino digitalizado desde la bandeja, revisa el diagnóstico óptico de sellos/firmas, la conciliación bancaria PUB SAREN y los datos de Libro, Tomo y Folio.',
      icon: FileSearch,
    },
    {
      num: '02',
      title: 'Cotejo y Certificación GTU (Rol MPPEU)',
      desc: 'Tras verificar el pergamino físico consignado en taquilla, aprueba el trámite individualmente o en lote para otorgar el sello electrónico CERTIFICADO_MPPEU.',
      icon: Stamp,
    },
    {
      num: '03',
      title: 'Emisión de Apostilla de La Haya (Rol MPPRE)',
      desc: 'El oficial consular verifica el refrendo previo del GTU, valida el país destino y emite la Apostilla Electrónica APOSTILLADO_MPPRE con código QR verificable.',
      icon: Globe,
    },
    {
      num: '04',
      title: 'Anclaje en Sepolia y Bitácora Auditable',
      desc: 'Cada resolución genera una transacción real EIP-1559 en Ethereum Sepolia y queda asentada en la Bitácora Ministerial exportable en formato CSV y PDF.',
      icon: Layers,
    },
  ];

  const adminTools = [
    {
      title: 'Bandeja de Cotejo Individual y por Lotes',
      badge: 'Filtro GTU / MPPRE',
      desc: 'Filtra expedientes por cédula, código GTU o hash SHA-256, aprueba múltiples títulos sincronizados o emite rechazos motivados para subsanación.',
      icon: CheckCircle2,
    },
    {
      title: 'Alertas por Correo e In-App por Ente',
      badge: 'Campana de Alertas',
      desc: 'Vincula tu correo electrónico institucional desde el botón Alertas del encabezado para recibir avisos automáticos cuando ingresen expedientes a tu bandeja.',
      icon: Bell,
    },
    {
      title: 'Firma Criptográfica Dual en Sepolia',
      badge: 'MetaMask + EIP-1559',
      desc: 'Conecta una billetera institucional con WalletConnect para firmar en primera persona o utiliza el firmador criptográfico integrado del servidor en Ethereum Sepolia.',
      icon: Wallet,
    },
    {
      title: 'Bitácora CSV/PDF y Gestión de Catálogos',
      badge: 'Configuración Ministerial',
      desc: 'Alterna con un clic hacia el Centro de Bitácora para descargar reportes de auditoría, crear cuentas de auditores y actualizar requisitos, planillas o sedes.',
      icon: FileSpreadsheet,
    },
  ];

  const adminFaqItems = [
    {
      q: '¿Cuál es la diferencia operativa entre ingresar como auditor MPPEU (GTU) y como auditor MPPRE (Cancillería)?',
      a: 'El sistema aplica Segregación Estricta de Funciones (SoD). El rol MPPEU (Taquilla GTU) actúa en la Estación 2 para cotejar el pergamino universitario y otorgar la legalización ministerial (CERTIFICADO_MPPEU). El rol MPPRE (Cancillería) actúa en la Estación 4 únicamente sobre documentos ya certificados por el GTU para emitir la Apostilla Electrónica de La Haya (APOSTILLADO_MPPRE).',
    },
    {
      q: '¿Cómo apruebo o rechazo un expediente desde la bandeja administrativa?',
      a: 'En la tabla principal haz clic en el botón de inspección del documento para visualizar el título escaneado, los metadatos OCR y el registro académico. Si todo coincide con el pergamino físico, pulsa Certificar GTU o Emitir Apostilla; si detectas una discrepancia o imagen ilegible, pulsa Rechazar e indica la causal exacta para notificar al graduando.',
    },
    {
      q: '¿Necesito tener MetaMask instalado para sellar certificados en la Blockchain de Sepolia?',
      a: 'No es obligatorio. Si conectas tu billetera Web3 en el botón superior del panel, podrás firmar la transacción directamente desde MetaMask en la red Ethereum Sepolia. Si operas desde un equipo ministerial sin extensión Web3, el backend institucional firma y transmite automáticamente la transacción EIP-1559 verificable en Etherscan.',
    },
    {
      q: '¿Cómo vinculo mi correo electrónico para recibir notificaciones de nuevos trámites?',
      a: 'Una vez dentro del panel, abre el botón "Alertas" en la esquina superior derecha. Allí encontrarás el campo "Mi correo vinculado para alertas": ingresa tu correo institucional o de trabajo y pulsa "Vincular". A partir de ese momento recibirás alertas automáticas correspondientes a tu ente (MPPEU o MPPRE).',
    },
    {
      q: '¿Dónde descargo la Bitácora de Auditoría Ministerial y dónde registro nuevos funcionarios?',
      a: 'En la barra superior del panel encontrarás el botón "Bitácora CSV/PDF y Configuración". Desde esa vista puedes exportar el historial cronológico inmutable de aprobaciones y rechazos (con operador, ente, fecha y TxHash Sepolia), registrar nuevos auditores y administrar el checklist de recaudos, planillas y guías de sedes.',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.38 } },
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--surface-canvas)',
        color: 'var(--color-ink-black)',
        minHeight: '100vh',
        width: '100%',
        overflowX: 'hidden',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* ─── HEADER INSTITUCIONAL EDITORIAL (MISMO ESTILO STEEP DEL SISTEMA) ─── */}
      <header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--border)',
          boxShadow: '0 1px 4px rgba(23, 25, 28, 0.03)',
          position: 'sticky',
          top: 0,
          zIndex: 500,
        }}
      >
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
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--color-ink-black)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Shield size={13} /> SISTEMA INTERMINISTERIAL DE FE PÚBLICA
            </span>
            <span className="landing-meta-subtitle" style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1rem' }}>
              Taquilla GTU (MPPEU) · Cancillería (MPPRE)
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 6px rgba(16, 185, 129, 0.7)' }} />
              Sesiones activas: <strong style={{ color: 'var(--color-ink-black)', fontWeight: 600 }}>{onlineUsers}</strong>
            </span>
            <span className="landing-meta-network" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: blockchainOnline ? '#10b981' : 'var(--color-sienna-brown)' }} />
              Red Ethereum Sepolia:{' '}
              <strong style={{ color: 'var(--color-ink-black)', fontWeight: 500 }}>
                {blockchainOnline === true ? 'Nodo RPC En línea' : 'Verificación SHA-256 Híbrida'}
              </strong>
            </span>
          </div>
        </div>

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
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '9999px',
                backgroundColor: 'var(--color-ink-black)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(23, 25, 28, 0.15)',
              }}
            >
              <Shield size={20} color="#ffffff" />
            </div>
            <div>
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)',
                  fontWeight: 400,
                  margin: 0,
                  color: 'var(--color-ink-black)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.15,
                }}
              >
                Portal de Auditoría Ministerial
              </h1>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 450 }}>
                Fiscalización Documental, Cotejo GTU y Apostilla Electrónica
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <a
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-pill)',
                padding: '0.5rem 1rem',
                fontSize: '0.8rem',
                color: 'var(--color-ink-black)',
                fontWeight: 500,
                textDecoration: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <ArrowLeft size={14} /> Portal Graduandos USM
            </a>
            <button
              type="button"
              onClick={scrollToLogin}
              className="send-btn"
              style={{
                padding: '0.6rem 1.25rem',
                fontSize: '0.84rem',
              }}
            >
              <Lock size={14} /> Iniciar Sesión Auditor
            </button>
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION + TARJETA DE INICIO DE SESIÓN REQUERIDO ─── */}
      <section
        className="landing-hero"
        style={{
          padding: '4rem 1.75rem 3rem 1.75rem',
          maxWidth: '1240px',
          margin: '0 auto',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div
            variants={itemVariants}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.55rem',
              backgroundColor: 'var(--color-blush-peach)',
              color: 'var(--color-sienna-brown)',
              padding: '0.45rem 1.15rem',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid rgba(93, 42, 26, 0.2)',
              fontSize: 'clamp(0.74rem, 2vw, 0.82rem)',
              fontWeight: 600,
              marginBottom: '1.4rem',
            }}
          >
            <ShieldCheck size={14} style={{ flexShrink: 0 }} /> Acceso Restringido `/admin` — Autenticación Institucional Requerida
          </motion.div>

          <motion.h1
            variants={itemVariants}
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(1.85rem, 4.4vw, 3.25rem)',
              fontWeight: 400,
              lineHeight: 1.15,
              maxWidth: '900px',
              margin: '0 auto 1.15rem auto',
              color: 'var(--color-ink-black)',
              letterSpacing: '-0.025em',
            }}
          >
            Centro de fiscalización académica, legalización GTU y apostilla en Blockchain
          </motion.h1>

          <motion.p
            variants={itemVariants}
            style={{
              fontSize: 'clamp(0.94rem, 2.1vw, 1.06rem)',
              color: 'var(--text-secondary)',
              maxWidth: '780px',
              margin: '0 auto 2.4rem auto',
              lineHeight: 1.65,
            }}
          >
            Plataforma operativa exclusiva para funcionarios revisores del <strong>MPPEU (Taquilla GTU)</strong> y de <strong>Cancillería (MPPRE)</strong>. Inicia sesión con tus credenciales oficiales para inspeccionar pergaminos, aprobar lotes, vincular alertas por correo y sellar certificados en Ethereum Sepolia.
          </motion.p>

          {/* ─── TARJETA DE AUTENTICACIÓN MINISTERIAL (MISMO ESTILO DE StudentAuth) ─── */}
          <motion.div
            id="admin-login-section"
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
              }}
            >
              <div style={{ marginBottom: '1.25rem' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.4rem',
                    fontWeight: 400,
                    color: 'var(--color-ink-black)',
                    margin: 0,
                  }}
                >
                  Acceso para Auditores Ministeriales
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.35rem', marginBottom: 0 }}>
                  Selecciona tu ente gubernamental e ingresa tus credenciales institucionales para desbloquear la bandeja.
                </p>
              </div>

              {/* Selector de Ente Ministerial en tonos claros Steep */}
              <div style={{ marginBottom: '1.15rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--color-ink-black)',
                    marginBottom: '0.45rem',
                  }}
                >
                  Ente Ministerial de Adscripción
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
                  {Object.keys(entesConfig).map((key) => {
                    const e = entesConfig[key];
                    const Icon = e.icon;
                    const isSelected = selectedEnte === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectEnte(key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.55rem',
                          padding: '0.7rem 0.9rem',
                          borderRadius: 'var(--radius-inputs)',
                          border: isSelected ? '1px solid rgba(93, 42, 26, 0.35)' : '1px solid var(--border)',
                          backgroundColor: isSelected ? 'var(--color-blush-peach)' : 'var(--color-fog-white)',
                          color: isSelected ? 'var(--color-sienna-brown)' : 'var(--text-secondary)',
                          fontSize: '0.83rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.18s ease',
                        }}
                      >
                        <Icon size={16} color={isSelected ? 'var(--color-sienna-brown)' : 'var(--color-slate-gray)'} style={{ flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {e.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Resumen del rol seleccionado */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--color-fog-white)',
                  borderRadius: 'var(--radius-inputs)',
                  border: '1px solid var(--border)',
                  marginBottom: '1.25rem',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-blush-peach)',
                    color: 'var(--color-sienna-brown)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <CurrentIcon size={17} />
                </div>
                <div style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                  <strong style={{ color: 'var(--color-ink-black)', display: 'block' }}>{currentEnte.subtitle}</strong>
                  <span style={{ color: 'var(--text-secondary)' }}>{currentEnte.role}</span>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.8rem 1rem',
                    borderRadius: 'var(--radius-inputs)',
                    backgroundColor: 'rgba(185, 28, 28, 0.08)',
                    border: '1px solid rgba(185, 28, 28, 0.25)',
                    color: '#b91c1c',
                    fontSize: '0.84rem',
                    marginBottom: '1.2rem',
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.05rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'var(--color-ink-black)',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Identificador de Funcionario / Usuario
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      backgroundColor: 'var(--color-fog-white)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-inputs)',
                      padding: '0.2rem 1rem',
                    }}
                  >
                    <UserCheck size={16} color="var(--color-slate-gray)" />
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      placeholder={currentEnte.placeholderUser}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="chat-input"
                      style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0' }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'var(--color-ink-black)',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Clave de Seguridad Institucional
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      backgroundColor: 'var(--color-fog-white)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-inputs)',
                      padding: '0.2rem 1rem',
                    }}
                  >
                    <KeyRound size={16} color="var(--color-slate-gray)" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="Ingresa tu clave ministerial"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="chat-input"
                      style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.75rem 0' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      aria-label="Mostrar u ocultar clave"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-slate-gray)' }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || lockoutSeconds > 0}
                  className="send-btn"
                  style={{
                    padding: '0.88rem 1.4rem',
                    marginTop: '0.3rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    fontSize: '0.94rem',
                    fontWeight: 600,
                    opacity: lockoutSeconds > 0 ? 0.6 : 1,
                    cursor: lockoutSeconds > 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="animate-spin" size={17} /> Verificando credenciales...
                    </>
                  ) : lockoutSeconds > 0 ? (
                    <>Bloqueado por seguridad ({lockoutSeconds}s)</>
                  ) : (
                    <>
                      Iniciar Sesión como {currentEnte.code} <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Acceso Rápido Demo para Evaluación de Jurado (igual que StudentAuth) */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.55rem',
                  marginTop: '1.15rem',
                  borderTop: '1px solid var(--border)',
                  paddingTop: '1rem',
                }}
              >
                <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'center' }}>
                  Acceso rápido de evaluación para defensa de tesis (Modo Jurado):
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickDemo('mppeu')}
                    className="btn-ghost"
                    style={{
                      padding: '0.55rem 0.75rem',
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary)',
                      border: '1px dashed var(--border)',
                      justifyContent: 'center',
                    }}
                  >
                    ⚡ Demo Auditor GTU (MPPEU)
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickDemo('mppre')}
                    className="btn-ghost"
                    style={{
                      padding: '0.55rem 0.75rem',
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary)',
                      border: '1px dashed var(--border)',
                      justifyContent: 'center',
                    }}
                  >
                    ⚡ Demo Cancillería (MPPRE)
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* ─── 4 TARJETAS DE MÉTRICAS EN VIVO DEL LADO ADMINISTRADOR ─── */}
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
            margin: '0 auto',
          }}
        >
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
            }}
          >
            <FileSearch size={22} color="var(--color-ink-black)" style={{ margin: '0 auto 0.5rem auto' }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9rem', fontWeight: 400, margin: '0 0 0.2rem 0', color: 'var(--color-ink-black)' }}>
              {trayStats.totalExpedientes}
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 450 }}>Expedientes en Bandeja</p>
          </motion.div>

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
            }}
          >
            <Building2 size={22} color="var(--color-ink-black)" style={{ margin: '0 auto 0.5rem auto' }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9rem', fontWeight: 400, margin: '0 0 0.2rem 0', color: 'var(--color-ink-black)' }}>
              {trayStats.pendientesGtu}
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 450 }}>Por Cotejar en GTU (MPPEU)</p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ y: -6, scale: 1.015 }}
            className="card-peach"
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              borderRadius: 'var(--radius-cards)',
            }}
          >
            <ShieldCheck size={24} color="var(--color-sienna-brown)" style={{ margin: '0 auto 0.5rem auto' }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9rem', fontWeight: 400, margin: '0 0 0.2rem 0', color: 'var(--color-sienna-brown)' }}>
              {trayStats.selladosSepolia}
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--color-sienna-brown)', margin: 0, fontWeight: 500 }}>
              Certificados Sellados en Sepolia
            </p>
          </motion.div>

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
            }}
          >
            <Globe size={22} color="var(--color-ink-black)" style={{ margin: '0 auto 0.5rem auto' }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9rem', fontWeight: 400, margin: '0 0 0.2rem 0', color: 'var(--color-ink-black)' }}>
              {trayStats.pendientesMppre}
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 450 }}>Listos para Apostilla (MPPRE)</p>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── SECCIÓN 1: GUÍA DE USO DEL SISTEMA PARA AUDITORES MINISTERIALES ─── */}
      <section
        className="landing-section"
        style={{
          padding: '4.5rem 1.75rem',
          backgroundColor: '#ffffff',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.75rem' }}>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)',
                fontWeight: 400,
                color: 'var(--color-ink-black)',
                marginBottom: '0.6rem',
                letterSpacing: '-0.02em',
              }}
            >
              Flujo de trabajo del auditor en el panel administrativo
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', maxWidth: '650px', margin: '0 auto' }}>
              Procedimiento estandarizado en 4 pasos para inspeccionar, certificar, apostillar y auditar documentos académicos.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.35rem' }}>
            {adminSteps.map((step) => (
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
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 400, color: 'var(--color-ink-black)' }}>
                    {step.num}
                  </span>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-ink-black)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <step.icon size={18} />
                  </div>
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.18rem',
                    fontWeight: 400,
                    margin: 0,
                    color: 'var(--color-ink-black)',
                    letterSpacing: '-0.01em',
                  }}
                >
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

      {/* ─── SECCIÓN 2: HERRAMIENTAS Y MÓDULOS DEL LADO ADMIN ─── */}
      <section className="landing-section" style={{ padding: '4.5rem 1.75rem', maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.75rem' }}>
          <div
            style={{
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
              boxShadow: '0 1px 3px rgba(23, 25, 28, 0.04)',
            }}
          >
            <Shield size={14} /> Capacidades del Entorno `/admin`
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)',
              fontWeight: 400,
              color: 'var(--color-ink-black)',
              margin: '0 0 0.6rem 0',
              letterSpacing: '-0.02em',
            }}
          >
            Herramientas operativas para la gestión ministerial
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', maxWidth: '650px', margin: '0 auto' }}>
            Diseñado para agilizar la revisión de grandes volúmenes de títulos manteniendo trazabilidad criptográfica total.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.35rem' }}>
          {adminTools.map((item, idx) => (
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
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                <item.icon size={20} color="var(--color-ink-black)" />
                <span
                  style={{
                    fontSize: '0.73rem',
                    backgroundColor: 'var(--surface-canvas)',
                    padding: '0.25rem 0.65rem',
                    borderRadius: 'var(--radius-pill)',
                    color: 'var(--color-ink-black)',
                    border: '1px solid var(--border)',
                    fontWeight: 500,
                  }}
                >
                  {item.badge}
                </span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', fontWeight: 400, color: 'var(--color-ink-black)', margin: 0 }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── SECCIÓN 3: GOBERNANZA, SEGREGACIÓN DE FUNCIONES Y LINEAMIENTOS DE AUDITORÍA ─── */}
      <section
        className="landing-section"
        style={{
          padding: '4.5rem 1.75rem',
          backgroundColor: '#ffffff',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '2rem' }}>
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(1.35rem, 3vw, 1.6rem)',
                fontWeight: 400,
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                color: 'var(--color-ink-black)',
              }}
            >
              <BookOpen size={20} style={{ flexShrink: 0 }} /> Gobernanza y Segregación de Roles (SoD)
            </h2>

            <div
              style={{
                padding: '1.75rem',
                borderRadius: 'var(--radius-cards)',
                backgroundColor: 'var(--surface-canvas)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-subtle)',
              }}
            >
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.18rem', fontWeight: 400, color: 'var(--color-ink-black)', marginBottom: '0.85rem' }}>
                Control Interministerial con Trazabilidad Inmutable
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 1.25rem 0' }}>
                En cumplimiento de la <strong>Ley de Infogobierno</strong> y la <strong>Ley sobre Mensajes de Datos y Firmas Electrónicas</strong>, ningún funcionario puede ejecutar etapas fuera de su competencia ministerial, quedando cada acto administrativo registrado con marca de tiempo y TxHash público.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div style={{ backgroundColor: '#ffffff', padding: '1.1rem', borderRadius: 'var(--radius-inputs)', border: '1px solid var(--border)' }}>
                  <h4 style={{ color: 'var(--color-ink-black)', fontSize: '0.88rem', margin: '0 0 0.35rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600 }}>
                    <Building2 size={14} /> Competencia MPPEU
                  </h4>
                  <p style={{ fontSize: '0.81rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Verifica autenticidad de autoridades rectorales, Libro/Tomo/Folio y emite la certificación GTU.
                  </p>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '1.1rem', borderRadius: 'var(--radius-inputs)', border: '1px solid var(--border)' }}>
                  <h4 style={{ color: 'var(--color-ink-black)', fontSize: '0.88rem', margin: '0 0 0.35rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600 }}>
                    <Globe size={14} /> Competencia MPPRE
                  </h4>
                  <p style={{ fontSize: '0.81rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Exige certificación GTU previa para expedir la Apostilla de La Haya o Legalización Consular.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(1.35rem, 3vw, 1.6rem)',
                fontWeight: 400,
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                color: 'var(--color-ink-black)',
              }}
            >
              <CheckCircle2 size={20} style={{ flexShrink: 0 }} /> Recomendaciones Operativas para el Auditor
            </h2>

            <div
              style={{
                padding: '1.5rem',
                borderRadius: 'var(--radius-cards)',
                backgroundColor: 'var(--surface-canvas)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.2rem',
                boxShadow: 'var(--shadow-subtle)',
              }}
            >
              {[
                {
                  tag: 'Paso Inicial Recomendado',
                  title: 'Configura tu Correo en la Campana de Alertas',
                  desc: 'Al ingresar, abre "Alertas" en la barra superior y vincula tu correo electrónico para recibir notificaciones inmediatas de nuevos expedientes.',
                },
                {
                  tag: 'Revisión de Calidad Documental',
                  title: 'Coteja el Pergamino Digital antes de Sellar',
                  desc: 'Utiliza el visor integrado con zoom para confirmar que nombres, cédula, mención y fecha coincidan exactamente con el título consignado.',
                },
                {
                  tag: 'Cierre de Jornada',
                  title: 'Respalda la Bitácora Ministerial en CSV o PDF',
                  desc: 'Desde "Bitácora CSV/PDF y Configuración" puedes generar el acta consolidada de todos los títulos certificados o apostillados en tu turno.',
                },
              ].map((tip, idx) => (
                <div key={idx} style={{ borderBottom: idx !== 2 ? '1px solid var(--border)' : 'none', paddingBottom: idx !== 2 ? '1rem' : 0 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-sienna-brown)', fontWeight: 600 }}>{tip.tag}</span>
                  <h4 style={{ fontSize: '0.92rem', margin: '0.25rem 0', color: 'var(--color-ink-black)', fontWeight: 600 }}>{tip.title}</h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>{tip.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECCIÓN 4: PREGUNTAS FRECUENTES DEL LADO ADMIN (FAQ ACCORDION) ─── */}
      <section className="landing-section" style={{ padding: '4.5rem 1.75rem', maxWidth: '840px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(1.6rem, 3.5vw, 2rem)',
              fontWeight: 400,
              color: 'var(--color-ink-black)',
              margin: '0 0 0.5rem 0',
              letterSpacing: '-0.02em',
            }}
          >
            Preguntas frecuentes para auditores y administradores
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem' }}>
            Guía rápida sobre permisos ministeriales, firma en Blockchain, alertas y operación de la bandeja `/admin`.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {adminFaqItems.map((item, idx) => {
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
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              >
                <button
                  type="button"
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
                    gap: '1rem',
                  }}
                >
                  <span style={{ lineHeight: 1.45 }}>{item.q}</span>
                  <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ flexShrink: 0 }}>
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
                      <div
                        style={{
                          padding: '0.85rem 1.35rem 1.3rem 1.35rem',
                          color: 'var(--text-secondary)',
                          fontSize: '0.88rem',
                          lineHeight: 1.6,
                          borderTop: '1px solid var(--border)',
                        }}
                      >
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
          fontSize: '0.84rem',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.25rem',
          }}
        >
          <div>
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                color: 'var(--color-ink-black)',
                fontWeight: 400,
                fontSize: '1.05rem',
                margin: '0 0 0.3rem 0',
              }}
            >
              PORTAL INTERMINISTERIAL GTU (MPPEU) · CANCILLERÍA (MPPRE)
            </p>
            <p style={{ margin: 0 }}>Universidad Santa María — Proyecto de Tesis de Grado · Ingeniería en Sistemas 2026</p>
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            <span>Segregación de Funciones (SoD)</span>
            <span>Ethereum Sepolia EIP-1559</span>
            <span>Auditoría Criptográfica SHA-256</span>
          </div>
        </div>
        <div
          style={{
            maxWidth: '1240px',
            margin: '1.5rem auto 0 auto',
            borderTop: '1px solid var(--border)',
            paddingTop: '1rem',
            textAlign: 'center',
            fontSize: '0.76rem',
          }}
        >
          Uso restringido a personal ministerial autorizado. Cada inicio de sesión y firma electrónica genera registro de auditoría verificable.
        </div>
      </footer>
    </div>
  );
};

export default GovernmentLoginPortal;
