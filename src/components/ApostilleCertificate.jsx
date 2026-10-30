import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2pdf from 'html2pdf.js';
import { X, CheckCircle, Shield, Printer, ExternalLink, Globe, Award, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

const ApostilleCertificate = ({ record, onClose }) => {
  const printRef = useRef(null);

  if (!record) return null;

  const apostilleNumber = record.apostilleNumber || `APO-VE-2026-${(record.hash || '8492').substring(2, 8).toUpperCase()}`;
  const verifyUrl = `${window.location.origin}/?hash=${record.hash || ''}`;
  const issueDate = record.mppreDate || new Date().toLocaleDateString('es-VE');

  const handleDownloadPDF = () => {
    if (!printRef.current) return;
    const opt = {
      margin: 8,
      filename: `Apostilla_La_Haya_${record.cedula || 'USM'}_${apostilleNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(printRef.current).save();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300,
        padding: '1rem'
      }}
    >
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          maxWidth: '820px',
          width: '100%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          border: '1px solid #cbd5e1'
        }}
      >
        {/* Modal Toolbar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.9rem 1.4rem',
          background: 'var(--color-fog-white)',
          borderBottom: '1px solid var(--border)',
          color: 'var(--color-ink-black)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Globe size={20} color="var(--color-sienna-brown)" />
            <span style={{ fontWeight: 400, fontFamily: 'var(--font-serif)', fontSize: '1.08rem', color: 'var(--color-ink-black)' }}>
              Apostilla Electrónica de La Haya (MPPRE / MPPEU)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handleDownloadPDF}
              className="send-btn"
              style={{
                padding: '0.45rem 0.9rem',
                fontSize: '0.82rem'
              }}
            >
              Descargar PDF
            </button>
            <button
              onClick={handlePrint}
              className="btn-ghost"
              style={{
                padding: '0.45rem 0.75rem',
                fontSize: '0.82rem'
              }}
            >
              <Printer size={15} />
            </button>
            <button
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid var(--border)',
                color: 'var(--color-ink-black)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                marginLeft: '0.3rem'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Apostille Sheet */}
        <div style={{ overflowY: 'auto', padding: '1.75rem' }}>
          <div
            ref={printRef}
            style={{
              border: '4px double #1e293b',
              padding: '2rem 2.25rem',
              backgroundColor: '#fafaf9',
              color: '#0f172a',
              fontFamily: "'Times New Roman', Times, serif",
              lineHeight: 1.35
            }}
          >
            {/* National Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.15rem 0', fontSize: '0.78rem', letterSpacing: '1.5px', fontWeight: 'bold' }}>
                REPÚBLICA BOLIVARIANA DE VENEZUELA
              </p>
              <p style={{ margin: '0 0 0.2rem 0', fontSize: '0.72rem', letterSpacing: '0.8px', color: '#475569' }}>
                MINISTERIO DEL PODER POPULAR PARA RELACIONES EXTERIORES
              </p>
              <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b' }}>
                SISTEMA INTEGRADO DE LEGALIZACIÓN Y APOSTILLA ELECTRÓNICA
              </p>
            </div>

            {/* Official Hague Heading */}
            <div style={{
              textAlign: 'center',
              margin: '1rem 0 1.5rem 0',
              padding: '0.6rem 0',
              borderTop: '2px solid #0f172a',
              borderBottom: '2px solid #0f172a'
            }}>
              <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.45rem', letterSpacing: '3px', fontWeight: 'bold' }}>
                APOSTILLE
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic', letterSpacing: '0.5px' }}>
                (Convention de La Haye du 5 octobre 1961)
              </p>
            </div>

            {/* The 10 Official Points */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.85rem', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <strong>1. País / Country:</strong>
                <span>República Bolivariana de Venezuela</span>
              </div>

              <div style={{
                background: '#f1f5f9',
                padding: '0.65rem 0.85rem',
                borderRadius: '6px',
                borderLeft: '4px solid #0284c7'
              }}>
                <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.82rem', fontWeight: 'bold', color: '#0369a1' }}>
                  El presente documento público / This public document
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <div>
                    <strong>2. Ha sido firmado por:</strong>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>Rector y Secretario General</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Universidad Santa María</div>
                  </div>
                  <div>
                    <strong>3. Actuando en calidad de:</strong>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>Autoridad Universitaria Oficial</div>
                  </div>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>4. Está revestido del sello / timbre de:</strong>
                  <div style={{ color: '#0f172a' }}>
                    Universidad Santa María · Legalizado ante MPPEU (GTU Cita N° {record.solicitudCode || 'GTU-2026-USM-8492'})
                  </div>
                </div>
              </div>

              <div style={{
                background: '#f8fafc',
                padding: '0.65rem 0.85rem',
                borderRadius: '6px',
                borderLeft: '4px solid #10b981'
              }}>
                <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.82rem', fontWeight: 'bold', color: '#047857' }}>
                  Certificado / Certified
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <div>
                    <strong>5. En / At:</strong> <span>Caracas, D.C.</span>
                  </div>
                  <div>
                    <strong>6. El / The:</strong> <span>{issueDate}</span>
                  </div>
                  <div>
                    <strong>7. Por / By:</strong> <span>Dirección de Legalizaciones y Apostilla (MPPRE)</span>
                  </div>
                  <div>
                    <strong>8. Bajo el número / Under No:</strong>
                    <div style={{ fontWeight: 700, color: '#0f172a', letterSpacing: '0.5px' }}>
                      {apostilleNumber}
                    </div>
                  </div>
                </div>
              </div>

              {/* Points 9 & 10 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.25rem' }}>
                <div style={{ border: '1px solid #cbd5e1', padding: '0.85rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 'bold', marginBottom: '0.35rem' }}>
                    9. Sello / Seal:
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      border: '2px dashed #0284c7',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.55rem',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      color: '#0284c7'
                    }}>
                      <span>MPPRE</span>
                      <span>CANCILLERÍA</span>
                      <span>2026</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                      <div>Sello Digital Certificado</div>
                      <div style={{ fontWeight: 600 }}>República Bolivariana de Venezuela</div>
                    </div>
                  </div>
                </div>

                <div style={{ border: '1px solid #cbd5e1', padding: '0.85rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 'bold', marginBottom: '0.35rem' }}>
                    10. Firma Digital Consular / Signature:
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                    <div style={{ fontWeight: 600 }}>{record.mppreOfficer || 'Dr. Fernando Morales'}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Oficial de Apostilla Electrónica · MPPRE</div>
                    <div style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#0284c7', marginTop: '0.2rem' }}>
                      KEY-ID: MPPRE-ECDSA-{apostilleNumber.slice(-6)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Document & Graduate Metadata */}
            <div style={{
              marginTop: '1.25rem',
              padding: '0.85rem',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '6px'
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Datos del Graduando y del Título Universitario
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', fontSize: '0.84rem' }}>
                <div>
                  <strong>Titular del Documento:</strong> {record.ownerName || 'Graduando USM'}
                  <br />
                  <strong>Cédula de Identidad:</strong> {record.cedula || 'N/A'}
                  <br />
                  <strong>Documento Certificado:</strong> {record.documentType || 'Título de Grado'}
                </div>
                <div>
                  <strong>Tomo:</strong> {record.tomo || 'XVIII'} | <strong>Folio:</strong> {record.folio || '142'}
                  <br />
                  <strong>Libro:</strong> {record.libro || 'Grados USM'}
                  <br />
                  <strong>Cotejo MPPEU:</strong> <span style={{ color: '#059669', fontWeight: 600 }}>Validado en Taquilla</span>
                </div>
              </div>
            </div>

            {/* Inmutable Blockchain Footprint */}
            <div style={{
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem'
            }}>
              <div style={{ flex: 1, fontSize: '0.74rem', color: '#475569', fontFamily: 'monospace' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0f172a', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                  <Shield size={14} color="#0284c7" /> REGISTRO INMUTABLE EN ETHEREUM SEPOLIA
                </div>
                <div><strong>Hash SHA-256 Documento:</strong> {record.hash || 'N/A'}</div>
                <div><strong>TxHash Blockchain:</strong> {record.txHash || 'N/A'}</div>
                <div style={{ marginTop: '0.35rem', color: '#64748b', fontStyle: 'italic', fontFamily: 'sans-serif', fontSize: '0.7rem' }}>
                  Este documento cuenta con certificación dual (MPPEU + MPPRE) conforme al Art. 16 de la Ley sobre Mensajes de Datos y Firmas Electrónicas.
                </div>
              </div>

              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <QRCodeSVG value={verifyUrl} size={84} level="M" />
                <div style={{ fontSize: '0.62rem', marginTop: '0.25rem', color: '#475569', fontWeight: 600 }}>
                  Verificación QR
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ApostilleCertificate;
