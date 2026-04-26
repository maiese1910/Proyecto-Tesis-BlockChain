import React, { useState, useEffect, useRef } from 'react';
import { Paperclip, Send } from 'lucide-react';

const ChatBotWidget = () => {
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [status, setStatus] = useState('Conectando...');
  const [isConnected, setIsConnected] = useState(false);
  
  const ws = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:8000/ws/chat');

    ws.current.onopen = () => {
      setStatus('En línea');
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      let formattedText = event.data
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
        
      setMessages((prev) => [...prev, { text: formattedText, sender: 'bot' }]);
    };

    ws.current.onclose = () => {
      setStatus('Desconectado');
      setIsConnected(false);
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputVal.trim() || !isConnected) return;

    setMessages((prev) => [...prev, { text: inputVal, sender: 'user' }]);
    ws.current.send(inputVal);
    setInputVal('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !isConnected) return;

    const fileMsg = `📎 Documento adjunto: ${file.name}`;
    setMessages((prev) => [...prev, { text: fileMsg, sender: 'user', isFile: true }]);
    
    // Enviamos una etiqueta especial al backend para que sepa que es un archivo
    ws.current.send(`[FILE_UPLOAD]${file.name}`);
    
    // Resetear el input
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
            onClick={() => {
              if (!isConnected) return;
              const msg = "auditar";
              setMessages(prev => [...prev, { text: msg, sender: 'user' }]);
              ws.current.send(msg);
            }}
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
