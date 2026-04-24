import React, { useState } from 'react';
import { Search, CheckCircle, XCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Simula la verificación contra el contrato blockchain
// En producción: llama al backend FastAPI → web3.py → Sepolia
const simulateVerify = async (hash) => {
  await new Promise(r => setTimeout(r, 2000));

  // Simulación: si el hash empieza con "0X" y tiene longitud suficiente → existe
  if (hash.startsWith('0X') && hash.length > 20) {
    return {
      exists: true,
      ownerName: 'Juan Carlos Pérez García',
      cedula: 'V-12.345.678',
      documentType: 'Planilla Única Bancaria (PUB) — SAREN',
      timestamp: Math.floor(Date.now() / 1000) - 300,
      txHash: '0x' + Math.random().toString(16).slice(2, 66),
    };
  }
  return { exists: false };
};

const BlockchainVerifier = () => {
  const [hashInput, setHashInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleVerify = async () => {
    if (!hashInput.trim()) return;
    setLoading(true);
    setResult(null);
    const data = await simulateVerify(hashInput.trim().toUpperCase());
    setResult(data);
    setLoading(false);
  };

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
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <input
            className="chat-input"
            style={{ flex: 1, fontFamily: 'monospace' }}
            placeholder="Pega aquí el hash del documento (ej: 0XA1B2C3...)"
            value={hashInput}
            onChange={e => setHashInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleVerify()}
          />
          <button
            className="send-btn"
            style={{ padding: '0 2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}
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
                <div style={{ border: '1px solid rgba(16,185,129,0.4)', borderRadius: '16px', overflow: 'hidden' }}>
                  {/* Banner */}
                  <div style={{ background: 'rgba(16,185,129,0.15)', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <CheckCircle size={32} color="var(--success)" />
                    <div>
                      <h3 style={{ color: 'var(--success)', marginBottom: '0.2rem' }}>✅ Documento Auténtico y Verificado</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Este documento existe de forma inmutable en la Blockchain de Ethereum.</p>
                    </div>
                  </div>

                  {/* Detalles */}
                  <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    {[
                      { label: 'Propietario', value: result.ownerName },
                      { label: 'Cédula de Identidad', value: result.cedula },
                      { label: 'Tipo de Documento', value: result.documentType },
                      { label: 'Fecha de Registro', value: formatTimestamp(result.timestamp) },
                    ].map(item => (
                      <div key={item.label}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{item.label}</p>
                        <p style={{ fontWeight: '600' }}>{item.value}</p>
                      </div>
                    ))}

                    <div style={{ gridColumn: '1 / -1' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Transaction Hash (Blockchain)</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.3)', padding: '0.8rem 1rem', borderRadius: '8px' }}>
                        <code style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--primary)', wordBreak: 'break-all' }}>
                          {result.txHash}
                        </code>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                        >
                          Ver en Etherscan <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(124,58,237,0.05)' }}>
                    <ShieldCheck size={18} color="#a78bfa" />
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Registrado en la red <strong style={{ color: '#a78bfa' }}>Ethereum Sepolia Testnet</strong> — inmutable e inalcanzable por cualquier institución.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ border: '1px solid rgba(239,68,68,0.4)', borderRadius: '16px', padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(239,68,68,0.05)' }}>
                  <XCircle size={40} color="var(--danger)" />
                  <div>
                    <h3 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>❌ Documento No Encontrado</h3>
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
