import React, { useState, useEffect, useRef } from 'react';
import { Send, FileText, Download, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Validadores por campo ───────────────────────────────────────────────────
const validators = {
  nombre_completo: (v) => {
    const words = v.trim().split(/\s+/);
    if (words.length < 2) return 'Debes escribir al menos **nombre y apellido** completos.';
    if (/\d/.test(v)) return 'El nombre no debe contener números. Por favor corrígelo.';
    return null;
  },
  cedula: (v) => {
    if (!/^[VvEe]-?\d{6,9}$/.test(v.replace(/\./g, '')))
      return 'Formato incorrecto. Usa el formato **V-12.345.678** o **E-12.345.678**.';
    return null;
  },
  telefono: (v) => {
    const cleaned = v.replace(/[-\s]/g, '');
    if (!/^(0414|0424|0412|0416|0426|0212|0241|0251|0261|0281|0291|0243)[0-9]{7}$/.test(cleaned))
      return 'Número inválido. Usa el formato venezolano: **0414-1234567** o **0212-5551234**.';
    return null;
  },
  correo: (v) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
      return 'El correo electrónico no es válido. Ejemplo correcto: **juan.perez@gmail.com**.';
    return null;
  },
  tramite: (v) => {
    if (v.trim().length < 5) return 'El tipo de trámite es demasiado corto. Escribe el nombre completo.';
    return null;
  },
  institucion: (v) => {
    if (v.trim().length < 3) return 'Por favor escribe el nombre completo de la institución.';
    return null;
  },
  banco: (v) => {
    if (v.trim().length < 3) return 'Por favor indica el nombre del banco (ej: **Banco de Venezuela**).';
    return null;
  },
  monto: (v) => {
    if (!/^\d+([.,]\d{1,2})?$/.test(v.trim()))
      return 'Monto inválido. Escribe solo números con hasta 2 decimales. Ejemplo: **150.00**.';
    if (parseFloat(v.replace(',', '.')) <= 0)
      return 'El monto debe ser mayor a cero.';
    return null;
  },
};

// ─── Definición de campos de la PUB ─────────────────────────────────────────
const PUB_FIELDS = [
  {
    id: 'nombre_completo',
    label: 'Nombre Completo del Solicitante',
    placeholder: 'Ej: Juan Carlos Pérez García',
    pregunta: '¡Comencemos! 📝\n\n**Campo 1 — Nombre Completo**\n\n¿Cuál es tu nombre completo tal como aparece en tu cédula de identidad?',
    ayuda: 'Escribe **todos tus nombres y ambos apellidos**, exactamente como aparecen en tu cédula laminada. Ejemplo: *Juan Carlos Pérez García*. No uses abreviaciones ni apodos.',
  },
  {
    id: 'cedula',
    label: 'Cédula de Identidad',
    placeholder: 'Ej: V-12.345.678',
    pregunta: '**Campo 2 — Cédula de Identidad**\n\n¿Cuál es tu número de cédula? (Incluye el prefijo V- o E-)',
    ayuda: 'Usa el formato: **V-12.345.678** (venezolano) o **E-12.345.678** (extranjero). El formato incorrecto causa rechazo inmediato en el SAREN.',
  },
  {
    id: 'telefono',
    label: 'Teléfono de Contacto',
    placeholder: 'Ej: 0414-1234567',
    pregunta: '**Campo 3 — Teléfono de Contacto**\n\n¿Cuál es tu número de teléfono venezolano activo?',
    ayuda: 'Escribe tu número con la operadora incluida: **0414-1234567**, **0212-5551234**, etc. El SAREN lo usa para notificaciones del trámite.',
  },
  {
    id: 'correo',
    label: 'Correo Electrónico',
    placeholder: 'Ej: juan.perez@gmail.com',
    pregunta: '**Campo 4 — Correo Electrónico**\n\n¿Cuál es tu correo electrónico activo?',
    ayuda: 'Usa un correo que revises con frecuencia. El SAREN envía confirmaciones y estados del trámite a este correo.',
  },
  {
    id: 'tramite',
    label: 'Tipo de Trámite',
    placeholder: 'Registro de Título Universitario',
    pregunta: '**Campo 5 — Tipo de Trámite**\n\nEscribe el tipo de trámite. Para egresados USM suele ser:\n• *Registro de Título Universitario*\n• *Apostilla de Documento Educativo*',
    ayuda: 'Escribe exactamente **"Registro de Título Universitario"**. No uses abreviaciones; el funcionario puede rechazarlo.',
  },
  {
    id: 'institucion',
    label: 'Institución Educativa',
    placeholder: 'Universidad Santa María (USM)',
    pregunta: '**Campo 6 — Institución Educativa**\n\n¿En qué universidad obtuviste tu título?',
    ayuda: 'Escribe el nombre oficial completo: **"Universidad Santa María"**. No uses variantes informales.',
  },
  {
    id: 'banco',
    label: 'Banco Receptor del Pago',
    placeholder: 'Ej: Banco de Venezuela',
    pregunta: '**Campo 7 — Banco Receptor**\n\n¿En qué banco realizaste el pago del arancel del SAREN?\n*(Ej: Banco de Venezuela, Banesco, BNC)*',
    ayuda: 'Indica el banco donde hiciste el pago del arancel, no tu banco personal. Verifica en la sede del Registro cuál aceptan actualmente.',
  },
  {
    id: 'monto',
    label: 'Monto Pagado (Bs.)',
    placeholder: 'Ej: 150.00',
    pregunta: '**Campo 8 — Monto del Arancel (último campo)**\n\n¿Cuál fue el monto exacto pagado en el banco? (en Bs.)',
    ayuda: 'Usa el monto exacto del comprobante bancario incluyendo los céntimos. Ejemplo: **150.00**. Cualquier diferencia causará rechazo.',
  },
];

// ─── Generador de hash simulado (SHA256-like display) ────────────────────────
const generateHash = (data) => {
  const str = JSON.stringify(data) + Date.now();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `0x${hex}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 18)}`.toUpperCase();
};

const PUBForm = () => {
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [formData, setFormData] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [currentFieldIndex, setCurrentFieldIndex] = useState(-1);
  const [isComplete, setIsComplete] = useState(false);
  const [blockchainHash, setBlockchainHash] = useState(null);
  const [isHashing, setIsHashing] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addBotMessage = (text, isError = false) => {
    setMessages(prev => [...prev, { text, sender: 'bot', isError }]);
  };
  const addUserMessage = (text) => {
    setMessages(prev => [...prev, { text, sender: 'user' }]);
  };

  const handleStart = () => {
    setCurrentFieldIndex(0);
    setFormData({});
    setFieldErrors({});
    setIsComplete(false);
    setBlockchainHash(null);
    setMessages([]);
    setTimeout(() => {
      addBotMessage(
        '🏛️ **Asistente de Llenado — Planilla Única Bancaria (PUB)**\n\n' +
        'Te guiaré campo por campo. Cada respuesta será **validada en tiempo real**.\n' +
        '• Si algo está mal, te lo diré y podrás corregirlo al instante.\n' +
        '• Escribe **"ayuda"** si tienes dudas sobre cualquier campo.\n\n' +
        PUB_FIELDS[0].pregunta
      );
    }, 300);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputVal.trim() || currentFieldIndex < 0) return;

    const userText = inputVal.trim();
    addUserMessage(userText);
    setInputVal('');

    if (isComplete) return;

    const currentField = PUB_FIELDS[currentFieldIndex];

    // Comando ayuda
    if (['ayuda', 'help', '?'].includes(userText.toLowerCase())) {
      setTimeout(() => {
        addBotMessage(`💡 **Ayuda — ${currentField.label}**\n\n${currentField.ayuda}\n\nCuando estés listo, escribe el valor correcto.`);
      }, 300);
      return;
    }

    // ── Validación ─────────────────────────────────────────────────────────
    const validate = validators[currentField.id];
    const error = validate ? validate(userText) : null;

    if (error) {
      setFieldErrors(prev => ({ ...prev, [currentField.id]: userText }));
      setTimeout(() => {
        addBotMessage(
          `⚠️ **¡Oye! El campo "${currentField.label}" tiene información inválida.**\n\n` +
          `${error}\n\n` +
          `Por favor corrígelo antes de continuar. Escribe **"ayuda"** si necesitas orientación.`,
          true
        );
      }, 350);
      return;
    }

    // Campo aprobado — limpiar error previo y guardar
    setFieldErrors(prev => { const n = { ...prev }; delete n[currentField.id]; return n; });
    const updatedData = { ...formData, [currentField.id]: userText };
    setFormData(updatedData);

    const nextIndex = currentFieldIndex + 1;

    if (nextIndex < PUB_FIELDS.length) {
      setCurrentFieldIndex(nextIndex);
      setTimeout(() => {
        addBotMessage(`✅ **${currentField.label}** registrado correctamente.\n\n${PUB_FIELDS[nextIndex].pregunta}`);
      }, 450);
    } else {
      setIsComplete(true);
      setCurrentFieldIndex(-1);
      setTimeout(() => {
        addBotMessage(
          '🎉 **¡Planilla PUB completada y validada al 100%!**\n\n' +
          'Todos los campos son correctos. Tu documento está limpio y listo.\n\n' +
          '👉 Ahora puedes **registrar la huella digital (hash) en Blockchain** usando el botón que aparece a la derecha. Esto le dará autenticidad inmutable a tu planilla antes de imprimirla.'
        );
      }, 500);
    }
  };

  const handleBlockchain = async () => {
    setIsHashing(true);
    addBotMessage('⛓️ **Registrando huella digital en Blockchain (Sepolia)...**\n\nPor favor confirma la transacción en tu dispositivo si es necesario.');
    
    try {
      const hash = generateHash(formData);
      const response = await fetch('http://localhost:8000/blockchain/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hash: hash,
          ownerName: formData.nombre_completo,
          cedula: formData.cedula,
          documentType: formData.tramite
        })
      });

      const data = await response.json();

      if (data.success) {
        setBlockchainHash(hash);
        addBotMessage(
          `🔐 **¡Registro exitoso en Blockchain!**\n\n` +
          `**Hash del documento:**\n\`${hash}\`\n\n` +
          `**Transaction Hash:**\n\`${data.txHash}\`\n\n` +
          `Este registro es inmutable. Puedes verificarlo en [Etherscan](${data.certificateUrl}).`
        );
      } else {
        addBotMessage(`❌ **Error en el registro:** ${data.error || 'No se pudo completar la transacción.'}`, true);
      }
    } catch (err) {
      console.error(err);
      addBotMessage('❌ **Error de conexión:** No se pudo contactar con el servidor de Blockchain.', true);
    } finally {
      setIsHashing(false);
    }
  };

  const handleAyudaRapida = () => {
    if (currentFieldIndex < 0 || currentFieldIndex >= PUB_FIELDS.length) return;
    const field = PUB_FIELDS[currentFieldIndex];
    addUserMessage('ayuda');
    setTimeout(() => {
      addBotMessage(`💡 **Ayuda — ${field.label}**\n\n${field.ayuda}\n\nCuando estés listo, escribe el valor correcto.`);
    }, 300);
  };

  const progress = currentFieldIndex >= 0
    ? Math.round((currentFieldIndex / PUB_FIELDS.length) * 100)
    : isComplete ? 100 : 0;

  return (
    <div className="view-container">
      <div className="dashboard-header">
        <h2>Asistente de Llenado PUB</h2>
        <p>La IA valida cada campo en tiempo real. Si cometes un error, te lo indica al instante sin perder el progreso. Al terminar, registra la huella digital en Blockchain.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flex: 1, minHeight: 0 }}>

        {/* ── Chatbot Guiador ──────────────────────────────────────────── */}
        <div className="chat-container" style={{ minHeight: '520px' }}>
          <div className="chat-header">
            <div className="status-dot" style={{ backgroundColor: currentFieldIndex >= 0 ? '#22c55e' : isComplete ? '#a78bfa' : '#f59e0b' }} />
            <h2 style={{ fontSize: '1rem' }}>
              Asistente PUB
              {currentFieldIndex >= 0 && (
                <small style={{ marginLeft: '0.8rem', opacity: 0.6, fontSize: '0.8rem' }}>
                  Campo {currentFieldIndex + 1} de {PUB_FIELDS.length}
                </small>
              )}
              {isComplete && <small style={{ marginLeft: '0.8rem', color: 'var(--success)', fontSize: '0.8rem' }}>Completado ✓</small>}
            </h2>
          </div>

          {/* Barra de progreso */}
          {(currentFieldIndex >= 0 || isComplete) && (
            <div style={{ padding: '0 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px', height: '4px', margin: '0.8rem 0' }}>
                <motion.div
                  style={{ background: isComplete ? 'var(--success)' : 'var(--primary)', height: '100%', borderRadius: '4px' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}

          <div className="chat-messages">
            {messages.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <FileText size={48} opacity={0.3} />
                <div>
                  <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Planilla PUB — SAREN</h3>
                  <p>Validación campo a campo con IA.<br />Escribe <strong style={{ color: 'var(--primary)' }}>"ayuda"</strong> si tienes dudas en cualquier momento.</p>
                </div>
                <button className="send-btn" style={{ padding: '0.8rem 2rem' }} onClick={handleStart}>
                  🚀 Comenzar a llenar la planilla
                </button>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`message ${msg.sender}`}
                style={msg.isError ? { borderLeft: '3px solid var(--danger)', background: 'rgba(239,68,68,0.08)' } : {}}
              >
                <span dangerouslySetInnerHTML={{
                  __html: msg.text
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:0.1rem 0.4rem;border-radius:4px;font-family:monospace;font-size:0.8rem;word-break:break-all">$1</code>')
                    .replace(/\n/g, '<br/>')
                }} />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            {currentFieldIndex >= 0 && (
              <div style={{ marginBottom: '0.8rem', display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleAyudaRapida}
                  style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}
                >
                  💡 ¿Qué va aquí?
                </button>
              </div>
            )}
            {isComplete && !blockchainHash && (
              <button
                className="send-btn"
                style={{ width: '100%', padding: '0.9rem', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', background: 'linear-gradient(to right, #7c3aed, #4f46e5)', fontSize: '0.95rem' }}
                onClick={handleBlockchain}
                disabled={isHashing}
              >
                <ShieldCheck size={20} />
                {isHashing ? 'Generando hash...' : '⛓️ Registrar Huella en Blockchain'}
              </button>
            )}
            <form className="input-wrapper" onSubmit={handleSend}>
              <input
                type="text"
                className="chat-input"
                placeholder={currentFieldIndex >= 0 ? `"${PUB_FIELDS[currentFieldIndex]?.label}"...` : isComplete ? 'Planilla completada' : 'Presiona "Comenzar" para iniciar...'}
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                disabled={currentFieldIndex < 0}
              />
              <button type="submit" className="send-btn" disabled={currentFieldIndex < 0 || !inputVal.trim()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>

        {/* ── Vista Previa del Formulario PUB ──────────────────────────── */}
        <motion.div
          className="glass-panel"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', flexDirection: 'column', overflow: 'auto' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <FileText size={20} color="var(--primary)" />
              Vista Previa — Planilla PUB
            </h3>
            {isComplete && (
              <button
                className="send-btn"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                onClick={() => window.print()}
              >
                <Download size={16} /> Imprimir
              </button>
            )}
          </div>

          {/* Membrete oficial */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>República Bolivariana de Venezuela</p>
            <h4 style={{ fontSize: '1rem', margin: '0.3rem 0' }}>Servicio Autónomo de Registros y Notarías</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '700', letterSpacing: '1px' }}>PLANILLA ÚNICA BANCARIA (PUB)</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', flex: 1 }}>
            {PUB_FIELDS.map((field, i) => {
              const value = formData[field.id];
              const isCurrent = i === currentFieldIndex;
              const hasError = fieldErrors[field.id];
              const isFilled = !!value;

              return (
                <motion.div
                  key={field.id}
                  animate={{
                    borderColor: hasError ? 'rgba(239,68,68,0.6)' : isCurrent ? 'rgba(14, 165, 233, 0.6)' : isFilled ? 'rgba(16, 185, 129, 0.4)' : 'var(--border)',
                    background: hasError ? 'rgba(239,68,68,0.05)' : isCurrent ? 'rgba(14, 165, 233, 0.05)' : isFilled ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.02)',
                  }}
                  transition={{ duration: 0.3 }}
                  style={{ border: '1px solid', borderRadius: '10px', padding: '0.7rem 1rem' }}
                >
                  <p style={{ fontSize: '0.7rem', color: isCurrent ? 'var(--primary)' : 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {field.label}
                  </p>
                  <AnimatePresence mode="wait">
                    {isFilled ? (
                      <motion.p key="filled" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                        {value}
                      </motion.p>
                    ) : (
                      <p key="empty" style={{ color: isCurrent ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.85rem', opacity: 0.5 }}>
                        {isCurrent ? '✍️ Escribiendo...' : field.placeholder}
                      </p>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Hash Blockchain */}
          <AnimatePresence>
            {blockchainHash && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: '1.5rem', padding: '1.2rem', background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(79,70,229,0.1))', border: '1px solid rgba(124,58,237,0.4)', borderRadius: '12px' }}
              >
                <p style={{ color: '#a78bfa', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={18} /> Huella Digital Blockchain Registrada
                </p>
                <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all', lineHeight: '1.6' }}>
                  {blockchainHash}
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Cualquier modificación al documento invalidará este hash.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {isComplete && !blockchainHash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', textAlign: 'center' }}
            >
              <p style={{ color: 'var(--success)', fontWeight: '700' }}>✅ Planilla 100% Válida — Lista para Blockchain</p>
            </motion.div>
          )}
        </motion.div>

      </div>
    </div>
  );
};

export default PUBForm;
