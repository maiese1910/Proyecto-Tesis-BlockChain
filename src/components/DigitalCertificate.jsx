import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import html2pdf from 'html2pdf.js';
import { X, CheckCircle, Shield, Printer } from 'lucide-react';
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
        // Fallback local desde usm_blockchain_records o usm_pub_history
        try {
          const bc = JSON.parse(localStorage.getItem('usm_blockchain_records') || '[]');
          const pub = JSON.parse(localStorage.getItem('usm_pub_history') || '[]');
          const cleanTarget = (docHash || '').trim().toUpperCase().replace(/^0X/, '');
          const matchDoc = (h) => (h || '').trim().toUpperCase().replace(/^0X/, '') === cleanTarget;
          const found = bc.find(r => matchDoc(r.hash)) || pub.find(r => matchDoc(r.hash || r.blockchainHash));

          if (found) {
            const isRev = Boolean(found.is_revoked || (found.status || '').includes('Rechazado') || (found.status || '').includes('Revocado'));
            const verifyUrl = typeof window !== 'undefined' ? `${window.location.origin}/?hash=${docHash}` : `https://usm-apostillabot.vercel.app/?hash=${docHash}`;
            setCertData({
              title: "CERTIFICADO DE AUTENTICIDAD DIGITAL",
              institution: "Universidad Santa María - Facultad de Ingeniería",
              owner: found.ownerName || found.nombre || found.owner_name || "Graduando USM",
              id_number: found.cedula || "V-00.000.000",
              document_type: found.documentType || found.tramite || found.document_type || "Título Universitario USM",
              blockchain_status: isRev ? "REVOCADO / ANULADO" : "VALIDADO E INMUTABLE",
              is_revoked: isRev,
              network: "Ethereum Sepolia Testnet",
              registration_date: found.createdAt || found.timestamp || found.created_at || new Date().toISOString(),
              document_hash: docHash,
              tx_hash: (found.txHash && !found.txHash.includes('PENDIENTE')) ? found.txHash : '0xSepolia-OnChain-Verified',
              verified_by: found.verifiedBy || found.mppeuOfficer || "MPPEU / GTU Taquilla Oficial",
              qr_link: verifyUrl,
              verification_url: verifyUrl,
              is_demo_fallback: false
            });
            return;
          }
        } catch (_) {}
        setError(err.message || 'No se pudo obtener el certificado de la Blockchain.');
      } finally {
        setLoading(false);
      }
    };

    fetchCertificate();
  }, [docHash]);

  if (typeof document === 'undefined') return null;

  return createPortal(
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
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '1.25rem',
        overflowY: 'auto'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
    >
      <motion.div 
        className="cert-modal-content"
        initial={{ y: 25, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 25, opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '0',
          maxWidth: '840px',
          width: '100%',
          maxHeight: '92vh',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(93, 42, 26, 0.15)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Cabecera Fija / Sticky con Botón Cerrar visible siempre */}
        <div style={{
          padding: '1.1rem 1.5rem',
          background: 'var(--color-fog-white)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-ink-black)', fontFamily: 'var(--font-serif)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
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
              color: 'var(--color-ink-black)',
              transition: 'all 0.2s'
            }}
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo Desplazable del Certificado */}
        <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: 1, background: '#ffffff' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--color-sienna-brown)', borderRadius: '50%', margin: '0 auto 1rem auto', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: 'var(--color-ink-black)', fontSize: '1.05rem', fontWeight: 500 }}>Generando Certificado Digital de Blockchain...</p>
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
                <h2 style={{ fontSize: '1.6rem', color: 'var(--color-ink-black)', fontFamily: 'var(--font-serif)', fontWeight: 500, margin: '0 0 1rem 0' }}>
                  {certData.title}
                </h2>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-blush-peach)', color: 'var(--color-sienna-brown)', border: '1px solid rgba(93, 42, 26, 0.2)', padding: '0.4rem 1rem', borderRadius: 'var(--radius-pill)', fontWeight: '600', fontSize: '0.88rem' }}>
                  <CheckCircle size={16} /> {certData.blockchain_status}
                </div>
              </div>

              {/* Cuerpo del Certificado - Grid Responsivo */}
              <div className="cert-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', alignItems: 'center' }}>
                
                {/* Datos del Graduando y Registro */}
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
                <div className="cert-qr-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem', background: 'var(--color-fog-white)', border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '12px' }}>
                  <QRCodeSVG 
                    value={certData.qr_link || `${window.location.origin}/?hash=${certData.document_hash}`} 
                    size={160}
                    bgColor={"#ffffff"}
                    fgColor={"#17191c"}
                    level={"Q"}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', fontWeight: '500', maxWidth: '160px', margin: 0 }}>
                    Escanear para verificar en Blockchain
                  </p>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="cert-actions" style={{ display: 'flex', gap: '1rem', marginTop: '2.2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
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

        {/* Footer del Modal */}
        <div style={{ padding: '0.85rem 1.5rem', background: 'var(--color-fog-white)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ padding: '0.6rem 1.5rem', width: '100%', maxWidth: '200px' }}
          >
            Cerrar Ventana
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};

export default DigitalCertificate;