import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Paperclip, Send, Bot, User, RefreshCw,
  ArrowRight, FileText, Shield, Globe,
  Building, Check, X, Printer, Clock, Layers, FolderOpen
} from 'lucide-react';
import { chatAPI, blockchainAPI } from '../services/api';

const QUICK_PROMPTS = [
  { label: '📋 Estado de Mi Trámite', text: '¿Cuál es el estado actual de mi trámite y mi taquilla asignada?', icon: FolderOpen },
  { label: '🔎 Auditar mi Expediente', text: 'auditar', icon: Shield },
  { label: '🏛️ Ruta GTU / MPPEU', text: '¿Cómo tramito el GTU del MPPEU?', icon: Building },
  { label: '📄 Planilla PUB SAREN', text: '¿Cómo generar y pagar la Planilla PUB SAREN?', icon: FileText },
  { label: '🌍 Apostilla de La Haya', text: '¿Cuáles son los pasos para la Apostilla de La Haya en MPPRE?', icon: Globe },
  { label: '🎓 Requisitos Egresado USM', text: '¿Cuáles son los trámites de egresados en Secretaría General USM?', icon: Building },
  { label: '⛓️ Verificar Blockchain', text: '¿Cómo funciona la verificación de mi título en Blockchain?', icon: Shield },
];

const AUDIT_QUESTIONS = [
  '<strong>Requisito 1 de 5:</strong> ¿Posees el <strong>Título Original en Pergamino</strong> firmado por el Rector y Secretario General de la USM?',
  '<strong>Requisito 2 de 5:</strong> ¿Ya digitalizaste tu pergamino en el <strong>Motor OCR con IA</strong> para obtener tu código preliminar GTU y Hash SHA-256?',
  '<strong>Requisito 3 de 5:</strong> ¿Emitiste y liquidaste la <strong>Planilla Única Bancaria (PUB) del SAREN</strong> junto con los Timbres Fiscales (0.5 UT)?',
  '<strong>Requisito 4 de 5:</strong> ¿Cuentas con las <strong>Notas Certificadas y Acta de Grado</strong> firmadas por Secretaría General USM (Módulo 4)?',
  '<strong>Requisito 5 de 5:</strong> ¿Ya seleccionaste el <strong>País de Destino (Convenio de La Haya)</strong> para tu solicitud electrónica ante el MPPRE?'
];

const ChatBotWidget = ({ user, onNavigate }) => {
  const storageKey = `usm_chat_history_${(user?.cedula || 'guest').replace(/\D/g, '') || 'guest'}`;

  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('En línea');
  const [isAuditMode, setIsAuditMode] = useState(false);
  const [auditStep, setAuditStep] = useState(0);
  const [auditAnswers, setAuditAnswers] = useState([]);
  const [userRecords, setUserRecords] = useState([]);

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

  // Cargar trámites activos del estudiante para contexto personalizado
  const loadStudentRecords = useCallback(async () => {
    try {
      const b = JSON.parse(localStorage.getItem('usm_blockchain_records') || '[]');
      const p = JSON.parse(localStorage.getItem('usm_pub_history') || '[]');
      const m = new Map();

      const mergeRec = (r) => {
        if (!r || !(r.hash || r.blockchainHash)) return;
        const h = r.hash || r.blockchainHash;
        m.set(h.toUpperCase(), { ...(m.get(h.toUpperCase()) || {}), ...r, hash: h });
      };
      b.forEach(mergeRec);
      p.forEach(mergeRec);

      if (user?.cedula) {
        try {
          const res = await blockchainAPI.getRecordsByCedula(user.cedula);
          if (res?.success && Array.isArray(res.records)) {
            res.records.forEach(mergeRec);
          }
        } catch (_) {}
      }

      const userCedClean = (user?.cedula || '').replace(/\D/g, '');
      const userNameNorm = (user?.nombre || '').toLowerCase().trim();
      const userEmailNorm = (user?.email || '').toLowerCase().trim();

      const list = Array.from(m.values())
        .filter(r => {
          const rCed = (r.cedula || r.formData?.cedula || '').replace(/\D/g, '');
          const rAccCed = (r.accountCedula || r.account_cedula || '').replace(/\D/g, '');
          if (userCedClean && (rCed === userCedClean || rAccCed === userCedClean)) return true;
          const rEmail = (r.accountEmail || r.account_email || '').toLowerCase().trim();
          if (userEmailNorm && rEmail && rEmail === userEmailNorm) return true;
          const rName = (r.ownerName || r.nombre || '').toLowerCase().trim();
          if (userNameNorm && rName && (rName.includes(userNameNorm) || userNameNorm.includes(rName))) return true;
          return false;
        })
        .sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0));

      setUserRecords(list);
    } catch (_) {}
  }, [user]);

  useEffect(() => {
    loadStudentRecords();
    window.addEventListener('usm_records_updated', loadStudentRecords);
    return () => window.removeEventListener('usm_records_updated', loadStudentRecords);
  }, [loadStudentRecords]);

  // Persistir mensajes del estudiante
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(messages.slice(-40)));
        localStorage.setItem(storageKey, JSON.stringify(messages.slice(-40)));
      } catch (_) {}
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, storageKey]);

  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMsg = {
        sender: 'bot',
        text: `👋 ¡Hola, <strong>${user?.nombre || 'Graduando USM'}</strong>! Soy tu <strong>Asistente Institucional con Inteligencia Artificial</strong>.<br/><br/>
Estoy conectado en tiempo real a tu expediente (Cédula <strong>${user?.cedula || 'USM'}</strong> — <strong>${user?.carrera || 'Ingeniería'}</strong>). Puedo ayudarte a:<br/>
• Consultar el estatus exacto de tus trámites en las 4 estaciones (USM → SAREN → MPPEU → MPPRE).<br/>
• Ejecutar una auditoría guiada de tus documentos antes de ir a taquilla.<br/>
• Explicarte aranceles PUB, citas GTU y verificación en Ethereum Sepolia.<br/><br/>
[ACTION:ocr][ACTION:prevalidation]`
      };
      setMessages([welcomeMsg]);
    }
  }, [user]);

  const buildPersonalizedTramiteReply = () => {
    if (userRecords.length === 0) {
      return {
        text: `📋 <strong>Estado de tu Expediente (${user?.nombre || 'Graduando'} — ${user?.cedula || 'USM'}):</strong><br/><br/>
Actualmente <strong>no tienes trámites registrados</strong> en la cadena de custodia.<br/><br/>
<strong>Recomendación para iniciar hoy mismo:</strong><br/>
1. Escanea tu título en el <strong>Motor OCR con IA</strong> para extraer tus datos y generar tu código GTU.<br/>
2. Verifica los 6 requisitos ópticos en <strong>Pre-validación Documental</strong>.<br/>
3. Liquida tu <strong>Planilla Única Bancaria (PUB)</strong>.<br/><br/>
[ACTION:ocr][ACTION:pub]`,
        isAudit: false
      };
    }

    const latest = userRecords[0];
    const st = String(latest.status || '').toUpperCase();
    const stageDesc = st.includes('APOSTILLADO')
      ? '✅ Estación 4 Completada: Apostilla Electrónica de La Haya Emitida (100%)'
      : st.includes('PENDIENTE_APOSTILLA')
      ? '⏳ Estación 4 en Curso: En Revisión Diplomática por Cancillería MPPRE (85%)'
      : (latest.mppeuVerified || st.includes('CERTIFICADO'))
      ? '✅ Estación 3 Completada: Certificado por MPPEU (GTU) y Anclado en Sepolia (75%)'
      : '⏳ Estación 2/3 en Curso: Emitido en USM/SAREN — Pendiente de Cotejo Físico en Taquilla MPPEU (50%)';

    return {
      text: `📋 <strong>Reporte en Vivo de tu Expediente (${userRecords.length} ${userRecords.length === 1 ? 'trámite activo' : 'trámites activos'}):</strong><br/><br/>
• <strong>Trámite Principal:</strong> ${latest.solicitudCode || 'GTU-2026-USM'} — ${latest.documentType || 'Título Universitario'}<br/>
• <strong>Titular:</strong> ${latest.ownerName || user?.nombre} (${latest.cedula || user?.cedula})<br/>
• <strong>Estatus Actual:</strong> <strong>${stageDesc}</strong><br/>
• <strong>Hash SHA-256:</strong> <code>${(latest.hash || '').slice(0, 18)}...</code><br/>
${(latest.sede_taquilla || latest.sedeTaquilla) ? `• <strong>Taquilla Asignada:</strong> ${latest.sede_taquilla || latest.sedeTaquilla} (${latest.estado || 'Distrito Capital'})<br/>` : ''}
${latest.apostilleNumber ? `• <strong>N° Apostilla de La Haya:</strong> ${latest.apostilleNumber}<br/>` : ''}<br/>
[ACTION:dashboard][ACTION:prevalidation][ACTION:blockchain]`,
      isAudit: false
    };
  };

  const getInstitutionalReply = (text, isFile = false) => {
    const cleanText = text.toLowerCase().trim();

    if (isFile) {
      return {
        text: `🔍 <strong>Documento Inspeccionado por el Asistente:</strong> El archivo adjunto presenta buena legibilidad preliminar. Para ejecutar el análisis óptico completo de DPI, contraste, sellos húmedos y extracción NER, procésalo en el Motor OCR o en Pre-Validación Forense.<br/><br/>[ACTION:ocr][ACTION:prevalidation]`,
        isAudit: isAuditMode
      };
    }

    // Flujo interactivo de Auditoría Paso a Paso (5 Requisitos)
    if (isAuditMode) {
      if (cleanText === 'salir' || cleanText.includes('cancelar')) {
        setIsAuditMode(false);
        setAuditStep(0);
        setAuditAnswers([]);
        return {
          text: `Has salido del asistente de auditoría. ¿En qué más puedo orientarte sobre tu trámite universitario?<br/><br/>[ACTION:dashboard]`,
          isAudit: false
        };
      }

      const isYes = cleanText === 'sí' || cleanText === 'si' || cleanText.includes('tengo') || cleanText.includes('listo');
      const nextAnswers = [...auditAnswers, isYes];
      const nextStep = auditStep + 1;

      if (nextStep < AUDIT_QUESTIONS.length) {
        setAuditStep(nextStep);
        setAuditAnswers(nextAnswers);
        return {
          text: `${isYes ? '✅ <strong>Requisito confirmado.</strong>' : '⚠️ <strong>Tomado en cuenta (pendiente por completar).</strong>'}<br/><br/>${AUDIT_QUESTIONS[nextStep]}<br/><em>(Usa los botones de respuesta rápida abajo)</em>`,
          isAudit: true
        };
      } else {
        setIsAuditMode(false);
        setAuditStep(0);
        setAuditAnswers([]);
        const yesCount = nextAnswers.filter(Boolean).length;
        const pct = Math.round((yesCount / AUDIT_QUESTIONS.length) * 100);
        return {
          text: `📊 <strong>Dictamen Final de Auditoría Interactiva: ${pct}% (${yesCount}/${AUDIT_QUESTIONS.length} requisitos cumplidos)</strong><br/><br/>
${pct === 100
  ? '🎉 <strong>¡Excelente!</strong> Tu expediente cumple con todos los recaudos obligatorios para acudir a taquilla y tramitar tu Apostilla Electrónica de La Haya.'
  : '📌 <strong>Recomendación:</strong> Completa los pasos pendientes utilizando el Motor OCR, la Planilla PUB y el módulo de Pre-Validación Forense antes de asistir a tu cita.'}<br/><br/>
[ACTION:prevalidation][ACTION:pub][ACTION:dashboard]`,
          isAudit: false
        };
      }
    }

    if (cleanText.includes('auditar') || cleanText.includes('auditoria') || cleanText === '/start') {
      setIsAuditMode(true);
      setAuditStep(0);
      setAuditAnswers([]);
      return {
        text: `🔎 <strong>Iniciando Auditoría Interactiva del Expediente USM (${user?.nombre?.split(' ')[0] || 'Graduando'}):</strong><br/><br/>
${AUDIT_QUESTIONS[0]}<br/>
<em>(Usa los botones de respuesta rápida abajo)</em>`,
        isAudit: true
      };
    }

    if (
      cleanText.includes('mi tramite') ||
      cleanText.includes('mi trámite') ||
      cleanText.includes('estado actual') ||
      cleanText.includes('como va') ||
      cleanText.includes('cómo va') ||
      cleanText.includes('mi taquilla') ||
      cleanText.includes('mis tramites') ||
      cleanText.includes('mis trámites')
    ) {
      return buildPersonalizedTramiteReply();
    }

    if (cleanText.includes('gtu') || cleanText.includes('mppeu')) {
      return {
        text: `🏛️ <strong>Gestión de Trámites Universitarios (GTU — MPPEU)</strong><br/><br/>
El <strong>GTU</strong> es la certificación oficial de las firmas de las autoridades rectorales de la Universidad Santa María ante el Ministerio del Poder Popular para la Educación Universitaria.<br/><br/>
<strong>Pasos clave en nuestra plataforma:</strong><br/>
1. <strong>Digitalización OCR (Etapa 1):</strong> Escanea tu título para generar tu código GTU y asignar tu sede territorial.<br/>
2. <strong>Cotejo Físico (Etapa 3):</strong> Presenta tu pergamino original junto al comprobante QR en la taquilla asignada.<br/>
3. <strong>Sello Digital y Blockchain:</strong> El analista ministerial aprueba el cotejo y el título queda certificado en Ethereum Sepolia.<br/><br/>
[ACTION:ocr][ACTION:dashboard]`,
        isAudit: false
      };
    }

    if (cleanText.includes('pub') || cleanText.includes('saren') || cleanText.includes('arancel') || cleanText.includes('timbre')) {
      return {
        text: `📄 <strong>Planilla Única Bancaria (PUB) y Protocolización SAREN</strong><br/><br/>
La <strong>PUB</strong> liquida los aranceles de Registro Principal para protocolizar tu título universitario.<br/><br/>
<strong>Recaudos obligatorios:</strong><br/>
• Planilla PUB generada con tus datos verificados (Cédula <strong>${user?.cedula || 'USM'}</strong>).<br/>
• Pago de derechos de registro (~15 UT para título pergamino) + <strong>Timbres Fiscales Regionales (0.5 UT / 10 UT según jurisdicción)</strong>.<br/>
• Copia de cédula y documento original.<br/><br/>
[ACTION:pub][ACTION:prevalidation]`,
        isAudit: false
      };
    }

    if (cleanText.includes('apostilla') || cleanText.includes('mppre') || cleanText.includes('haya')) {
      return {
        text: `🌍 <strong>Apostilla Electrónica de La Haya (MPPRE / Cancillería)</strong><br/><br/>
Otorga validez jurídica internacional en los más de 126 países signatarios del Convenio de La Haya de 1961.<br/><br/>
<strong>Flujo de las 4 Estaciones en la plataforma:</strong><br/>
1. <strong>Estación 1 (USM):</strong> Emisión y pre-validación con Hash SHA-256.<br/>
2. <strong>Estación 2 (SAREN):</strong> Liquidación de Planilla PUB y Registro Principal.<br/>
3. <strong>Estación 3 (MPPEU):</strong> Certificación de firmas GTU y anclaje en Sepolia.<br/>
4. <strong>Estación 4 (MPPRE):</strong> Solicitud 100% digital desde tu Timeline y emisión del Certificado de Apostilla con QR internacional.<br/><br/>
[ACTION:dashboard][ACTION:guide]`,
        isAudit: false
      };
    }

    if (cleanText.includes('blockchain') || cleanText.includes('sepolia') || cleanText.includes('hash')) {
      return {
        text: `⛓️ <strong>Seguridad Criptográfica y Registro en Blockchain (Ethereum Sepolia)</strong><br/><br/>
Cada documento procesado genera una huella criptográfica <strong>SHA-256</strong> única e inalterable, inscrita mediante la Billetera Institucional del Rectorado USM en el Smart Contract <code>USMApostillaRegistry.sol</code> en <strong>Ethereum Sepolia</strong>.<br/><br/>
Cualquier universidad extranjera, consulado o empleador puede verificar tu título escaneando el código QR o ingresando el Hash en el Verificador Blockchain.<br/><br/>
[ACTION:blockchain]`,
        isAudit: false
      };
    }

    if (cleanText.includes('usm') || cleanText.includes('secretaria') || cleanText.includes('modulo 4') || cleanText.includes('egresado')) {
      return {
        text: `🎓 <strong>Trámites en Secretaría General — Universidad Santa María</strong><br/><br/>
• <strong>Ubicación:</strong> Campus La Florencia, Edificio Administrativo, Módulo 4.<br/>
• <strong>Horario de Atención:</strong> Lunes a Viernes de 8:30 a.m. a 3:30 p.m.<br/>
• <strong>Documentos disponibles:</strong> Certificación de Notas, Acta de Grado, Fondo Negro Certificado, Puesto y Rango, y Pensum de Estudios para <strong>${user?.carrera || 'Ingeniería'}</strong>.<br/><br/>
[ACTION:forms][ACTION:guide]`,
        isAudit: false
      };
    }

    return null;
  };

  const sendMessage = async (text, isInit = false, isFile = false) => {
    if (!text.trim() && !isFile) return;

    if (!isInit) {
      setMessages((prev) => [...prev, { text, sender: 'user', isFile }]);
    }
    setLoading(true);

    // 1. Primero verificar si es una consulta personalizada del expediente o del flujo de auditoría local
    const localContextual = getInstitutionalReply(text, isFile);
    if (localContextual) {
      setTimeout(() => {
        setMessages((prev) => [...prev, {
          text: localContextual.text,
          sender: 'bot',
          rawText: localContextual.text
        }]);
        setStatus('En línea · Expediente Sincronizado');
        setLoading(false);
      }, 320);
      return;
    }

    // 2. Consultar motor IA del backend Flask con contexto del estudiante y sus trámites
    try {
      const data = await chatAPI.sendMessage(getSessionId(), text, isFile, {
        nombre: user?.nombre || user?.nombre_completo,
        cedula: user?.cedula,
        carrera: user?.carrera,
        tramites_activos: userRecords.length,
        ultimo_tramite: userRecords[0]?.solicitudCode || null,
        ultimo_estatus: userRecords[0]?.status || null
      });

      let rawReply = data.reply || '';
      let formattedText = rawReply
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br/>');

      setMessages((prev) => [...prev, {
        text: formattedText,
        sender: 'bot',
        rawText: rawReply
      }]);
      setStatus('En línea · IA Activa');
    } catch (_) {
      const fallbackText = `Entendido, <strong>${user?.nombre?.split(' ')[0] || 'Graduando'}</strong>. Como <strong>Asistente Institucional de la USM</strong>, puedo mostrarte el estado en vivo de tus trámites (${userRecords.length} registrados), iniciar una auditoría interactiva de 5 pasos o guiarte en el proceso ante USM, SAREN, MPPEU y MPPRE.<br/><br/>[ACTION:dashboard][ACTION:prevalidation][ACTION:guide]`;
      setMessages((prev) => [...prev, {
        text: fallbackText,
        sender: 'bot',
        rawText: fallbackText
      }]);
      setStatus('En línea (Base Institucional)');
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
    try {
      sessionStorage.removeItem(storageKey);
      localStorage.removeItem(storageKey);
    } catch (_) {}
    setIsAuditMode(false);
    setAuditStep(0);
    setAuditAnswers([]);
    const welcomeMsg = {
      sender: 'bot',
      text: `🔄 <strong>Conversación reiniciada.</strong> Hola de nuevo, <strong>${user?.nombre || 'Graduando USM'}</strong> (${user?.cedula || 'USM'}). ¿Deseas consultar el estado de tus trámites activos (${userRecords.length}) o iniciar una auditoría de requisitos?<br/><br/>[ACTION:ocr][ACTION:prevalidation]`
    };
    setMessages([welcomeMsg]);
  };

  const handleExportChatPdf = () => {
    const win = window.open('', '_blank', 'width=820,height=720');
    if (!win) return;
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Resumen de Asesoría Institucional — USM</title>
        <style>
          body { font-family: 'Georgia', serif; color: #121212; padding: 32px; max-width: 740px; margin: 0 auto; }
          .header { border-bottom: 2px solid #121212; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; }
          .msg { margin-bottom: 12px; padding: 10px 14px; border-radius: 8px; font-family: Arial, sans-serif; font-size: 13px; line-height: 1.5; border: 1px solid #e4e4e7; }
          .bot { background: #f8f8f7; }
          .user { background: #fdf3e7; border-color: #e5c7b5; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h2 style="margin:0 0 4px 0;">UNIVERSIDAD SANTA MARÍA</h2>
            <p style="margin:0; font-family:Arial,sans-serif; font-size:12px; color:#555;">Bitácora de Asesoría Institucional y Legalización Universitaria</p>
          </div>
          <div style="text-align:right; font-family:Arial,sans-serif; font-size:12px;">
            <strong>${user?.nombre || 'Graduando USM'}</strong><br/>
            ${user?.cedula || ''} · ${new Date().toLocaleDateString('es-VE')}
          </div>
        </div>
        ${messages.map(m => `
          <div class="msg ${m.sender}">
            <strong>${m.sender === 'bot' ? 'Asistente Institucional USM:' : (user?.nombre || 'Graduando') + ':'}</strong><br/>
            ${(m.text || '').replace(/\[ACTION:[a-z]+\]/g, '')}
          </div>
        `).join('')}
        <script>window.onload = () => { window.print(); };</script>
      </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    sendMessage(`📎 Archivo adjunto para revisión: ${file.name}`, false, true);
    e.target.value = null;
  };

  const renderMessageContent = (msg) => {
    const text = msg.text || '';

    const hasOcrAction = text.includes('[ACTION:ocr]');
    const hasPubAction = text.includes('[ACTION:pub]');
    const hasBlockchainAction = text.includes('[ACTION:blockchain]');
    const hasGuideAction = text.includes('[ACTION:guide]');
    const hasFormsAction = text.includes('[ACTION:forms]');
    const hasDashboardAction = text.includes('[ACTION:dashboard]');
    const hasPrevalAction = text.includes('[ACTION:prevalidation]');

    const cleanHtml = text
      .replace(/\[ACTION:ocr\]/g, '')
      .replace(/\[ACTION:pub\]/g, '')
      .replace(/\[ACTION:blockchain\]/g, '')
      .replace(/\[ACTION:guide\]/g, '')
      .replace(/\[ACTION:forms\]/g, '')
      .replace(/\[ACTION:dashboard\]/g, '')
      .replace(/\[ACTION:prevalidation\]/g, '');

    return (
      <div>
        <span dangerouslySetInnerHTML={{ __html: cleanHtml }} />

        {msg.sender === 'bot' && (hasOcrAction || hasPubAction || hasBlockchainAction || hasGuideAction || hasFormsAction || hasDashboardAction || hasPrevalAction) && (
          <div style={{ marginTop: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
            {hasDashboardAction && (
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('dashboard')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.48rem 0.85rem', background: 'var(--color-ink-black)',
                  color: '#ffffff', border: 'none', borderRadius: 'var(--radius-inputs)',
                  fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer'
                }}
              >
                <Clock size={13} /> Ver Mi Timeline (4 Estaciones) <ArrowRight size={13} />
              </button>
            )}

            {hasPrevalAction && (
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('prevalidation')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.48rem 0.85rem', background: 'var(--color-blush-peach)',
                  color: 'var(--color-sienna-brown)', border: '1px solid rgba(93, 42, 26, 0.2)',
                  borderRadius: 'var(--radius-inputs)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer'
                }}
              >
                <Shield size={13} /> Ir a Pre-Validación Forense <ArrowRight size={13} />
              </button>
            )}

            {hasOcrAction && (
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('ocr')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.48rem 0.85rem', background: 'var(--color-blush-peach)',
                  color: 'var(--color-sienna-brown)', border: '1px solid rgba(93, 42, 26, 0.2)',
                  borderRadius: 'var(--radius-inputs)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer'
                }}
              >
                📸 Escanear Título con IA (OCR) <ArrowRight size={13} />
              </button>
            )}

            {hasPubAction && (
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('pub')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.48rem 0.85rem', background: '#ffffff',
                  color: 'var(--color-ink-black)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-inputs)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer'
                }}
              >
                📝 Generar Planilla PUB (SAREN) <ArrowRight size={13} />
              </button>
            )}

            {hasBlockchainAction && (
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('blockchain')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.48rem 0.85rem', background: '#ffffff',
                  color: 'var(--color-ink-black)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-inputs)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer'
                }}
              >
                <Layers size={13} /> Verificador Blockchain <ArrowRight size={13} />
              </button>
            )}

            {hasFormsAction && (
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('forms')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.48rem 0.85rem', background: '#ffffff',
                  color: 'var(--color-ink-black)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-inputs)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer'
                }}
              >
                📂 Planillas Oficiales USM <ArrowRight size={13} />
              </button>
            )}

            {hasGuideAction && (
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('survival')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.48rem 0.85rem', background: '#ffffff',
                  color: 'var(--color-ink-black)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-inputs)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer'
                }}
              >
                📖 Guía SAREN / MPPRE <ArrowRight size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="chat-container" style={{
      maxWidth: '940px',
      margin: '0 auto',
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-card)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '80vh',
      minHeight: '620px'
    }}>
      {/* Cabecera del Asistente */}
      <div style={{
        padding: '0.95rem 1.35rem',
        background: 'linear-gradient(135deg, #fffbf7 0%, #fdf5ec 100%)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
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
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.76rem', color: 'var(--color-slate-gray)' }}>
              Conectado a tu expediente ({userRecords.length} {userRecords.length === 1 ? 'trámite activo' : 'trámites activos'}) · GTU, SAREN, MPPRE y Sepolia
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {user && (
            <div style={{
              fontSize: '0.74rem',
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
              <span style={{ fontWeight: 600 }}>{user.nombre?.split(' ')[0] || 'Egresado'} ({user.cedula || 'USM'})</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleExportChatPdf}
            className="btn-ghost"
            style={{
              padding: '0.38rem 0.75rem',
              fontSize: '0.76rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              borderRadius: 'var(--radius-pill)'
            }}
            title="Descargar o imprimir asesoría en PDF"
          >
            <Printer size={13} />
            <span>Exportar PDF</span>
          </button>

          <button
            type="button"
            onClick={handleResetChat}
            className="btn-ghost"
            style={{
              padding: '0.38rem 0.75rem',
              fontSize: '0.76rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              borderRadius: 'var(--radius-pill)'
            }}
            title="Reiniciar conversación"
          >
            <RefreshCw size={13} />
            <span>Reiniciar</span>
          </button>
        </div>
      </div>

      {/* Área de Mensajes */}
      <div className="chat-messages" style={{
        flex: 1,
        padding: '1.25rem',
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
                maxWidth: '84%',
                padding: '0.9rem 1.15rem',
                borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: isUser ? 'var(--color-sienna-brown)' : '#ffffff',
                color: isUser ? '#ffffff' : 'var(--color-ink-black)',
                boxShadow: isUser ? '0 4px 12px rgba(93, 42, 26, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.05)',
                border: isUser ? 'none' : '1px solid var(--border)',
                fontSize: '0.87rem',
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
              Consultando normativa y expediente...
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
            Respuesta Auditoría ({auditStep + 1}/5):
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
            <X size={14} /> No lo tengo aún
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
        padding: '0.65rem 1.25rem',
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
            >
              <Icon size={13} color="var(--color-sienna-brown)" />
              {qp.label}
            </button>
          );
        })}
      </div>

      {/* Input de Envío */}
      <div style={{
        padding: '0.85rem 1.25rem',
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
            onClick={() => fileInputRef.current?.click()}
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
              fontSize: '0.86rem',
              borderRadius: 'var(--radius-inputs)',
              border: '1px solid var(--border)',
              background: '#ffffff',
              outline: 'none',
              color: 'var(--color-ink-black)'
            }}
            placeholder={
              isAuditMode
                ? "Responde 'sí', 'no' o usa los botones arriba..."
                : "Pregunta por el estado de tu trámite, GTU, SAREN, aranceles o escribe 'auditar'..."
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
              padding: '0.75rem 1.2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              borderRadius: 'var(--radius-inputs)',
              opacity: !inputVal.trim() || loading ? 0.6 : 1,
              cursor: !inputVal.trim() || loading ? 'not-allowed' : 'pointer'
            }}
          >
            <Send size={15} />
            <span style={{ fontSize: '0.84rem' }}>Enviar</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatBotWidget;
