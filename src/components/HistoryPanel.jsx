import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ClipboardList, ShieldCheck, Download, X, Copy, Check, Clock, AlertCircle, FileText, Award } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import html2pdf from 'html2pdf.js';
import { blockchainAPI } from '../services/api';
import DigitalCertificate from './DigitalCertificate';
import ApostilleCertificate from './ApostilleCertificate';

// Modal de previsualización de la Planilla PUB con escala responsiva
const PUBPreviewModal = ({ record, onClose, onVerifyHash }) => {
  const [scale, setScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState('auto');
  const containerRef = useRef(null);
  const previewRef = useRef(null);

  const hash = record.hash || '0x0000000000000000000000000000000000000000000000000000000000000000';

  const formData = record.formData || {
    nombre_completo: record.owner_name,
    cedula: record.cedula,
    tramite: record.document_type,
    institucion: 'Universidad Santa María',
    pago_cedula: record.cedula,
    pago_telefono: '----------------------',
    pago_banco: '----------------------',
    confirmacion_pago: 'listo',
    banco_destino: 'Banco de Venezuela',
    monto: record.document_type === 'apostilla' ? '17458.80' : '8729.40',
    nro_cuenta: '0102-0552-22-0000001234'
  };

  const updateScale = () => {
    if (containerRef.current && previewRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const targetWidth = 702; // 700px minWidth + bordes
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
  }, []);

  const handleExportPDF = () => {
    const element = document.getElementById('history-pub-preview-sheet');
    const opt = {
      margin: 10,
      filename: `Planilla_PUB_${formData.cedula || 'USM'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="cert-modal-overlay" style={{ zIndex: 1100, padding: '1rem', backgroundColor: 'rgba(23, 25, 28, 0.55)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-cards)',
          padding: '0',
          maxWidth: '840px',
          width: '100%',
          maxHeight: '92vh',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-hover)',
          border: '1px solid var(--border)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Cabecera Sticky Fija */}
        <div style={{
          padding: '0.9rem 1.4rem',
          background: 'var(--color-fog-white)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', color: 'var(--color-ink-black)', fontFamily: 'var(--font-serif)', fontWeight: 400 }}>
            <ClipboardList color="var(--color-sienna-brown)" size={18} />
            Previsualización Oficial — Planilla PUB
          </h3>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <button
              onClick={handleExportPDF}
              className="send-btn"
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Download size={14} /> Descargar PDF
            </button>
            <button
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid var(--border)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--color-ink-black)'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div
          ref={containerRef}
          style={{
            width: '100%',
            overflow: 'auto',
            maxHeight: '70vh',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}
        >
          <div
            id="history-pub-preview-sheet"
            ref={previewRef}
            style={{
              padding: '2rem',
              background: '#ffffff',
              color: '#000000',
              fontFamily: '"Arial", sans-serif',
              minWidth: '700px',
              width: '700px',
              transform: `scale(${scale})`,
              transformOrigin: 'top left'
            }}
          >
            {/* Cabecera MPPRE */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #1a365d', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <img src="/images/mppre_facade.png" alt="Escudo" style={{ height: '50px', objectFit: 'contain', opacity: 0.1 }} onError={(e) => e.target.style.display = 'none'} />
              </div>
              <div style={{ textAlign: 'center', flex: 3 }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, color: '#4a5568' }}>República Bolivariana de Venezuela</p>
                <p style={{ fontSize: '0.6rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, color: '#4a5568' }}>Ministerio del Poder Popular para Relaciones Interiores, Justicia y Paz</p>
                <h4 style={{ fontSize: '0.95rem', margin: '0.4rem 0', color: '#1a365d', fontWeight: '900' }}>SERVICIO AUTÓNOMO DE REGISTROS Y NOTARÍAS</h4>
                <p style={{ fontSize: '0.8rem', color: '#2b6cb0', fontWeight: '800', letterSpacing: '1px', margin: 0 }}>PLANILLA ÚNICA BANCARIA (PUB)</p>
              </div>
              <div style={{ flex: 1, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem' }}>
                  <div style={{ display: 'flex', height: '20px', background: '#ffffff', gap: '1px' }}>
                    {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 1].map((w, i) => (
                      <div key={i} style={{ width: `${w}px`, height: '100%', background: i % 2 === 0 ? '#000000' : '#ffffff' }} />
                    ))}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.45rem', fontFamily: 'monospace', letterSpacing: '0.5px', fontWeight: 'bold' }}>*PUB-{hash.substring(2, 14).toUpperCase()}*</p>
                </div>
                <div style={{ border: '1px solid #cbd5e0', padding: '0.2rem 0.4rem', textAlign: 'center', background: '#f8fafc', borderRadius: '4px', display: 'inline-block' }}>
                  <p style={{ margin: 0, fontSize: '0.4rem', color: '#718096', fontWeight: 'bold' }}>NRO. TRÁMITE</p>
                  <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{hash.substring(14, 22).replace(/[^0-9]/g, '9') || '98765432'}</p>
                </div>
              </div>
            </div>

            {/* Datos Solicitante */}
            <div style={{ marginBottom: '1.2rem' }}>
              <div style={{ background: '#ebf8ff', padding: '0.4rem 0.8rem', borderLeft: '4px solid #3182ce', fontWeight: 'bold', fontSize: '0.75rem', color: '#2b6cb0', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                Datos del Solicitante
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.2rem' }}>
                  <p style={{ fontSize: '0.55rem', color: '#718096', margin: '0 0 0.1rem 0', fontWeight: 'bold' }}>NOMBRES Y APELLIDOS</p>
                  <p style={{ fontSize: '0.8rem', color: '#1a202c', margin: 0, fontWeight: '600' }}>{formData.nombre_completo}</p>
                </div>
                <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.2rem' }}>
                  <p style={{ fontSize: '0.55rem', color: '#718096', margin: '0 0 0.1rem 0', fontWeight: 'bold' }}>CÉDULA DE IDENTIDAD / PASAPORTE</p>
                  <p style={{ fontSize: '0.8rem', color: '#1a202c', margin: 0, fontWeight: '600' }}>{formData.cedula}</p>
                </div>
                <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.2rem' }}>
                  <p style={{ fontSize: '0.55rem', color: '#718096', margin: '0 0 0.1rem 0', fontWeight: 'bold' }}>TELÉFONO MÓVIL</p>
                  <p style={{ fontSize: '0.8rem', color: '#1a202c', margin: 0, fontWeight: '600' }}>{formData.telefono || '----------------------'}</p>
                </div>
                <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.2rem' }}>
                  <p style={{ fontSize: '0.55rem', color: '#718096', margin: '0 0 0.1rem 0', fontWeight: 'bold' }}>CORREO ELECTRÓNICO</p>
                  <p style={{ fontSize: '0.8rem', color: '#1a202c', margin: 0, fontWeight: '600' }}>{formData.correo || '----------------------'}</p>
                </div>
              </div>
            </div>

            {/* Datos Trámite */}
            <div style={{ marginBottom: '1.2rem' }}>
              <div style={{ background: '#ebf8ff', padding: '0.4rem 0.8rem', borderLeft: '4px solid #3182ce', fontWeight: 'bold', fontSize: '0.75rem', color: '#2b6cb0', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                Datos del Trámite e Institución
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.2rem' }}>
                  <p style={{ fontSize: '0.55rem', color: '#718096', margin: '0 0 0.1rem 0', fontWeight: 'bold' }}>DESCRIPCIÓN DEL ACTO O NEGOCIO JURÍDICO</p>
                  <p style={{ fontSize: '0.8rem', color: '#1a202c', margin: 0, fontWeight: '600', textTransform: 'uppercase' }}>{formData.tramite}</p>
                </div>
                <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.2rem' }}>
                  <p style={{ fontSize: '0.55rem', color: '#718096', margin: '0 0 0.1rem 0', fontWeight: 'bold' }}>INSTITUCIÓN EDUCATIVA DE ORIGEN</p>
                  <p style={{ fontSize: '0.8rem', color: '#1a202c', margin: 0, fontWeight: '600' }}>{formData.institucion}</p>
                </div>
              </div>
            </div>

            {/* Liquidación de aranceles */}
            <div style={{ marginBottom: '1.2rem' }}>
              <div style={{ background: '#ebf8ff', padding: '0.4rem 0.8rem', borderLeft: '4px solid #3182ce', fontWeight: 'bold', fontSize: '0.75rem', color: '#2b6cb0', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                Liquidación de Aranceles y Tasas
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ background: '#f7fafc', borderBottom: '2px solid #cbd5e0' }}>
                    <th style={{ padding: '0.4rem', textAlign: 'left', fontWeight: 'bold' }}>CANT.</th>
                    <th style={{ padding: '0.4rem', textAlign: 'left', fontWeight: 'bold' }}>CONCEPTO</th>
                    <th style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 'bold' }}>MONTO (Bs.)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.4rem' }}>1</td>
                    <td style={{ padding: '0.4rem' }}>Procesamiento de Trámite - {formData.tramite.toUpperCase()}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right' }}>{formData.monto}</td>
                  </tr>
                  <tr style={{ borderTop: '2px solid #cbd5e0', fontWeight: 'bold', background: '#f8fafc' }}>
                    <td colSpan="2" style={{ padding: '0.5rem', textAlign: 'right', color: '#c53030' }}>TOTAL A PAGAR:</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', color: '#c53030', fontSize: '0.85rem' }}>{formData.monto} Bs.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Datos del Pago Móvil */}
            <div style={{ marginBottom: '1.2rem' }}>
              <div style={{ background: '#ebf8ff', padding: '0.4rem 0.8rem', borderLeft: '4px solid #3182ce', fontWeight: 'bold', fontSize: '0.75rem', color: '#2b6cb0', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                Datos del Pago Móvil
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem' }}>
                <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.2rem' }}>
                  <p style={{ fontSize: '0.55rem', color: '#718096', margin: '0 0 0.1rem 0', fontWeight: 'bold' }}>CÉDULA DEL PAGADOR</p>
                  <p style={{ fontSize: '0.8rem', color: '#1a202c', margin: 0, fontWeight: '600' }}>{formData.pago_cedula || formData.cedula}</p>
                </div>
                <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.2rem' }}>
                  <p style={{ fontSize: '0.55rem', color: '#718096', margin: '0 0 0.1rem 0', fontWeight: 'bold' }}>TELÉFONO DEL PAGADOR</p>
                  <p style={{ fontSize: '0.8rem', color: '#1a202c', margin: 0, fontWeight: '600' }}>{formData.pago_telefono}</p>
                </div>
                <div style={{ borderBottom: '1px solid #cbd5e0', paddingBottom: '0.2rem' }}>
                  <p style={{ fontSize: '0.55rem', color: '#718096', margin: '0 0 0.1rem 0', fontWeight: 'bold' }}>BANCO DEL PAGADOR</p>
                  <p style={{ fontSize: '0.8rem', color: '#1a202c', margin: 0, fontWeight: '600' }}>{formData.pago_banco}</p>
                </div>
              </div>
            </div>

            {/* Info bancaria e Hito */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div style={{ border: '1px solid #cbd5e0', padding: '0.6rem', borderRadius: '4px', background: '#f8fafc' }}>
                <p style={{ fontSize: '0.55rem', color: '#718096', margin: '0 0 0.3rem 0', fontWeight: 'bold' }}>INFORMACIÓN DE DEPÓSITO / TRANSFERENCIA</p>
                <p style={{ fontSize: '0.75rem', color: '#2d3748', margin: '0 0 0.1rem 0' }}><strong>BANCO DESTINO:</strong> {formData.banco_destino}</p>
                <p style={{ fontSize: '0.75rem', color: '#2d3748', margin: '0 0 0.1rem 0' }}><strong>CUENTA:</strong> {formData.nro_cuenta}</p>
                <p style={{ fontSize: '0.75rem', color: '#2d3748', margin: 0 }}><strong>ESTADO:</strong> PAGADO (HUELLA BLOCKCHAIN CONSOLIDADA)</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e0', padding: '0.4rem', background: '#f8fafc' }}>
                <p style={{ fontSize: '0.45rem', color: '#a0aec0', marginBottom: '0.2rem', textAlign: 'center', fontWeight: 'bold' }}>Timbre Fiscal Electrónico (Blockchain)</p>
                <div style={{ width: '50px', height: '50px', display: 'grid', placeItems: 'center' }}>
                  <QRCodeSVG value={`${window.location.origin}/?hash=${hash}`} size={50} />
                </div>
                <p style={{ fontSize: '0.35rem', marginTop: '0.2rem', fontFamily: 'monospace' }}>{hash.substring(0, 15)}...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer del Modal con Cierre Táctil en Móvil */}
        <div style={{ padding: '0.85rem 1.4rem', background: 'var(--color-fog-white)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem' }}>
          {onVerifyHash && (
            <button
              onClick={() => {
                onVerifyHash(hash);
                onClose && onClose();
              }}
              className="send-btn"
              style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
            >
              Verificar Hash Criptográfico
            </button>
          )}
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ padding: '0.6rem 1.2rem', flex: 1 }}
          >
            Cerrar Ventana
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Componente principal de Historial de Trámites
const HistoryPanel = ({ user, onVerifyHash }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCertHash, setActiveCertHash] = useState(null);
  const [activePUBRecord, setActivePUBRecord] = useState(null);
  const [activeApostilleRecord, setActiveApostilleRecord] = useState(null);
  const [copiedHash, setCopiedHash] = useState(null);

  // Normaliza cualquier formato de cédula a solo letras+números en mayúsculas
  // Ej: "V-28.315.101" → "V28315101", "v28315101" → "V28315101"
  const normalizeCedula = (ced) => {
    return (ced || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  };

  // Jerarquía estricta de estatus del trámite (el estatus más avanzado siempre gana y nunca retrocede)
  const getStatusPriority = (status) => {
    if (!status) return 0;
    const s = String(status).toUpperCase();
    if (s.includes('APOSTILL')) return 50;
    if (s.includes('CERTIFICAD') || s.includes('VERIFICAD') || s.includes('APROBAD')) return 40;
    if (s.includes('COTEJO')) return 20;
    if (s.includes('SOLICITUD') || s.includes('EMITID') || s.includes('REGISTRADO')) return 10;
    if (s.includes('RECHAZ') || s.includes('REVOCAD')) return 5;
    return 15;
  };

  const renderStatusBadge = (status, record) => {
    const s = (status || '').toUpperCase();
    const hasApostille = Boolean(s.includes('APOSTILL') || record?.apostilleNumber || record?.mppreVerified);
    const hasCert = Boolean(s.includes('CERTIFICAD') || s.includes('VERIFICAD') || s.includes('APROBAD') || record?.mppeuVerified);

    if (hasApostille) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.25rem 0.75rem',
          borderRadius: 'var(--radius-pill)',
          background: '#dcfce7',
          color: '#15803d',
          border: '1px solid #86efac',
          fontSize: '0.78rem',
          fontWeight: 700
        }}>
          <Check size={14} /> Trámite Finalizado y Apostillado (MPPRE)
        </span>
      );
    }
    if (hasCert) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.25rem 0.75rem',
          borderRadius: 'var(--radius-pill)',
          background: '#e0f2fe',
          color: '#0369a1',
          border: '1px solid #7dd3fc',
          fontSize: '0.78rem',
          fontWeight: 700
        }}>
          <ShieldCheck size={14} /> Cotejado y Certificado on-chain (MPPEU)
        </span>
      );
    }
    if (s.includes('RECHAZ') || s.includes('REVOCAD')) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.25rem 0.75rem',
          borderRadius: 'var(--radius-pill)',
          background: '#fee2e2',
          color: '#b91c1c',
          border: '1px solid #fca5a5',
          fontSize: '0.78rem',
          fontWeight: 700
        }}>
          <AlertCircle size={14} /> Trámite Rechazado
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.25rem 0.75rem',
        borderRadius: 'var(--radius-pill)',
        background: '#fef3c7',
        color: '#b45309',
        border: '1px solid #fde68a',
        fontSize: '0.78rem',
        fontWeight: 700
      }}>
        <Clock size={14} /> En Espera de Cotejo Presencial GTU (Etapa 2)
      </span>
    );
  };

  const fetchRecords = async () => {
    try {
      let dbRecords = [];
      const userCedulaNorm = user?.cedula ? normalizeCedula(user.cedula) : '';

      // 1. Consultar registros del backend (tanto globales como específicos por cédula)
      try {
        const allRes = await blockchainAPI.getAllRecords();
        if (allRes?.success && Array.isArray(allRes.records)) {
          dbRecords = allRes.records;
        }
      } catch (_) { }

      if (user?.cedula) {
        try {
          const res = await blockchainAPI.getRecordsByCedula(user.cedula);
          if (res?.success && Array.isArray(res.records)) {
            const known = new Set(dbRecords.map(r => (r.hash || '').toUpperCase()));
            res.records.forEach(r => {
              if (r?.hash && !known.has(r.hash.toUpperCase())) {
                dbRecords.push(r);
                known.add(r.hash.toUpperCase());
              }
            });
          }
        } catch (_) { }
      }

      // 2. Obtener registros locales de usm_pub_history y usm_blockchain_records
      let localHistory = [];
      try {
        localHistory = JSON.parse(localStorage.getItem('usm_pub_history') || '[]');
      } catch (_) { }

      let localBc = [];
      try {
        localBc = JSON.parse(localStorage.getItem('usm_blockchain_records') || '[]');
      } catch (_) { }

      // 3. Fusionar datos con jerarquía estricta de estatus
      const mergedMap = new Map();

      const mergeIntoMap = (incoming) => {
        if (!incoming || !incoming.hash) return;
        const key = incoming.hash.toUpperCase();
        if (!mergedMap.has(key)) {
          mergedMap.set(key, { ...incoming });
        } else {
          const current = mergedMap.get(key);
          const pCurrent = getStatusPriority(current.status);
          const pIncoming = getStatusPriority(incoming.status);
          const chosenStatus = pIncoming >= pCurrent ? incoming.status : current.status;
          const isMppeu = Boolean(current.mppeuVerified || incoming.mppeuVerified || chosenStatus.includes('CERTIFICADO') || chosenStatus.includes('APOSTILLADO'));
          const isMppre = Boolean(current.mppreVerified || incoming.mppreVerified || chosenStatus.includes('APOSTILLADO'));
          const chosenTx = (incoming.tx_hash && !incoming.tx_hash.includes('PENDIENTE'))
            ? incoming.tx_hash
            : ((current.tx_hash && !current.tx_hash.includes('PENDIENTE')) ? current.tx_hash : (incoming.tx_hash || current.tx_hash || '0xPENDIENTE_COTEJO'));

          mergedMap.set(key, {
            ...current,
            ...incoming,
            owner_name: incoming.owner_name || current.owner_name,
            cedula: incoming.cedula || current.cedula,
            document_type: incoming.document_type || current.document_type,
            status: chosenStatus,
            mppeuVerified: isMppeu,
            mppreVerified: isMppre,
            apostilleNumber: incoming.apostilleNumber || current.apostilleNumber || null,
            tx_hash: chosenTx,
            formData: incoming.formData || current.formData,
            solicitudCode: incoming.solicitudCode || current.solicitudCode || incoming.solicitud_code || current.solicitud_code,
            created_at: current.created_at || incoming.created_at
          });
        }
      };

      // Agregar registros de backend
      dbRecords.forEach(rec => {
        if (!rec || !rec.hash) return;
        mergeIntoMap({
          hash: rec.hash,
          owner_name: rec.owner_name || rec.ownerName,
          cedula: rec.cedula,
          document_type: rec.document_type || rec.documentType,
          tx_hash: rec.tx_hash || rec.txHash,
          status: rec.status,
          created_at: rec.timestamp || rec.created_at,
          apostilleNumber: rec.apostilleNumber || rec.apostille_number,
          mppreVerified: Boolean(rec.mppreVerified || rec.mppre_verified),
          mppeuVerified: Boolean(rec.mppeuVerified || rec.mppeu_verified),
          solicitudCode: rec.solicitudCode || rec.solicitud_code,
          formData: null
        });
      });

      // Agregar de usm_blockchain_records (incluye los emitidos desde OCR)
      localBc.forEach(rec => {
        if (!rec || !rec.hash) return;
        mergeIntoMap({
          hash: rec.hash,
          owner_name: rec.ownerName || rec.owner_name,
          cedula: rec.cedula,
          document_type: rec.documentType || rec.document_type,
          tx_hash: rec.txHash || rec.tx_hash || '0xPENDIENTE_COTEJO',
          status: rec.status || 'PENDIENTE_COTEJO_MPPEU',
          created_at: rec.createdAt || rec.created_at,
          apostilleNumber: rec.apostilleNumber || rec.apostille_number,
          mppreVerified: Boolean(rec.mppreVerified || rec.mppre_verified),
          mppeuVerified: Boolean(rec.mppeuVerified || rec.mppeu_verified),
          solicitudCode: rec.solicitudCode || rec.solicitud_code,
          formData: rec.formData
        });
      });

      // Agregar de usm_pub_history
      localHistory.forEach(rec => {
        if (!rec) return;
        const h = rec.hash || rec.blockchainHash;
        if (!h) return;
        mergeIntoMap({
          hash: h,
          owner_name: rec.nombre || rec.owner_name || rec.ownerName || rec.formData?.nombre_completo,
          cedula: rec.cedula || rec.formData?.cedula,
          document_type: rec.tramite || rec.document_type || rec.documentType,
          tx_hash: rec.txHash || rec.tx_hash || '0xPENDIENTE_COTEJO',
          status: rec.status || 'SOLICITUD_GTU_EMITIDA',
          created_at: rec.timestamp || rec.created_at || rec.fecha,
          apostilleNumber: rec.apostilleNumber,
          mppreVerified: Boolean(rec.mppreVerified),
          mppeuVerified: Boolean(rec.mppeuVerified),
          solicitudCode: rec.solicitudCode || rec.stablePubCode,
          formData: rec.formData
        });
      });

      // Convertir a array
      const resolvedList = Array.from(mergedMap.values());

      // Re-sincronizar los registros consolidados en localStorage para actualizar los estados de inmediato
      try {
        const nextLocalBc = resolvedList.map(r => ({
          hash: r.hash,
          ownerName: r.owner_name,
          cedula: r.cedula,
          documentType: r.document_type,
          solicitudCode: r.solicitudCode,
          txHash: r.tx_hash,
          status: r.status,
          mppeuVerified: r.mppeuVerified,
          mppreVerified: r.mppreVerified,
          apostilleNumber: r.apostilleNumber,
          createdAt: r.created_at,
          formData: r.formData
        }));
        localStorage.setItem('usm_blockchain_records', JSON.stringify(nextLocalBc.slice(0, 50)));

        const nextPubHist = resolvedList.map(r => ({
          hash: r.hash,
          solicitudCode: r.solicitudCode,
          nombre: r.owner_name,
          cedula: r.cedula,
          tramite: r.document_type,
          txHash: r.tx_hash,
          status: r.status,
          mppeuVerified: r.mppeuVerified,
          mppreVerified: r.mppreVerified,
          apostilleNumber: r.apostilleNumber,
          timestamp: r.created_at,
          formData: r.formData
        }));
        localStorage.setItem('usm_pub_history', JSON.stringify(nextPubHist.slice(0, 50)));
      } catch (_) { }

      // Ordenar por fecha más reciente (descendente) para que los trámites nuevos aparezcan de primero
      resolvedList.sort((a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0));

      setRecords(resolvedList);
    } catch (err) {
      console.error("Error al cargar historial:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();

    // Heartbeat de actualización en vivo cada 5 segundos
    const pollInterval = setInterval(() => {
      fetchRecords();
    }, 5000);

    let channel;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('usm_records_sync');
        channel.onmessage = (event) => {
          if (event.data?.type === 'RECORD_ADDED' || event.data?.type === 'RECORD_UPDATED') {
            fetchRecords();
          }
        };
      } catch (_) { }
    }

    const handleStorageChange = (e) => {
      if (e.key === 'usm_blockchain_records' || e.key === 'usm_pub_history') {
        fetchRecords();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const handleCustomUpdate = () => {
      fetchRecords();
    };
    window.addEventListener('usm_records_updated', handleCustomUpdate);

    return () => {
      clearInterval(pollInterval);
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('usm_records_updated', handleCustomUpdate);
    };
  }, [user]);

  const handleCopy = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredRecords = records.filter(r => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    const docType = (r.document_type || '').toLowerCase();
    const hashVal = (r.hash || '').toLowerCase();
    const txHashVal = (r.tx_hash || '').toLowerCase();
    const ownerVal = (r.owner_name || '').toLowerCase();
    const cedulaVal = (r.cedula || '').toLowerCase();
    const solCodeVal = (r.solicitudCode || '').toLowerCase();
    const statusVal = (r.status || '').toLowerCase();
    return (
      docType.includes(term) ||
      hashVal.includes(term) ||
      txHashVal.includes(term) ||
      ownerVal.includes(term) ||
      cedulaVal.includes(term) ||
      solCodeVal.includes(term) ||
      statusVal.includes(term)
    );
  });

  return (
    <div className="view-container">
      <div className="dashboard-header">
        <h2>Historial de Trámites</h2>
        <p>Historial interactivo de todas tus planillas y huellas digitales registradas en la red Blockchain.</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.6rem 1rem' }}>
          <Search size={18} color="var(--text-muted)" style={{ marginRight: '0.8rem' }} />
          <input
            type="text"
            placeholder="Filtrar por trámite o hash de verificación..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', width: '100%', outline: 'none', fontSize: '0.9rem' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <div className="animate-spin" style={{ width: '30px', height: '30px', border: '3px solid rgba(14,165,233,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <AlertCircle size={40} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>No se encontraron trámites registrados.</p>
          {records.length === 0 && (
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
              Completa tu primer trámite en la sección "Llenar Planilla PUB".
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          <AnimatePresence>
            {filteredRecords.map((record, idx) => (
              <motion.div
                key={record.hash}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-panel"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  borderLeft: (Boolean(record.apostilleNumber || (record.status || '').toUpperCase().includes('APOSTILL') || record.mppreVerified))
                    ? '4px solid #15803d'
                    : (Boolean((record.status || '').toUpperCase().includes('CERTIFICAD') || (record.status || '').toUpperCase().includes('VERIFICAD') || record.mppeuVerified))
                    ? '4px solid #0369a1'
                    : '4px solid #d97706',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Detalles del Trámite */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: '1 1 300px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', padding: '0.2rem 0.65rem', background: 'var(--color-blush-peach)', color: 'var(--color-sienna-brown)', border: '1px solid rgba(93, 42, 26, 0.2)', borderRadius: 'var(--radius-pill)' }}>
                      {record.document_type || 'Documento'}
                    </span>
                    {record.solicitudCode && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.55rem', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontFamily: 'monospace' }}>
                        📋 {record.solicitudCode}
                      </span>
                    )}
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={14} />
                      {record.created_at ? `${new Date(record.created_at).toLocaleDateString()} ${new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'N/A'}
                    </span>
                  </div>

                  {(record.owner_name || record.cedula) && (
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-ink-black)', fontWeight: 500 }}>
                      <strong>Titular:</strong> {record.owner_name || 'Graduando'} {record.cedula ? `(${record.cedula})` : ''}
                    </p>
                  )}

                  <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong style={{ color: 'var(--color-ink-black)' }}>Document Hash:</strong>
                    <code style={{ background: 'var(--color-fog-white)', border: '1px solid var(--border)', color: 'var(--color-ink-black)', padding: '0.15rem 0.45rem', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                      {record.hash ? `${record.hash.substring(0, 22)}...${record.hash.substring(record.hash.length - 8)}` : 'N/A'}
                    </code>
                    <button
                      onClick={() => handleCopy(record.hash)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-ink-black)', display: 'inline-flex', padding: '2px', borderRadius: '4px' }}
                      title="Copiar Hash Completo"
                    >
                      {copiedHash === record.hash ? <Check size={14} color="var(--color-sienna-brown)" /> : <Copy size={14} />}
                    </button>
                  </p>

                  <div style={{ margin: '0.35rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong style={{ color: 'var(--color-ink-black)', fontSize: '0.82rem' }}>Estado del Trámite:</strong>
                    {renderStatusBadge(record.status, record)}
                  </div>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {(record.formData || (record.document_type || '').includes('PUB') || (record.document_type || '').includes('Planilla')) && (
                    <button
                      onClick={() => setActivePUBRecord(record)}
                      className="btn-ghost"
                      style={{ padding: '0.5rem 0.95rem', fontSize: '0.82rem' }}
                    >
                      <FileText size={16} /> Ver Planilla PUB
                    </button>
                  )}

                  <button
                    onClick={() => setActiveCertHash(record.hash)}
                    className="send-btn"
                    style={{ padding: '0.5rem 0.95rem', fontSize: '0.82rem' }}
                  >
                    <ShieldCheck size={16} /> Certificado Digital (GTU)
                  </button>

                  {(record.apostilleNumber || (record.status || '').includes('APOSTILLADO') || record.mppreVerified) && (
                    <button
                      onClick={() => setActiveApostilleRecord(record)}
                      style={{
                        background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
                        border: 'none',
                        color: '#ffffff',
                        padding: '0.5rem 0.95rem',
                        borderRadius: 'var(--radius-inputs)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)'
                      }}
                    >
                      <Award size={16} /> Apostilla de La Haya
                    </button>
                  )}

                  {onVerifyHash && (
                    <button
                      onClick={() => onVerifyHash(record.hash)}
                      className="btn-ghost"
                      style={{ padding: '0.5rem 0.95rem', fontSize: '0.82rem' }}
                    >
                      Verificar Hash
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal del Certificado Digital */}
      {activeCertHash && (
        <DigitalCertificate
          docHash={activeCertHash}
          onClose={() => setActiveCertHash(null)}
          onVerifyHash={onVerifyHash}
        />
      )}

      {/* Modal de Previsualización PUB */}
      {activePUBRecord && (
        <PUBPreviewModal
          record={activePUBRecord}
          onClose={() => setActivePUBRecord(null)}
          onVerifyHash={onVerifyHash}
        />
      )}

      {/* Modal de Apostilla de La Haya */}
      {activeApostilleRecord && (
        <ApostilleCertificate
          record={activeApostilleRecord}
          onClose={() => setActiveApostilleRecord(null)}
        />
      )}
    </div>
  );
};

export default HistoryPanel;
