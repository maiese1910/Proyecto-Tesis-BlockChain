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
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
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
          background: '#09090b',
          borderRadius: '16px',
          padding: '0',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '92vh',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(124, 58, 237, 0.4)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Cabecera Fija / Sticky con Botón Cerrar visible siempre */}
        <div style={{
          padding: '1rem 1.5rem',
          background: '#0c0e17',
          borderBottom: '1px solid rgba(124, 58, 237, 0.3)',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Shield color="#a78bfa" size={20} /> Certificado Digital de Inmutabilidad
          </h3>
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

        {/* Cuerpo Desplazable del Certificado */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <p style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>Generando Certificado Digital...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--danger)' }}>
              <p>{error}</p>
            </div>
          ) : (
            <div id="printable-certificate">
              {/* Header del Certificado */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid rgba(124, 58, 237, 0.2)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <p style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                  {certData.institution}
                </p>
                <h2 style={{ fontSize: '1.6rem', color: 'var(--text-main)', margin: '0 0 1rem 0' }}>
                  {certData.title}
                </h2>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '0.4rem 1rem', borderRadius: '20px', fontWeight: '600', fontSize: '0.9rem' }}>
                  <CheckCircle size={16} /> {certData.blockchain_status}
                </div>
              </div>

              {/* Cuerpo del Certificado */}
              <div className="cert-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'center' }}>
                
                {/* Datos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Titular del Documento</p>
                    <p style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--text-main)' }}>{certData.owner}</p>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                    <div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Cédula de Identidad</p>
                      <p style={{ fontSize: '1rem', fontWeight: '500' }}>{certData.id_number}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Tipo de Trámite</p>
                      <p style={{ fontSize: '1rem', fontWeight: '500' }}>{certData.document_type}</p>
                    </div>
                  </div>

                  <div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Fecha de Registro Blockchain</p>
                    <p style={{ fontSize: '1rem', fontWeight: '500' }}>{certData.registration_date}</p>
                  </div>
                  
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Hash Criptográfico (SHA-256)</p>
                      <button 
                        onClick={handleCopy}
                        style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                      >
                        {copied ? '¡Copiado!' : 'Copiar'}
                      </button>
                    </div>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--primary)', wordBreak: 'break-all', background: 'rgba(124, 58, 237, 0.1)', padding: '0.5rem', borderRadius: '6px' }}>
                      {certData.document_hash}
                    </p>
                  </div>
                </div>

                {/* QR Code */}
                <div className="cert-qr-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', background: '#ffffff', padding: '1.2rem', borderRadius: '12px' }}>
                  <QRCodeSVG 
                    value={certData.qr_link} 
                    size={150}
                    bgColor={"#ffffff"}
                    fgColor={"#000000"}
                    level={"Q"}
                  />
                  <p style={{ fontSize: '0.75rem', color: '#666666', textAlign: 'center', fontWeight: '600', maxWidth: '150px' }}>
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
                  className="send-btn" 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem', background: 'rgba(255,255,255,0.1)', color: 'var(--text-main)' }}
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
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem', background: 'linear-gradient(to right, #7c3aed, #4f46e5)', color: '#ffffff', cursor: 'pointer', border: 'none', borderRadius: '8px' }}
                >
                  <Shield size={18} /> Verificar en la misma Pestaña
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Footer del Modal con botón de Cierre Táctil en Móvil */}
        <div style={{ padding: '0.8rem 1.5rem', background: '#0c0e17', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--border)', color: '#fff', padding: '0.6rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', width: '100%' }}
          >
            Cerrar Ventana ✕
          </button>
        </div>

      </motion.div>
    </motion.div>
  );
};

export default DigitalCertificate;
