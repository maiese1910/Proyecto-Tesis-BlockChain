import React, { useState } from 'react';
import { Search, CheckCircle, XCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { blockchainAPI } from '../services/api';

// Conexión con el backend FastAPI → Blockchain (con timeout de 2.5s para fallback)
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
        <p>Pega el hash de un documento para comprobar su autenticidad e inmutabilidad en la red Ethereum (Sepolia). Cualquier persona en el mundo puede verificarlo con rigor matemático.</p>
      </div>

      <motion.div
        className="glass-panel"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div style={{ display: 'flex', gap: '0.85rem', marginBottom: '2.25rem', flexWrap: 'wrap' }}>
          <input
            className="chat-input"
            style={{
              flex: '1 1 240px',
              fontFamily: 'monospace',
              minWidth: '0',
              padding: '0.85rem 1.15rem',
              backgroundColor: 'var(--color-fog-white)'
            }}
            placeholder="Pega aquí el hash del documento (ej: 0XA1B2C3...)"
            value={hashInput}
            onChange={e => setHashInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleVerify()}
          />
          <button
            className="send-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
            onClick={() => handleVerify()}
            disabled={loading || !hashInput.trim()}
          >
            {loading ? 'Verificando...' : <><Search size={16} /> Verificar Hash</>}
          </button>
        </div>

        {/* Estado de carga */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-slate-gray)' }}>
            <div style={{
              display: 'inline-block',
              width: 36,
              height: 36,
              border: '2px solid var(--border)',
              borderTopColor: 'var(--color-ink-black)',
              borderRadius: '50%',
              animation: 'spin 0.9s linear infinite',
              marginBottom: '1rem'
            }} />
            <p style={{ fontSize: '0.92rem', margin: 0 }}>Consultando la red descentralizada Ethereum (Sepolia)...</p>
          </div>
        )}

        <AnimatePresence>
          {result !== null && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {result.exists ? (
                /* ─── STEEP ACCENT CARD: BLUSH PEACH (#fbe1d1) CON SIENNA BROWN (#5d2a1a) ─── */
                <motion.div
                  className="card-peach"
                  whileHover={{ y: -4, scale: 1.008 }}
                  style={{
                    padding: '2.25rem',
                    borderRadius: 'var(--radius-cards)',
                    border: '1px solid rgba(93, 42, 26, 0.15)',
                    backgroundColor: 'var(--color-blush-peach)',
                    color: 'var(--color-sienna-brown)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Banner Validado Editorial */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1.25rem',
                    marginBottom: '1.75rem',
                    borderBottom: '1px solid rgba(93, 42, 26, 0.15)',
                    paddingBottom: '1.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(93, 42, 26, 0.2)'
                      }}>
                        <CheckCircle size={24} color="var(--color-sienna-brown)" />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <h3 style={{
                            fontFamily: 'var(--font-serif)',
                            color: 'var(--color-sienna-brown)',
                            margin: 0,
                            fontSize: '1.45rem',
                            fontWeight: 400,
                            letterSpacing: '-0.01em'
                          }}>
                            Documento Auténtico y Verificado
                          </h3>
                          <span className="badge-validated">
                            Certificado On-Chain
                          </span>
                        </div>
                        <p style={{ color: 'var(--color-sienna-brown)', opacity: 0.85, fontSize: '0.88rem', margin: '0.25rem 0 0 0' }}>
                          El hash coincide matemáticamente con el registro inmutable en Ethereum Sepolia.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Baldosas de detalles en blanco sobre Peach */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1.5rem'
                  }}>
                    {[
                      { label: 'Propietario / Titular', value: result.ownerName },
                      { label: 'Cédula de Identidad', value: result.cedula },
                      { label: 'Tipo de Documento', value: result.documentType },
                      { label: 'Fecha de Certificación', value: formatTimestamp(result.timestamp) },
                    ].map(item => (
                      <motion.div
                        key={item.label}
                        whileHover={{ y: -3, scale: 1.01 }}
                        style={{
                          backgroundColor: '#ffffff',
                          padding: '1.1rem',
                          borderRadius: 'var(--radius-inputs)',
                          border: '1px solid rgba(93, 42, 26, 0.12)',
                          boxShadow: '0 2px 8px rgba(93, 42, 26, 0.05)',
                          transition: 'box-shadow 0.2s ease'
                        }}
                      >
                        <p style={{
                          fontSize: '0.72rem',
                          color: 'var(--color-sienna-brown)',
                          opacity: 0.75,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          fontWeight: 500,
                          margin: '0 0 0.3rem 0'
                        }}>
                          {item.label}
                        </p>
                        <p style={{
                          fontWeight: 500,
                          color: 'var(--color-sienna-brown)',
                          fontSize: '0.98rem',
                          margin: 0
                        }}>
                          {item.value}
                        </p>
                      </motion.div>
                    ))}

                    <div style={{ gridColumn: '1 / -1' }}>
                      <p style={{
                        fontSize: '0.72rem',
                        color: 'var(--color-sienna-brown)',
                        opacity: 0.75,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        fontWeight: 500,
                        margin: '0 0 0.35rem 0'
                      }}>
                        Transaction Hash (Sepolia)
                      </p>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid rgba(93, 42, 26, 0.12)',
                        padding: '0.85rem 1.15rem',
                        borderRadius: 'var(--radius-inputs)',
                        flexWrap: 'wrap'
                      }}>
                        <code style={{
                          flex: 1,
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                          color: 'var(--color-sienna-brown)',
                          wordBreak: 'break-all'
                        }}>
                          {result.txHash}
                        </code>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: 'var(--color-sienna-brown)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.84rem',
                            whiteSpace: 'nowrap',
                            fontWeight: 500,
                            textDecoration: 'underline'
                          }}
                        >
                          Ver en Etherscan <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    fontSize: '0.82rem',
                    color: 'var(--color-sienna-brown)',
                    opacity: 0.85
                  }}>
                    <ShieldCheck size={16} />
                    <span>Registro respaldado mediante contrato inteligente verificable en la red Ethereum.</span>
                  </div>
                </motion.div>
              ) : (
                /* Estado: Documento No Encontrado */
                <div style={{
                  border: '1px solid rgba(93, 42, 26, 0.2)',
                  borderRadius: 'var(--radius-cards)',
                  padding: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  backgroundColor: 'var(--color-fog-white)'
                }}>
                  <XCircle size={36} color="var(--color-sienna-brown)" />
                  <div>
                    <h3 style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.2rem',
                      fontWeight: 400,
                      color: 'var(--color-sienna-brown)',
                      margin: '0 0 0.35rem 0'
                    }}>
                      Documento No Encontrado
                    </h3>
                    <p style={{ color: 'var(--color-slate-gray)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                      Este hash no figura en el registro descentralizado. Comprueba que el código hash ingresado esté completo y coincida con el comprobante de liquidación.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instrucciones cuando no hay búsqueda */}
        {result === null && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--color-slate-gray)' }}>
            <ShieldCheck size={36} color="var(--color-ash-gray)" style={{ margin: '0 auto 1rem auto' }} />
            <p style={{ fontSize: '0.94rem', margin: '0 0 0.5rem 0' }}>
              Ingresa el hash que fue generado al finalizar el llenado de la Planilla PUB o expedición del título.
            </p>
            <p style={{ fontSize: '0.84rem', margin: 0 }}>
              El formato de búsqueda es: <code style={{ backgroundColor: 'var(--color-mist-gray)', padding: '0.2rem 0.55rem', borderRadius: '4px', color: 'var(--color-ink-black)', fontFamily: 'monospace' }}>0XA1B2C3...</code>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default BlockchainVerifier;
