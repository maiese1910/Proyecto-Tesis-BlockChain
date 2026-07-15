import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Wallet, ShieldCheck } from 'lucide-react';

const WalletConnect = () => {
  const [address, setAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  // Auto-conectar si ya se dio permiso previamente
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAddress(accounts[0]);
          }
        } catch (err) {
          console.error("Error auto-connecting:", err);
        }
      }
    };
    checkConnection();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
        } else {
          setAddress(null);
        }
      });
    }
  }, []);

  const connectWallet = async () => {
    setIsConnecting(true);
    setError('');
    
    if (typeof window.ethereum !== 'undefined') {
      try {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Get provider and signer
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        setAddress(address);
      } catch (err) {
        console.error(err);
        setError('Error al conectar la billetera.');
      }
    } else {
      setError('MetaMask no está instalado. Instalelo para usar funciones Web3.');
    }
    
    setIsConnecting(false);
  };

  const formatAddress = (addr) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
      {error && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{error}</span>}
      {address ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.4rem 1rem', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <ShieldCheck size={16} color="var(--success)" />
          <span style={{ color: 'var(--success)', fontWeight: '600', fontSize: '0.85rem' }}>
            {formatAddress(address)}
          </span>
        </div>
      ) : (
        <button 
          onClick={connectWallet}
          disabled={isConnecting}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', 
            background: 'linear-gradient(to right, #f59e0b, #d97706)', 
            color: 'white', border: 'none', padding: '0.5rem 1rem', 
            borderRadius: '20px', cursor: isConnecting ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem', fontWeight: '600'
          }}
        >
          <Wallet size={16} />
          {isConnecting ? 'Conectando...' : 'Conectar Web3'}
        </button>
      )}
    </div>
  );
};

export default WalletConnect;
