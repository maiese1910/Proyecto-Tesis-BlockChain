import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2pdf from 'html2pdf.js';
import { X, CheckCircle, Shield, Printer, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

const DigitalCertificate = ({ docHash, onClose }) => {
  const [certData, setCertData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const response = await fetch(`${API_URL}/blockchain/certificate/${docHash}`);
        if (!response.ok) {
          throw new Error('No se pudo obtener el certificado de la Blockchain.');
        }
        const data = await response.json();
        setCertData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificate();
  }, [docHash]);

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
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '2rem'
      }}
    >
      <motion.div 
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          padding: '2.5rem',
          maxWidth: '800px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(124, 58, 237, 0.3)',
          position: 'relative'
        }}
      >
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-muted)'
          }}
        >
          <X size={20} />
        </button>

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
            <div style={{ textAlign: 'center', borderBottom: '2px solid rgba(124, 58, 237, 0.2)', paddingBottom: '2rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--primary)' }}>
                <Shield size={48} />
              </div>
              <p style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                {certData.institution}
              </p>
              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', margin: '0 0 1rem 0' }}>
                {certData.title}
              </h2>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '0.4rem 1rem', borderRadius: '20px', fontWeight: '600', fontSize: '0.9rem' }}>
                <CheckCircle size={16} /> {certData.blockchain_status}
              </div>
            </div>

            {/* Cuerpo del Certificado */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '3rem', alignItems: 'center' }}>
              
              {/* Datos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Titular del Documento</p>
                  <p style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-main)' }}>{certData.owner}</p>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Cédula de Identidad</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>{certData.id_number}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Tipo de Trámite</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>{certData.document_type}</p>
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Fecha de Registro Blockchain</p>
                  <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>{certData.registration_date}</p>
                </div>
                
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Hash Criptográfico (SHA-256)</p>
                  <p style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--primary)', wordBreak: 'break-all', background: 'rgba(124, 58, 237, 0.1)', padding: '0.5rem', borderRadius: '6px' }}>
                    {certData.document_hash}
                  </p>
                </div>
              </div>

              {/* QR Code */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', background: '#ffffff', padding: '1.5rem', borderRadius: '12px' }}>
                <QRCodeSVG 
                  value={certData.qr_link} 
                  size={160}
                  bgColor={"#ffffff"}
                  fgColor={"#000000"}
                  level={"Q"}
                />
                <p style={{ fontSize: '0.75rem', color: '#666666', textAlign: 'center', fontWeight: '600', maxWidth: '160px' }}>
                  Escanear para verificar en la Blockchain
                </p>
              </div>

            {/* Botones de acción */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', justifyContent: 'center' }}>
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
              <a 
                href={certData.qr_link}
                target="_blank"
                rel="noopener noreferrer"
                className="send-btn" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem', background: 'linear-gradient(to right, #7c3aed, #4f46e5)', textDecoration: 'none', color: '#ffffff' }}
              >
                <ExternalLink size={18} /> Ver en Etherscan
              </a>
            </div>

          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default DigitalCertificate;
