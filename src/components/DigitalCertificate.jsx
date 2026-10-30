import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2pdf from 'html2pdf.js';
import { X, CheckCircle, Shield, Printer, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { blockchainAPI } from '../services/api';

const DigitalCertificate = ({ docHash, onClose, onVerifyHash }) => {
  const [certData, setCertData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (certData && certData.document_hash) {
      navigator.clipboard.writeText(certData.document_hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        const data = await blockchainAPI.getCertificate(docHash);
        setCertData(data);
      } catch (err) {
        setError(err.message || 'No se pudo obtener el certificado de la Blockchain.');
      } finally {
        setLoading(false);
      }
    };

    fetchCertificate();
  }, [docHash]);

  return (
    <motion.div 
      className="cert-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(23, 25, 28, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: '1rem'
      }}
    >
      <motion.div 
        className="cert-modal-content"
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-cards)',
          padding: '0',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '92vh',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-hover)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Cabecera Fija / Sticky con Botón Cerrar visible siempre */}
        <div style={{
          padding: '1rem 1.5rem',
          background: 'var(--color-fog-white)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-ink-black)', fontFamily: 'var(--font-serif)', fontWeight: 400, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Shield color="var(--color-sienna-brown)" size={20} /> Certificado Digital de Inmutabilidad
          </h3>
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

        {/* Cuerpo Desplazable del Certificado */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, background: '#ffffff' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <p style={{ color: 'var(--color-ink-black)', fontSize: '1.1rem' }}>Generando Certificado Digital...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--danger)' }}>
              <p>{error}</p>
            </div>
          ) : (
            <div id="printable-certificate">
              {/* Header del Certificado */}
              <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <p style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.78rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                  {certData.institution}
                </p>
                <h2 style={{ fontSize: '1.6rem', color: 'var(--color-ink-black)', fontFamily: 'var(--font-serif)', fontWeight: 400, margin: '0 0 1rem 0' }}>
                  {certData.title}
                </h2>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-blush-peach)', color: 'var(--color-sienna-brown)', border: '1px solid rgba(93, 42, 26, 0.2)', padding: '0.4rem 1rem', borderRadius: 'var(--radius-pill)', fontWeight: '600', fontSize: '0.88rem' }}>
                  <CheckCircle size={16} /> {certData.blockchain_status}
                </div>
              </div>

              {/* Cuerpo del Certificado */}
              <div className="cert-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'center' }}>
                
                {/* Datos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.2rem', fontWeight: 600 }}>Titular del Documento</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--color-ink-black)', margin: 0 }}>{certData.owner}</p>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.2rem', fontWeight: 600 }}>Cédula de Identidad</p>
                      <p style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--color-ink-black)', margin: 0 }}>{certData.id_number}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.2rem', fontWeight: 600 }}>Tipo de Trámite</p>
                      <p style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--color-ink-black)', margin: 0 }}>{certData.document_type}</p>
                    </div>
                  </div>

                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.2rem', fontWeight: 600 }}>Fecha de Registro Blockchain</p>
                    <p style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--color-ink-black)', margin: 0 }}>{certData.registration_date}</p>
                  </div>
                  
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0, fontWeight: 600 }}>Hash Criptográfico (SHA-256)</p>
                      <button 
                        onClick={handleCopy}
                        style={{ background: 'transparent', border: 'none', color: 'var(--color-sienna-brown)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                      >
                        {copied ? '¡Copiado!' : 'Copiar'}
                      </button>
                    </div>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-ink-black)', wordBreak: 'break-all', background: 'var(--color-fog-white)', border: '1px solid var(--border)', padding: '0.6rem 0.75rem', borderRadius: '8px', margin: 0 }}>
                      {certData.document_hash}
                    </p>
                  </div>
                </div>

                {/* QR Code */}
                <div className="cert-qr-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem', background: 'var(--color-fog-white)', border: '1px solid var(--border)', padding: '1.2rem', borderRadius: '12px' }}>
                  <QRCodeSVG 
                    value={certData.qr_link} 
                    size={150}
                    bgColor={"#ffffff"}
                    fgColor={"#17191c"}
                    level={"Q"}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', fontWeight: '500', maxWidth: '150px', margin: 0 }}>
                    Escanear para verificar en Blockchain
                  </p>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="cert-actions" style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => {
                    const element = document.getElementById('printable-certificate');
                    const opt = {
                      margin:       10,
                      filename:     `Certificado_Blockchain_${certData.id_number}.pdf`,
                      image:        { type: 'jpeg', quality: 0.98 },
                      html2canvas:  { scale: 2 },
                      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
                    };
                    html2pdf().set(opt).from(element).save();
                  }}
                  className="btn-ghost" 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.4rem' }}
                >
                  <Printer size={18} /> Descargar PDF Oficial
                </button>

                <button 
                  onClick={() => {
                    if (onVerifyHash) {
                      onVerifyHash(certData.document_hash);
                      onClose && onClose();
                    }
                  }}
                  className="send-btn" 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.4rem' }}
                >
                  <Shield size={18} /> Verificar Hash Criptográfico
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Footer del Modal con botón de Cierre Táctil en Móvil */}
        <div style={{ padding: '0.85rem 1.5rem', background: 'var(--color-fog-white)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ padding: '0.6rem 1.5rem', width: '100%' }}
          >
            Cerrar Ventana
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DigitalCertificate;
