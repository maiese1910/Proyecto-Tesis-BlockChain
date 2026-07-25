import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ClipboardList, ShieldCheck, Download, X, Copy, Check, Clock, AlertCircle, FileText } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import html2pdf from 'html2pdf.js';
import { blockchainAPI } from '../services/api';
import DigitalCertificate from './DigitalCertificate';

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
      margin:       10,
      filename:     `Planilla_PUB_${formData.cedula || 'USM'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="cert-modal-overlay" style={{ zIndex: 1100, padding: '1rem', backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        style={{
          background: '#09090b',
          borderRadius: '16px',
          padding: '0',
          maxWidth: '840px',
          width: '100%',
          maxHeight: '92vh',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(14, 165, 233, 0.4)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Cabecera Sticky Fija */}
        <div style={{
          padding: '0.8rem 1.2rem',
          background: '#0c0e17',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: '#fff' }}>
            <ClipboardList color="var(--primary)" size={18} />
            Previsualización Oficial — Planilla PUB
          </h3>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <button
              onClick={handleExportPDF}
              className="send-btn"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Download size={14} /> Descargar PDF
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff'
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
                <img src="/images/mppre_facade.png" alt="Escudo" style={{ height: '50px', objectFit: 'contain', opacity: 0.1 }} onError={(e) => e.target.style.display='none'} />
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
        <div style={{ padding: '0.8rem 1.2rem', background: '#0c0e17', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem' }}>
          {onVerifyHash && (
            <button
              onClick={() => {
                onVerifyHash(hash);
                onClose && onClose();
              }}
              style={{ background: 'linear-gradient(to right, #0284c7, #2563eb)', border: 'none', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
            >
              Verificar Hash en la misma Pestaña ➔
            </button>
          )}
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--border)', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', flex: 1 }}
          >
            Cerrar Ventana ✕
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
  const [copiedHash, setCopiedHash] = useState(null);

  // Normaliza cualquier formato de cédula a solo letras+números en mayúsculas
  // Ej: "V-28.315.101" → "V28315101", "v28315101" → "V28315101"
  const normalizeCedula = (ced) => {
    return (ced || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  };

  const fetchRecords = async () => {
    if (!user?.cedula) {
      setLoading(false);
      return;
    }
    try {
      const userCedulaNorm = normalizeCedula(user.cedula);

      // 1. Obtener registros de la base de datos (con normalización del backend)
      const res = await blockchainAPI.getRecordsByCedula(user.cedula);
      let dbRecords = [];
      if (res.success && res.records) {
        dbRecords = res.records;
      }

      // 2. Obtener registros del cache local
      const localHistory = JSON.parse(localStorage.getItem('usm_pub_history') || '[]');
      const filteredLocal = localHistory.filter(r => {
        if (!r || !r.cedula) return false;
        // Comparar cédulas normalizadas (sin puntos, guiones, espacios)
        return normalizeCedula(r.cedula) === userCedulaNorm;
      });

      // 3. Fusionar datos (dar prioridad a localStorage por tener el formData completo)
      const mergedMap = new Map();
      
      // Agregar primero de DB
      dbRecords.forEach(rec => {
        if (!rec || !rec.hash) return;
        mergedMap.set(rec.hash.toUpperCase(), {
          hash: rec.hash,
          owner_name: rec.owner_name || rec.ownerName,
          cedula: rec.cedula,
          document_type: rec.document_type || rec.documentType,
          tx_hash: rec.tx_hash || rec.txHash,
          status: rec.status,
          created_at: rec.timestamp,
          formData: null
        });
      });

      // Sobrescribir/fusión con local
      filteredLocal.forEach(rec => {
        if (!rec || !rec.hash) return;
        const hashKey = rec.hash.toUpperCase();
        const existing = mergedMap.get(hashKey) || {};
        mergedMap.set(hashKey, {
          hash: rec.hash,
          owner_name: rec.owner_name || existing.owner_name,
          cedula: rec.cedula,
          document_type: rec.document_type || existing.document_type,
          tx_hash: existing.tx_hash || 'Pendiente',
          status: existing.status || 'Registrado en Blockchain (Local)',
          created_at: rec.created_at || existing.created_at,
          formData: rec.formData
        });
      });

      // Convertir a array y ordenar por fecha descendente
      const sorted = Array.from(mergedMap.values()).sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
      });

      setRecords(sorted);
    } catch (err) {
      console.error("Error al cargar historial:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [user]);

  const handleCopy = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredRecords = records.filter(r => {
    const term = search.toLowerCase();
    const docType = (r.document_type || '').toLowerCase();
    const hashVal = (r.hash || '').toLowerCase();
    const txHashVal = (r.tx_hash || '').toLowerCase();
    return (
      docType.includes(term) ||
      hashVal.includes(term) ||
      txHashVal.includes(term)
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
                  borderLeft: '4px solid var(--primary)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Detalles del Trámite */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: '1 1 300px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', padding: '0.2rem 0.6rem', background: 'rgba(14, 165, 233, 0.1)', color: 'var(--primary)', borderRadius: '6px' }}>
                      {record.document_type || 'Documento'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={14} />
                      {record.created_at ? `${new Date(record.created_at).toLocaleDateString()} ${new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'N/A'}
                    </span>
                  </div>

                  <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong>Document Hash:</strong>
                    <code style={{ background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                      {record.hash ? `${record.hash.substring(0, 22)}...${record.hash.substring(record.hash.length - 8)}` : 'N/A'}
                    </code>
                    <button
                      onClick={() => handleCopy(record.hash)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'inline-flex', padding: '2px', borderRadius: '4px' }}
                      title="Copiar Hash Completo"
                    >
                      {copiedHash === record.hash ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                    </button>
                  </p>

                  <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <strong>Estado en Blockchain:</strong>{' '}
                    <span style={{
                      fontWeight: 'bold',
                      color: (record.status || '').includes('Verificado') ? 'var(--success)' : 'var(--accent)'
                    }}>
                      {record.status}
                    </span>
                  </p>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setActivePUBRecord(record)}
                    className="send-btn"
                    style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                  >
                    <FileText size={16} /> Ver Planilla PUB
                  </button>
                  <button
                    onClick={() => setActiveCertHash(record.hash)}
                    className="send-btn"
                    style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                  >
                    <ShieldCheck size={16} /> Ver Certificado
                  </button>
                  <button
                    onClick={() => setActivePUBRecord(record)}
                    style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Download size={16} /> Expediente Digital (PDF)
                  </button>
                  {onVerifyHash && (
                    <button
                      onClick={() => onVerifyHash(record.hash)}
                      style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.4)', color: '#38bdf8', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      Verificar Hash ➔
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
    </div>
  );
};

export default HistoryPanel;
