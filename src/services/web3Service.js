import { ethers } from 'ethers';
import contractArtifact from '../contracts/USMDocumentRegistry.json';

export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_HEX_CHAIN_ID = '0xaa36a7';
export const SEPOLIA_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
export const SEPOLIA_EXPLORER_URL = 'https://sepolia.etherscan.io';

export const CONTRACT_ABI = contractArtifact.abi;
export const CONTRACT_BYTECODE = contractArtifact.bytecode;

export const getContractAddress = () => {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('usm_contract_address');
    if (local && local.startsWith('0x') && local.length === 42) return local;
  }
  return import.meta.env.VITE_CONTRACT_ADDRESS || '0x1234567890123456789012345678901234567890';
};

export const setContractAddress = (address) => {
  if (typeof window !== 'undefined' && address) {
    localStorage.setItem('usm_contract_address', address);
    window.dispatchEvent(new CustomEvent('usm_contract_address_updated', { detail: address }));
  }
};

/**
 * Proveedor RPC público de sólo lectura para la red Ethereum Sepolia
 */
export const getPublicSepoliaProvider = () => {
  return new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
};

/**
 * Comprueba si el navegador tiene instalada una billetera Web3 (MetaMask u otra)
 */
export const isMetaMaskInstalled = () => {
  return typeof window !== 'undefined' && Boolean(window.ethereum);
};

/**
 * Conecta la billetera Web3 interactiva del usuario
 */
export const connectWallet = async () => {
  if (!isMetaMaskInstalled()) {
    throw new Error('No se detectó ninguna billetera Web3 (MetaMask). Por favor instala la extensión de MetaMask en tu navegador.');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send('eth_requestAccounts', []);
  if (!accounts || accounts.length === 0) {
    throw new Error('No se autorizó ninguna cuenta de MetaMask.');
  }

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();
  const balanceWei = await provider.getBalance(address);
  const balanceEth = ethers.formatEther(balanceWei);

  return {
    provider,
    signer,
    address,
    chainId: Number(network.chainId),
    isSepolia: Number(network.chainId) === SEPOLIA_CHAIN_ID,
    balance: parseFloat(balanceEth).toFixed(4),
  };
};

/**
 * Solicita a MetaMask cambiar a la red Ethereum Sepolia (o la añade automáticamente si no existe)
 */
export const switchToSepolia = async () => {
  if (!isMetaMaskInstalled()) return false;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_HEX_CHAIN_ID }],
    });
    return true;
  } catch (switchError) {
    // Si la red no está agregada en MetaMask (código 4902), se añade
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: SEPOLIA_HEX_CHAIN_ID,
              chainName: 'Ethereum Sepolia Testnet',
              nativeCurrency: {
                name: 'Sepolia Ether',
                symbol: 'SEP',
                decimals: 18,
              },
              rpcUrls: [SEPOLIA_RPC_URL],
              blockExplorerUrls: [SEPOLIA_EXPLORER_URL],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error('Error al añadir la red Sepolia:', addError);
        throw addError;
      }
    }
    throw switchError;
  }
};

/**
 * Despliega el contrato USMDocumentRegistry en Sepolia con 1 clic usando el Signer de MetaMask
 */
export const deployContractOnSepolia = async (signer) => {
  if (!signer) {
    const conn = await connectWallet();
    signer = conn.signer;
  }

  const network = await signer.provider.getNetwork();
  if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
    await switchToSepolia();
  }

  const factory = new ethers.ContractFactory(CONTRACT_ABI, CONTRACT_BYTECODE, signer);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  setContractAddress(deployedAddress);

  return {
    success: true,
    contractAddress: deployedAddress,
    txHash: contract.deploymentTransaction()?.hash || '0xDeployConfirmed',
  };
};

/**
 * Registra un documento en el contrato inteligente en Sepolia
 */
export const registerDocumentOnChain = async (docHash, ownerName, cedula, docType, signer) => {
  if (!signer) {
    const conn = await connectWallet();
    signer = conn.signer;
  }

  const network = await signer.provider.getNetwork();
  if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
    await switchToSepolia();
  }

  const contractAddr = getContractAddress();
  const contract = new ethers.Contract(contractAddr, CONTRACT_ABI, signer);

  const cleanHash = docHash.startsWith('0x') ? docHash : `0x${docHash}`;
  const tx = await contract.registerDocument(cleanHash, ownerName, cedula, docType);
  const receipt = await tx.wait(1);

  return {
    success: true,
    txHash: tx.hash,
    blockNumber: receipt?.blockNumber,
    contractAddress: contractAddr,
  };
};

/**
 * Verifica la existencia y estado de un documento directamente en el contrato inteligente en Sepolia
 * (Consulta de sólo lectura sin consumo de Gas)
 */
export const verifyDocumentOnChain = async (docHash) => {
  const contractAddr = getContractAddress();
  if (!contractAddr || contractAddr === '0x1234567890123456789012345678901234567890') {
    return { exists: false, error: 'Dirección del contrato inteligente no configurada.' };
  }

  try {
    const provider = isMetaMaskInstalled()
      ? new ethers.BrowserProvider(window.ethereum)
      : getPublicSepoliaProvider();

    const contract = new ethers.Contract(contractAddr, CONTRACT_ABI, provider);
    const cleanHash = docHash.startsWith('0x') ? docHash : `0x${docHash}`;

    const res = await contract.verifyDocument(cleanHash);
    const [exists, isRevoked, ownerName, cedula, docType, timestamp] = res;

    return {
      exists: Boolean(exists),
      isRevoked: Boolean(isRevoked),
      ownerName,
      cedula,
      documentType: docType,
      timestamp: Number(timestamp),
      contractAddress: contractAddr,
    };
  } catch (err) {
    console.warn('verifyDocumentOnChain error:', err);
    return { exists: false, error: err.message };
  }
};

/**
 * Revoca un documento en el contrato inteligente
 */
export const revokeDocumentOnChain = async (docHash, signer) => {
  if (!signer) {
    const conn = await connectWallet();
    signer = conn.signer;
  }

  const contractAddr = getContractAddress();
  const contract = new ethers.Contract(contractAddr, CONTRACT_ABI, signer);
  const cleanHash = docHash.startsWith('0x') ? docHash : `0x${docHash}`;

  const tx = await contract.revokeDocument(cleanHash);
  const receipt = await tx.wait(1);

  return {
    success: true,
    txHash: tx.hash,
    blockNumber: receipt?.blockNumber,
  };
};
