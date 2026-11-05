import React, { useState, useEffect } from 'react';
import { isMetaMaskInstalled } from '../services/web3Service';
import { resolveDocumentUrl } from '../services/documentStorage';
import { PAISES_CONVENIO_HAYA } from '../data/venezuelaLocations';
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
  Award,
  Globe,
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

const MPPRECotejoModal = ({ record, onClose, onConfirmApostille, onReject, loading }) => {
  const [checks, setChecks] = useState({
    gtuCertified: true,
    hagueConventionCountry: true,
    documentIntegrity: true,
    diplomaticVerification: true
  });

  const [countryDestiny, setCountryDestiny] = useState(
    record?.countryDestiny || record?.country_destiny || 'España'
  );
  const [notes, setNotes] = useState('Apostilla electrónica emitida y certificada bajo el Convenio de La Haya del 5 de octubre de 1961.');
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
  const isPdf = Boolean(
    (docImage && docImage.startsWith('data:application/pdf')) ||
    (docImage && docImage.toLowerCase().endsWith('.pdf')) ||
    (docImage && docImage.includes('.pdf?')) ||
    (record?.fileUrl && record.fileUrl.toLowerCase().endsWith('.pdf'))
  );

  const isAlreadyApostilled = Boolean(
    record.mppreVerified || (record.status || '').includes('APOSTILLADO_MPPRE')
  );

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
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(93, 42, 26, 0.08)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Modal */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--color-fog-white)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-blush-peach)',
              color: 'var(--color-sienna-brown)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(93, 42, 26, 0.25)',
              flexShrink: 0
            }}>
              <Globe size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--color-sienna-brown)',
                  background: 'rgba(93, 42, 26, 0.1)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--radius-pill)'
                }}>
                  MPPRE — Cancillería de la República
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#065f46',
                  background: 'rgba(16, 185, 129, 0.12)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid rgba(16, 185, 129, 0.25)'
                }}>
                  Etapa 3 · Apostilla de La Haya
                </span>
              </div>
              <h3 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.25rem',
                margin: 0,
                color: 'var(--color-ink-black)',
                fontWeight: 500
              }}>
                Revisión Consular y Emisión de Apostilla Electrónica
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '0.4rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s ease'
            }}
            title="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido en Dos Columnas: Visor Forense y Panel de Decisión Consular */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 1fr',
          gap: '1.5rem',
          padding: '1.5rem',
          overflowY: 'auto',
          flex: 1
        }}>
          {/* Columna Izquierda: Visor del Pergamino Original y Sello GTU */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.4rem 0.6rem',
              backgroundColor: 'var(--color-mist-gray)',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-ink-black)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ImageIcon size={14} color="var(--color-sienna-brown)" /> Título Académico Digitalizado
              </span>

              {/* Controles de Visor */}
              {!isPdf && docImage && (
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                  <button onClick={handleZoomOut} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.2rem 0.4rem', cursor: 'pointer' }} title="Reducir">
                    <ZoomOut size={13} />
                  </button>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', minWidth: '35px', textAlign: 'center' }}>
                    {Math.round(zoom * 100)}%
                  </span>
                  <button onClick={handleZoomIn} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.2rem 0.4rem', cursor: 'pointer' }} title="Ampliar">
                    <ZoomIn size={13} />
                  </button>
                  <button onClick={handleRotate} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.2rem 0.4rem', cursor: 'pointer' }} title="Girar 90°">
                    <RotateCw size={13} />
                  </button>
                  <button onClick={handleResetView} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.2rem 0.4rem', cursor: 'pointer', fontSize: '0.72rem' }} title="Reiniciar">
                    1:1
                  </button>
                </div>
              )}
            </div>

            {/* Contenedor del Visor */}
            <div style={{
              flex: 1,
              minHeight: '380px',
              backgroundColor: '#1e2022',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {imageLoading ? (
                <div style={{ textAlign: 'center', color: '#fff', padding: '2rem' }}>
                  <Sparkles size={28} className="animate-spin" style={{ margin: '0 auto 0.5rem auto', color: 'var(--color-blush-peach)' }} />
                  <p style={{ margin: 0, fontSize: '0.84rem' }}>Cargando pergamino desde Supabase Storage...</p>
                </div>
              ) : isPdf && docImage ? (
                <iframe
                  src={docImage}
                  title="Visor PDF Ministerial MPPRE"
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '400px',
                    border: 'none'
                  }}
                />
              ) : docImage ? (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'auto',
                  padding: '1rem'
                }}>
                  <img
                    src={docImage}
                    alt="Diploma Académico"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transition: 'transform 0.15s ease',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', padding: '2rem' }}>
                  <FileText size={36} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '0.86rem' }}>Documento no disponible en Storage</p>
                  <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>El egresado aún no ha sincronizado el archivo digital</span>
                </div>
              )}

              {isRemoteStorage && docImage && (
                <a
                  href={docImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    backgroundColor: 'rgba(0,0,0,0.75)',
                    color: '#fff',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}
                >
                  <ExternalLink size={12} /> Abrir Original
                </a>
              )}
            </div>

            {/* Certificación Previa del MPPEU */}
            <div style={{
              padding: '0.85rem 1rem',
              backgroundColor: '#f0fdf4',
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#047857', fontWeight: 600, fontSize: '0.82rem' }}>
                <CheckCircle2 size={16} /> Certificación Universitaria Previa Aprobada por MPPEU (GTU)
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                <span><strong>Oficial GTU:</strong> {record.mppeuOfficer || 'Taquilla Central MPPEU'}</span>
                <span><strong>Fecha Cotejo:</strong> {record.mppeuDate || 'Previamente Verificado'}</span>
                <span><strong>Tomo / Folio:</strong> Tomo {record.tomo || 'XVIII'}, Folio {record.folio || '142'}</span>
                <span><strong>Libro de Grado:</strong> {record.libro || 'Grados 2026'}</span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Datos del Egresado, Selección de País y Firma Consular */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.1rem'
          }}>
            {/* Tarjeta de Metadatos del Graduando */}
            <div style={{
              backgroundColor: 'var(--color-fog-white)',
              borderRadius: '10px',
              padding: '1rem',
              border: '1px solid var(--border)'
            }}>
              <h4 style={{ margin: '0 0 0.65rem 0', fontSize: '0.84rem', color: 'var(--color-ink-black)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 700 }}>
                Datos Civiles y Académicos del Egresado
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.3rem' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <User size={14} /> Titular del Grado:
                  </span>
                  <strong style={{ color: 'var(--color-ink-black)' }}>{record.ownerName || 'N/A'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.3rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Cédula de Identidad:</span>
                  <strong style={{ color: 'var(--color-ink-black)' }}>{record.cedula || 'N/A'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.3rem' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Building2 size={14} /> Título / Mención:
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--color-ink-black)', textAlign: 'right', maxWidth: '240px', wordBreak: 'break-word' }}>
                    {record.documentType || 'Título Universitario'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.1rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Expediente GTU:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-sienna-brown)' }}>
                    {record.solicitudCode || 'GTU-2026-OFICIAL'}
                  </span>
                </div>
              </div>
            </div>

            {/* Selección de País de Destino Internacional */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-ink-black)', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                <Globe size={14} color="var(--color-sienna-brown)" /> País de Destino (Convenio de La Haya)
              </label>
              <select
                value={countryDestiny}
                onChange={(e) => setCountryDestiny(e.target.value)}
                disabled={isAlreadyApostilled}
                style={{
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: 'var(--color-ink-black)',
                  backgroundColor: isAlreadyApostilled ? 'var(--color-fog-white)' : '#ffffff',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-inputs)',
                  outline: 'none',
                  cursor: isAlreadyApostilled ? 'default' : 'pointer'
                }}
              >
                {PAISES_CONVENIO_HAYA.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Validez jurídica automática en los Estados signatarios del Convenio del 5 de octubre de 1961.
              </span>
            </div>

            {/* Lista de Cotejo Consular MPPRE */}
            <div style={{
              backgroundColor: '#fff',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.55rem'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink-black)', letterSpacing: '0.4px', marginBottom: '0.2rem' }}>
                Criterios de Verificación Consular (Auditoría MPPRE)
              </span>

              {[
                { key: 'gtuCertified', label: 'Cotejo y Sello Digital GTU del MPPEU verificado y registrado on-chain.' },
                { key: 'hagueConventionCountry', label: 'País de destino suscrito al Convenio de La Haya del 5 de octubre de 1961.' },
                { key: 'documentIntegrity', label: 'Pergamino original íntegro, sin borraduras, enmiendas ni alteraciones.' },
                { key: 'diplomaticVerification', label: 'Firmas de autoridades universitarias coinciden con el registro consular.' }
              ].map(({ key, label }) => (
                <div
                  key={key}
                  onClick={() => !isAlreadyApostilled && toggleCheck(key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.35rem 0.5rem',
                    borderRadius: '6px',
                    cursor: isAlreadyApostilled ? 'default' : 'pointer',
                    backgroundColor: checks[key] ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                    border: `1px solid ${checks[key] ? 'rgba(16, 185, 129, 0.25)' : 'transparent'}`
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    backgroundColor: checks[key] ? '#10b981' : '#fff',
                    border: `1px solid ${checks[key] ? '#10b981' : 'var(--border)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0
                  }}>
                    {checks[key] && <Check size={12} strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-black)', lineHeight: 1.3 }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Observaciones Consulares */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Declaración Oficial del Cónsul / Oficial Habilitado:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isAlreadyApostilled}
                rows={2}
                style={{
                  padding: '0.5rem',
                  fontSize: '0.82rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  outline: 'none',
                  resize: 'none',
                  color: 'var(--color-ink-black)'
                }}
              />
            </div>

            {/* Modalidad de Firma Criptográfica */}
            {!isAlreadyApostilled && (
              <div style={{
                display: 'flex',
                gap: '0.6rem',
                backgroundColor: 'var(--color-mist-gray)',
                padding: '0.5rem',
                borderRadius: '8px'
              }}>
                <button
                  type="button"
                  onClick={() => setSigningMode('metamask')}
                  style={{
                    flex: 1,
                    padding: '0.45rem',
                    fontSize: '0.78rem',
                    borderRadius: '6px',
                    border: signingMode === 'metamask' ? '1px solid var(--color-ink-black)' : '1px solid transparent',
                    backgroundColor: signingMode === 'metamask' ? '#fff' : 'transparent',
                    fontWeight: signingMode === 'metamask' ? 700 : 500,
                    cursor: 'pointer'
                  }}
                >
                  🦊 Firma Web3 (MetaMask)
                </button>
                <button
                  type="button"
                  onClick={() => setSigningMode('custodial')}
                  style={{
                    flex: 1,
                    padding: '0.45rem',
                    fontSize: '0.78rem',
                    borderRadius: '6px',
                    border: signingMode === 'custodial' ? '1px solid var(--color-ink-black)' : '1px solid transparent',
                    backgroundColor: signingMode === 'custodial' ? '#fff' : 'transparent',
                    fontWeight: signingMode === 'custodial' ? 700 : 500,
                    cursor: 'pointer'
                  }}
                >
                  🏛️ Llave Ministerial MPPRE
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pie de Página: Botones de Acción */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.1rem 1.75rem',
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--color-fog-white)'
        }}>
          <div>
            {!allChecksPassed && !isAlreadyApostilled && (
              <span style={{ fontSize: '0.78rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <AlertOctagon size={14} /> Marca todos los criterios de verificación para habilitar la Apostilla.
              </span>
            )}
            {isAlreadyApostilled && (
              <span style={{ fontSize: '0.82rem', color: '#047857', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} /> Apostilla de La Haya legalmente emitida: <strong>{record.apostilleNumber}</strong>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={onClose}
              style={{
                padding: '0.65rem 1.25rem',
                backgroundColor: '#fff',
                color: 'var(--color-ink-black)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-inputs)',
                fontSize: '0.86rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cerrar Visor
            </button>

            {!isAlreadyApostilled && onReject && (
              <button
                onClick={() => onReject(record)}
                style={{
                  padding: '0.65rem 1.1rem',
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-inputs)',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Rechazar
              </button>
            )}

            {!isAlreadyApostilled && onConfirmApostille && (
              <button
                disabled={!allChecksPassed || loading}
                onClick={() => onConfirmApostille(record, { countryDestiny, notes, signingMode })}
                style={{
                  padding: '0.65rem 1.4rem',
                  backgroundColor: allChecksPassed ? 'var(--color-ink-black)' : 'var(--color-slate-gray)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-inputs)',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  cursor: allChecksPassed && !loading ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: allChecksPassed ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
                }}
              >
                <Award size={16} />
                {loading ? 'Apostillando...' : 'Firmar y Emitir Apostilla de La Haya'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default MPPRECotejoModal;

