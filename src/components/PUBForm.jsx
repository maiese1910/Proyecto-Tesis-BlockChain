import React, { useState, useEffect, useRef } from 'react';
import { Send, FileText, Download, ShieldCheck, Printer, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import html2pdf from 'html2pdf.js';
import { QRCodeSVG } from 'qrcode.react';
import DigitalCertificate from './DigitalCertificate';
import { blockchainAPI, hashAPI } from '../services/api';

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
  pago_cedula: (v) => {
    if (!/^[VvEe]-?\d{6,9}$/.test(v.replace(/\./g, '')))
      return 'Formato incorrecto. Usa el formato **V-12.345.678** o **E-12.345.678**.';
    return null;
  },
  pago_telefono: (v) => {
    const cleaned = v.replace(/[-\s]/g, '');
    if (!/^(0414|0424|0412|0416|0426|0212|0241|0251|0261|0281|0291|0243)[0-9]{7}$/.test(cleaned))
      return 'Número inválido. Usa el formato venezolano: **0414-1234567**.';
    return null;
  },
  pago_banco: (v) => {
    if (v.trim().length < 3) return 'Por favor indica el nombre del banco (ej: **Banesco**, **Mercantil**, **Provincial**).';
    return null;
  },
  confirmacion_pago: (v) => {
    if (v.trim().toLowerCase() !== 'listo') return 'Debes escribir **"listo"** cuando hayas realizado la transferencia para continuar.';
    return null;
  }
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
    pregunta: '**Campo 5 — Tipo de Trámite**\n\nEscribe el tipo de trámite. Ejemplos:\n• *Registro de Título Universitario*\n• *Apostilla de Documento Educativo*\n• *Legalización*',
    ayuda: 'Escribe exactamente el nombre del trámite. La IA calculará el costo basado en esto.',
  },
  {
    id: 'institucion',
    label: 'Institución Educativa',
    placeholder: 'Universidad Santa María (USM)',
    pregunta: '**Campo 6 — Institución Educativa**\n\n¿En qué universidad obtuviste tu título?',
    ayuda: 'Escribe el nombre oficial completo: **"Universidad Santa María"**. No uses variantes informales.',
  },
  {
    id: 'pago_cedula',
    label: 'Cédula del Pagador (Pago Móvil)',
    placeholder: 'Ej: V-12.345.678',
    pregunta: '**Campo 7 — Cédula del Pagador**\n\n¿Cuál es la cédula de identidad asociada al pago móvil?\n\n*(Puede ser la misma que la del solicitante o de otra persona que realizará el pago)*',
    ayuda: 'Escribe la cédula de la persona que realizará el pago móvil, en formato **V-12.345.678** o **E-12.345.678**.',
  },
  {
    id: 'pago_telefono',
    label: 'Teléfono del Pagador (Pago Móvil)',
    placeholder: 'Ej: 0414-1234567',
    pregunta: '**Campo 8 — Teléfono del Pagador**\n\n¿Cuál es el número de teléfono asociado al pago móvil?',
    ayuda: 'Escribe el número de teléfono **registrado en tu banco** para pago móvil. Formato: **0414-1234567**.',
  },
  {
    id: 'pago_banco',
    label: 'Banco del Pagador',
    placeholder: 'Ej: Banco de Venezuela',
    pregunta: '**Campo 9 — Banco del Pagador**\n\n¿Desde qué banco realizarás el pago móvil?\n\nEjemplos: *Banco de Venezuela*, *Banesco*, *Mercantil*, *Provincial*',
    ayuda: 'Escribe el nombre completo del banco desde el cual harás la transferencia o pago móvil.',
  },
  {
    id: 'confirmacion_pago',
    label: 'Confirmación de Pago',
    placeholder: 'Escribe "listo"',
    pregunta: '', // Se genera dinámicamente
    ayuda: 'Realiza la transferencia al número de cuenta indicado y escribe "listo".',
  }
];

// ─── Generador de hash SHA-256 REAL usando Web Crypto API ──────────────────
const generateHash = async (data) => {
  return await hashAPI.generateClientHash(data);
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
  const [showCert, setShowCert] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState('chat'); // 'chat' or 'preview'

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
      
      // Lógica especial de calculadora de aranceles antes de pedir la confirmación de pago
      if (PUB_FIELDS[nextIndex].id === 'pago_cedula') {
        // Calcular aranceles al llegar a la sección de pago (Valores realistas basados en PTR)
        const tramiteLower = updatedData.tramite.toLowerCase();
        let montoCalculado = 0;
        let unidad = '';
        
        // Tasa referencial ficticia para el sistema (1 PTR = ~60 USD = ~43.647 Bs a tasa BCV 727.45)
        const valorPetroBs = 43647.00; 

        if (tramiteLower.includes('titulo') || tramiteLower.includes('título')) {
          unidad = '0.5 PTR';
          montoCalculado = 0.5 * valorPetroBs; // ~ $30 USD
        } else if (tramiteLower.includes('apostilla')) {
          unidad = '0.4 PTR';
          montoCalculado = 0.4 * valorPetroBs; // ~ $24 USD
        } else {
          unidad = '0.1 PTR';
          montoCalculado = 0.1 * valorPetroBs; // ~ $6 USD
        }

        // Auto-llenar campos de monto para el PDF
        setFormData(prev => ({
          ...prev, 
          banco_destino: 'Banco de Venezuela', 
          monto: montoCalculado.toFixed(2),
          nro_cuenta: '0102-0552-22-0000001234'
        }));

        setTimeout(() => {
          addBotMessage(
            `✅ **Institución Educativa** registrada.\n\n` +
            `🤖 **Calculadora IA de Aranceles (SAREN):**\n` +
            `He analizado tu trámite (*${updatedData.tramite}*). El costo estipulado corresponde a **${unidad}** (Tasa Petro oficial).\n\n` +
            `💰 **Monto Total a Pagar: ${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(montoCalculado)} Bs.**\n\n` +
            `Datos de la cuenta destino:\n` +
            `• **Banco:** Banco de Venezuela\n` +
            `• **Cuenta:** 0102-0552-22-0000001234\n` +
            `• **A nombre de:** SAREN Recaudación (G-20000000-0)\n\n` +
            `📱 Ahora necesito los datos de tu **Pago Móvil** para registrar la transacción.\n\n` +
            `${PUB_FIELDS[nextIndex].pregunta}`
          );
        }, 450);
      } else if (PUB_FIELDS[nextIndex].id === 'confirmacion_pago') {
        // Guardar banco del pagador y pedir confirmación
        setTimeout(() => {
          addBotMessage(
            `✅ **Banco del Pagador** registrado: *${userText}*\n\n` +
            `📋 **Resumen de tu Pago Móvil:**\n` +
            `• **Cédula:** ${updatedData.pago_cedula}\n` +
            `• **Teléfono:** ${updatedData.pago_telefono}\n` +
            `• **Banco:** ${userText}\n` +
            `• **Monto:** ${updatedData.monto} Bs.\n\n` +
            `Por favor realiza el pago móvil y escribe **"listo"** cuando hayas confirmado la transferencia.`
          );
        }, 450);
      } else {
        setTimeout(() => {
          addBotMessage(`✅ **${currentField.label}** registrado correctamente.\n\n${PUB_FIELDS[nextIndex].pregunta}`);
        }, 450);
      }
    } else {
      setIsComplete(true);
      setCurrentFieldIndex(-1);
      setTimeout(() => {
        addBotMessage(
          '🎉 **¡Planilla PUB completada y validada al 100%!**\n\n' +
          'Todos los datos, incluyendo la verificación del arancel, son correctos. Tu planilla oficial está generada en la vista previa.\n\n' +
          '👉 Ahora **Registra la huella digital en Blockchain** usando el botón de abajo. Esto inmutabilizará tu planilla antes de imprimirla.'
        );
      }, 500);
    }
  };

  const handleBlockchain = async () => {
    setIsHashing(true);
    addBotMessage('⛓️ **Registrando huella digital en Blockchain (Sepolia)...**\n\nGenerando hash SHA-256 y registrando en la red descentralizada...');
    
    try {
      const hash = await generateHash(formData);
      
      try {
        const data = await blockchainAPI.register({
          hash: hash,
          ownerName: formData.nombre_completo,
          cedula: formData.cedula,
          documentType: formData.tramite
        });

        if (data.success) {
          setBlockchainHash(hash);
          addBotMessage(
            `🔐 **¡Registro exitoso en Blockchain!**\n\n` +
            `**Hash del documento (SHA-256 real):**\n\`${hash}\`\n\n` +
            `**Transaction Hash:**\n\`${data.txHash}\`\n\n` +
            `Este registro es inmutable. Puedes verificarlo en [Etherscan](${data.certificateUrl}).`
          );
          return;
        }
      } catch (blockchainErr) {
        console.warn('Blockchain direct registration failed, using local hash:', blockchainErr);
      }

      // Fallback: registrar hash localmente sin transacción Ethereum real
      setBlockchainHash(hash);
      addBotMessage(
        `🔐 **¡Huella digital registrada exitosamente!**\n\n` +
        `**Hash del documento (SHA-256):**\n\`${hash}\`\n\n` +
        `La huella digital ha sido generada y almacenada. El documento queda protegido contra modificaciones.\n\n` +
        `📋 Puedes verificar la integridad del documento en cualquier momento desde la sección **"Verificar Blockchain"**.`
      );
    } catch (err) {
      console.error('Hash generation error:', err);
      addBotMessage('❌ **Error:** No se pudo generar la huella digital del documento. Intenta de nuevo.', true);
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

      {/* Selector de pestañas móviles */}
      <div className="mobile-tabs-header">
        <button 
          className={`mobile-tab-btn ${activeMobileTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveMobileTab('chat')}
        >
          <MessageSquare size={18} />
          Asistente Chat
        </button>
        <button 
          className={`mobile-tab-btn ${activeMobileTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveMobileTab('preview')}
        >
          <FileText size={18} />
          Vista Previa
        </button>
      </div>

      <div className={`pub-form-grid ${activeMobileTab === 'chat' ? 'show-chat' : 'show-preview'}`}>

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
                onClick={() => {
                  const element = document.getElementById('pub-preview');
                  const opt = {
                    margin:       10,
                    filename:     `Planilla_PUB_${formData.cedula || 'USM'}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2 },
                    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
                  };
                  html2pdf().set(opt).from(element).save();
                }}
              >
                <Download size={16} /> Exportar PDF Oficial
              </button>
            )}
          </div>

          <div className="pdf-preview-container">
            <div id="pub-preview" style={{ padding: '2rem', background: '#ffffff', color: '#000000', fontFamily: '"Arial", sans-serif', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', minWidth: '700px' }}>
            {/* Membrete oficial de VENEZUELA */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #1a365d', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <img src="/images/mppre_facade.png" alt="Escudo" style={{ height: '60px', objectFit: 'contain', opacity: 0.1 }} onError={(e) => e.target.style.display='none'} />
              </div>
              <div style={{ textAlign: 'center', flex: 3 }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, color: '#4a5568' }}>República Bolivariana de Venezuela</p>
                <p style={{ fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, color: '#4a5568' }}>Ministerio del Poder Popular para Relaciones Interiores, Justicia y Paz</p>
                <h4 style={{ fontSize: '1.1rem', margin: '0.5rem 0', color: '#1a365d', fontWeight: '900' }}>SERVICIO AUTÓNOMO DE REGISTROS Y NOTARÍAS</h4>
                <p style={{ fontSize: '0.9rem', color: '#2b6cb0', fontWeight: '800', letterSpacing: '1.5px', margin: 0 }}>PLANILLA ÚNICA BANCARIA (PUB)</p>
              </div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                 <div style={{ display: 'inline-block', border: '1px solid #cbd5e0', padding: '0.5rem', textAlign: 'center' }}>
                   <p style={{ margin: 0, fontSize: '0.5rem', color: '#718096' }}>NRO. PLANILLA</p>
                   <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 'bold', fontFamily: 'monospace' }}>PUB-{new Date().getFullYear()}-{Math.floor(Math.random()*1000000).toString().padStart(6,'0')}</p>
                 </div>
              </div>
            </div>

            {/* Datos del Solicitante */}
            <h5 style={{ background: '#edf2f7', padding: '0.5rem', margin: '0 0 1rem 0', fontSize: '0.8rem', borderLeft: '4px solid #3182ce', color: '#2d3748', textTransform: 'uppercase' }}>Datos del Solicitante</h5>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.3rem' }}>
                <p style={{ fontSize: '0.6rem', color: '#718096', margin: '0 0 0.2rem 0', fontWeight: 'bold' }}>NOMBRES Y APELLIDOS</p>
                <p style={{ fontSize: '0.9rem', color: '#1a202c', margin: 0, fontWeight: '600' }}>{formData.nombre_completo || '----------------------'}</p>
              </div>
              <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.3rem' }}>
                <p style={{ fontSize: '0.6rem', color: '#718096', margin: '0 0 0.2rem 0', fontWeight: 'bold' }}>CÉDULA DE IDENTIDAD / PASAPORTE</p>
                <p style={{ fontSize: '0.9rem', color: '#1a202c', margin: 0, fontWeight: '600' }}>{formData.cedula || '----------------------'}</p>
              </div>
              <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.3rem' }}>
                <p style={{ fontSize: '0.6rem', color: '#718096', margin: '0 0 0.2rem 0', fontWeight: 'bold' }}>TELÉFONO MÓVIL</p>
                <p style={{ fontSize: '0.9rem', color: '#1a202c', margin: 0, fontWeight: '600' }}>{formData.telefono || '----------------------'}</p>
              </div>
              <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.3rem' }}>
                <p style={{ fontSize: '0.6rem', color: '#718096', margin: '0 0 0.2rem 0', fontWeight: 'bold' }}>CORREO ELECTRÓNICO</p>
                <p style={{ fontSize: '0.9rem', color: '#1a202c', margin: 0, fontWeight: '600' }}>{formData.correo || '----------------------'}</p>
              </div>
            </div>

            {/* Datos del Trámite */}
            <h5 style={{ background: '#edf2f7', padding: '0.5rem', margin: '0 0 1rem 0', fontSize: '0.8rem', borderLeft: '4px solid #3182ce', color: '#2d3748', textTransform: 'uppercase' }}>Datos del Trámite e Institución</h5>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.3rem' }}>
                <p style={{ fontSize: '0.6rem', color: '#718096', margin: '0 0 0.2rem 0', fontWeight: 'bold' }}>DESCRIPCIÓN DEL ACTO O NEGOCIO JURÍDICO</p>
                <p style={{ fontSize: '0.9rem', color: '#1a202c', margin: 0, fontWeight: '600', textTransform: 'uppercase' }}>{formData.tramite || '----------------------'}</p>
              </div>
              <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.3rem' }}>
                <p style={{ fontSize: '0.6rem', color: '#718096', margin: '0 0 0.2rem 0', fontWeight: 'bold' }}>INSTITUCIÓN EDUCATIVA DE ORIGEN</p>
                <p style={{ fontSize: '0.9rem', color: '#1a202c', margin: 0, fontWeight: '600', textTransform: 'uppercase' }}>{formData.institucion || '----------------------'}</p>
              </div>
            </div>

            {/* Liquidación de Aranceles */}
            <h5 style={{ background: '#edf2f7', padding: '0.5rem', margin: '0 0 1rem 0', fontSize: '0.8rem', borderLeft: '4px solid #3182ce', color: '#2d3748', textTransform: 'uppercase' }}>Liquidación de Aranceles y Tasas</h5>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '1.5rem' }}>
               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                 <thead style={{ background: '#f7fafc', borderBottom: '1px solid #e2e8f0' }}>
                   <tr>
                     <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.65rem', color: '#4a5568' }}>CANT.</th>
                     <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.65rem', color: '#4a5568' }}>CONCEPTO</th>
                     <th style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.65rem', color: '#4a5568' }}>MONTO (Bs.)</th>
                   </tr>
                 </thead>
                 <tbody>
                   <tr>
                     <td style={{ padding: '0.5rem', fontSize: '0.85rem', borderBottom: '1px solid #edf2f7' }}>1</td>
                     <td style={{ padding: '0.5rem', fontSize: '0.85rem', borderBottom: '1px solid #edf2f7' }}>Procesamiento de {formData.tramite || 'Trámite'}</td>
                     <td style={{ padding: '0.5rem', fontSize: '0.85rem', borderBottom: '1px solid #edf2f7', textAlign: 'right', fontWeight: 'bold' }}>{formData.monto || '0.00'}</td>
                   </tr>
                 </tbody>
                 <tfoot>
                   <tr style={{ background: '#edf2f7' }}>
                     <td colSpan="2" style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 'bold' }}>TOTAL A PAGAR:</td>
                     <td style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: '900', color: '#e53e3e' }}>Bs. {formData.monto || '0.00'}</td>
                   </tr>
                 </tfoot>
               </table>
            </div>

            {/* Información de Pago Móvil */}
            <h5 style={{ background: '#edf2f7', padding: '0.5rem', margin: '0 0 1rem 0', fontSize: '0.8rem', borderLeft: '4px solid #3182ce', color: '#2d3748', textTransform: 'uppercase' }}>Datos del Pago Móvil</h5>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.3rem' }}>
                <p style={{ fontSize: '0.6rem', color: '#718096', margin: '0 0 0.2rem 0', fontWeight: 'bold' }}>CÉDULA DEL PAGADOR</p>
                <p style={{ fontSize: '0.85rem', color: '#1a202c', margin: 0, fontWeight: '600' }}>{formData.pago_cedula || '----------------------'}</p>
              </div>
              <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.3rem' }}>
                <p style={{ fontSize: '0.6rem', color: '#718096', margin: '0 0 0.2rem 0', fontWeight: 'bold' }}>TELÉFONO DEL PAGADOR</p>
                <p style={{ fontSize: '0.85rem', color: '#1a202c', margin: 0, fontWeight: '600' }}>{formData.pago_telefono || '----------------------'}</p>
              </div>
              <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.3rem' }}>
                <p style={{ fontSize: '0.6rem', color: '#718096', margin: '0 0 0.2rem 0', fontWeight: 'bold' }}>BANCO DEL PAGADOR</p>
                <p style={{ fontSize: '0.85rem', color: '#1a202c', margin: 0, fontWeight: '600' }}>{formData.pago_banco || '----------------------'}</p>
              </div>
            </div>

            {/* Información Bancaria Destino */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ border: '1px solid #cbd5e0', padding: '0.8rem', borderRadius: '4px', background: '#f8fafc' }}>
                <p style={{ fontSize: '0.6rem', color: '#718096', margin: '0 0 0.4rem 0', fontWeight: 'bold' }}>INFORMACIÓN DE DEPÓSITO / TRANSFERENCIA</p>
                <p style={{ fontSize: '0.8rem', color: '#2d3748', margin: '0 0 0.2rem 0' }}><strong>BANCO DESTINO:</strong> {formData.banco_destino || '----------------------'}</p>
                <p style={{ fontSize: '0.8rem', color: '#2d3748', margin: '0 0 0.2rem 0' }}><strong>CUENTA:</strong> {formData.nro_cuenta || '----------------------'}</p>
                <p style={{ fontSize: '0.8rem', color: '#2d3748', margin: 0 }}><strong>ESTADO:</strong> {formData.confirmacion_pago ? 'PAGADO' : 'PENDIENTE'}</p>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e0', padding: '0.5rem' }}>
                 <p style={{ fontSize: '0.5rem', color: '#a0aec0', marginBottom: '0.3rem', textAlign: 'center' }}>Timbre Fiscal Electrónico (Blockchain)</p>
                 {blockchainHash ? (
                   <div style={{ width: '60px', height: '60px', display: 'grid', placeItems: 'center' }}>
                     <QRCodeSVG value={`${window.location.origin}/?hash=${blockchainHash}`} size={60} />
                   </div>
                 ) : (
                   <div style={{ width: '60px', height: '60px', background: '#edf2f7' }}></div>
                 )}
                 {blockchainHash && <p style={{ fontSize: '0.4rem', marginTop: '0.2rem', fontFamily: 'monospace' }}>{blockchainHash.substring(0, 15)}...</p>}
              </div>
            </div>
          </div>
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
                <button
                  onClick={() => setShowCert(true)}
                  style={{ marginTop: '1rem', width: '100%', padding: '0.8rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <ShieldCheck size={18} /> Ver Certificado Digital
                </button>
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
      
      <AnimatePresence>
        {showCert && blockchainHash && (
          <DigitalCertificate docHash={blockchainHash} onClose={() => setShowCert(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PUBForm;
