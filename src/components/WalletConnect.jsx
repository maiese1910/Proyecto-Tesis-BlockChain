import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, ShieldCheck, AlertTriangle, ExternalLink, Copy, Check,
  RefreshCw, Power, Award, ArrowUpRight, ChevronRight, X
} from 'lucide-react';
import {
  isMetaMaskInstalled, connectWallet, switchToSepolia,
  getContractAddress, setContractAddress, deployContractOnSepolia,
  SEPOLIA_CHAIN_ID, SEPOLIA_EXPLORER_URL
} from '../services/web3Service';
import { statsAPI } from '../services/api';

const WalletConnect = () => {
  const [address, setAddress] = useState(null);
  const [balance, setBalance] = useState('0.0000');
  const [isSepolia, setIsSepolia] = useState(false);
  const [chainId, setChainId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contractAddr, setContractAddr] = useState(getContractAddress());
  const [deploying, setDeploying] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState(null);
  const [inputContract, setInputContract] = useState('');
  const [showConfigContract, setShowConfigContract] = useState(false);
  const [error, setError] = useState(null);

  // Formateador de direcciones
  const formatAddress = (addr) => {
    if (!addr) return '';
    if (addr.length <= 12) return addr;
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // Cargar estado inicial y listeners de MetaMask
  const updateWalletState = useCallback(async () => {
    if (!isMetaMaskInstalled()) {
      // Si no hay MetaMask, consultar la wallet institucional del backend para vista previa
      try {
        const data = await statsAPI.getStats();
        if (data.wallet_address) {
          setAddress(data.wallet_address);
          setIsSepolia(true);
        }
      } catch (_) {}
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        const currentChain = await window.ethereum.request({ method: 'eth_chainId' });
        const cId = parseInt(currentChain, 16);
        setChainId(cId);
        setIsSepolia(cId === SEPOLIA_CHAIN_ID);
        setAddress(accounts[0]);

        // Consultar balance
        const balHex = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [accounts[0], 'latest'],
        });
        const balEth = parseInt(balHex, 16) / 1e18;
        setBalance(balEth.toFixed(4));
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    updateWalletState();

    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccounts = (accounts) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          updateWalletState();
        } else {
          setAddress(null);
          setBalance('0.0000');
        }
      };

      const handleChain = () => {
        updateWalletState();
      };

      window.ethereum.on('accountsChanged', handleAccounts);
      window.ethereum.on('chainChanged', handleChain);

      const handleContractUpdate = (e) => {
        setContractAddr(e.detail);
      };
      window.addEventListener('usm_contract_address_updated', handleContractUpdate);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccounts);
          window.ethereum.removeListener('chainChanged', handleChain);
        }
        window.removeEventListener('usm_contract_address_updated', handleContractUpdate);
      };
    }
  }, [updateWalletState]);

  // Manejar conexión interactiva
  const handleConnect = async () => {
    setError(null);
    setLoading(true);
    try {
      const conn = await connectWallet();
      setAddress(conn.address);
      setBalance(conn.balance);
      setIsSepolia(conn.isSepolia);
      setChainId(conn.chainId);
      if (!conn.isSepolia) {
        await switchToSepolia();
        setIsSepolia(true);
      }
    } catch (err) {
      setError(err.message || 'Error al conectar la billetera.');
      alert(err.message || 'Error al conectar la billetera.');
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambio a Sepolia
  const handleSwitchNetwork = async () => {
    try {
      await switchToSepolia();
      setIsSepolia(true);
      updateWalletState();
    } catch (err) {
      alert('No se pudo cambiar a la red Sepolia: ' + err.message);
    }
  };

  // Copiar dirección
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Desconectar
  const handleDisconnect = () => {
    setAddress(null);
    setBalance('0.0000');
    setShowModal(false);
  };

  // Desplegar contrato en Sepolia desde MetaMask
  const handleDeployContract = async () => {
    if (!address) {
      alert('Debes conectar MetaMask primero.');
      return;
    }
    if (!isSepolia) {
      await handleSwitchNetwork();
    }

    setDeploying(true);
    setError(null);
    try {
      const res = await deployContractOnSepolia();
      if (res.success) {
        setContractAddr(res.contractAddress);
        setDeploySuccess(`Contrato desplegado con éxito en Sepolia:\n${res.contractAddress}`);
        alert(`¡Contrato desplegado en Sepolia con éxito!\nDirección: ${res.contractAddress}\nTX: ${res.txHash}`);
      }
    } catch (err) {
      console.error('Error desplegando contrato:', err);
      setError('Error al desplegar contrato: ' + (err.message || 'Revisa tu balance de Sepolia ETH.'));
      alert('Error desplegando contrato: ' + (err.message || 'Revisa que tengas Sepolia ETH para gas.'));
    } finally {
      setDeploying(false);
    }
  };

  // Guardar dirección manual de contrato
  const handleSaveContractAddress = () => {
    if (!inputContract.startsWith('0x') || inputContract.length !== 42) {
      alert('Ingresa una dirección Ethereum válida (debe comenzar con 0x y tener 42 caracteres).');
      return;
    }
    setContractAddress(inputContract.trim());
    setContractAddr(inputContract.trim());
    setShowConfigContract(false);
    alert('Dirección del contrato actualizada para toda la aplicación.');
  };

  return (
    <>
      {/* Botón Píldora de Conexión en el Sidebar */}
      {!address ? (
        <button
          onClick={handleConnect}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'var(--color-fog-white)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-pill)',
            padding: '0.35rem 0.85rem',
            color: 'var(--color-ink-black)',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-ink-black)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <Wallet size={14} color="var(--color-ink-black)" />
          <span>{loading ? 'Conectando...' : 'Conectar MetaMask'}</span>
        </button>
      ) : (
        <div
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: isSepolia ? 'var(--color-blush-peach)' : 'rgba(239, 68, 68, 0.12)',
            border: isSepolia ? '1px solid rgba(93, 42, 26, 0.2)' : '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-pill)',
            padding: '0.35rem 0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
          title={isSepolia ? 'Billetera conectada a Sepolia (clic para gestionar)' : 'Red incorrecta (haz clic para cambiar a Sepolia)'}
        >
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            backgroundColor: isSepolia ? '#10b981' : '#ef4444',
            boxShadow: isSepolia ? '0 0 6px rgba(16, 185, 129, 0.8)' : '0 0 6px rgba(239, 68, 68, 0.8)'
          }} />
          <span style={{
            color: isSepolia ? 'var(--color-sienna-brown)' : '#b91c1c',
            fontWeight: 600,
            fontSize: '0.8rem',
            fontFamily: 'monospace'
          }}>
            {formatAddress(address)}
          </span>
        </div>
      )}

      {/* Modal de Gestión de Billetera y Contrato Sepolia */}
      <AnimatePresence>
        {showModal && (
          <div
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              padding: '1rem',
            }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 14 }}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '460px',
                padding: '1.75rem',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
                color: 'var(--color-ink-black)',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '10px', backgroundColor: 'var(--color-fog-white)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center' }}>
                    <Wallet size={18} color="var(--color-ink-black)" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>Billetera Web3</h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Ethereum Sepolia Testnet</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-slate-gray)', padding: '0.2rem' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Alerta si no está en Sepolia */}
              {!isSepolia && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={16} color="#b91c1c" />
                    <span style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 500 }}>Red incorrecta</span>
                  </div>
                  <button
                    onClick={handleSwitchNetwork}
                    style={{
                      background: '#b91c1c',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 'var(--radius-pill)',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cambiar a Sepolia
                  </button>
                </div>
              )}

              {/* Tarjeta de Cuenta */}
              <div style={{
                backgroundColor: 'var(--color-fog-white)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.15rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>DIRECCIÓN CONECTADA</span>
                  <button
                    onClick={() => handleCopy(address)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                      fontSize: '0.75rem', color: 'var(--color-ink-black)', fontWeight: 600
                    }}
                  >
                    {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>

                <div style={{ fontFamily: 'monospace', fontSize: '0.88rem', fontWeight: 600, wordBreak: 'break-all', marginBottom: '0.85rem' }}>
                  {address}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.65rem' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Saldo en cuenta</span>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', fontFamily: 'monospace' }}>
                      {balance} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>SepoliaETH</span>
                    </p>
                  </div>

                  <a
                    href={`${SEPOLIA_EXPLORER_URL}/address/${address}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                      fontSize: '0.78rem', color: 'var(--color-ink-black)', textDecoration: 'none', fontWeight: 600
                    }}
                  >
                    <span>Ver en Etherscan</span>
                    <ArrowUpRight size={14} />
                  </a>
                </div>
              </div>

              {/* Sección Contrato Inteligente USM */}
              <div style={{
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ShieldCheck size={15} color="var(--color-sienna-brown)" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Contrato USMDocumentRegistry</span>
                  </div>
                  <button
                    onClick={() => setShowConfigContract(!showConfigContract)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-sienna-brown)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {showConfigContract ? 'Cancelar' : 'Cambiar'}
                  </button>
                </div>

                <p style={{ margin: '0 0 0.5rem 0', fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                  {contractAddr || 'Sin desplegar'}
                </p>

                {showConfigContract ? (
                  <div style={{ marginTop: '0.6rem' }}>
                    <input
                      type="text"
                      placeholder="Pega la dirección 0x... del contrato"
                      value={inputContract}
                      onChange={(e) => setInputContract(e.target.value)}
                      style={{
                        width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.8rem',
                        border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '0.5rem',
                        fontFamily: 'monospace'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={handleSaveContractAddress}
                        style={{
                          flex: 1, padding: '0.45rem', backgroundColor: 'var(--color-ink-black)',
                          color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        Guardar Dirección
                      </button>
                      <button
                        onClick={handleDeployContract}
                        disabled={deploying}
                        style={{
                          flex: 1, padding: '0.45rem', backgroundColor: 'var(--color-blush-peach)',
                          color: 'var(--color-sienna-brown)', border: '1px solid rgba(93, 42, 26, 0.2)',
                          borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        {deploying ? 'Desplegando...' : 'Desplegar con MetaMask'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <a
                      href={`${SEPOLIA_EXPLORER_URL}/address/${contractAddr}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.75rem', color: 'var(--color-ink-black)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                    >
                      <span>Ver Contrato en Etherscan</span>
                      <ExternalLink size={12} />
                    </a>

                    <button
                      onClick={handleDeployContract}
                      disabled={deploying}
                      style={{
                        background: 'none', border: 'none', color: 'var(--color-sienna-brown)',
                        fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600
                      }}
                    >
                      {deploying ? 'Desplegando en Sepolia...' : 'Desplegar Nuevo Contrato'}
                    </button>
                  </div>
                )}
              </div>

              {/* Botón de Desconexión */}
              <button
                onClick={handleDisconnect}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: 'rgba(185, 28, 28, 0.08)',
                  border: '1px solid rgba(185, 28, 28, 0.25)',
                  borderRadius: '10px',
                  color: '#b91c1c',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Power size={15} />
                <span>Desconectar Billetera</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default WalletConnect;
