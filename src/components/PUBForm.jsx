import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, FileText, Download, ShieldCheck, Printer, MessageSquare,
  FolderOpen, Lock, MapPin, CreditCard, CheckCircle, Sparkles, ArrowRight, RefreshCw, Building
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import html2pdf from 'html2pdf.js';
import { QRCodeSVG } from 'qrcode.react';
import DigitalCertificate from './DigitalCertificate';
import { blockchainAPI, hashAPI } from '../services/api';
import { ESTADOS_VENEZUELA, UNIVERSIDADES_CATALOGO } from '../data/venezuelaLocations';

// ─── Catálogo de Bancos Recaudadores (Convenio SENIAT / SAREN / Tesorería) ──
const BANCOS_RECEPTORES_SAREN = [
  {
    id: 'bdv',
    nombre: 'Banco de Venezuela (0102)',
    cuenta: '0102-0552-22-0000001234',
    rif: 'G-20000000-0',
    titular: 'SAREN — Tesorería Nacional Recaudación'
  },
  {
    id: 'tesoro',
    nombre: 'Banco del Tesoro (0163)',
    cuenta: '0163-0900-11-0000098765',
    rif: 'G-20000000-0',
    titular: 'Oficina Nacional del Tesoro (ONT - SAREN)'
  },
  {
    id: 'banesco',
    nombre: 'Banesco Banco Universal (0134)',
    cuenta: '0134-0031-88-0000543210',
    rif: 'G-20000000-0',
    titular: 'Convenio Recaudación SAREN / SENIAT'
  },
  {
    id: 'mercantil',
    nombre: 'Banco Mercantil (0105)',
    cuenta: '0105-0012-44-0000876543',
    rif: 'G-20000000-0',
    titular: 'Convenio Recaudación SAREN / SENIAT'
  }
];

const BANCOS_PAGADOR = [
  'Banco de Venezuela (0102)',
  'Banesco Banco Universal (0134)',
  'Banco Mercantil (0105)',
  'BBVA Provincial (0108)',
  'Banco del Tesoro (0163)',
  'BNC - Banco Nacional de Crédito (0191)',
  'Bancamiga (0172)'
];

const TIPOS_TRAMITE_SAREN = [
  {
    label: 'Registro de Título Universitario (Protocolización Principal)',
    ut: '0.50 UT (0.20 PTR)',
    montoBs: '8729.40',
    derechosBs: '6235.30',
    procesamientoBs: '2494.10'
  },
  {
    label: 'Legalización de Notas Certificadas de Grado',
    ut: '0.25 UT (0.10 PTR)',
    montoBs: '4364.70',
    derechosBs: '3117.65',
    procesamientoBs: '1247.05'
  },
  {
    label: 'Certificación de Acta de Grado y Fondo Negro',
    ut: '0.25 UT (0.10 PTR)',
    montoBs: '4364.70',
    derechosBs: '3117.65',
    procesamientoBs: '1247.05'
  },
  {
    label: 'Habilitación Expresa y Arancel de Apostilla Educacional',
    ut: '1.00 UT (0.40 PTR)',
    montoBs: '17458.80',
    derechosBs: '12470.60',
    procesamientoBs: '4988.20'
  }
];

const calculateTariffForTramite = (tramiteStr = '') => {
  const lower = String(tramiteStr || '').toLowerCase();
  if (lower.includes('apostilla') || lower.includes('habilitaci')) {
    return TIPOS_TRAMITE_SAREN[3];
  }
  if (lower.includes('notas') || lower.includes('calificaciones')) {
    return TIPOS_TRAMITE_SAREN[1];
  }
  if (lower.includes('acta') || lower.includes('fondo negro')) {
    return TIPOS_TRAMITE_SAREN[2];
  }
  return TIPOS_TRAMITE_SAREN[0];
};

// ─── Validadores por campo ───────────────────────────────────────────────────
const validators = {
  nombre_completo: (v) => {
    const words = String(v || '').trim().split(/\s+/).filter(Boolean);
    if (words.length < 2) return 'Debes escribir al menos **nombre y apellido** completos.';
    if (/\d/.test(v)) return 'El nombre no debe contener números. Por favor corrígelo.';
    return null;
  },
  cedula: (v) => {
    if (!/^[VvEe]-?\d{6,9}$/.test(String(v || '').replace(/\./g, '').trim()))
      return 'Formato incorrecto. Usa el formato **V-12.345.678** o **E-12.345.678**.';
    return null;
  },
  telefono: (v) => {
    const cleaned = String(v || '').replace(/[-\s]/g, '').trim();
    if (!/^(0414|0424|0412|0416|0426|0212|0241|0251|0261|0281|0291|0243)[0-9]{7}$/.test(cleaned))
      return 'Número inválido. Usa el formato venezolano: **0414-1234567** o **0212-5551234**.';
    return null;
  },
  correo: (v) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim()))
      return 'El correo electrónico no es válido. Ejemplo correcto: **juan.perez@gmail.com**.';
    return null;
  },
  tramite: (v) => {
    if (String(v || '').trim().length < 5) return 'El tipo de trámite es demasiado corto. Escribe el nombre completo.';
    return null;
  },
  institucion: (v) => {
    if (String(v || '').trim().length < 3) return 'Por favor escribe el nombre completo de la institución.';
    return null;
  },
  pago_cedula: (v) => {
    if (!/^[VvEe]-?\d{6,9}$/.test(String(v || '').replace(/\./g, '').trim()))
      return 'Formato incorrecto. Usa el formato **V-12.345.678** o **E-12.345.678**.';
    return null;
  },
  pago_telefono: (v) => {
    const cleaned = String(v || '').replace(/[-\s]/g, '').trim();
    if (!/^(0414|0424|0412|0416|0426|0212|0241|0251|0261|0281|0291|0243)[0-9]{7}$/.test(cleaned))
      return 'Número inválido. Usa el formato venezolano: **0414-1234567**.';
    return null;
  },
  pago_banco: (v) => {
    if (String(v || '').trim().length < 3) return 'Por favor indica el nombre del banco (ej: **Banco de Venezuela**, **Banesco**, **Mercantil**).';
    return null;
  },
  referencia_bancaria: (v) => {
    const cleanRef = String(v || '').replace(/\D/g, '');
    if (cleanRef.length < 6 || cleanRef.length > 12) {
      return 'Ingresa un **número de referencia bancaria válido (de 6 a 12 dígitos)** emitido por tu banco.';
    }
    return null;
  }
};

// ─── Definición de campos de la PUB ─────────────────────────────────────────
const PUB_FIELDS = [
  {
    id: 'nombre_completo',
    label: 'Nombre Completo del Solicitante',
    placeholder: 'Ej: Mauro Daniel Maiese Ferreira',
    pregunta: 'Formulario Oficial — Planilla Única Bancaria (PUB)\n\n**Campo 1 — Nombre Completo**\n\n¿Cuál es su nombre completo tal como aparece en su cédula de identidad?',
    ayuda: 'Escribe **todos tus nombres y ambos apellidos**, exactamente como aparecen en tu cédula laminada.',
  },
  {
    id: 'cedula',
    label: 'Cédula de Identidad (Inmutable)',
    placeholder: 'Ej: V-28.315.101',
    pregunta: '**Campo 2 — Cédula de Identidad**\n\n¿Cuál es tu número de cédula? (Incluye el prefijo V- o E-)',
    ayuda: 'Usa el formato: **V-12.345.678** (venezolano) o **E-12.345.678** (extranjero).',
  },
  {
    id: 'telefono',
    label: 'Teléfono de Contacto',
    placeholder: 'Ej: 0414-1234567',
    pregunta: '**Campo 3 — Teléfono de Contacto**\n\n¿Cuál es tu número de teléfono venezolano activo?',
    ayuda: 'Escribe tu número con la operadora incluida: **0414-1234567**, **0412-5551234**, etc.',
  },
  {
    id: 'correo',
    label: 'Correo Electrónico',
    placeholder: 'Ej: graduando@usm.edu.ve',
    pregunta: '**Campo 4 — Correo Electrónico**\n\n¿Cuál es tu correo electrónico activo?',
    ayuda: 'El SAREN y el sistema SENIAT envían el comprobante de liquidación fiscal a este correo.',
  },
  {
    id: 'tramite',
    label: 'Tipo de Trámite Registral',
    placeholder: 'Registro de Título Universitario',
    pregunta: '**Campo 5 — Tipo de Trámite**\n\nIndica el trámite a protocolizar:\n• *Registro de Título Universitario*\n• *Legalización de Notas Certificadas de Grado*\n• *Certificación de Acta de Grado*',
    ayuda: 'Escribe o selecciona el trámite oficial para calcular las Unidades Tributarias correspondientes.',
  },
  {
    id: 'institucion',
    label: 'Institución Educativa',
    placeholder: 'Universidad Santa María (USM)',
    pregunta: '**Campo 6 — Institución Educativa**\n\n¿En qué universidad obtuviste tu título?',
    ayuda: 'Escribe el nombre oficial completo: **"Universidad Santa María (USM)"**.',
  },
  {
    id: 'pago_cedula',
    label: 'Cédula del Pagador (Pago Móvil / Transferencia)',
    placeholder: 'Ej: V-28.315.101',
    pregunta: '**Campo 7 — Cédula del Pagador**\n\n¿Cuál es la cédula de identidad asociada a la cuenta pagadora?',
    ayuda: 'Escribe la cédula de la persona que realiza el pago en formato **V-12.345.678**.',
  },
  {
    id: 'pago_telefono',
    label: 'Teléfono del Pagador (Pago Móvil)',
    placeholder: 'Ej: 0414-1234567',
    pregunta: '**Campo 8 — Teléfono del Pagador**\n\n¿Cuál es el número de teléfono asociado al Pago Móvil interbancario?',
    ayuda: 'Escribe el número de teléfono registrado en el banco emisor. Formato: **0414-1234567**.',
  },
  {
    id: 'pago_banco',
    label: 'Banco Origen del Pagador',
    placeholder: 'Ej: Banco de Venezuela (0102)',
    pregunta: '**Campo 9 — Banco del Pagador**\n\n¿Desde qué banco realizarás el pago de aranceles?\n\nEjemplos: *Banco de Venezuela*, *Banesco*, *Mercantil*, *Provincial*',
    ayuda: 'Indica el banco desde el cual emites el Pago Móvil o transferencia.',
  },
  {
    id: 'referencia_bancaria',
    label: 'N° de Referencia Bancaria (12 dígitos)',
    placeholder: 'Ej: 202608491723',
    pregunta: '',
    ayuda: 'Ingresa los dígitos del número de referencia bancaria (6 a 12 dígitos) o usa el botón de "Conciliar Pago en Pasarela SENIAT/SAREN".',
  }
];

const generateHash = async (data) => {
  return await hashAPI.generateClientHash(data);
};

const PUBForm = ({ user, initialData, onVerifyHash, onNavigate }) => {
  const defaultEstadoObj = ESTADOS_VENEZUELA[0]; // Distrito Capital

  const [userRecords, setUserRecords] = useState([]);
  const [selectedRecordKey, setSelectedRecordKey] = useState('NEW_STANDALONE');
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [currentFieldIndex, setCurrentFieldIndex] = useState(-1);
  const [isComplete, setIsComplete] = useState(false);
  const [blockchainHash, setBlockchainHash] = useState(null);
  const [pubSpecificHash, setPubSpecificHash] = useState(null);
  const [isHashing, setIsHashing] = useState(false);
  const [isConciliating, setIsConciliating] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('PENDIENTE DE PAGO'); // 'PENDIENTE DE PAGO' | 'LIQUIDADA / CONCILIADA'
  const [conciliationTimestamp, setConciliationTimestamp] = useState(null);
  const [showCert, setShowCert] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState('chat'); // 'chat' or 'preview'
  const [leftMode, setLeftMode] = useState('pasarela'); // 'pasarela' (Formulario + Pasarela SENIAT) | 'chat' (Asistente Guiado)
  const [scale, setScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState('auto');
  const [copiedHash, setCopiedHash] = useState(false);

  const containerRef = useRef(null);
  const previewRef = useRef(null);
  const messagesEndRef = useRef(null);

  const stablePubCode = useRef(`PUB-${new Date().getFullYear()}-SAREN-${Math.floor(100000 + Math.random() * 900000)}`);
  const stableTramiteNum = useRef(Math.floor(10000000 + Math.random() * 90000000).toString());

  // Construir estado inicial del formulario combinando user + initialData
  const buildInitialFormState = useCallback((recordToLink = null) => {
    const recForm = recordToLink?.formData || {};
    const docType =
      recordToLink?.documentType ||
      initialData?.tramite ||
      recForm.tramite ||
      (user?.carrera ? `Registro de Título Universitario (${user.carrera})` : TIPOS_TRAMITE_SAREN[0].label);

    const tariff = calculateTariffForTramite(docType);
    const estName = recordToLink?.estado || recForm.estado || defaultEstadoObj.estado;
    const foundEst = ESTADOS_VENEZUELA.find(e => e.estado === estName) || defaultEstadoObj;
    const munName = recordToLink?.municipio || recForm.municipio || foundEst.municipios[0];
    const taqName = recordToLink?.sede_taquilla || recordToLink?.sedeTaquilla || recForm.sede_taquilla || foundEst.taquillas[0].nombre;
    const foundTaq = foundEst.taquillas.find(t => t.nombre === taqName) || foundEst.taquillas[0];

    const immutableCedula = user?.cedula || recordToLink?.cedula || initialData?.cedula || 'V-28.315.101';
    const fullName = user?.nombre || recordToLink?.ownerName || initialData?.nombre_completo || 'Graduando USM';
    const phone = user?.telefono || recForm.telefono || initialData?.telefono || '0414-2831510';
    const email = user?.email || recForm.correo || initialData?.correo || 'graduando@usm.edu.ve';

    return {
      nombre_completo: fullName,
      cedula: immutableCedula,
      telefono: phone,
      correo: email,
      tramite: docType,
      institucion: recordToLink?.institucion || initialData?.institucion || recForm.institucion || 'Universidad Santa María (USM)',
      estado: foundEst.estado,
      municipio: munName,
      sede_taquilla: foundTaq.nombre,
      sede_direccion: foundTaq.direccion,
      sede_horario: foundTaq.horario,
      banco_receptor_id: recForm.banco_receptor_id || BANCOS_RECEPTORES_SAREN[0].id,
      banco_destino: recForm.banco_destino || BANCOS_RECEPTORES_SAREN[0].nombre,
      nro_cuenta: recForm.nro_cuenta || BANCOS_RECEPTORES_SAREN[0].cuenta,
      unidad_tributaria: tariff.ut,
      monto: tariff.montoBs,
      derechos_registro: tariff.derechosBs,
      procesamiento_digital: tariff.procesamientoBs,
      pago_cedula: recForm.pago_cedula || immutableCedula,
      pago_telefono: recForm.pago_telefono || phone,
      pago_banco: recForm.pago_banco || BANCOS_PAGADOR[0],
      referencia_bancaria: recordToLink?.paymentReference || recForm.referencia_bancaria || '',
      confirmacion_pago: (recordToLink?.paymentReference || recForm.referencia_bancaria) ? 'CONCILIADO' : ''
    };
  }, [user, initialData, defaultEstadoObj]);

  const [formData, setFormData] = useState(() => buildInitialFormState(null));

  // Cargar los trámites existentes del estudiante para vincular sin crear duplicados
  const loadStudentRecords = useCallback(async () => {
    try {
      const bc = JSON.parse(localStorage.getItem('usm_blockchain_records') || '[]');
      const pub = JSON.parse(localStorage.getItem('usm_pub_history') || '[]');
      const map = new Map();

      const addRec = (r) => {
        if (!r || !(r.hash || r.blockchainHash)) return;
        const h = r.hash || r.blockchainHash;
        const k = h.toUpperCase();
        map.set(k, { ...(map.get(k) || {}), ...r, hash: h });
      };

      bc.forEach(addRec);
      pub.forEach(addRec);

      if (user?.cedula) {
        try {
          const res = await blockchainAPI.getRecordsByCedula(user.cedula);
          if (res?.success && Array.isArray(res.records)) {
            res.records.forEach(addRec);
          }
        } catch (_) {}
      }

      const userCedClean = (user?.cedula || '').replace(/\D/g, '');
      const userNameNorm = (user?.nombre || '').toLowerCase().trim();
      const userEmailNorm = (user?.email || '').toLowerCase().trim();

      const filtered = Array.from(map.values())
        .filter(r => {
          if (!r) return false;
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

      setUserRecords(filtered);

      if (filtered.length > 0) {
        const activeHash = (localStorage.getItem('usm_active_tramite_hash') || sessionStorage.getItem('usm_active_tramite_hash') || '').trim().toUpperCase();
        const chosen = filtered.find(r => (r.hash || '').toUpperCase() === activeHash) || filtered[0];
        if (chosen && chosen.hash) {
          setSelectedRecordKey(chosen.hash);
          const nextState = buildInitialFormState(chosen);
          setFormData(nextState);
          if (chosen.pubCode || chosen.stablePubCode) {
            stablePubCode.current = chosen.pubCode || chosen.stablePubCode;
          }
          if (chosen.paymentReference || chosen.formData?.referencia_bancaria || chosen.sarenVerified) {
            setPaymentStatus('LIQUIDADA / CONCILIADA');
            setIsComplete(true);
            setBlockchainHash(chosen.hash);
          }
        }
      }
    } catch (e) {
      console.warn('Error loading student records in PUBForm:', e);
    }
  }, [user, buildInitialFormState]);

  useEffect(() => {
    loadStudentRecords();
  }, [loadStudentRecords]);

  // Si llega initialData nuevo desde OCRExtractor
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData(prev => {
        const merged = {
          ...prev,
          ...initialData,
          cedula: user?.cedula || initialData.cedula || prev.cedula
        };
        const tariff = calculateTariffForTramite(merged.tramite);
        return {
          ...merged,
          unidad_tributaria: tariff.ut,
          monto: tariff.montoBs,
          derechos_registro: tariff.derechosBs,
          procesamiento_digital: tariff.procesamientoBs
        };
      });
    }
  }, [initialData, user]);

  // Cambiar expediente seleccionado en el desplegable superior
  const handleSelectLinkedRecord = (key) => {
    setSelectedRecordKey(key);
    if (key === 'NEW_STANDALONE') {
      stablePubCode.current = `PUB-${new Date().getFullYear()}-SAREN-${Math.floor(100000 + Math.random() * 900000)}`;
      const fresh = buildInitialFormState(null);
      fresh.referencia_bancaria = '';
      fresh.confirmacion_pago = '';
      setFormData(fresh);
      setPaymentStatus('PENDIENTE DE PAGO');
      setIsComplete(false);
      setBlockchainHash(null);
      setPubSpecificHash(null);
      return;
    }

    const found = userRecords.find(r => r.hash === key);
    if (found) {
      localStorage.setItem('usm_active_tramite_hash', found.hash);
      sessionStorage.setItem('usm_active_tramite_hash', found.hash);
      if (found.pubCode || found.stablePubCode) {
        stablePubCode.current = found.pubCode || found.stablePubCode;
      } else {
        stablePubCode.current = `PUB-${new Date().getFullYear()}-SAREN-${Math.floor(100000 + Math.random() * 900000)}`;
      }
      const hydrated = buildInitialFormState(found);
      setFormData(hydrated);
      const isAlreadyPaid = Boolean(found.paymentReference || found.formData?.referencia_bancaria || found.sarenVerified);
      setPaymentStatus(isAlreadyPaid ? 'LIQUIDADA / CONCILIADA' : 'PENDIENTE DE PAGO');
      setIsComplete(isAlreadyPaid);
      setBlockchainHash(isAlreadyPaid ? found.hash : null);
    }
  };

  // Manejadores de cambio en el formulario directo / pasarela
  const handleDirectFieldChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };

      if (field === 'tramite') {
        const tariff = calculateTariffForTramite(value);
        next.unidad_tributaria = tariff.ut;
        next.monto = tariff.montoBs;
        next.derechos_registro = tariff.derechosBs;
        next.procesamiento_digital = tariff.procesamientoBs;
      }

      if (field === 'estado') {
        const estObj = ESTADOS_VENEZUELA.find(e => e.estado === value) || defaultEstadoObj;
        next.municipio = estObj.municipios[0];
        next.sede_taquilla = estObj.taquillas[0].nombre;
        next.sede_direccion = estObj.taquillas[0].direccion;
        next.sede_horario = estObj.taquillas[0].horario;
      }

      if (field === 'sede_taquilla') {
        const estObj = ESTADOS_VENEZUELA.find(e => e.estado === prev.estado) || defaultEstadoObj;
        const taqObj = estObj.taquillas.find(t => t.nombre === value) || estObj.taquillas[0];
        next.sede_direccion = taqObj.direccion;
        next.sede_horario = taqObj.horario;
      }

      if (field === 'banco_receptor_id') {
        const bankObj = BANCOS_RECEPTORES_SAREN.find(b => b.id === value) || BANCOS_RECEPTORES_SAREN[0];
        next.banco_destino = bankObj.nombre;
        next.nro_cuenta = bankObj.cuenta;
      }

      return next;
    });
  };

  // Generar referencia interbancaria aleatoria de 12 dígitos
  const handleGenerateBankRef = () => {
    const prefix = new Date().getFullYear().toString();
    const random8 = Math.floor(10000000 + Math.random() * 90000000).toString();
    const ref12 = `${prefix}${random8}`;
    setFormData(prev => ({
      ...prev,
      referencia_bancaria: ref12
    }));
    setFieldErrors(prev => {
      const copy = { ...prev };
      delete copy.referencia_bancaria;
      return copy;
    });
  };

  // Persistir y vincular en localStorage, PreValidation y Backend sin duplicar
  const persistAndSyncExpediente = async (finalFormData, statusPago = 'LIQUIDADA / CONCILIADA') => {
    setIsHashing(true);
    try {
      const calculatedPubHash = await generateHash({
        ...finalFormData,
        pubCode: stablePubCode.current,
        statusPago
      });
      setPubSpecificHash(calculatedPubHash);

      const linkedRecord = selectedRecordKey !== 'NEW_STANDALONE'
        ? userRecords.find(r => r.hash === selectedRecordKey)
        : null;

      // Si hay un expediente vinculado del OCR, usamos su mismo hash principal para NO duplicar
      const canonicalHash = linkedRecord?.hash || calculatedPubHash;
      const cedulaToSave = user?.cedula || finalFormData.cedula;
      const pubCode = stablePubCode.current;
      const nowIso = new Date().toISOString();

      // 1. Actualizar o insertar en usm_blockchain_records (sin duplicar)
      const bcList = JSON.parse(localStorage.getItem('usm_blockchain_records') || '[]');
      const existingBc = bcList.find(r => (r.hash || '').toUpperCase() === canonicalHash.toUpperCase()) || linkedRecord || {};

      const preservedStatus =
        existingBc.status && (String(existingBc.status).includes('CERTIFICADO') || String(existingBc.status).includes('APOSTILLADO'))
          ? existingBc.status
          : 'SAREN_PUB_LIQUIDADA';

      const updatedBcRecord = {
        ...existingBc,
        hash: canonicalHash,
        pubHash: calculatedPubHash,
        ownerName: finalFormData.nombre_completo,
        owner_name: finalFormData.nombre_completo,
        cedula: cedulaToSave,
        accountCedula: user?.cedula || cedulaToSave,
        accountNombre: user?.nombre || finalFormData.nombre_completo,
        accountEmail: user?.email || finalFormData.correo,
        documentType: existingBc.documentType || finalFormData.tramite || 'Registro de Título Universitario',
        solicitudCode: existingBc.solicitudCode || pubCode,
        pubCode: pubCode,
        stablePubCode: pubCode,
        sarenVerified: true,
        paymentReference: finalFormData.referencia_bancaria,
        paymentStatus: statusPago,
        bancoReceptor: finalFormData.banco_destino,
        montoArancel: finalFormData.monto,
        estado: finalFormData.estado,
        municipio: finalFormData.municipio,
        sede_taquilla: finalFormData.sede_taquilla,
        sedeTaquilla: finalFormData.sede_taquilla,
        sede_direccion: finalFormData.sede_direccion,
        sedeDireccion: finalFormData.sede_direccion,
        sede_horario: finalFormData.sede_horario,
        sedeHorario: finalFormData.sede_horario,
        status: preservedStatus,
        txHash: existingBc.txHash || `0x${calculatedPubHash.replace(/^0x/i, '').slice(0, 40)}`,
        createdAt: existingBc.createdAt || nowIso,
        timestamp: existingBc.timestamp || nowIso,
        formData: finalFormData
      };

      const nextBcList = [
        updatedBcRecord,
        ...bcList.filter(r => (r.hash || '').toUpperCase() !== canonicalHash.toUpperCase())
      ];
      localStorage.setItem('usm_blockchain_records', JSON.stringify(nextBcList.slice(0, 60)));

      // 2. Actualizar o insertar en usm_pub_history (sin duplicar)
      const pubHistory = JSON.parse(localStorage.getItem('usm_pub_history') || '[]');
      const newPubItem = {
        ...updatedBcRecord,
        owner_name: finalFormData.nombre_completo,
        nombre: finalFormData.nombre_completo,
        document_type: updatedBcRecord.documentType,
        created_at: updatedBcRecord.createdAt,
        formData: finalFormData
      };
      const nextPubHistory = [
        newPubItem,
        ...pubHistory.filter(r => ((r.hash || r.blockchainHash || '').toUpperCase() !== canonicalHash.toUpperCase()))
      ];
      localStorage.setItem('usm_pub_history', JSON.stringify(nextPubHistory.slice(0, 60)));

      // 3. Sincronizar con usm_forensic_audit_<cedula> para PreValidation.jsx
      try {
        const cleanCed = cedulaToSave.replace(/\D/g, '');
        const auditKey = `usm_forensic_audit_${cleanCed}`;
        const prevAudit = JSON.parse(localStorage.getItem(auditKey) || '{}');
        localStorage.setItem(auditKey, JSON.stringify({
          ...prevAudit,
          pubLiquidated: true,
          pubCode,
          paymentReference: finalFormData.referencia_bancaria,
          paymentStatus: statusPago,
          bancoReceptor: finalFormData.banco_destino,
          montoArancel: finalFormData.monto,
          sede_taquilla: finalFormData.sede_taquilla,
          estado: finalFormData.estado,
          updatedAt: nowIso
        }));
      } catch (_) {}

      // 4. Fijar como trámite activo y emitir eventos globales
      localStorage.setItem('usm_active_tramite_hash', canonicalHash);
      sessionStorage.setItem('usm_active_tramite_hash', canonicalHash);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('usm_records_updated', { detail: updatedBcRecord }));
        window.dispatchEvent(new Event('storage'));
      }
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const ch = new BroadcastChannel('usm_records_sync');
          ch.postMessage({ type: 'RECORD_UPDATED', record: updatedBcRecord });
          ch.close();
        } catch (_) {}
      }

      // 5. Sincronizar con el Backend Flask (/blockchain/register hace merge inteligente)
      try {
        await blockchainAPI.register({
          hash: canonicalHash,
          pubHash: calculatedPubHash,
          ownerName: finalFormData.nombre_completo,
          cedula: cedulaToSave,
          accountCedula: user?.cedula || cedulaToSave,
          accountNombre: user?.nombre || finalFormData.nombre_completo,
          accountEmail: user?.email || finalFormData.correo,
          documentType: updatedBcRecord.documentType,
          solicitudCode: updatedBcRecord.solicitudCode,
          pubCode: pubCode,
          sarenVerified: true,
          paymentReference: finalFormData.referencia_bancaria,
          paymentStatus: statusPago,
          bancoReceptor: finalFormData.banco_destino,
          montoArancel: finalFormData.monto,
          estado: finalFormData.estado,
          municipio: finalFormData.municipio,
          sedeTaquilla: finalFormData.sede_taquilla,
          sedeDireccion: finalFormData.sede_direccion,
          sedeHorario: finalFormData.sede_horario,
          formData: finalFormData
        });
      } catch (err) {
        console.warn('Backend sync fallback local en PUBForm:', err);
      }

      setBlockchainHash(canonicalHash);
      setSelectedRecordKey(canonicalHash);
      await loadStudentRecords();
      return canonicalHash;
    } finally {
      setIsHashing(false);
    }
  };

  // Simulador de Liquidación y Conciliación Bancaria Interbancaria (SENIAT / SAREN)
  const handleSimulateBankConciliation = async () => {
    const errors = {};
    if (validators.nombre_completo(formData.nombre_completo)) errors.nombre_completo = validators.nombre_completo(formData.nombre_completo);
    if (validators.telefono(formData.telefono)) errors.telefono = validators.telefono(formData.telefono);
    if (validators.correo(formData.correo)) errors.correo = validators.correo(formData.correo);
    if (validators.pago_cedula(formData.pago_cedula)) errors.pago_cedula = validators.pago_cedula(formData.pago_cedula);
    if (validators.pago_telefono(formData.pago_telefono)) errors.pago_telefono = validators.pago_telefono(formData.pago_telefono);

    let refToUse = String(formData.referencia_bancaria || '').replace(/\D/g, '');
    if (refToUse.length < 6) {
      // Autogenerar referencia interbancaria de 12 dígitos si el usuario pulsa conciliar directamente
      refToUse = `${new Date().getFullYear()}${Math.floor(10000000 + Math.random() * 90000000)}`;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsConciliating(true);

    const updatedForm = {
      ...formData,
      referencia_bancaria: refToUse,
      confirmacion_pago: 'CONCILIADO_SENIAT_SAREN'
    };
    setFormData(updatedForm);

    setTimeout(async () => {
      const nowStr = new Date().toLocaleString('es-VE');
      setConciliationTimestamp(nowStr);
      setPaymentStatus('LIQUIDADA / CONCILIADA');
      setIsComplete(true);
      setIsConciliating(false);

      const finalHash = await persistAndSyncExpediente(updatedForm, 'LIQUIDADA / CONCILIADA');

      addBotMessage(
        `✅ **Conciliación Bancaria Interbancaria Exitosa (SENIAT / SAREN)**\n\n` +
        `• **Planilla:** \`${stablePubCode.current}\`\n` +
        `• **Referencia Interbancaria (12 dígitos):** \`#${refToUse}\`\n` +
        `• **Banco Recaudador:** ${updatedForm.banco_destino}\n` +
        `• **Sede Asignada:** ${updatedForm.sede_taquilla} (${updatedForm.estado})\n` +
        `• **Estatus Fiscal:** **LIQUIDADA / CONCILIADA**\n` +
        `• **Hash de Expediente Vinculado:** \`${finalHash}\`\n\n` +
        `El requisito de **Arancel PUB y Timbres Fiscales** ha quedado automáticamente habilitado en el módulo de **Pre-Validación Forense** y en tu **Tracking de 4 Estaciones**.`
      );
    }, 950);
  };

  const updateScale = () => {
    if (containerRef.current && previewRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const targetWidth = 702;
      if (containerWidth < targetWidth) {
        const s = containerWidth / targetWidth;
        setScale(s);
        setScaledHeight(`${previewRef.current.offsetHeight * s}px`);
      } else {
        setScale(1);
        setScaledHeight('auto');
      }
    }
  };

  useEffect(() => {
    updateScale();
    if (!containerRef.current || !previewRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      updateScale();
    });

    resizeObserver.observe(previewRef.current);
    resizeObserver.observe(containerRef.current);

    window.addEventListener('resize', updateScale);
    const timer = setTimeout(updateScale, 150);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [activeMobileTab, formData, leftMode, paymentStatus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addBotMessage = (text, isError = false) => {
    setMessages(prev => [...prev, { text, sender: 'bot', isError }]);
  };

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, { text, sender: 'user' }]);
  };

  // Asistente Chat Inteligente: salta automáticamente los campos que ya están pre-cargados y válidos
  const handleStart = () => {
    setFieldErrors({});
    setMessages([]);

    // Encontrar el primer campo que esté vacío o inválido
    let firstMissingIdx = PUB_FIELDS.findIndex(f => {
      const val = formData[f.id];
      if (!val) return true;
      const validator = validators[f.id];
      return validator ? Boolean(validator(String(val))) : false;
    });

    if (firstMissingIdx === -1) {
      // Solo pedir o confirmar la referencia bancaria (último paso)
      firstMissingIdx = PUB_FIELDS.length - 1;
    }

    setCurrentFieldIndex(firstMissingIdx);

    setTimeout(() => {
      const nextField = PUB_FIELDS[firstMissingIdx];
      const promptQuestion = nextField.id === 'referencia_bancaria'
        ? `**Paso Final — Número de Referencia Bancaria (SENIAT / SAREN)**\n\nIngresa los **6 a 12 dígitos** de la referencia bancaria de tu Pago Móvil por **Bs. ${formData.monto}** a **${formData.banco_destino}** (${formData.nro_cuenta}).`
        : nextField.pregunta;

      addBotMessage(
        '**Asistente Institucional — Planilla Única Bancaria (PUB)**\n\n' +
        'He sincronizado automáticamente los datos ya verificados en tu expediente USM:\n' +
        `• **Titular:** ${formData.nombre_completo}\n` +
        `• **Cédula Inmutable:** ${formData.cedula} 🔒\n` +
        `• **Trámite:** ${formData.tramite}\n` +
        `• **Sede Territorial:** ${formData.sede_taquilla} (${formData.estado})\n` +
        `• **Arancel Calculado:** Bs. ${formData.monto} (${formData.unidad_tributaria})\n\n` +
        promptQuestion
      );
    }, 250);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputVal.trim() || currentFieldIndex < 0) return;

    const userText = inputVal.trim();
    addUserMessage(userText);
    setInputVal('');

    if (isComplete && currentFieldIndex < 0) return;

    const currentField = PUB_FIELDS[currentFieldIndex];

    if (['ayuda', 'help', '?'].includes(userText.toLowerCase())) {
      setTimeout(() => {
        addBotMessage(`**Instrucción — ${currentField.label}**\n\n${currentField.ayuda}\n\nCuando esté listo, ingrese el valor correcto.`);
      }, 250);
      return;
    }

    // Proteger la cédula inmutable del titular
    if (currentField.id === 'cedula' && user?.cedula) {
      const cleanUserCed = user.cedula.replace(/\D/g, '');
      const cleanInputCed = userText.replace(/\D/g, '');
      if (cleanUserCed && cleanInputCed !== cleanUserCed) {
        addBotMessage(
          `🔒 **Protección de Identidad Inmutable:** La cédula del titular no puede ser modificada a una distinta de tu expediente registrado (**${user.cedula}**). Se mantendrá **${user.cedula}**.`,
          true
        );
        return;
      }
    }

    const validate = validators[currentField.id];
    const error = validate ? validate(userText) : null;

    if (error) {
      setFieldErrors(prev => ({ ...prev, [currentField.id]: error }));
      setTimeout(() => {
        addBotMessage(
          `**El campo "${currentField.label}" requiere atención.**\n\n` +
          `${error}\n\n` +
          `Por favor corríjalo antes de continuar. Escriba **"ayuda"** si necesita orientación.`,
          true
        );
      }, 300);
      return;
    }

    setFieldErrors(prev => { const n = { ...prev }; delete n[currentField.id]; return n; });
    const updatedData = { ...formData, [currentField.id]: userText };

    if (currentField.id === 'tramite') {
      const tariff = calculateTariffForTramite(userText);
      updatedData.unidad_tributaria = tariff.ut;
      updatedData.monto = tariff.montoBs;
      updatedData.derechos_registro = tariff.derechosBs;
      updatedData.procesamiento_digital = tariff.procesamientoBs;
    }

    setFormData(updatedData);

    const nextIndex = currentFieldIndex + 1;

    if (nextIndex < PUB_FIELDS.length) {
      setCurrentFieldIndex(nextIndex);
      const nextField = PUB_FIELDS[nextIndex];

      if (nextField.id === 'referencia_bancaria') {
        setTimeout(() => {
          addBotMessage(
            `**Banco del Pagador** registrado: *${userText}*\n\n` +
            `**Resumen de Liquidación SAREN (${updatedData.unidad_tributaria}):**\n` +
            `• **Cédula Pagador:** ${updatedData.pago_cedula}\n` +
            `• **Teléfono Pagador:** ${updatedData.pago_telefono}\n` +
            `• **Banco Destino:** ${updatedData.banco_destino} (${updatedData.nro_cuenta})\n` +
            `• **Monto Total:** Bs. ${updatedData.monto}\n\n` +
            `Ingresa el **Número de Referencia Bancaria (6 a 12 dígitos)** para conciliar la planilla.`
          );
        }, 350);
      } else {
        setTimeout(() => {
          addBotMessage(`**${currentField.label}** registrado correctamente.\n\n${nextField.pregunta}`);
        }, 350);
      }
    } else {
      setCurrentFieldIndex(-1);
      setPaymentStatus('LIQUIDADA / CONCILIADA');
      setConciliationTimestamp(new Date().toLocaleString('es-VE'));
      setIsComplete(true);
      persistAndSyncExpediente(updatedData, 'LIQUIDADA / CONCILIADA');
      setTimeout(() => {
        addBotMessage(
          '✅ **Planilla PUB Liquidada, Conciliada y Vinculada al Expediente.**\n\n' +
          `• **Referencia SENIAT/SAREN:** \`#${updatedData.referencia_bancaria}\`\n` +
          `• **Estado:** **LIQUIDADA / CONCILIADA**\n\n` +
          'La vista previa oficial con sello de pago y código QR Blockchain ya está lista para descargar en PDF.'
        );
      }, 400);
    }
  };

  const handleBlockchain = async () => {
    await persistAndSyncExpediente(formData, paymentStatus);
  };

  const handleAyudaRapida = () => {
    if (currentFieldIndex < 0 || currentFieldIndex >= PUB_FIELDS.length) return;
    const field = PUB_FIELDS[currentFieldIndex];
    addUserMessage('ayuda');
    setTimeout(() => {
      addBotMessage(`**Instrucción — ${field.label}**\n\n${field.ayuda}\n\nCuando esté listo, ingrese el valor correcto.`);
    }, 250);
  };

  const currentEstadoObj = ESTADOS_VENEZUELA.find(e => e.estado === formData.estado) || defaultEstadoObj;
  const isPaid = paymentStatus === 'LIQUIDADA / CONCILIADA';
  const linkedRecordObj = selectedRecordKey !== 'NEW_STANDALONE'
    ? userRecords.find(r => r.hash === selectedRecordKey)
    : null;

  const progress = isPaid
    ? 100
    : currentFieldIndex >= 0
    ? Math.round((currentFieldIndex / PUB_FIELDS.length) * 100)
    : 65;

  return (
    <div className="view-container">
      <div className="dashboard-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', width: '100%' }}>
          <div>
            <h2>Generador de Planilla Única Bancaria (SAREN PUB)</h2>
            <p>
              Vincula tu Planilla PUB directamente a tu título digitalizado en OCR (sin duplicar trámites), selecciona tu sede registral y ejecuta la conciliación interbancaria SENIAT / SAREN.
            </p>
          </div>
          {onNavigate && (
            <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => onNavigate('prevalidation')}
                className="btn-ghost"
                style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <ShieldCheck size={15} /> Ver Pre-Validación Forense
              </button>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="send-btn"
                style={{ padding: '0.5rem 0.95rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Tracking 4 Estaciones <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Barra Superior: Selector de Vinculación con Expediente OCR Existente (Evita Duplicados) ── */}
      <div
        className="glass-panel"
        style={{
          marginBottom: '1.35rem',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          borderLeft: '4px solid var(--color-sienna-brown)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flex: '1 1 320px' }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '10px',
            backgroundColor: 'var(--color-blush-peach)',
            color: 'var(--color-sienna-brown)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <FolderOpen size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Vincular Planilla PUB a Expediente Académico (Evita Duplicados):
            </label>
            <select
              value={selectedRecordKey}
              onChange={(e) => handleSelectLinkedRecord(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--color-fog-white)',
                color: 'var(--color-ink-black)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {userRecords.map((rec) => {
                const isRecPaid = Boolean(rec.paymentReference || rec.formData?.referencia_bancaria || rec.sarenVerified);
                return (
                  <option key={rec.hash} value={rec.hash}>
                    🔗 {rec.solicitudCode || 'GTU-2026'} — {rec.documentType || 'Título Universitario'} ({isRecPaid ? '✓ PUB Conciliada' : 'Pendiente PUB'}) [{rec.hash.slice(0, 10)}...]
                  </option>
                );
              })}
              <option value="NEW_STANDALONE">
                ➕ Emitir Nueva Planilla PUB Independiente (Sin Escaneo OCR Previo)
              </option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.14)' : 'var(--color-blush-peach)',
            color: isPaid ? '#065f46' : 'var(--color-sienna-brown)',
            border: isPaid ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(93, 42, 26, 0.2)',
            fontSize: '0.78rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            {isPaid ? <CheckCircle size={14} /> : <CreditCard size={14} />}
            Estatus PUB: {paymentStatus}
          </span>

          {linkedRecordObj && (
            <span style={{
              fontSize: '0.75rem',
              background: 'var(--color-fog-white)',
              border: '1px solid var(--border)',
              padding: '0.3rem 0.7rem',
              borderRadius: 'var(--radius-pill)',
              color: 'var(--text-secondary)',
              fontWeight: 600
            }}>
              Hash Vinculado: <code>{linkedRecordObj.hash.slice(0, 10)}...</code>
            </span>
          )}
        </div>
      </div>

      {/* Selector de pestañas móviles */}
      <div className="mobile-tabs-header">
        <button
          className={`mobile-tab-btn ${activeMobileTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveMobileTab('chat')}
        >
          <CreditCard size={18} />
          Liquidación y Datos
        </button>
        <button
          className={`mobile-tab-btn ${activeMobileTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveMobileTab('preview')}
        >
          <FileText size={18} />
          Vista Previa PUB
        </button>
      </div>

      <div className={`pub-form-grid ${activeMobileTab === 'chat' ? 'show-chat' : 'show-preview'}`}>

        {/* ── Columna Izquierda: Modo Pasarela SENIAT/SAREN o Asistente Chat ── */}
        <div className="chat-container" style={{ minHeight: '620px', display: 'flex', flexDirection: 'column' }}>
          <div className="chat-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div className="status-dot" style={{ backgroundColor: isPaid ? '#10b981' : 'var(--color-sienna-brown)' }} />
              <h2 style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--color-ink-black)', margin: 0 }}>
                {leftMode === 'pasarela' ? 'Liquidación y Pasarela Bancaria SAREN' : 'Asistente Conversacional PUB'}
              </h2>
            </div>

            <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--color-fog-white)', padding: '0.2rem', borderRadius: '999px', border: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={() => setLeftMode('pasarela')}
                style={{
                  border: 'none',
                  background: leftMode === 'pasarela' ? 'var(--color-ink-black)' : 'transparent',
                  color: leftMode === 'pasarela' ? '#ffffff' : 'var(--text-secondary)',
                  padding: '0.28rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ⚡ Pasarela Rápida
              </button>
              <button
                type="button"
                onClick={() => {
                  setLeftMode('chat');
                  if (messages.length === 0) handleStart();
                }}
                style={{
                  border: 'none',
                  background: leftMode === 'chat' ? 'var(--color-ink-black)' : 'transparent',
                  color: leftMode === 'chat' ? '#ffffff' : 'var(--text-secondary)',
                  padding: '0.28rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                💬 Asistente Chat
              </button>
            </div>
          </div>

          {/* Barra de progreso */}
          <div style={{ padding: '0 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--color-fog-white)' }}>
            <div style={{ background: 'var(--border)', borderRadius: '4px', height: '4px', margin: '0.65rem 0' }}>
              <motion.div
                style={{ background: isPaid ? '#10b981' : 'var(--color-ink-black)', height: '100%', borderRadius: '4px' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          {leftMode === 'pasarela' ? (
            <div style={{ padding: '1.15rem 1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* 1. Identidad del Titular (Autocompletada con Cédula Inmutable) */}
              <div style={{ background: 'var(--color-fog-white)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.9rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink-black)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Lock size={14} color="var(--color-sienna-brown)" /> 1. Identidad del Titular (Sincronizada con USM / OCR)
                  </span>
                  <span style={{ fontSize: '0.7rem', background: 'var(--color-blush-peach)', color: 'var(--color-sienna-brown)', padding: '0.12rem 0.55rem', borderRadius: '999px', fontWeight: 600 }}>
                    Cédula Protegida
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                      Cédula Titular (Inmutable) 🔒
                    </label>
                    <input
                      type="text"
                      value={formData.cedula || ''}
                      readOnly
                      disabled
                      title="La cédula del titular es inmutable para garantizar la concordancia registral ante el SAREN y MPPEU"
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.7rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        backgroundColor: '#e5e7eb',
                        color: '#374151',
                        fontSize: '0.83rem',
                        fontWeight: 700,
                        cursor: 'not-allowed'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                      Nombre Completo del Graduando
                    </label>
                    <input
                      type="text"
                      value={formData.nombre_completo || ''}
                      onChange={(e) => handleDirectFieldChange('nombre_completo', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.7rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        backgroundColor: '#ffffff',
                        fontSize: '0.83rem',
                        fontWeight: 600
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                      Teléfono de Contacto
                    </label>
                    <input
                      type="text"
                      value={formData.telefono || ''}
                      onChange={(e) => handleDirectFieldChange('telefono', e.target.value)}
                      placeholder="0414-1234567"
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.7rem',
                        borderRadius: '6px',
                        border: fieldErrors.telefono ? '1px solid var(--danger)' : '1px solid var(--border)',
                        backgroundColor: '#ffffff',
                        fontSize: '0.83rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={formData.correo || ''}
                      onChange={(e) => handleDirectFieldChange('correo', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.7rem',
                        borderRadius: '6px',
                        border: fieldErrors.correo ? '1px solid var(--danger)' : '1px solid var(--border)',
                        backgroundColor: '#ffffff',
                        fontSize: '0.83rem'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Selección de Trámite y Sede Territorial SAREN / GTU */}
              <div style={{ background: 'var(--color-fog-white)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.9rem 1rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink-black)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
                  <MapPin size={14} color="var(--color-sienna-brown)" /> 2. Trámite SAREN y Sede Territorial (`Estado → Municipio → Taquilla`)
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.65rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                      Acto o Trámite a Protocolizar (Cálculo Automático en UT / Petro)
                    </label>
                    <select
                      value={TIPOS_TRAMITE_SAREN.some(t => t.label === formData.tramite) ? formData.tramite : TIPOS_TRAMITE_SAREN[0].label}
                      onChange={(e) => handleDirectFieldChange('tramite', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.7rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        backgroundColor: '#ffffff',
                        fontSize: '0.82rem',
                        fontWeight: 600
                      }}
                    >
                      {TIPOS_TRAMITE_SAREN.map((t) => (
                        <option key={t.label} value={t.label}>
                          {t.label} — {t.ut} (Bs. {t.montoBs})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.6rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                        Estado
                      </label>
                      <select
                        value={formData.estado || defaultEstadoObj.estado}
                        onChange={(e) => handleDirectFieldChange('estado', e.target.value)}
                        style={{ width: '100%', padding: '0.48rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border)', background: '#ffffff', fontSize: '0.82rem' }}
                      >
                        {ESTADOS_VENEZUELA.map((est) => (
                          <option key={est.estado} value={est.estado}>{est.estado}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                        Municipio
                      </label>
                      <select
                        value={formData.municipio || currentEstadoObj.municipios[0]}
                        onChange={(e) => handleDirectFieldChange('municipio', e.target.value)}
                        style={{ width: '100%', padding: '0.48rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border)', background: '#ffffff', fontSize: '0.82rem' }}
                      >
                        {currentEstadoObj.municipios.map((mun) => (
                          <option key={mun} value={mun}>{mun}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                      Taquilla / Registro Principal Asignado
                    </label>
                    <select
                      value={formData.sede_taquilla || currentEstadoObj.taquillas[0].nombre}
                      onChange={(e) => handleDirectFieldChange('sede_taquilla', e.target.value)}
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border)', background: '#ffffff', fontSize: '0.82rem', fontWeight: 600 }}
                    >
                      {currentEstadoObj.taquillas.map((taq) => (
                        <option key={taq.id} value={taq.nombre}>{taq.nombre}</option>
                      ))}
                    </select>
                    <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                      📍 {formData.sede_direccion} · 🕒 {formData.sede_horario}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Innovación de Tesis: Simulador de Liquidación y Conciliación Bancaria Interbancaria (SENIAT / SAREN) */}
              <div style={{
                background: isPaid ? 'rgba(16, 185, 129, 0.06)' : '#ffffff',
                border: isPaid ? '1.5px solid rgba(16, 185, 129, 0.4)' : '1.5px solid rgba(93, 42, 26, 0.25)',
                borderRadius: '10px',
                padding: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink-black)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Building size={15} color="var(--color-sienna-brown)" /> 3. Pasarela de Conciliación Interbancaria (SENIAT / SAREN)
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.6rem',
                    borderRadius: '999px',
                    background: isPaid ? '#059669' : 'var(--color-ink-black)',
                    color: '#ffffff'
                  }}>
                    Total: Bs. {formData.monto} ({formData.unidad_tributaria})
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.65rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                      Banco Recaudador Destino (Tesorería Nacional / Convenio SAREN)
                    </label>
                    <select
                      value={formData.banco_receptor_id || 'bdv'}
                      onChange={(e) => handleDirectFieldChange('banco_receptor_id', e.target.value)}
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border)', background: '#ffffff', fontSize: '0.82rem', fontWeight: 600 }}
                    >
                      {BANCOS_RECEPTORES_SAREN.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.nombre} — Cta: {b.cuenta} ({b.rif})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.6rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                        Banco Origen del Pagador
                      </label>
                      <select
                        value={formData.pago_banco || BANCOS_PAGADOR[0]}
                        onChange={(e) => handleDirectFieldChange('pago_banco', e.target.value)}
                        style={{ width: '100%', padding: '0.48rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border)', background: '#ffffff', fontSize: '0.81rem' }}
                      >
                        {BANCOS_PAGADOR.map(bp => (
                          <option key={bp} value={bp}>{bp}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                        Teléfono Pago Móvil
                      </label>
                      <input
                        type="text"
                        value={formData.pago_telefono || ''}
                        onChange={(e) => handleDirectFieldChange('pago_telefono', e.target.value)}
                        placeholder="0414-1234567"
                        style={{ width: '100%', padding: '0.48rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border)', background: '#ffffff', fontSize: '0.82rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-ink-black)' }}>
                        Número de Referencia Interbancaria (12 dígitos)
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateBankRef}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-sienna-brown)',
                          fontSize: '0.73rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: 0
                        }}
                      >
                        <RefreshCw size={12} /> Autogenerar Ref. 12 Dígitos
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        maxLength={12}
                        value={formData.referencia_bancaria || ''}
                        onChange={(e) => handleDirectFieldChange('referencia_bancaria', e.target.value.replace(/\D/g, ''))}
                        placeholder="Ej: 202648910234 (o pulsa Conciliar para simular pasarela)"
                        style={{
                          flex: 1,
                          padding: '0.55rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          background: '#ffffff',
                          fontFamily: 'monospace',
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          letterSpacing: '1px'
                        }}
                      />
                    </div>
                  </div>

                  {Object.keys(fieldErrors).length > 0 && (
                    <div style={{ padding: '0.55rem 0.75rem', borderRadius: '6px', background: 'rgba(185, 28, 28, 0.08)', color: 'var(--danger)', fontSize: '0.76rem' }}>
                      Verifica los datos de contacto o teléfono antes de conciliar la planilla.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSimulateBankConciliation}
                    disabled={isConciliating || isHashing}
                    className="send-btn"
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      backgroundColor: isPaid ? '#059669' : 'var(--color-ink-black)'
                    }}
                  >
                    <Sparkles size={17} />
                    {isConciliating
                      ? 'Conciliando pago con Cámara de Compensación SENIAT / SAREN...'
                      : isPaid
                      ? '✓ Pago Conciliado y Sincronizado (Actualizar / Re-Anclar)'
                      : '⚡ Registrar Pago Bancario (Simulación Pasarela Tesorería Nacional)'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="chat-messages">
                {messages.length === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1.2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <FileText size={44} opacity={0.35} color="var(--color-ink-black)" />
                    <div>
                      <h3 style={{ color: 'var(--color-ink-black)', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.3rem', marginBottom: '0.4rem' }}>Asistente Conversacional PUB</h3>
                      <p style={{ fontSize: '0.86rem' }}>Reconoce automáticamente los campos ya extraídos de tu expediente y valida la referencia bancaria en tiempo real.</p>
                    </div>
                    <button className="send-btn" style={{ padding: '0.75rem 1.8rem' }} onClick={handleStart}>
                      Iniciar / Continuar en Modo Chat
                    </button>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`message ${msg.sender}`}
                    style={msg.isError ? { borderLeft: '3px solid var(--danger)', background: 'rgba(185, 28, 28, 0.06)' } : {}}
                  >
                    <span dangerouslySetInnerHTML={{
                      __html: msg.text
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/`(.*?)`/g, '<code style="background:var(--color-fog-white);border:1px solid var(--border);padding:0.1rem 0.4rem;border-radius:4px;font-family:monospace;font-size:0.8rem;word-break:break-all">$1</code>')
                        .replace(/\n/g, '<br/>')
                    }} />
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-input-area">
                {currentFieldIndex >= 0 && (
                  <div style={{ marginBottom: '0.65rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleAyudaRapida}
                      style={{ background: 'var(--color-blush-peach)', color: 'var(--color-sienna-brown)', border: '1px solid rgba(93, 42, 26, 0.25)', borderRadius: 'var(--radius-inputs)', padding: '0.35rem 0.85rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600' }}
                    >
                      Ver Instrucciones del Campo
                    </button>
                    {PUB_FIELDS[currentFieldIndex]?.id === 'referencia_bancaria' && (
                      <button
                        type="button"
                        onClick={() => {
                          const ref12 = `${new Date().getFullYear()}${Math.floor(10000000 + Math.random() * 90000000)}`;
                          setInputVal(ref12);
                        }}
                        style={{ background: 'var(--color-fog-white)', color: 'var(--color-ink-black)', border: '1px solid var(--border)', borderRadius: 'var(--radius-inputs)', padding: '0.35rem 0.85rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600' }}
                      >
                        🎲 Usar Referencia Simulada (12 dígitos)
                      </button>
                    )}
                  </div>
                )}
                <form className="input-wrapper" onSubmit={handleSend}>
                  <input
                    type="text"
                    className="chat-input"
                    placeholder={currentFieldIndex >= 0 ? `"${PUB_FIELDS[currentFieldIndex]?.label}"...` : isComplete ? 'Planilla conciliada' : 'Presiona "Iniciar" para comenzar...'}
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    disabled={currentFieldIndex < 0}
                  />
                  <button type="submit" className="send-btn" disabled={currentFieldIndex < 0 || !inputVal.trim()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* ── Vista Previa Oficial del Formulario PUB ──────────────────────────── */}
        <motion.div
          className="glass-panel"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.2rem', color: 'var(--color-ink-black)', margin: 0 }}>
              <FileText size={20} color="var(--color-sienna-brown)" />
              Vista Previa Oficial — Planilla PUB
            </h3>
            <button
              className="send-btn"
              style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
              onClick={() => {
                const element = document.getElementById('pub-preview');
                const opt = {
                  margin: 10,
                  filename: `Planilla_PUB_${formData.cedula || 'USM'}_${stablePubCode.current}.pdf`,
                  image: { type: 'jpeg', quality: 0.98 },
                  html2canvas: { scale: 2 },
                  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };
                html2pdf().set(opt).from(element).save();
              }}
            >
              <Download size={15} /> Exportar PDF Oficial
            </button>
          </div>

          <div className="pdf-preview-container" ref={containerRef} style={{ width: '100%', overflow: 'auto', maxHeight: '72vh', height: scaledHeight }}>
            <div
              id="pub-preview"
              ref={previewRef}
              style={{
                padding: '1.75rem 2rem',
                background: '#ffffff',
                color: '#000000',
                fontFamily: '"Arial", sans-serif',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                minWidth: '700px',
                width: '700px',
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                transition: 'transform 0.15s ease-out',
                position: 'relative'
              }}
            >
              {/* Membrete oficial de VENEZUELA */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #1a365d', paddingBottom: '0.85rem', marginBottom: '1.15rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'inline-block',
                    padding: '0.35rem 0.6rem',
                    border: '1.5px solid #1a365d',
                    borderRadius: '4px',
                    fontSize: '0.6rem',
                    fontWeight: 900,
                    color: '#1a365d',
                    textAlign: 'center',
                    lineHeight: 1.25
                  }}>
                    SENIAT / SAREN<br />
                    TESORERÍA NACIONAL
                  </div>
                </div>

                <div style={{ textAlign: 'center', flex: 3 }}>
                  <p style={{ fontSize: '0.62rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, color: '#4a5568' }}>República Bolivariana de Venezuela</p>
                  <p style={{ fontSize: '0.6rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, color: '#4a5568' }}>Ministerio del Poder Popular para Relaciones Interiores, Justicia y Paz</p>
                  <h4 style={{ fontSize: '1.02rem', margin: '0.35rem 0', color: '#1a365d', fontWeight: '900' }}>SERVICIO AUTÓNOMO DE REGISTROS Y NOTARÍAS</h4>
                  <p style={{ fontSize: '0.85rem', color: '#2b6cb0', fontWeight: '800', letterSpacing: '1.2px', margin: 0 }}>PLANILLA ÚNICA BANCARIA (PUB)</p>
                </div>

                <div style={{ flex: 1, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem' }}>
                    <div style={{ display: 'flex', height: '22px', background: '#ffffff', gap: '1px' }}>
                      {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 1].map((w, i) => (
                        <div key={i} style={{ width: `${w}px`, height: '100%', background: i % 2 === 0 ? '#000000' : '#ffffff' }} />
                      ))}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.48rem', fontFamily: 'monospace', letterSpacing: '0.5px', fontWeight: 'bold' }}>*{stablePubCode.current}*</p>
                  </div>
                  <div style={{ border: '1px solid #cbd5e0', padding: '0.2rem 0.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '4px', display: 'inline-block' }}>
                    <p style={{ margin: 0, fontSize: '0.45rem', color: '#718096', fontWeight: 'bold' }}>NRO. PLANILLA</p>
                    <p style={{ margin: 0, fontSize: '0.62rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{stableTramiteNum.current}</p>
                  </div>
                </div>
              </div>

              {/* Datos del Solicitante */}
              <h5 style={{ background: '#edf2f7', padding: '0.4rem 0.6rem', margin: '0 0 0.75rem 0', fontSize: '0.75rem', borderLeft: '4px solid #3182ce', color: '#2d3748', textTransform: 'uppercase' }}>
                1. Datos de Identidad del Solicitante
              </h5>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.1rem' }}>
                <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.25rem' }}>
                  <p style={{ fontSize: '0.58rem', color: '#718096', margin: '0 0 0.15rem 0', fontWeight: 'bold' }}>NOMBRES Y APELLIDOS DEL TITULAR</p>
                  <p style={{ fontSize: '0.84rem', color: '#1a202c', margin: 0, fontWeight: '700' }}>{formData.nombre_completo || '----------------------'}</p>
                </div>
                <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.25rem' }}>
                  <p style={{ fontSize: '0.58rem', color: '#718096', margin: '0 0 0.15rem 0', fontWeight: 'bold' }}>CÉDULA DE IDENTIDAD INMUTABLE</p>
                  <p style={{ fontSize: '0.84rem', color: '#1a202c', margin: 0, fontWeight: '700' }}>{formData.cedula || '----------------------'}</p>
                </div>
                <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.25rem' }}>
                  <p style={{ fontSize: '0.58rem', color: '#718096', margin: '0 0 0.15rem 0', fontWeight: 'bold' }}>TELÉFONO MÓVIL</p>
                  <p style={{ fontSize: '0.82rem', color: '#1a202c', margin: 0, fontWeight: '600' }}>{formData.telefono || '----------------------'}</p>
                </div>
                <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.25rem' }}>
                  <p style={{ fontSize: '0.58rem', color: '#718096', margin: '0 0 0.15rem 0', fontWeight: 'bold' }}>CORREO ELECTRÓNICO</p>
                  <p style={{ fontSize: '0.82rem', color: '#1a202c', margin: 0, fontWeight: '600' }}>{formData.correo || '----------------------'}</p>
                </div>
              </div>

              {/* Datos del Trámite y Sede Territorial */}
              <h5 style={{ background: '#edf2f7', padding: '0.4rem 0.6rem', margin: '0 0 0.75rem 0', fontSize: '0.75rem', borderLeft: '4px solid #3182ce', color: '#2d3748', textTransform: 'uppercase' }}>
                2. Datos del Acto Jurídico y Jurisdicción Registral (SAREN / GTU)
              </h5>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.1rem' }}>
                <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.25rem' }}>
                  <p style={{ fontSize: '0.58rem', color: '#718096', margin: '0 0 0.15rem 0', fontWeight: 'bold' }}>DESCRIPCIÓN DEL TRÁMITE</p>
                  <p style={{ fontSize: '0.8rem', color: '#1a202c', margin: 0, fontWeight: '700', textTransform: 'uppercase' }}>{formData.tramite || '----------------------'}</p>
                </div>
                <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.25rem' }}>
                  <p style={{ fontSize: '0.58rem', color: '#718096', margin: '0 0 0.15rem 0', fontWeight: 'bold' }}>INSTITUCIÓN EDUCATIVA EMISORA</p>
                  <p style={{ fontSize: '0.8rem', color: '#1a202c', margin: 0, fontWeight: '700', textTransform: 'uppercase' }}>{formData.institucion || 'UNIVERSIDAD SANTA MARÍA (USM)'}</p>
                </div>
                <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.25rem' }}>
                  <p style={{ fontSize: '0.58rem', color: '#718096', margin: '0 0 0.15rem 0', fontWeight: 'bold' }}>JURISDICCIÓN (ESTADO / MUNICIPIO)</p>
                  <p style={{ fontSize: '0.8rem', color: '#1a202c', margin: 0, fontWeight: '600' }}>{formData.estado || 'Distrito Capital'} — {formData.municipio || 'Libertador'}</p>
                </div>
                <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.25rem' }}>
                  <p style={{ fontSize: '0.58rem', color: '#718096', margin: '0 0 0.15rem 0', fontWeight: 'bold' }}>OFICINA REGISTRAL / TAQUILLA ASIGNADA</p>
                  <p style={{ fontSize: '0.78rem', color: '#1a202c', margin: 0, fontWeight: '600' }}>{formData.sede_taquilla || 'Registro Principal'}</p>
                </div>
              </div>

              {/* Liquidación de Aranceles */}
              <h5 style={{ background: '#edf2f7', padding: '0.4rem 0.6rem', margin: '0 0 0.75rem 0', fontSize: '0.75rem', borderLeft: '4px solid #3182ce', color: '#2d3748', textTransform: 'uppercase' }}>
                3. Liquidación de Aranceles y Tasas Fiscales (Art. 45 Ley de Registros y del Notariado)
              </h5>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '1.1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f7fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '0.4rem 0.5rem', textAlign: 'left', fontSize: '0.62rem', color: '#4a5568' }}>CÓD.</th>
                      <th style={{ padding: '0.4rem 0.5rem', textAlign: 'left', fontSize: '0.62rem', color: '#4a5568' }}>CONCEPTO TRIBUTARIO</th>
                      <th style={{ padding: '0.4rem 0.5rem', textAlign: 'center', fontSize: '0.62rem', color: '#4a5568' }}>UNIDAD</th>
                      <th style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontSize: '0.62rem', color: '#4a5568' }}>MONTO (Bs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '0.4rem 0.5rem', fontSize: '0.78rem', borderBottom: '1px solid #edf2f7', fontFamily: 'monospace' }}>45-01</td>
                      <td style={{ padding: '0.4rem 0.5rem', fontSize: '0.78rem', borderBottom: '1px solid #edf2f7' }}>Derechos de Protocolización: {formData.tramite || 'Título Universitario'}</td>
                      <td style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem', borderBottom: '1px solid #edf2f7', textAlign: 'center' }}>{formData.unidad_tributaria || '0.50 UT'}</td>
                      <td style={{ padding: '0.4rem 0.5rem', fontSize: '0.78rem', borderBottom: '1px solid #edf2f7', textAlign: 'right', fontWeight: 'bold' }}>{formData.derechos_registro || '6235.30'}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.4rem 0.5rem', fontSize: '0.78rem', borderBottom: '1px solid #edf2f7', fontFamily: 'monospace' }}>45-02</td>
                      <td style={{ padding: '0.4rem 0.5rem', fontSize: '0.78rem', borderBottom: '1px solid #edf2f7' }}>Procesamiento de Legajo Digital y Timbre Fiscal Electrónico</td>
                      <td style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem', borderBottom: '1px solid #edf2f7', textAlign: 'center' }}>Tasa Fija</td>
                      <td style={{ padding: '0.4rem 0.5rem', fontSize: '0.78rem', borderBottom: '1px solid #edf2f7', textAlign: 'right', fontWeight: 'bold' }}>{formData.procesamiento_digital || '2494.10'}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#edf2f7' }}>
                      <td colSpan="3" style={{ padding: '0.45rem 0.5rem', textAlign: 'right', fontSize: '0.74rem', fontWeight: 'bold' }}>TOTAL LIQUIDADO A PAGAR:</td>
                      <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', fontSize: '0.88rem', fontWeight: '900', color: isPaid ? '#047857' : '#e53e3e' }}>Bs. {formData.monto || '8729.40'}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Conciliación Bancaria Interbancaria */}
              <h5 style={{ background: '#edf2f7', padding: '0.4rem 0.6rem', margin: '0 0 0.75rem 0', fontSize: '0.75rem', borderLeft: '4px solid #3182ce', color: '#2d3748', textTransform: 'uppercase' }}>
                4. Conciliación Interbancaria (SENIAT / Tesorería Nacional)
              </h5>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.65rem', marginBottom: '1rem' }}>
                <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.25rem' }}>
                  <p style={{ fontSize: '0.55rem', color: '#718096', margin: '0 0 0.15rem 0', fontWeight: 'bold' }}>CÉDULA PAGADOR</p>
                  <p style={{ fontSize: '0.78rem', color: '#1a202c', margin: 0, fontWeight: '600' }}>{formData.pago_cedula || '----------------------'}</p>
                </div>
                <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.25rem' }}>
                  <p style={{ fontSize: '0.55rem', color: '#718096', margin: '0 0 0.15rem 0', fontWeight: 'bold' }}>TELÉFONO PAGADOR</p>
                  <p style={{ fontSize: '0.78rem', color: '#1a202c', margin: 0, fontWeight: '600' }}>{formData.pago_telefono || '----------------------'}</p>
                </div>
                <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.25rem' }}>
                  <p style={{ fontSize: '0.55rem', color: '#718096', margin: '0 0 0.15rem 0', fontWeight: 'bold' }}>BANCO ORIGEN</p>
                  <p style={{ fontSize: '0.76rem', color: '#1a202c', margin: 0, fontWeight: '600' }}>{formData.pago_banco || '----------------------'}</p>
                </div>
                <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.25rem' }}>
                  <p style={{ fontSize: '0.55rem', color: '#718096', margin: '0 0 0.15rem 0', fontWeight: 'bold' }}>REF. INTERBANCARIA (12D)</p>
                  <p style={{ fontSize: '0.8rem', color: '#047857', margin: 0, fontWeight: '800', fontFamily: 'monospace' }}>
                    {formData.referencia_bancaria ? `#${formData.referencia_bancaria}` : 'PENDIENTE'}
                  </p>
                </div>
              </div>

              {/* Pie de Planilla con Sello de Conciliación y QR Blockchain */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div style={{
                  border: isPaid ? '1.5px solid #059669' : '1px solid #cbd5e0',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  background: isPaid ? '#ecfdf5' : '#f8fafc'
                }}>
                  <p style={{ fontSize: '0.58rem', color: '#4a5568', margin: '0 0 0.3rem 0', fontWeight: 'bold' }}>
                    CERTIFICACIÓN DE RECAUDACIÓN TESORERÍA NACIONAL / SAREN
                  </p>
                  <p style={{ fontSize: '0.76rem', color: '#2d3748', margin: '0 0 0.2rem 0' }}>
                    <strong>BANCO RECEPTOR:</strong> {formData.banco_destino || 'Banco de Venezuela'}
                  </p>
                  <p style={{ fontSize: '0.76rem', color: '#2d3748', margin: '0 0 0.2rem 0' }}>
                    <strong>CUENTA OFICIAL:</strong> {formData.nro_cuenta || '0102-0552-22-0000001234'}
                  </p>
                  <p style={{ fontSize: '0.78rem', color: isPaid ? '#065f46' : '#c53030', margin: 0, fontWeight: 800 }}>
                    <strong>ESTATUS FISCAL:</strong> {paymentStatus}
                    {conciliationTimestamp ? ` (${conciliationTimestamp})` : ''}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e0', padding: '0.5rem', borderRadius: '6px' }}>
                  <p style={{ fontSize: '0.5rem', color: '#4a5568', marginBottom: '0.25rem', textAlign: 'center', fontWeight: 700 }}>
                    Timbre Fiscal Electrónico (Sepolia)
                  </p>
                  <div style={{ width: '62px', height: '62px', display: 'grid', placeItems: 'center' }}>
                    <QRCodeSVG
                      value={`${window.location.origin}/?hash=${blockchainHash || linkedRecordObj?.hash || stablePubCode.current}`}
                      size={60}
                    />
                  </div>
                  <p style={{ fontSize: '0.42rem', marginTop: '0.2rem', fontFamily: 'monospace', color: '#2d3748' }}>
                    {(blockchainHash || linkedRecordObj?.hash || stablePubCode.current).substring(0, 18)}...
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta de Huella Digital Blockchain Vinculada */}
          <AnimatePresence>
            {blockchainHash && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: '1.15rem', padding: '1rem 1.15rem', background: 'var(--color-fog-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-inputs)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <p style={{ color: '#065f46', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.86rem' }}>
                    <ShieldCheck size={18} /> Planilla PUB Conciliada y Vinculada al Expediente Blockchain
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(blockchainHash);
                      setCopiedHash(true);
                      setTimeout(() => setCopiedHash(false), 2000);
                    }}
                    className="btn-ghost"
                    style={{ padding: '0.22rem 0.65rem', fontSize: '0.74rem' }}
                  >
                    {copiedHash ? '¡Copiado!' : 'Copiar Hash'}
                  </button>
                </div>

                <p style={{ fontFamily: 'monospace', fontSize: '0.73rem', color: 'var(--color-ink-black)', background: '#ffffff', border: '1px solid var(--border)', padding: '0.45rem 0.7rem', borderRadius: '6px', wordBreak: 'break-all', margin: '0.35rem 0' }}>
                  Hash Expediente: {blockchainHash}
                  {pubSpecificHash && pubSpecificHash !== blockchainHash ? ` | Hash PUB: ${pubSpecificHash.slice(0, 18)}...` : ''}
                </p>

                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setShowCert(true)}
                    className="send-btn"
                    style={{ flex: 1, padding: '0.65rem 0.9rem', fontSize: '0.8rem' }}
                  >
                    <ShieldCheck size={16} /> Ver Certificado Digital
                  </button>
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('prevalidation')}
                      className="btn-ghost"
                      style={{ flex: 1, padding: '0.65rem 0.9rem', fontSize: '0.8rem' }}
                    >
                      Verificar en Pre-Validación <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

      </div>

      <AnimatePresence>
        {showCert && blockchainHash && (
          <DigitalCertificate docHash={blockchainHash} onClose={() => setShowCert(false)} onVerifyHash={onVerifyHash} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PUBForm;
