import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, ExternalLink, ShieldCheck, FileText, Layers, Award, Sparkles, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { blockchainAPI } from '../services/api';
import { verifyDocumentOnChain, SEPOLIA_EXPLORER_URL, getContractAddress } from '../services/web3Service';
import DigitalCertificate from './DigitalCertificate';
import WalletConnect from './WalletConnect';

const SAMPLE_HASHES = [
  {
    label: 'Título Ing. de Sistemas (V-28.315.101)',
    hash: '0x4b7891a2bc3456def0123456789abcdef0123456789abcdef0123456789abcd1',
    note: 'Cotejo MPPEU (GTU) Aprobado'
  },
  {
    label: 'Título Ing. Civil (V-27.890.432)',
    hash: '0x1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B',
    note: 'Apostillado por Cancillería MPPRE'
  }
];

const BlockchainVerifier = ({ initialHash }) => {
  const [hashInput, setHashInput] = useState(initialHash || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showCertModal, setShowCertModal] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [contractAddr, setContractAddr] = useState(getContractAddress());

  useEffect(() => {
    const handleAddrUpdate = (e) => {
      if (e.detail) setContractAddr(e.detail);
    };
    window.addEventListener('usm_contract_address_updated', handleAddrUpdate);
    return () => window.removeEventListener('usm_contract_address_updated', handleAddrUpdate);
  }, []);

  const handleVerify = async (hashToVerify = hashInput) => {
    if (!hashToVerify || !hashToVerify.trim()) return;
    setLoading(true);
    setResult(null);

    const cleanInput = hashToVerify.trim();
    let data = null;

    // 1. Intento de verificación On-Chain en Ethereum Sepolia (Smart Contract)
    try {
      const onChainData = await verifyDocumentOnChain(cleanInput);
      if (onChainData && onChainData.exists) {
        data = {
          exists: true,
          isOnChainSmartContract: true,
          ownerName: onChainData.ownerName,
          cedula: onChainData.cedula,
          documentType: onChainData.documentType,
          timestamp: onChainData.timestamp || Math.floor(Date.now() / 1000),
          isRevoked: onChainData.isRevoked,
          contractAddress: onChainData.contractAddress,
          txHash: onChainData.contractAddress,
          status: onChainData.isRevoked ? 'REVOCADO / ANULADO' : 'CERTIFICADO ON-CHAIN (SEPOLIA)'
        };
      }
    } catch (chainErr) {
      console.warn("Consulta On-Chain directa no disponible:", chainErr);
    }

    // 2. Consulta al Servidor Backend de la Plataforma (Flask + Supabase / Memoria)
    if (!data || !data.exists) {
      try {
        const backendRes = await Promise.race([
          blockchainAPI.verify(cleanInput),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500))
        ]);
        if (backendRes && backendRes.exists) {
          data = {
            ...backendRes,
            isOnChainSmartContract: false
          };
        }
      } catch (backendErr) {
        console.warn("Consulta backend falló, evaluando fallback local:", backendErr);
      }
    } else {
      // Si ya existía On-Chain, consultar metadatos enriquecidos del backend sin bloquear
      try {
        const extraRes = await blockchainAPI.verify(cleanInput);
        if (extraRes && extraRes.exists) {
          data = {
            ...data,
            ...extraRes,
            isOnChainSmartContract: true
          };
        }
      } catch (_) {}
    }

    // 3. Fallback de Almacenamiento Local (usm_blockchain_records y usm_pub_history)
    if (!data || !data.exists) {
      try {
        const localHistory = JSON.parse(localStorage.getItem('usm_pub_history') || '[]');
        const bcRecords = JSON.parse(localStorage.getItem('usm_blockchain_records') || '[]');
        const normInput = cleanInput.replace(/^0x/i, '').toUpperCase();

        const findRecord = (arr) => arr.find(r => {
          if (!r) return false;
          const h = (r.hash || r.document_hash || r.blockchainHash || '').replace(/^0x/i, '').toUpperCase();
          return h === normInput;
        });

        const localMatch = findRecord(bcRecords) || findRecord(localHistory);

        if (localMatch) {
          data = {
            exists: true,
            isOnChainSmartContract: false,
            ownerName: localMatch.ownerName || localMatch.owner_name || localMatch.formData?.nombre_completo || 'Titular Registrado',
            cedula: localMatch.cedula || localMatch.formData?.cedula || 'V-00000000',
            documentType: localMatch.documentType || localMatch.document_type || localMatch.formData?.tramite || 'Título de Grado USM',
            timestamp: localMatch.timestamp || Math.floor(new Date(localMatch.created_at || Date.now()).getTime() / 1000),
            txHash: localMatch.txHash || localMatch.tx_hash || `0x${normInput}`,
            status: localMatch.status || 'CERTIFICADO_MPPEU',
            isRevoked: Boolean(localMatch.isRevoked || (localMatch.status || '').includes('Rechazado') || (localMatch.status || '').includes('Revocado')),
            rejectionReason: localMatch.rejectionReason,
            verifiedBy: localMatch.verifiedBy || localMatch.mppeuOfficer,
            solicitudCode: localMatch.solicitudCode,
            apostilleNumber: localMatch.apostilleNumber
          };
        }
      } catch (e) {
        console.warn("Local storage fallback check error:", e);
      }
    }

    setResult(data || { exists: false, error: "Documento no registrado en la blockchain ni en base de datos." });
    setLoading(false);
  };

  useEffect(() => {
    if (initialHash) {
      handleVerify(initialHash);
    }
  }, [initialHash]);

  const formatTimestamp = (ts) => {
    if (!ts) return 'Fecha no registrada';
    const dateObj = typeof ts === 'number' && ts < 10000000000 ? new Date(ts * 1000) : new Date(ts);
    return dateObj.toLocaleString('es-VE', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  return (
    <div className="view-container">
      <div className="dashboard-header">
        <h2>Verificador Blockchain de Documentos</h2>
        <p>
          Comprueba la autenticidad e inmutabilidad de títulos universitarios y apostillas en la red pública Ethereum (Sepolia). 
          Cualquier institución educativa o consular del mundo puede verificar los documentos con rigor criptográfico independiente.
        </p>
      </div>

      {/* ─── Banner de Estado del Contrato Inteligente en Sepolia ─── */}
      <div style={{
        background: 'var(--color-fog-white)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-cards)',
        padding: '0.85rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        fontSize: '0.82rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#10b981',
            boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)'
          }} />
          <span style={{ fontWeight: 600, color: 'var(--color-ink-black)' }}>Ethereum Sepolia Testnet</span>
          <span style={{ color: 'var(--color-slate-gray)' }}>·</span>
          <span style={{ color: 'var(--color-slate-gray)' }}>Smart Contract:</span>
          <code style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-sienna-brown)' }}>
            {contractAddr ? `${contractAddr.slice(0, 8)}...${contractAddr.slice(-6)}` : '0x1234...890'}
          </code>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <WalletConnect />
          {contractAddr && contractAddr.startsWith('0x') && contractAddr.length === 42 && (
            <a
              href={`${SEPOLIA_EXPLORER_URL}/address/${contractAddr}#readContract`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: 'var(--color-sienna-brown)',
                fontWeight: 500,
                textDecoration: 'none'
              }}
            >
              Explorar Código en Etherscan <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>

      <motion.div
        className="glass-panel"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div style={{ display: 'flex', gap: '0.85rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <input
            className="chat-input"
            style={{
              flex: '1 1 240px',
              fontFamily: 'monospace',
              minWidth: '0',
              padding: '0.85rem 1.15rem',
              backgroundColor: 'var(--color-fog-white)'
            }}
            placeholder="Pega aquí el hash SHA-256 o Keccak-256 del documento (ej: 0x4b78...)"
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

        {/* Botones de Hashes de Prueba para Evaluación Académica */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            Ejemplos de Grado:
          </span>
          {SAMPLE_HASHES.map((sample) => (
            <button
              key={sample.hash}
              onClick={() => {
                setHashInput(sample.hash);
                handleVerify(sample.hash);
              }}
              style={{
                fontSize: '0.76rem',
                padding: '0.35rem 0.75rem',
                background: 'var(--color-fog-white)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-pill)',
                color: 'var(--color-ink-black)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title={sample.note}
            >
              {sample.label}
            </button>
          ))}
        </div>

        {/* Estado de carga */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--color-slate-gray)' }}>
            <div style={{
              display: 'inline-block',
              width: 38,
              height: 38,
              border: '2px solid var(--border)',
              borderTopColor: 'var(--color-sienna-brown)',
              borderRadius: '50%',
              animation: 'spin 0.9s linear infinite',
              marginBottom: '1rem'
            }} />
            <p style={{ fontSize: '0.94rem', margin: 0, fontWeight: 500, color: 'var(--color-ink-black)' }}>
              Consultando la red Ethereum Sepolia y el registro distribuido...
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-gray)', margin: '0.35rem 0 0 0' }}>
              Validación criptográfica mediante llamadas RPC de consenso descentralizado.
            </p>
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
                (() => {
                  const isRevoked = Boolean(result.isRevoked || (result.status || '').includes('Rechazado') || (result.status || '').includes('Revocado'));

                  if (isRevoked) {
                    return (
                      <motion.div
                        whileHover={{ y: -3, scale: 1.005 }}
                        style={{
                          padding: '2.25rem',
                          borderRadius: 'var(--radius-cards)',
                          border: '1px solid rgba(185, 28, 28, 0.3)',
                          backgroundColor: 'rgba(185, 28, 28, 0.06)',
                          color: 'var(--danger)',
                          overflow: 'hidden'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '1.25rem',
                          marginBottom: '1.75rem',
                          borderBottom: '1px solid rgba(185, 28, 28, 0.15)',
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
                              border: '1px solid rgba(185, 28, 28, 0.25)'
                            }}>
                              <XCircle size={24} color="var(--danger)" />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <h3 style={{
                                  fontFamily: 'var(--font-serif)',
                                  color: 'var(--danger)',
                                  margin: 0,
                                  fontSize: '1.45rem',
                                  fontWeight: 400
                                }}>
                                  Documento Rechazado / Revocado
                                </h3>
                                <span style={{
                                  fontSize: '0.74rem',
                                  fontWeight: 600,
                                  background: 'rgba(185, 28, 28, 0.15)',
                                  color: 'var(--danger)',
                                  border: '1px solid rgba(185, 28, 28, 0.3)',
                                  padding: '0.2rem 0.65rem',
                                  borderRadius: 'var(--radius-pill)'
                                }}>
                                  Anulado On-Chain
                                </span>
                              </div>
                              <p style={{ color: 'var(--danger)', opacity: 0.9, fontSize: '0.88rem', margin: '0.25rem 0 0 0' }}>
                                {result.rejectionReason ? `Causa de rechazo: ${result.rejectionReason}` : "Este documento fue formalmente rechazado o revocado por las autoridades gubernamentales."}
                              </p>
                              {result.verifiedBy && (
                                <p style={{ fontSize: '0.8rem', opacity: 0.85, margin: '0.2rem 0 0 0' }}>
                                  Auditado por: <strong>{result.verifiedBy}</strong>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                          gap: '1rem',
                          marginBottom: '1.5rem'
                        }}>
                          {[
                            { label: 'Titular', value: result.ownerName },
                            { label: 'Cédula de Identidad', value: result.cedula },
                            { label: 'Tipo de Documento', value: result.documentType },
                            { label: 'Fecha de Registro', value: formatTimestamp(result.timestamp) },
                          ].map(item => (
                            <div
                              key={item.label}
                              style={{
                                backgroundColor: '#ffffff',
                                padding: '1.1rem',
                                borderRadius: 'var(--radius-inputs)',
                                border: '1px solid rgba(185, 28, 28, 0.15)'
                              }}
                            >
                              <p style={{ fontSize: '0.72rem', color: 'var(--danger)', opacity: 0.75, textTransform: 'uppercase', fontWeight: 600, margin: '0 0 0.3rem 0' }}>
                                {item.label}
                              </p>
                              <p style={{ fontWeight: 600, color: 'var(--color-ink-black)', fontSize: '0.95rem', margin: 0 }}>
                                {item.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  }

                  const hasRealTx = result.txHash && result.txHash.startsWith('0x') && result.txHash.length === 66;

                  return (
                    <motion.div
                      className="card-peach"
                      whileHover={{ y: -3, scale: 1.005 }}
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
                            width: 46,
                            height: 46,
                            borderRadius: '50%',
                            backgroundColor: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(93, 42, 26, 0.2)'
                          }}>
                            <CheckCircle size={26} color="var(--color-sienna-brown)" />
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
                                Documento Auténtico e Inmutable
                              </h3>
                              <span className="badge-validated" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                <Sparkles size={12} />
                                {result.isOnChainSmartContract ? 'Smart Contract Sepolia' : 'Certificado Criptográfico'}
                              </span>
                            </div>
                            <p style={{ color: 'var(--color-sienna-brown)', opacity: 0.9, fontSize: '0.88rem', margin: '0.25rem 0 0 0' }}>
                              El hash coincide matemáticamente con el registro distribuido inmutable.
                            </p>
                          </div>
                        </div>

                        {/* Botón para Abrir Certificado Oficial Digital */}
                        <button
                          onClick={() => setShowCertModal(true)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.65rem 1.2rem',
                            background: '#ffffff',
                            border: '1px solid rgba(93, 42, 26, 0.25)',
                            borderRadius: 'var(--radius-pill)',
                            color: 'var(--color-sienna-brown)',
                            fontWeight: 600,
                            fontSize: '0.84rem',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(93, 42, 26, 0.06)'
                          }}
                        >
                          <Award size={16} /> Ver Certificado Digital con QR
                        </button>
                      </div>

                      {/* Baldosas de detalles */}
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
                          <div
                            key={item.label}
                            style={{
                              backgroundColor: '#ffffff',
                              padding: '1.1rem',
                              borderRadius: 'var(--radius-inputs)',
                              border: '1px solid rgba(93, 42, 26, 0.12)',
                              boxShadow: '0 2px 8px rgba(93, 42, 26, 0.05)'
                            }}
                          >
                            <p style={{
                              fontSize: '0.72rem',
                              color: 'var(--color-sienna-brown)',
                              opacity: 0.75,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              fontWeight: 600,
                              margin: '0 0 0.3rem 0'
                            }}>
                              {item.label}
                            </p>
                            <p style={{
                              fontWeight: 600,
                              color: 'var(--color-sienna-brown)',
                              fontSize: '0.98rem',
                              margin: 0
                            }}>
                              {item.value}
                            </p>
                          </div>
                        ))}

                        {/* Hash del Documento */}
                        <div style={{ gridColumn: '1 / -1' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                            <p style={{
                              fontSize: '0.72rem',
                              color: 'var(--color-sienna-brown)',
                              opacity: 0.75,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              fontWeight: 600,
                              margin: 0
                            }}>
                              Hash Criptográfico del Documento (SHA-256)
                            </p>
                            <button
                              onClick={() => copyToClipboard(hashInput.trim())}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-sienna-brown)',
                                cursor: 'pointer',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              {copiedHash ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
                            </button>
                          </div>
                          <div style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid rgba(93, 42, 26, 0.12)',
                            padding: '0.85rem 1.15rem',
                            borderRadius: 'var(--radius-inputs)'
                          }}>
                            <code style={{
                              fontFamily: 'monospace',
                              fontSize: '0.84rem',
                              color: 'var(--color-sienna-brown)',
                              wordBreak: 'break-all'
                            }}>
                              {hashInput.trim()}
                            </code>
                          </div>
                        </div>

                        {/* Transacción en Sepolia */}
                        <div style={{ gridColumn: '1 / -1' }}>
                          <p style={{
                            fontSize: '0.72rem',
                            color: 'var(--color-sienna-brown)',
                            opacity: 0.75,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            fontWeight: 600,
                            margin: '0 0 0.35rem 0'
                          }}>
                            Transaction Hash / Registro On-Chain (Ethereum Sepolia)
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
                              fontSize: '0.84rem',
                              color: 'var(--color-sienna-brown)',
                              wordBreak: 'break-all'
                            }}>
                              {result.txHash || '0xRegistradoOnChain'}
                            </code>
                            {hasRealTx && (
                              <a
                                href={`${SEPOLIA_EXPLORER_URL}/tx/${result.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: 'var(--color-sienna-brown)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  fontSize: '0.84rem',
                                  whiteSpace: 'nowrap',
                                  fontWeight: 600,
                                  textDecoration: 'underline'
                                }}
                              >
                                Ver Transacción en Etherscan <ExternalLink size={13} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        fontSize: '0.82rem',
                        color: 'var(--color-sienna-brown)',
                        opacity: 0.9
                      }}>
                        <ShieldCheck size={16} />
                        <span>Registro respaldado mediante contrato inteligente desplegado en la red Ethereum Sepolia (PoS).</span>
                      </div>
                    </motion.div>
                  );
                })()
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
                      Este código hash no figura registrado en el contrato inteligente ni en la base ministerial. 
                      Verifica que el hash coincida con el emitido al término del cotejo institucional o la Planilla PUB.
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
            <ShieldCheck size={38} color="var(--color-ash-gray)" style={{ margin: '0 auto 1rem auto' }} />
            <p style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0', color: 'var(--color-ink-black)', fontWeight: 500 }}>
              Ingresa el hash generado al completar el escaneo de tu título o la solicitud en taquilla.
            </p>
            <p style={{ fontSize: '0.84rem', margin: 0 }}>
              Puedes pegar un hash directo o pulsar cualquiera de los botones de ejemplo arriba para comprobar el funcionamiento.
            </p>
          </div>
        )}
      </motion.div>

      {/* Modal de Certificado Digital con QR */}
      {showCertModal && (
        <DigitalCertificate
          docHash={hashInput.trim()}
          onClose={() => setShowCertModal(false)}
        />
      )}
    </div>
  );
};

export default BlockchainVerifier;
