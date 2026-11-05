import React, { useState, useEffect } from 'react';
import { isMetaMaskInstalled } from '../services/web3Service';
import { resolveDocumentUrl } from '../services/documentStorage';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
  FileText,
  User,
  Building2,
  Stamp,
  KeyRound,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ExternalLink,
  Image as ImageIcon,
  Sparkles,
  Maximize2
} from 'lucide-react';

const MPPEUCotejoModal = ({ record, onClose, onConfirmCertify, onReject, loading }) => {
  const [checks, setChecks] = useState({
    rectorSignature: true,
    secretarySignature: true,
    watermarkAndSeal: true,
    idCardMatch: true
  });

  const [notes, setNotes] = useState('');
  const [signingMode, setSigningMode] = useState(isMetaMaskInstalled() ? 'metamask' : 'custodial');
  const [docImage, setDocImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let isMounted = true;
    if (!record) return;

    setImageLoading(true);
    resolveDocumentUrl(record)
      .then(url => {
        if (isMounted) {
          setDocImage(url);
          setImageLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setImageLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [record]);

  if (!record) return null;
  if (typeof document === "undefined") return null;

  const allChecksPassed = Object.values(checks).every(Boolean);

  const toggleCheck = (key) => {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleZoomIn = () => setZoom(prev => Math.min(2.5, prev + 0.25));
  const handleZoomOut = () => setZoom(prev => Math.max(0.75, prev - 0.25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleResetView = () => {
    setZoom(1);
    setRotation(0);
  };

  const isRemoteStorage = docImage && (docImage.startsWith('http://') || docImage.startsWith('https://'));

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(23, 25, 28, 0.65)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflowY: 'auto'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
    >
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        style={{
          background: '#ffffff',
          color: 'var(--color-ink-black)',
          borderRadius: 'var(--radius-cards)',
          maxWidth: '1240px',
          width: '96vw',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.1rem 1.6rem',
          background: '#ffffff',
          borderBottom: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: '12px',
              background: 'var(--color-blush-peach)',
              border: '1px solid rgba(93, 42, 26, 0.25)',
              color: 'var(--color-sienna-brown)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Building2 size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'var(--font-serif)', fontWeight: 500, color: 'var(--color-ink-black)' }}>
                  Mesa de Cotejo Físico-Digital — Taquilla GTU (MPPEU)
                </h3>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.55rem',
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(93, 42, 26, 0.1)',
                  color: 'var(--color-sienna-brown)',
                  border: '1px solid rgba(93, 42, 26, 0.2)'
                }}>
                  Fiscalización SoD
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--color-slate-gray)' }}>
                Expediente: <strong style={{ color: 'var(--color-ink-black)' }}>{record.solicitudCode || 'GTU-2026-USM-8492'}</strong> · Contrastación del pergamino digital custodiado vs. título físico original
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--color-fog-white)',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              width: 34,
              height: 34,
              color: 'var(--color-slate-gray)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            title="Cerrar ventana"
          >
            <X size={17} />
          </button>
        </div>

        {/* Modal Body - 2 Paneles Grandes: Visor del Pergamino (Izquierda) + Mesa de Cotejo (Derecha) */}
        <div style={{
          padding: '1.25rem 1.5rem',
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(420px, 1.1fr) minmax(460px, 1fr)',
          gap: '1.5rem',
          background: 'var(--color-fog-white)'
        }}>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* PANEL IZQUIERDO: VISOR DEL DOCUMENTO ORIGINAL EN STORAGE          */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div style={{
            background: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '1.2rem',
            boxShadow: 'var(--shadow-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            {/* Header del Visor */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ImageIcon size={17} style={{ color: 'var(--color-sienna-brown)' }} />
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--color-ink-black)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Pergamino Digital Custodiado
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.55rem',
                  borderRadius: 'var(--radius-pill)',
                  background: isRemoteStorage ? 'rgba(16, 185, 129, 0.1)' : 'rgba(93, 42, 26, 0.1)',
                  color: isRemoteStorage ? '#065f46' : 'var(--color-sienna-brown)',
                  border: `1px solid ${isRemoteStorage ? 'rgba(16, 185, 129, 0.25)' : 'rgba(93, 42, 26, 0.2)'}`
                }}>
                  {isRemoteStorage ? '☁️ Supabase Storage' : '💾 Custodia Criptográfica'}
                </span>
              </div>
            </div>

            {/* Barra de Herramientas de Inspección Forense */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.4rem 0.75rem',
              background: 'var(--color-fog-white)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              fontSize: '0.78rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.25rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-ink-black)', fontSize: '0.76rem', fontWeight: 600 }}
                  title="Acercar"
                >
                  <ZoomIn size={14} /> +
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.25rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-ink-black)', fontSize: '0.76rem', fontWeight: 600 }}
                  title="Alejar"
                >
                  <ZoomOut size={14} /> -
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.25rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-ink-black)', fontSize: '0.76rem', fontWeight: 600 }}
                  title="Girar 90°"
                >
                  <RotateCw size={14} /> 90°
                </button>
                {(zoom !== 1 || rotation !== 0) && (
                  <button
                    type="button"
                    onClick={handleResetView}
                    style={{ background: 'none', border: 'none', color: 'var(--color-sienna-brown)', cursor: 'pointer', fontSize: '0.74rem', textDecoration: 'underline', padding: '0.2rem' }}
                  >
                    Restablecer
                  </button>
                )}
              </div>

              {docImage && (
                <a
                  href={docImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-sienna-brown)', textDecoration: 'none', fontWeight: 600, fontSize: '0.76rem' }}
                >
                  <ExternalLink size={13} /> Pantalla Completa
                </a>
              )}
            </div>

            {/* Contenedor Interactivo de la Imagen del Título */}
            <div style={{
              position: 'relative',
              width: '100%',
              minHeight: '380px',
              maxHeight: '480px',
              background: '#1a1d21',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              userSelect: 'none'
            }}>
              {imageLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.7rem', color: '#ffffff' }}>
                  <RotateCw size={24} className="animate-spin" />
                  <span style={{ fontSize: '0.82rem' }}>Recuperando pergamino digital de Storage...</span>
                </div>
              ) : docImage ? (
                (docImage.toLowerCase().includes('.pdf') || docImage.startsWith('data:application/pdf')) ? (
                  <iframe
                    src={docImage}
                    title={`Pergamino Digital - ${record.ownerName}`}
                    style={{
                      width: '100%',
                      height: '460px',
                      border: 'none',
                      borderRadius: '8px',
                      background: '#ffffff',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)'
                    }}
                  />
                ) : (
                  <img
                    src={docImage}
                    alt={`Pergamino Digital - ${record.ownerName}`}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '460px',
                      objectFit: 'contain',
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transition: 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)'
                    }}
                  />
                )
              ) : (
                /* Pergamino Simulado de Resguardo si no hubo imagen previa */
                <div style={{
                  padding: '2.5rem 2rem',
                  maxWidth: '380px',
                  background: 'linear-gradient(135deg, #fffdfa 0%, #f7f1e5 100%)',
                  borderRadius: '10px',
                  border: '2px solid rgba(93, 42, 26, 0.25)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  textAlign: 'center',
                  color: 'var(--color-ink-black)',
                  transform: `scale(${zoom}) rotate(${rotation}deg)`
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-blush-peach)', border: '1px solid rgba(93, 42, 26, 0.3)', margin: '0 auto 0.75rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-sienna-brown)' }}>
                    <Stamp size={24} />
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-sienna-brown)' }}>
                    República Bolivariana de Venezuela
                  </span>
                  <h4 style={{ margin: '0.2rem 0 0.5rem 0', fontFamily: 'var(--font-serif)', fontSize: '1.05rem', color: 'var(--color-ink-black)' }}>
                    Universidad Santa María
                  </h4>
                  <div style={{ margin: '0.8rem 0', padding: '0.6rem', borderTop: '1px solid rgba(93, 42, 26, 0.15)', borderBottom: '1px solid rgba(93, 42, 26, 0.15)' }}>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-slate-gray)' }}>Confiere el título a:</p>
                    <p style={{ margin: '0.2rem 0', fontSize: '0.98rem', fontWeight: 700, color: 'var(--color-ink-black)' }}>
                      {record.ownerName}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-sienna-brown)' }}>
                      {record.cedula}
                    </p>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--color-ink-black)' }}>
                    {record.documentType || 'Ingeniero de Sistemas'}
                  </p>
                  <p style={{ margin: '0.6rem 0 0 0', fontSize: '0.68rem', color: 'var(--color-slate-gray)' }}>
                    Tomo {record.tomo || 'XVIII'} · Folio {record.folio || '142'} · Libro {record.libro || 'Grados 2026'}
                  </p>
                </div>
              )}
            </div>

            {/* Pie de advertencia y contraste */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.65rem 0.85rem',
              background: 'rgba(93, 42, 26, 0.05)',
              border: '1px solid rgba(93, 42, 26, 0.15)',
              borderRadius: '8px',
              fontSize: '0.76rem',
              color: 'var(--color-sienna-brown)'
            }}>
              <Sparkles size={16} style={{ flexShrink: 0 }} />
              <span>
                <strong>Instrucción SoD:</strong> Contrasta con la lupa los rasgos caligráficos del pergamino físico contra este documento antes de estampar la firma blockchain.
              </span>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* PANEL DERECHO: DATOS DIGITALES OCR + LISTA DE COTEJO FÍSICO       */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            
            {/* Sección 1: Datos Extraídos por OCR */}
            <div style={{
              background: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '1.2rem',
              boxShadow: 'var(--shadow-subtle)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--color-ink-black)',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginBottom: '0.85rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                <FileText size={15} /> 1. Datos Digitales Registrados (OCR + PUB)
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.86rem' }}>
                <div style={{ background: 'var(--color-fog-white)', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Titular del Título:</span>
                  <p style={{ margin: '0.15rem 0 0 0', fontWeight: 700, fontSize: '0.94rem', color: 'var(--color-ink-black)' }}>
                    {record.ownerName}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <div style={{ background: 'var(--color-fog-white)', padding: '0.55rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Cédula:</span>
                    <p style={{ margin: '0.1rem 0 0 0', fontWeight: 600, color: 'var(--color-ink-black)' }}>{record.cedula}</p>
                  </div>
                  <div style={{ background: 'var(--color-fog-white)', padding: '0.55rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Institución:</span>
                    <p style={{ margin: '0.1rem 0 0 0', fontWeight: 600, color: 'var(--color-ink-black)' }}>Universidad Santa María</p>
                  </div>
                </div>

                <div style={{ background: 'var(--color-fog-white)', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Grado / Carrera:</span>
                  <p style={{ margin: '0.15rem 0 0 0', fontWeight: 600, color: 'var(--color-ink-black)' }}>
                    {record.documentType || 'Título de Grado Académico'}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ background: 'var(--color-fog-white)', padding: '0.45rem 0.55rem', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', fontWeight: 600 }}>Tomo</span>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-sienna-brown)' }}>{record.tomo || 'XVIII'}</p>
                  </div>
                  <div style={{ background: 'var(--color-fog-white)', padding: '0.45rem 0.55rem', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', fontWeight: 600 }}>Folio</span>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-sienna-brown)' }}>{record.folio || '142'}</p>
                  </div>
                  <div style={{ background: 'var(--color-fog-white)', padding: '0.45rem 0.55rem', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', fontWeight: 600 }}>Libro</span>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-sienna-brown)' }}>{record.libro || '2026'}</p>
                  </div>
                </div>

                <div style={{ background: 'var(--color-fog-white)', padding: '0.55rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', fontWeight: 600 }}>Huella SHA-256 On-Chain:</span>
                  <p style={{ margin: '0.1rem 0 0 0', fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--color-slate-gray)', wordBreak: 'break-all' }}>
                    {record.hash}
                  </p>
                </div>
              </div>
            </div>

            {/* Sección 2: Lista de Cotejo Físico en Taquilla */}
            <div style={{
              background: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '1.2rem',
              boxShadow: 'var(--shadow-subtle)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--color-ink-black)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  marginBottom: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  <Stamp size={15} /> 2. Lista de Cotejo Físico (Pergamino Original)
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {[
                    {
                      key: 'rectorSignature',
                      title: 'Firma y Rúbrica del Rector USM',
                      desc: 'Firma manuscrita en tinta ferrogálica con sello húmedo rectoral visible.'
                    },
                    {
                      key: 'secretarySignature',
                      title: 'Firma del Secretario General',
                      desc: 'Refrenda del Secretario General y concordancia de tomo/folio.'
                    },
                    {
                      key: 'watermarkAndSeal',
                      title: 'Sello Troquelado y Marcas de Seguridad',
                      desc: 'Pergamino con fibras ópticas de seguridad y relieve seco oficial.'
                    },
                    {
                      key: 'idCardMatch',
                      title: 'Cédula de Identidad Laminada Vigente',
                      desc: 'Concordancia con el portador presencial en taquilla ministerial.'
                    }
                  ].map(item => {
                    const checked = checks[item.key];
                    return (
                      <div
                        key={item.key}
                        onClick={() => toggleCheck(item.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.7rem',
                          padding: '0.65rem 0.8rem',
                          background: checked ? 'rgba(16, 185, 129, 0.05)' : 'var(--color-fog-white)',
                          border: `1px solid ${checked ? '#10b981' : 'var(--border)'}`,
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{
                          width: 18,
                          height: 18,
                          borderRadius: '5px',
                          border: `2px solid ${checked ? 'var(--color-ink-black)' : 'var(--color-slate-gray)'}`,
                          backgroundColor: checked ? 'var(--color-ink-black)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '0.1rem'
                        }}>
                          {checked && <Check size={12} color="#ffffff" strokeWidth={3} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 600, color: 'var(--color-ink-black)' }}>
                            {item.title}
                          </p>
                          <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.74rem', color: 'var(--color-slate-gray)', lineHeight: 1.35 }}>
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Input de Observaciones */}
                <div style={{ marginTop: '0.85rem' }}>
                  <label style={{ fontSize: '0.74rem', color: 'var(--color-slate-gray)', display: 'block', marginBottom: '0.3rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Observaciones de Taquilla (opcional):
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Ej: Presentó pergamino en óptimo estado de conservación"
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.8rem',
                      background: '#ffffff',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-inputs)',
                      color: 'var(--color-ink-black)',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Selector de Protocolo de Firma */}
              <div style={{
                marginTop: '0.85rem',
                padding: '0.65rem 0.8rem',
                background: 'var(--color-fog-white)',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                  Protocolo de Firma Criptográfica:
                </span>
                <div style={{ display: 'flex', gap: '0.55rem' }}>
                  <button
                    type="button"
                    onClick={() => setSigningMode('metamask')}
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.65rem',
                      borderRadius: 'var(--radius-pill)',
                      border: `1px solid ${signingMode === 'metamask' ? 'var(--color-ink-black)' : 'var(--border)'}`,
                      background: signingMode === 'metamask' ? 'var(--color-ink-black)' : '#ffffff',
                      color: signingMode === 'metamask' ? '#ffffff' : 'var(--color-slate-gray)',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    🦊 MetaMask Web3
                  </button>
                  <button
                    type="button"
                    onClick={() => setSigningMode('custodial')}
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.65rem',
                      borderRadius: 'var(--radius-pill)',
                      border: `1px solid ${signingMode === 'custodial' ? 'var(--color-ink-black)' : 'var(--border)'}`,
                      background: signingMode === 'custodial' ? 'var(--color-ink-black)' : '#ffffff',
                      color: signingMode === 'custodial' ? '#ffffff' : 'var(--color-slate-gray)',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    🏛️ Firma Ministerial (GTU)
                  </button>
                </div>
              </div>

              {/* Barra de Acciones */}
              <div style={{
                display: 'flex',
                gap: '0.7rem',
                marginTop: '1rem',
                paddingTop: '0.85rem',
                borderTop: '1px solid var(--border)',
                alignItems: 'center'
              }}>
                {(record.mppeuVerified || (record.status || '').includes('CERTIFICADO_MPPEU') || (record.status || '').includes('APOSTILLADO_MPPRE')) ? (
                  <>
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem',
                      padding: '0.65rem 1rem',
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: '#065f46',
                      borderRadius: 'var(--radius-pill)',
                      fontWeight: 600,
                      fontSize: '0.84rem',
                      border: '1px solid rgba(16, 185, 129, 0.25)'
                    }}>
                      <ShieldCheck size={16} /> Documento Cotejado y Certificado con GTU
                    </div>
                    <button
                      onClick={onClose}
                      style={{
                        padding: '0.65rem 1.4rem',
                        background: 'var(--color-ink-black)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 'var(--radius-pill)',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      Cerrar Visor
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onReject(record)}
                      style={{
                        padding: '0.65rem 1.1rem',
                        background: '#ffffff',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        color: '#b91c1c',
                        borderRadius: 'var(--radius-pill)',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      Rechazar
                    </button>

                    <button
                      onClick={() => onConfirmCertify(record, { useMetaMask: signingMode === 'metamask', notes })}
                      disabled={!allChecksPassed || loading}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.65rem 1.25rem',
                        background: allChecksPassed ? 'var(--color-ink-black)' : 'var(--color-mist-gray)',
                        color: allChecksPassed ? '#ffffff' : 'var(--color-slate-gray)',
                        border: 'none',
                        borderRadius: 'var(--radius-pill)',
                        fontWeight: 600,
                        fontSize: '0.84rem',
                        cursor: allChecksPassed && !loading ? 'pointer' : 'not-allowed',
                        boxShadow: allChecksPassed ? 'var(--shadow-subtle)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <ShieldCheck size={16} />
                      {loading
                        ? 'Anclando a Ethereum Sepolia...'
                        : signingMode === 'metamask'
                          ? 'Aprobar y Sellar con MetaMask'
                          : 'Aprobar Cotejo y Sellar en Blockchain (GTU)'
                      }
                    </button>
                  </>
                )}
              </div>

            </div>
          </div>

        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default MPPEUCotejoModal;
