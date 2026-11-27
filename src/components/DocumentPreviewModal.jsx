import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCw, RefreshCw, FileText, ShieldCheck, ExternalLink } from 'lucide-react';
import { resolveDocumentUrl, resolveFallbackDocumentUrl } from '../services/documentStorage';

const DocumentPreviewModal = ({ record, onClose }) => {
  const [docUrl, setDocUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setDocUrl(null);
    setZoom(1);
    setRotation(0);

    resolveDocumentUrl(record)
      .then((url) => {
        if (active) {
          setDocUrl(url || null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setDocUrl(null);
          setLoading(false);
        }
      });

    return () => { active = false; };
  }, [record]);

  if (!record || typeof document === 'undefined') return null;

  const isPdf = Boolean(
    docUrl && (
      docUrl.startsWith('data:application/pdf') ||
      docUrl.toLowerCase().endsWith('.pdf') ||
      docUrl.toLowerCase().includes('.pdf?')
    )
  );
  const isRemote = Boolean(docUrl && (docUrl.startsWith('http://') || docUrl.startsWith('https://')));
  const ownerName = record.ownerName || record.owner_name || 'Graduando USM';
  const docType = record.documentType || record.document_type || 'Título Universitario';
  const solicitudCode = record.solicitudCode || record.solicitud_code || 'GTU-2026';

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflowY: 'auto',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 14 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45)',
        }}
      >
        {/* Cabecera */}
        <div style={{
          padding: '1rem 1.4rem',
          background: 'var(--color-fog-white)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}>
          <div>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-sienna-brown)' }}>
              Visor de Documento en Validación · {solicitudCode}
            </span>
            <h3 style={{ margin: '0.15rem 0 0 0', fontSize: '1.1rem', fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--color-ink-black)' }}>
              {docType} — {ownerName}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {docUrl && !isPdf && (
              <>
                <button type="button" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(2)))} className="btn-ghost" style={{ padding: '0.35rem 0.5rem' }} title="Alejar">
                  <ZoomOut size={15} />
                </button>
                <span style={{ fontSize: '0.74rem', fontWeight: 600, minWidth: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {Math.round(zoom * 100)}%
                </span>
                <button type="button" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.2).toFixed(2)))} className="btn-ghost" style={{ padding: '0.35rem 0.5rem' }} title="Acercar">
                  <ZoomIn size={15} />
                </button>
                <button type="button" onClick={() => setRotation((r) => (r + 90) % 360)} className="btn-ghost" style={{ padding: '0.35rem 0.5rem' }} title="Rotar 90°">
                  <RotateCw size={15} />
                </button>
              </>
            )}
            <button
              type="button"
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
                color: 'var(--color-ink-black)',
              }}
              title="Cerrar"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Lienzo del documento */}
        <div style={{
          flex: 1,
          minHeight: '320px',
          maxHeight: '68vh',
          overflow: 'auto',
          background: '#17191c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem',
          position: 'relative',
        }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: '#ffffff' }}>
              <RefreshCw size={24} className="animate-spin" />
              <span style={{ fontSize: '0.84rem' }}>Cargando documento digitalizado...</span>
            </div>
          ) : docUrl ? (
            isPdf ? (
              <iframe
                src={docUrl}
                title={`Documento ${solicitudCode}`}
                style={{ width: '100%', height: '60vh', minHeight: '420px', border: 'none', borderRadius: '8px', background: '#ffffff' }}
              />
            ) : (
              <img
                src={docUrl}
                alt={`Documento digitalizado - ${ownerName}`}
                onError={async () => {
                  const fb = await resolveFallbackDocumentUrl(record, docUrl);
                  setDocUrl(fb || null);
                }}
                style={{
                  maxWidth: '100%',
                  maxHeight: '62vh',
                  objectFit: 'contain',
                  borderRadius: '6px',
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.18s ease',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
                }}
              />
            )
          ) : (
            <div style={{
              background: 'linear-gradient(135deg, #fffdfa 0%, #f7f1e5 100%)',
              borderRadius: '14px',
              border: '2px solid rgba(93, 42, 26, 0.25)',
              padding: '2rem',
              maxWidth: '460px',
              width: '100%',
              textAlign: 'center',
              color: 'var(--color-ink-black)',
            }}>
              <FileText size={32} color="var(--color-sienna-brown)" style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
              <h4 style={{ margin: '0 0 0.35rem 0', fontFamily: 'var(--font-serif)', fontSize: '1.15rem' }}>
                Expediente Criptográfico Registrado
              </h4>
              <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.82rem', color: 'var(--color-slate-gray)', lineHeight: 1.5 }}>
                Este expediente corresponde a un registro sin archivo fotográfico adjunto en la nube o digitalizado previamente. Sus metadatos y huella SHA-256 permanecen íntegros para auditoría ministerial.
              </p>
              <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem', fontSize: '0.76rem', textAlign: 'left' }}>
                <div><strong>Titular:</strong> {ownerName} ({record.cedula || 'N/A'})</div>
                <div style={{ marginTop: '0.25rem' }}><strong>Documento:</strong> {docType}</div>
                <div style={{ marginTop: '0.25rem', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.71rem', color: 'var(--color-sienna-brown)' }}>
                  <strong>SHA-256:</strong> {record.hash || 'N/A'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie del visor */}
        <div style={{
          padding: '0.85rem 1.4rem',
          background: 'var(--color-fog-white)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.6rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            <ShieldCheck size={14} color="var(--color-sienna-brown)" />
            <span>Estado actual: <strong style={{ color: 'var(--color-ink-black)' }}>{record.status || 'EN REVISIÓN'}</strong></span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {isRemote && (
              <a
                href={docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.78rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <ExternalLink size={13} /> Abrir en nueva pestaña
              </a>
            )}
            <button type="button" onClick={onClose} className="send-btn" style={{ padding: '0.48rem 1.15rem', fontSize: '0.8rem' }}>
              Cerrar Visor
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default DocumentPreviewModal;
