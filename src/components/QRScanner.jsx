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
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem', background: '#f7fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem', paddingTop: '1rem' }}>
        <h2 style={{ color: '#1a365d', marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>Portal de Autoridades</h2>
        <p style={{ color: '#4a5568', fontSize: '0.9rem' }}>Sistema de Verificación Blockchain (SAREN)</p>
      </div>

      {!scanResult ? (
        <div style={{ padding: '1rem', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div id="reader" style={{ width: '100%' }}></div>
          <p style={{ textAlign: 'center', marginTop: '1rem', color: '#718096', fontSize: '0.85rem' }}>
            Apunta la cámara al código QR de la Planilla PUB para verificar su autenticidad.
          </p>
        </div>
      ) : (
        <div style={{ padding: '2rem', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <Loader2 size={48} color="#3182ce" className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ color: '#2b6cb0', fontWeight: 'bold' }}>Consultando Nodo Ethereum...</p>
            </div>
          ) : verificationData ? (
            <div style={{ animation: 'fadeIn 0.5s ease-in' }}>
              <ShieldCheck size={80} color="#38a169" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ color: '#276749', fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 'bold' }}>DOCUMENTO AUTÉNTICO</h3>
              
              <div style={{ background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: '8px', padding: '1.5rem', textAlign: 'left', marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#4a5568', fontWeight: 'bold' }}>TITULAR:</p>
                <p style={{ margin: '0 0 1rem 0', fontWeight: 'bold', color: '#1a202c' }}>{verificationData.ownerName}</p>
                
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#4a5568', fontWeight: 'bold' }}>CÉDULA:</p>
                <p style={{ margin: '0 0 1rem 0', fontWeight: 'bold', color: '#1a202c' }}>{verificationData.cedula}</p>
                
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#4a5568', fontWeight: 'bold' }}>TRÁMITE REGISTRADO:</p>
                <p style={{ margin: '0 0 1rem 0', fontWeight: 'bold', color: '#1a202c' }}>{verificationData.documentType}</p>
                
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#4a5568', fontWeight: 'bold' }}>FECHA DE REGISTRO:</p>
                <p style={{ margin: '0 0 1rem 0', fontWeight: 'bold', color: '#1a202c' }}>
                  {new Date(verificationData.timestamp * 1000).toLocaleString()}
                </p>
                
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#4a5568', fontWeight: 'bold' }}>HASH (SHA-256):</p>
                <p style={{ margin: 0, fontSize: '0.65rem', fontFamily: 'monospace', wordBreak: 'break-all', color: '#718096' }}>
                  {scanResult}
                </p>
              </div>

              <button 
                onClick={resetScanner}
                style={{ width: '100%', padding: '1rem', background: '#3182ce', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
              >
                Escanear Nuevo Documento
              </button>
            </div>
          ) : (
            <div style={{ animation: 'fadeIn 0.5s ease-in' }}>
              <XCircle size={80} color="#e53e3e" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ color: '#c53030', fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 'bold' }}>DOCUMENTO INVÁLIDO</h3>
              <p style={{ color: '#742a2a', marginBottom: '1.5rem' }}>{error}</p>
              
              <button 
                onClick={resetScanner}
                style={{ width: '100%', padding: '1rem', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
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
        /* Sobrescribir estilos feos de html5-qrcode */
        #reader button { background: #3182ce; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; margin: 0.5rem; font-weight: bold; }
        #reader a { color: #3182ce; text-decoration: none; display: none; }
      `}</style>
    </div>
  );
};

export default QRScanner;
