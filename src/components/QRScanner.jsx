import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ShieldCheck, XCircle, Loader2 } from 'lucide-react';
import { blockchainAPI } from '../services/api';

const QRScanner = () => {
  const [scanResult, setScanResult] = useState(null);
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Inicializar el escáner al montar el componente
    const scanner = new Html5QrcodeScanner('reader', {
      qrbox: {
        width: 250,
        height: 250,
      },
      fps: 5,
    });

    scanner.render(success, onScanError);

    function success(result) {
      scanner.clear();
      setScanResult(result);
      verifyDocument(result);
    }

    function onScanError(err) {
      // ignorar errores de frame vacío
    }

    return () => {
      scanner.clear().catch(err => {
        console.error("Failed to clear html5QrcodeScanner. ", err);
      });
    };
  }, []);

  const verifyDocument = async (hash) => {
    setLoading(true);
    setError(null);
    try {
      // Limpiar el hash si viene como URL
      let cleanHash = hash;
      if (hash.includes('hash=')) {
        cleanHash = hash.split('hash=')[1].split('&')[0];
      }

      const res = await blockchainAPI.verify(cleanHash.trim().toUpperCase());
      if (res.exists) {
        setVerificationData(res);
      } else {
        setError("Documento no encontrado en la Blockchain.");
      }
    } catch (err) {
      console.error(err);
      setError("Error de conexión al verificar el documento.");
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setVerificationData(null);
    setError(null);
    window.location.reload();
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem 1rem', background: 'var(--surface-canvas)', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem', paddingTop: '1rem' }}>
        <h2 style={{ color: 'var(--color-ink-black)', fontFamily: 'var(--font-serif)', fontWeight: 400, marginBottom: '0.5rem', fontSize: '1.85rem' }}>Portal de Autoridades</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Sistema de Verificación Blockchain (SAREN / MPPEU / MPPRE)</p>
      </div>

      {!scanResult ? (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div id="reader" style={{ width: '100%' }}></div>
          <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Apunta la cámara al código QR de la Planilla PUB o Apostilla para verificar su autenticidad.
          </p>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <Loader2 size={48} color="var(--color-sienna-brown)" className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ color: 'var(--color-ink-black)', fontWeight: 600 }}>Consultando Nodo Ethereum...</p>
            </div>
          ) : verificationData ? (
            (() => {
              const isRevoked = Boolean(verificationData.isRevoked || (verificationData.status || '').includes('Rechazado') || (verificationData.status || '').includes('Revocado'));
              return (
                <div style={{ animation: 'fadeIn 0.5s ease-in' }}>
                  {isRevoked ? (
                    <XCircle size={72} color="var(--danger)" style={{ margin: '0 auto 1rem auto' }} />
                  ) : (
                    <ShieldCheck size={72} color="var(--color-sienna-brown)" style={{ margin: '0 auto 1rem auto' }} />
                  )}

                  <h3 style={{ color: isRevoked ? 'var(--danger)' : 'var(--color-ink-black)', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.6rem', marginBottom: '0.4rem' }}>
                    {isRevoked ? 'Documento Rechazado / Revocado' : 'Documento Auténtico'}
                  </h3>

                  <p style={{ color: isRevoked ? 'var(--danger)' : 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    {isRevoked ? (verificationData.rejectionReason || 'Este documento fue formalmente revocado por la autoridad ministerial.') : 'Huella criptográfica validada contra contrato inteligente en Ethereum Sepolia.'}
                  </p>
                  
                  <div style={{ background: isRevoked ? 'rgba(185, 28, 28, 0.05)' : 'var(--color-fog-white)', border: isRevoked ? '1px solid rgba(185, 28, 28, 0.2)' : '1px solid var(--border)', borderRadius: 'var(--radius-inputs)', padding: '1.5rem', textAlign: 'left', marginBottom: '1.5rem' }}>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TITULAR:</p>
                    <p style={{ margin: '0 0 1rem 0', fontWeight: 600, color: 'var(--color-ink-black)' }}>{verificationData.ownerName}</p>
                    
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>CÉDULA:</p>
                    <p style={{ margin: '0 0 1rem 0', fontWeight: 600, color: 'var(--color-ink-black)' }}>{verificationData.cedula}</p>
                    
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TRÁMITE REGISTRADO:</p>
                    <p style={{ margin: '0 0 1rem 0', fontWeight: 600, color: 'var(--color-ink-black)' }}>{verificationData.documentType}</p>
                    
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>FECHA DE REGISTRO:</p>
                    <p style={{ margin: '0 0 1rem 0', fontWeight: 600, color: 'var(--color-ink-black)' }}>
                      {new Date(verificationData.timestamp * 1000).toLocaleString()}
                    </p>
                    
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>HASH (SHA-256):</p>
                    <p style={{ margin: 0, fontSize: '0.72rem', fontFamily: 'monospace', wordBreak: 'break-all', color: 'var(--text-secondary)' }}>
                      {scanResult}
                    </p>
                  </div>

                  <button 
                    onClick={resetScanner}
                    className="send-btn"
                    style={{ width: '100%', padding: '0.9rem' }}
                  >
                    Escanear Nuevo Documento
                  </button>
                </div>
              );
            })()
          ) : (
            <div style={{ animation: 'fadeIn 0.5s ease-in' }}>
              <XCircle size={72} color="var(--danger)" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ color: 'var(--danger)', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.6rem', marginBottom: '1rem' }}>Documento Inválido</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>

              <button
                onClick={resetScanner}
                className="send-btn"
                style={{ width: '100%', padding: '0.9rem', background: 'var(--danger)' }}
              >
                Intentar Nuevamente
              </button>
            </div>
          )}
        </div>
      )}
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        /* Sobrescribir estilos de html5-qrcode con tokens Steep */
        #reader button { background: var(--color-ink-black); color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; margin: 0.5rem; font-weight: 500; }
        #reader a { color: var(--color-sienna-brown); text-decoration: none; display: none; }
      `}</style>
    </div>
  );
};

export default QRScanner;
