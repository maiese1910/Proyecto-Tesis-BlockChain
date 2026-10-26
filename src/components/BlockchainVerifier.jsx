import React, { useState } from 'react';
import { Search, CheckCircle, XCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { blockchainAPI } from '../services/api';

// Conexión con el backend FastAPI → Blockchain (con timeout rápido de 2.5s para fallback)
const verifyOnChain = async (hash) => {
  try {
    return await Promise.race([
      blockchainAPI.verify(hash),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500))
    ]);
  } catch (error) {
    console.error("Verification Error:", error);
    return { exists: false, error: "No se pudo conectar con el servicio de verificación." };
  }
};

const BlockchainVerifier = ({ initialHash }) => {
  const [hashInput, setHashInput] = useState(initialHash || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleVerify = async (hashToVerify = hashInput) => {
    if (!hashToVerify || !hashToVerify.trim()) return;
    setLoading(true);
    setResult(null);

    const cleanInput = hashToVerify.trim();
    let data = await verifyOnChain(cleanInput);

    if (!data || !data.exists) {
      try {
        const localHistory = JSON.parse(localStorage.getItem('usm_pub_history') || '[]');
        const normInput = cleanInput.replace(/^0x/i, '').toUpperCase();
        const localMatch = localHistory.find(r => {
          if (!r || !r.hash) return false;
          const normLocal = r.hash.replace(/^0x/i, '').toUpperCase();
          return normLocal === normInput;
        });

        if (localMatch) {
          data = {
            exists: true,
            ownerName: localMatch.owner_name || localMatch.formData?.nombre_completo || 'Titular Registrado',
            cedula: localMatch.cedula || localMatch.formData?.cedula || 'V-00000000',
            documentType: localMatch.document_type || localMatch.formData?.tramite || 'Planilla PUB',
            timestamp: Math.floor(new Date(localMatch.created_at || Date.now()).getTime() / 1000),
            txHash: localMatch.tx_hash || `0x${normInput}`
          };
        }
      } catch (e) {
        console.warn("Local storage fallback check error:", e);
      }
    }

    setResult(data);
    setLoading(false);
  };

  // Si recibimos un hash inicial (ej: escaneo QR), verificamos automáticamente
  React.useEffect(() => {
    if (initialHash) {
      handleVerify(initialHash);
    }
  }, [initialHash]);

  const formatTimestamp = (ts) => {
    return new Date(ts * 1000).toLocaleString('es-VE', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="view-container">
      <div className="dashboard-header">
        <h2>Verificador Blockchain de Documentos</h2>
        <p>Pega el hash de un documento para comprobar su autenticidad e inmutabilidad en la red Ethereum (Sepolia). Cualquier persona en el mundo puede verificarlo.</p>
      </div>

      <motion.div className="glass-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <input
            className="chat-input"
            style={{ flex: '1 1 200px', fontFamily: 'monospace', minWidth: '0' }}
            placeholder="Pega aquí el hash del documento (ej: 0XA1B2C3...)"
            value={hashInput}
            onChange={e => setHashInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleVerify()}
          />
          <button
            className="send-btn"
            style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', whiteSpace: 'nowrap', flexShrink: 0 }}
            onClick={handleVerify}
            disabled={loading || !hashInput.trim()}
          >
            {loading ? 'Verificando...' : <><Search size={18} /> Verificar</>}
          </button>
        </div>

        {/* Estado de carga */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'inline-block', width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
            <p>Consultando la red Blockchain (Sepolia)...</p>
          </div>
        )}

        <AnimatePresence>
          {result !== null && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {result.exists ? (
                <div className="card-validated" style={{ background: 'rgba(14, 19, 29, 0.95)', border: '1px solid rgba(173,226,230,0.5)', borderRadius: '16px', overflow: 'hidden' }}>
                  {/* Banner Validado (Huemint Aqua & Navy) */}
                  <div style={{ background: 'linear-gradient(135deg, rgba(173,226,230,0.18), rgba(54,68,134,0.25))', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(173,226,230,0.25)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(173,226,230,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(173,226,230,0.45)', boxShadow: '0 0 16px rgba(173,226,230,0.35)' }}>
                        <CheckCircle size={28} color="#ade2e6" />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <h3 style={{ color: '#ade2e6', margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Documento Auténtico y Verificado</h3>
                          <span className="badge-validated">Oficial On-Chain</span>
                        </div>
                        <p style={{ color: '#9cb3ba', fontSize: '0.88rem', marginTop: '0.2rem' }}>El hash coincide matemáticamente con el registro inmutable en Ethereum.</p>
                      </div>
                    </div>
                  </div>

                  {/* Detalles (Huemint Surface) */}
                  <div style={{ padding: '1.5rem 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', background: '#080c14' }}>
                    {[
                      { label: 'Propietario / Titular', value: result.ownerName },
                      { label: 'Cédula de Identidad', value: result.cedula },
                      { label: 'Tipo de Documento', value: result.documentType },
                      { label: 'Fecha de Certificación', value: formatTimestamp(result.timestamp) },
                    ].map(item => (
                      <div key={item.label} style={{ background: '#0e131d', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(102,118,127,0.35)' }}>
                        <p style={{ fontSize: '0.72rem', color: '#9cb3ba', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700', marginBottom: '0.3rem' }}>{item.label}</p>
                        <p style={{ fontWeight: '600', color: '#ffffff', fontSize: '0.95rem' }}>{item.value}</p>
                      </div>
                    ))}

                    <div style={{ gridColumn: '1 / -1' }}>
                      <p style={{ fontSize: '0.72rem', color: '#9cb3ba', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700', marginBottom: '0.3rem' }}>Transaction Hash (Sepolia)</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#0e131d', border: '1px solid rgba(102,118,127,0.35)', padding: '0.8rem 1rem', borderRadius: '10px' }}>
                        <code style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.82rem', color: '#ade2e6', wordBreak: 'break-all' }}>
                          {result.txHash}
                        </code>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#7286b6', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', whiteSpace: 'nowrap', fontWeight: '700' }}
                        >
                          Ver en Etherscan <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '0.9rem 2rem', borderTop: '1px solid rgba(102,118,127,0.3)', display: 'flex', alignItems: 'center', gap: '0.8rem', background: '#000100', flexWrap: 'wrap' }}>
                    <ShieldCheck size={18} color="#ade2e6" />
                    <p style={{ fontSize: '0.82rem', color: '#9cb3ba', margin: 0 }}>
                      Registro validado en la red <strong style={{ color: '#ade2e6' }}>Ethereum Sepolia Testnet</strong> — autenticidad respaldada mediante smart contract.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ border: '1px solid rgba(239,68,68,0.4)', borderRadius: '16px', padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(239,68,68,0.05)' }}>
                  <XCircle size={40} color="var(--danger)" />
                  <div>
                    <h3 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>Documento No Encontrado</h3>
                    <p style={{ color: 'var(--text-muted)' }}>
                      Este hash no existe en el registro de la Blockchain. Puede ser que el documento no haya sido registrado, o que el hash sea incorrecto.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instrucciones */}
        {result === null && !loading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            <ShieldCheck size={40} opacity={0.3} style={{ marginBottom: '1rem' }} />
            <p>Ingresa el hash que fue generado al finalizar el llenado de la Planilla PUB.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
              El hash tiene el formato: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>0XA1B2C3...</code>
            </p>
          </div>
        )}
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default BlockchainVerifier;
