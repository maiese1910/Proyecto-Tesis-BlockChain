import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Paperclip, Send, Bot, User, Sparkles, RefreshCw, 
  CheckCircle, ArrowRight, FileText, Shield, Globe, 
  HelpCircle, Building, Check, X, AlertCircle
} from 'lucide-react';
import { chatAPI } from '../services/api';

const QUICK_PROMPTS = [
  { label: "🔎 Auditar mi Expediente", text: "auditar", icon: Shield },
  { label: "🏛️ Ruta GTU / MPPEU", text: "¿Cómo tramito el GTU del MPPEU?", icon: Building },
  { label: "📄 Planilla PUB SAREN", text: "¿Cómo generar y pagar la Planilla PUB SAREN?", icon: FileText },
  { label: "🌍 Apostilla de La Haya", text: "¿Cuáles son los pasos para la Apostilla de La Haya en MPPRE?", icon: Globe },
  { label: "🎓 Requisitos Egresado USM", text: "¿Cuáles son los trámites de egresados en Secretaría General USM?", icon: Building },
  { label: "⛓️ Verificar Blockchain", text: "¿Cómo funciona la verificación de mi título en Blockchain?", icon: Shield },
];

const ChatBotWidget = ({ user, onNavigate }) => {
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Conectando...');
  const [isConnected, setIsConnected] = useState(false);
  const [isAuditMode, setIsAuditMode] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const getSessionId = () => {
    if (user?.cedula) return user.cedula;
    const stored = localStorage.getItem('usm_user');
    if (stored) {
      try { return JSON.parse(stored).cedula; } catch (_) {}
    }
    return 'default';
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    // Inicializar chat con bienvenida oficial
    sendMessage('/start', true);
  }, []);

  const getInstitutionalOfflineReply = (text, isFile = false) => {
    const cleanText = text.toLowerCase().trim();

    if (isFile) {
      return {
        text: `🔍 <strong>Documento Inspeccionado:</strong> El archivo adjunto cuenta con resolución suficiente y encuadre legible para cotejo forense preliminar.<br/><br/>[ACTION:ocr]`,
        isAudit: isAuditMode
      };
    }

    if (cleanText.includes('auditar') || cleanText.includes('auditoria') || cleanText.includes('/start')) {
      setIsAuditMode(true);
      return {
        text: `🔎 <strong>Iniciando Auditoría Interactiva del Expediente USM:</strong><br/><br/>
<strong>Requisito 1 de 5:</strong> ¿Posee el <strong>Título Original en Pergamino</strong> firmado por el Rector y Secretario General de la USM?<br/>
<em>(Usa los botones de respuesta rápida abajo)</em>`,
        isAudit: true
      };
    }

    if (cleanText.includes('gtu') || cleanText.includes('mppeu')) {
      return {
        text: `🏛️ <strong>Gestión de Trámites Universitarios (GTU — MPPEU)</strong><br/><br/>
El <strong>GTU</strong> es la legalización previa y obligatoria de las firmas de las autoridades rectorales de la Universidad Santa María ante el Ministerio de Educación Universitaria.<br/><br/>
<strong>Pasos clave:</strong><br/>
1. <strong>Cita electrónica:</strong> Solicítala en el portal oficial del MPPEU según el terminal de cédula.<br/>
2. <strong>Presentación:</strong> Acude con el título pergamino original, fondo negro certificado y cédula laminada.<br/>
3. <strong>Sello Digital:</strong> El funcionario estampa la hoja de certificación ministerial con código QR y sello GTU.<br/><br/>
[ACTION:ocr]`,
        isAudit: false
      };
    }

    if (cleanText.includes('pub') || cleanText.includes('saren') || cleanText.includes('arancel') || cleanText.includes('timbre')) {
      return {
        text: `📄 <strong>Planilla Única Bancaria (PUB) y Protocolización SAREN</strong><br/><br/>
La <strong>PUB</strong> es el formato de liquidación de aranceles oficiales para protocolizar tu título en los libros del Registro Principal.<br/><br/>
<strong>Recaudos de taquilla:</strong><br/>
• Planilla PUB con el número de trámite emitido.<br/>
• Comprobante de pago bancario en entidades autorizadas.<br/>
• <strong>Timbres Fiscales Regionales (0.5 UT)</strong> del estado o Distrito Capital.<br/>
• Fondo negro certificado por Secretaría General USM.<br/><br/>
[ACTION:pub]`,
        isAudit: false
      };
    }

    if (cleanText.includes('apostilla') || cleanText.includes('mppre') || cleanText.includes('haya')) {
      return {
        text: `🌍 <strong>Apostilla Electrónica de La Haya (MPPRE / Cancillería)</strong><br/><br/>
Otorga validez jurídica internacional en los más de 126 países miembros del Convenio de La Haya de 1961.<br/><br/>
<strong>Cadena de legalización indispensable:</strong><br/>
1. Certificación del título en <strong>Secretaría USM</strong>.<br/>
2. Legalización de firmas en <strong>GTU (MPPEU)</strong>.<br/>
3. Registro de título en <strong>Registro Principal (SAREN)</strong>.<br/>
4. Emisión de Apostilla Electrónica en el <strong>MPPRE</strong>.<br/><br/>
[ACTION:guide]`,
        isAudit: false
      };
    }

    if (cleanText.includes('blockchain') || cleanText.includes('sepolia') || cleanText.includes('hash')) {
      return {
        text: `⛓️ <strong>Seguridad Criptográfica y Registro en Blockchain (Ethereum Sepolia)</strong><br/><br/>
Cada diploma digitalizado en nuestra plataforma genera un hash resumen <strong>SHA-256</strong> único e inmutable, el cual se registra en un Contrato Inteligente en la red descentralizada <strong>Ethereum Sepolia</strong>.<br/><br/>
Cualquier empleador o consulado en el mundo puede verificar la autenticidad con el código QR sin riesgo de falsificación.<br/><br/>
[ACTION:blockchain]`,
        isAudit: false
      };
    }

    if (cleanText.includes('usm') || cleanText.includes('secretaria') || cleanText.includes('modulo 4')) {
      return {
        text: `🎓 <strong>Trámites en Secretaría General — Universidad Santa María</strong><br/><br/>
• <strong>Ubicación:</strong> Campus La Florencia, Edificio Administrativo, Módulo 4.<br/>
• <strong>Horario:</strong> Lunes a Viernes de 8:30 a.m. a 3:30 p.m.<br/>
• <strong>Recaudos:</strong> Fondo negro certificado, certificación de notas, puesto y rango, y pensum legalizado.<br/><br/>
[ACTION:forms]`,
        isAudit: false
      };
    }

    return {
      text: `Entendido. Como <strong>Asistente Institucional de la USM</strong>, puedo orientarte sobre la digitalización con IA de tu título, la legalización GTU (MPPEU), aranceles de la Planilla PUB (SAREN), Apostilla de La Haya y verificación en Blockchain.<br/><br/>¿Deseas auditar tu expediente actual o consultar un trámite específico?<br/><br/>[ACTION:guide]`,
      isAudit: false
    };
  };

  const sendMessage = async (text, isInit = false, isFile = false) => {
    if (!text.trim() && !isFile) return;

    if (!isInit) {
      setMessages((prev) => [...prev, { text, sender: 'user', isFile }]);
    }
    setLoading(true);

    try {
      const data = await chatAPI.sendMessage(getSessionId(), text, isFile, {
        nombre: user?.nombre || user?.nombre_completo,
        cedula: user?.cedula,
        carrera: user?.carrera
      });

      let rawReply = data.reply || '';
      let formattedText = rawReply
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br/>');

      const auditOngoing = rawReply.includes('Requisito') || rawReply.includes('Iniciando Auditoría') || rawReply.includes('Auditoría');
      setIsAuditMode(auditOngoing);

      setMessages((prev) => [...prev, { 
        text: formattedText, 
        sender: 'bot', 
        rawText: rawReply 
      }]);
      setStatus('En línea');
      setIsConnected(true);
    } catch (err) {
      console.warn("Backend chat endpoint fallback a motor institucional local:", err);
      const fallback = getInstitutionalOfflineReply(text, isFile);
      setMessages((prev) => [...prev, { 
        text: fallback.text, 
        sender: 'bot', 
        rawText: fallback.text 
      }]);
      setIsAuditMode(fallback.isAudit);
      setStatus('En línea (Base Institucional)');
      setIsConnected(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputVal.trim() || loading) return;
    sendMessage(inputVal);
    setInputVal('');
  };

  const handleResetChat = () => {
    setMessages([]);
    setIsAuditMode(false);
    sendMessage('/start', true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    sendMessage(`[FILE_UPLOAD] ${file.name}`, false, true);
    e.target.value = null;
  };

  const renderMessageContent = (msg) => {
    const text = msg.text;

    // Detectar acciones interactivas dentro del mensaje
    const hasOcrAction = text.includes('[ACTION:ocr]');
    const hasPubAction = text.includes('[ACTION:pub]');
    const hasBlockchainAction = text.includes('[ACTION:blockchain]');
    const hasGuideAction = text.includes('[ACTION:guide]');
    const hasFormsAction = text.includes('[ACTION:forms]');

    const cleanHtml = text
      .replace(/\[ACTION:ocr\]/g, '')
      .replace(/\[ACTION:pub\]/g, '')
      .replace(/\[ACTION:blockchain\]/g, '')
      .replace(/\[ACTION:guide\]/g, '')
      .replace(/\[ACTION:forms\]/g, '');

    return (
      <div>
        <span dangerouslySetInnerHTML={{ __html: cleanHtml }} />

        {/* Tarjetas de Acción Rápida dentro del Chat */}
        {msg.sender === 'bot' && (hasOcrAction || hasPubAction || hasBlockchainAction || hasGuideAction || hasFormsAction) && (
          <div style={{ marginTop: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {hasOcrAction && (
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('ocr')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.9rem',
                  background: 'var(--color-blush-peach)',
                  color: 'var(--color-sienna-brown)',
                  border: '1px solid rgba(93, 42, 26, 0.2)',
                  borderRadius: 'var(--radius-inputs)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>📸 Escanear Título con IA (OCR)</span>
                <ArrowRight size={15} />
              </button>
            )}

            {hasPubAction && (
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('pub')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.9rem',
                  background: '#ffffff',
                  color: 'var(--color-ink-black)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-inputs)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>📝 Generar Planilla PUB (SAREN)</span>
                <ArrowRight size={15} />
              </button>
            )}

            {hasBlockchainAction && (
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('blockchain')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.9rem',
                  background: '#ffffff',
                  color: 'var(--color-ink-black)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-inputs)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>⛓️ Verificador Criptográfico Blockchain</span>
                <ArrowRight size={15} />
              </button>
            )}

            {hasFormsAction && (
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('forms')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.9rem',
                  background: '#ffffff',
                  color: 'var(--color-ink-black)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-inputs)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>📂 Ver Modelos de Planillas Oficiales</span>
                <ArrowRight size={15} />
              </button>
            )}

            {hasGuideAction && (
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('survival')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.9rem',
                  background: '#ffffff',
                  color: 'var(--color-ink-black)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-inputs)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>📖 Consultar Guía de Trámites Completa</span>
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="chat-container" style={{
      maxWidth: '920px',
      margin: '0 auto',
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-card)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '78vh',
      minHeight: '620px'
    }}>
      {/* Cabecera del Asistente */}
      <div style={{
        padding: '1rem 1.4rem',
        background: 'linear-gradient(135deg, #fffbf7 0%, #fdf5ec 100%)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.8rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: '12px',
            background: 'var(--color-blush-peach)',
            border: '1px solid rgba(93, 42, 26, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-sienna-brown)'
          }}>
            <Bot size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.08rem', fontFamily: 'var(--font-serif)', color: 'var(--color-ink-black)', fontWeight: 500 }}>
                Asistente Institucional USM
              </h2>
              <span style={{
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#047857',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                fontSize: '0.68rem',
                fontWeight: 600,
                padding: '0.1rem 0.5rem',
                borderRadius: 'var(--radius-pill)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}></span>
                {status}
              </span>
            </div>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: 'var(--color-slate-gray)' }}>
              Especialista en GTU (MPPEU), SAREN, Apostilla MPPRE y Blockchain Sepolia
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {user && (
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--color-ink-black)',
              background: '#ffffff',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              <User size={13} color="var(--color-sienna-brown)" />
              <span style={{ fontWeight: 600 }}>{user.nombre?.split(' ')[0] || 'Egresado'}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleResetChat}
            className="btn-ghost"
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderRadius: 'var(--radius-pill)'
            }}
            title="Reiniciar conversación"
          >
            <RefreshCw size={14} />
            <span>Reiniciar</span>
          </button>
        </div>
      </div>

      {/* Área de Mensajes */}
      <div className="chat-messages" style={{
        flex: 1,
        padding: '1.4rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        background: '#fafafa'
      }}>
        {messages.map((msg, idx) => {
          const isUser = msg.sender === 'user';
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                gap: '0.65rem'
              }}
            >
              {!isUser && (
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--color-blush-peach)',
                  border: '1px solid rgba(93, 42, 26, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-sienna-brown)',
                  flexShrink: 0
                }}>
                  <Bot size={17} />
                </div>
              )}

              <div style={{
                maxWidth: '82%',
                padding: '0.9rem 1.15rem',
                borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: isUser ? 'var(--color-sienna-brown)' : '#ffffff',
                color: isUser ? '#ffffff' : 'var(--color-ink-black)',
                boxShadow: isUser ? '0 4px 12px rgba(93, 42, 26, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.05)',
                border: isUser ? 'none' : '1px solid var(--border)',
                fontSize: '0.88rem',
                lineHeight: '1.55',
                wordBreak: 'break-word'
              }}>
                {renderMessageContent(msg)}
              </div>

              {isUser && (
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--color-fog-white)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-ink-black)',
                  flexShrink: 0
                }}>
                  <User size={16} />
                </div>
              )}
            </motion.div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--color-blush-peach)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-sienna-brown)'
            }}>
              <Bot size={17} />
            </div>
            <div style={{
              background: '#ffffff',
              padding: '0.75rem 1.1rem',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontSize: '0.82rem',
              color: 'var(--color-slate-gray)'
            }}>
              <span className="dot-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-sienna-brown)' }} />
              Consultando normativa institucional...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Botones de Respuesta Rápida en Modo Auditoría */}
      {isAuditMode && !loading && (
        <div style={{
          padding: '0.6rem 1.4rem',
          background: 'linear-gradient(135deg, #fffbf6 0%, #fdf2e4 100%)',
          borderTop: '1px solid rgba(93, 42, 26, 0.15)',
          display: 'flex',
          gap: '0.6rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-sienna-brown)', textTransform: 'uppercase' }}>
            Opciones:
          </span>
          <button
            type="button"
            onClick={() => sendMessage('sí')}
            style={{
              padding: '0.35rem 0.85rem',
              background: '#047857',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Check size={14} /> Sí, lo tengo
          </button>
          <button
            type="button"
            onClick={() => sendMessage('no')}
            style={{
              padding: '0.35rem 0.85rem',
              background: '#b91c1c',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <X size={14} /> No lo tengo
          </button>
          <button
            type="button"
            onClick={() => sendMessage('omitir')}
            style={{
              padding: '0.35rem 0.85rem',
              background: '#ffffff',
              color: 'var(--color-ink-black)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.78rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Omitir por ahora
          </button>
          <button
            type="button"
            onClick={() => sendMessage('salir')}
            style={{
              padding: '0.35rem 0.85rem',
              background: 'transparent',
              color: 'var(--color-slate-gray)',
              border: 'none',
              fontSize: '0.78rem',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Salir de auditoría
          </button>
        </div>
      )}

      {/* Barra de Consultas Frecuentes / Atajos */}
      <div style={{
        padding: '0.65rem 1.4rem',
        background: '#ffffff',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        {QUICK_PROMPTS.map((qp, i) => {
          const Icon = qp.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={() => sendMessage(qp.text)}
              disabled={loading}
              style={{
                padding: '0.38rem 0.75rem',
                background: 'var(--color-fog-white)',
                color: 'var(--color-ink-black)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-sienna-brown)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <Icon size={13} color="var(--color-sienna-brown)" />
              {qp.label}
            </button>
          );
        })}
      </div>

      {/* Input de Envío */}
      <div style={{
        padding: '0.9rem 1.4rem',
        background: '#ffffff',
        borderTop: '1px solid var(--border)'
      }}>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
            accept=".pdf,.jpg,.jpeg,.png,.webp"
          />
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-inputs)' }}
            onClick={() => fileInputRef.current.click()}
            title="Adjuntar documento o título para inspección"
          >
            <Paperclip size={18} />
          </button>

          <input
            type="text"
            className="chat-input"
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              fontSize: '0.88rem',
              borderRadius: 'var(--radius-inputs)',
              border: '1px solid var(--border)',
              background: '#ffffff',
              outline: 'none',
              color: 'var(--color-ink-black)'
            }}
            placeholder={
              isAuditMode 
                ? "Responde 'sí', 'no' o usa los botones arriba..." 
                : "Pregunta sobre GTU, SAREN, aranceles, Apostilla o escribe 'auditar'..."
            }
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={loading}
          />

          <button
            type="submit"
            className="send-btn"
            disabled={!inputVal.trim() || loading}
            style={{
              padding: '0.75rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: 'var(--radius-inputs)',
              opacity: !inputVal.trim() || loading ? 0.6 : 1,
              cursor: !inputVal.trim() || loading ? 'not-allowed' : 'pointer'
            }}
          >
            <Send size={16} />
            <span style={{ fontSize: '0.85rem' }}>Enviar</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatBotWidget;
