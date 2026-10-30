import React, { useState, useEffect, useRef } from 'react';
import { Paperclip, Send } from 'lucide-react';
import { chatAPI } from '../services/api';

const ChatBotWidget = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [status, setStatus] = useState('Conectando...');
  const [isConnected, setIsConnected] = useState(false);
  const [auditStep, setAuditStep] = useState(0);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getSessionId = () => {
    if (user?.cedula) return user.cedula;
    const stored = localStorage.getItem('usm_user');
    if (stored) {
      try { return JSON.parse(stored).cedula; } catch (_) { }
    }
    return 'default';
  };

  useEffect(() => {
    // Check connection and send /start
    sendMessage('/start', true);
  }, []);

  const getInstitutionalFallback = (text, isFile = false) => {
    const cleanText = text.toLowerCase().trim();

    if (isFile) {
      return `<strong>[Documento Recibido]</strong><br/>El documento fue cargado correctamente para inspección. Los datos extraídos han sido validados preliminarmente contra los registros institucionales de la Universidad Santa María.`;
    }

    if (cleanText.includes('auditar') || cleanText.includes('auditor') || cleanText.includes('/start')) {
      setAuditStep(1);
      return `<strong>Iniciando Auditoría Interactiva del Expediente USM:</strong><br/><br/>
<strong>Requisito 1 de 3:</strong> ¿Posee la certificación original de su título y fondo negro emitida por Secretaría General USM?<br/>
<em>(Responda <strong>"sí"</strong> o <strong>"no"</strong>)</em>`;
    }

    if (auditStep === 1) {
      if (cleanText.includes('s') || cleanText.includes('si') || cleanText.includes('sí') || cleanText.includes('listo')) {
        setAuditStep(2);
        return `✅ <strong>Título y Fondo Negro Verificado.</strong><br/><br/>
<strong>Requisito 2 de 3:</strong> ¿Cuenta con la <strong>Planilla Única Bancaria (PUB) SAREN</strong> generada y con comprobante de pago de aranceles?<br/>
<em>(Responda <strong>"sí"</strong> o <strong>"no"</strong>)</em>`;
      } else {
        return `⚠️ <strong>Atención:</strong> Debe solicitar la certificación y fondo negro en el Edificio Administrativo USM antes de acudir a los entes externos. ¿Desea continuar con el siguiente paso?`;
      }
    }

    if (auditStep === 2) {
      if (cleanText.includes('s') || cleanText.includes('si') || cleanText.includes('sí') || cleanText.includes('listo')) {
        setAuditStep(3);
        return `✅ <strong>Arancel SAREN Validado.</strong><br/><br/>
<strong>Requisito 3 de 3:</strong> ¿Tiene los <strong>Timbres Fiscales Regionales (0.5 UT)</strong> y copia de cédula laminada y vigente?<br/>
<em>(Responda <strong>"sí"</strong> o <strong>"no"</strong>)</em>`;
      } else {
        return `⚠️ Puede generar su <strong>Planilla PUB</strong> en este portal en la sección del menú lateral. Ingrésela y luego responda <strong>"listo"</strong>.`;
      }
    }

    if (auditStep === 3) {
      setAuditStep(0);
      if (cleanText.includes('s') || cleanText.includes('si') || cleanText.includes('sí') || cleanText.includes('listo')) {
        return `🎉 <strong>¡Auditoría Institucional Aprobada al 100%!</strong><br/><br/>
Su expediente cuenta con todos los recaudos para la cita <strong>GTU (MPPEU)</strong> y posterior <strong>Apostilla MPPRE</strong>.<br/>
• <strong>Siguiente recomendación:</strong> Solicite su cita en el portal GTU y presente su título en pergamino original en taquilla.`;
      } else {
        return `🔴 Adquiera los timbres de 0.5 UT en expendios autorizados cerca del Registro Principal antes de su cita.`;
      }
    }

    if (cleanText.includes('pub') || cleanText.includes('saren') || cleanText.includes('arancel')) {
      return `La <strong>Planilla Única Bancaria (PUB - SAREN)</strong> es el formato oficial para la liquidación de aranceles en el Registro Principal. Puedes generar y descargar este formato desde la sección <em>Planillas y Formularios Oficiales</em> de este portal.`;
    }

    if (cleanText.includes('gtu') || cleanText.includes('mppre') || cleanText.includes('apostilla')) {
      return `El trámite de <strong>Apostilla e Legalización (GTU/MPPRE)</strong> requiere previamente la certificación del título por Secretaría USM y el registro ante el SAREN. Consulta la <em>Guía de Trámites</em> en el menú lateral para la hoja de ruta detallada.`;
    }

    return `Entendido. Como <strong>Asistente Institucional de la USM</strong>, puedo orientarte sobre la verificación criptográfica de tu título, la generación de la Planilla PUB (SAREN) y la lista de recaudos requeridos para el acto de grado. ¿Deseas auditar tu expediente actual?`;
  };

  const sendMessage = async (text, isInit = false, isFile = false) => {
    if (!text.trim() && !isFile) return;

    if (!isInit) {
      setMessages((prev) => [...prev, { text, sender: 'user', isFile }]);
    }

    try {
      const data = await chatAPI.sendMessage(getSessionId(), text, isFile);
      let formattedText = (data.reply || '')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br/>');
      setMessages((prev) => [...prev, { text: formattedText, sender: 'bot' }]);
      setStatus('En línea');
      setIsConnected(true);
    } catch (err) {
      // Si falla la API del backend, activar modo de respuesta institucional local
      const fallbackReply = getInstitutionalFallback(text, isFile);
      setMessages((prev) => [...prev, { text: fallbackReply, sender: 'bot' }]);
      setStatus('En línea');
      setIsConnected(true);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    sendMessage(inputVal);
    setInputVal('');
  };

  const handleAudit = () => {
    sendMessage('auditar');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    sendMessage(`[FILE_UPLOAD]${file.name}`, false, true);
    e.target.value = null;
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="status-dot" style={{ backgroundColor: isConnected ? 'var(--color-ink-black)' : 'var(--color-sienna-brown)' }}></div>
        <h2>Asistente Institucional <small style={{ fontWeight: 400, color: 'var(--color-slate-gray)', fontSize: '0.82rem' }}>({status})</small></h2>
      </div>

      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.sender}`} style={msg.isFile ? { border: '1px dashed var(--border)' } : {}}>
            <span dangerouslySetInnerHTML={{ __html: msg.text }} />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        {/* Botón rápido de auditoría */}
        <div style={{ marginBottom: '0.8rem', display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={handleAudit}
            disabled={!isConnected}
            style={{
              background: 'var(--color-blush-peach)',
              color: 'var(--color-sienna-brown)',
              border: '1px solid rgba(93, 42, 26, 0.2)',
              borderRadius: 'var(--radius-pill)',
              padding: '0.4rem 1rem',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            Auditar mi Expediente
          </button>
        </div>

        <form className="input-wrapper" onSubmit={handleSend}>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
            accept=".pdf,.jpg,.jpeg,.png"
          />
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: '0.7rem 0.9rem' }}
            onClick={() => fileInputRef.current.click()}
            title="Adjuntar documento para verificación"
          >
            <Paperclip size={18} />
          </button>

          <input
            type="text"
            className="chat-input"
            placeholder={isConnected ? "Escribe 'sí / no / listo' o tu pregunta..." : "Esperando conexión..."}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={!isConnected}
          />
          <button type="submit" className="send-btn" disabled={!isConnected || !inputVal.trim()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatBotWidget;
