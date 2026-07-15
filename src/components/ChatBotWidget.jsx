import React, { useState, useEffect, useRef } from 'react';
import { Paperclip, Send } from 'lucide-react';
import { chatAPI } from '../services/api';

const ChatBotWidget = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [status, setStatus] = useState('Conectando...');
  const [isConnected, setIsConnected] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getSessionId = () => {
    if (user?.cedula) return user.cedula;
    const stored = localStorage.getItem('usm_user');
    if (stored) {
      try { return JSON.parse(stored).cedula; } catch(_) {}
    }
    return 'default';
  };

  useEffect(() => {
    // Check connection and send /start
    sendMessage('/start', true);
  }, []);

  const sendMessage = async (text, isInit = false, isFile = false) => {
    if (!text.trim() && !isFile) return;

    if (!isInit) {
      setMessages((prev) => [...prev, { text, sender: 'user', isFile }]);
    }

    try {
      const data = await chatAPI.sendMessage(getSessionId(), text, isFile);
      let formattedText = data.reply
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
      setMessages((prev) => [...prev, { text: formattedText, sender: 'bot' }]);
      setStatus('En línea');
      setIsConnected(true);
    } catch(err) {
      if (isInit) {
        setStatus('Desconectado');
        setIsConnected(false);
      } else {
        setMessages((prev) => [...prev, { text: 'Error de conexión con el servidor...', sender: 'bot' }]);
      }
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
        <div className="status-dot" style={{ backgroundColor: isConnected ? '#22c55e' : '#ef4444' }}></div>
        <h2>Asistente Gubernamental IA <small style={{ fontWeight: 300, opacity: 0.7, fontSize: '0.8rem' }}>({status})</small></h2>
      </div>

      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.sender}`} style={msg.isFile ? { border: '1px dashed rgba(255,255,255,0.4)' } : {}}>
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
              background: 'rgba(14, 165, 233, 0.15)',
              color: 'var(--primary)',
              border: '1px solid rgba(14, 165, 233, 0.3)',
              borderRadius: '8px',
              padding: '0.4rem 1rem',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            🔎 Auditar mi Expediente
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
            className="send-btn"
            style={{ padding: '0 1rem', background: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}
            onClick={() => fileInputRef.current.click()}
            title="Adjuntar documento para verificación"
          >
            <Paperclip size={20} />
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
