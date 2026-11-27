import { ethers } from 'ethers';
import contractArtifact from '../contracts/USMDocumentRegistry.json';

export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_HEX_CHAIN_ID = '0xaa36a7';
export const SEPOLIA_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
export const SEPOLIA_RPC_URLS = [
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://1rpc.io/sepolia',
  'https://rpc.sepolia.org',
];
export const SEPOLIA_EXPLORER_URL = 'https://sepolia.etherscan.io';

export const CONTRACT_ABI = contractArtifact.abi;
export const CONTRACT_BYTECODE = contractArtifact.bytecode;

const PLACEHOLDER_ADDRESSES = new Set([
  '',
  '0x0000000000000000000000000000000000000000',
  '0x1234567890123456789012345678901234567890',
]);

export const KNOWN_FAKE_TX_HASHES = new Set([
  '0x4b7891a2bc3456def0123456789abcdef0123456789abcdef0123456789abcd1',
  '0x9876543210abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
]);

/**
 * Normaliza cualquier dirección Ethereum a formato EIP-55 checksum válido
 * (previene TypeError: bad address checksum en ethers v6).
 */
export const normalizeAddress = (addr) => {
  if (!addr || typeof addr !== 'string') return null;
  const clean = addr.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(clean)) return null;
  try {
    return ethers.getAddress(clean.toLowerCase());
  } catch (_) {
    return null;
  }
};

export const isPlaceholderAddress = (addr) => {
  const norm = normalizeAddress(addr);
  return !norm || PLACEHOLDER_ADDRESSES.has(norm.toLowerCase());
};

/**
 * Valida si un string tiene formato de Transaction Hash real de Ethereum
 * (66 chars hex, no placeholder, no demo falso, y distinto al SHA-256 del documento).
 */
export const isPlausibleTxHash = (txHash, docHash = null) => {
  if (!txHash || typeof txHash !== 'string') return false;
  const clean = txHash.trim().toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(clean)) return false;
  if (KNOWN_FAKE_TX_HASHES.has(clean)) return false;
  if (docHash && typeof docHash === 'string') {
    const cleanDoc = docHash.trim().toLowerCase();
    const normDoc = cleanDoc.startsWith('0x') ? cleanDoc : `0x${cleanDoc}`;
    if (clean === normDoc) return false;
  }
  return true;
};

export const getContractAddress = () => {
  if (typeof window !== 'undefined') {
    const local = normalizeAddress(localStorage.getItem('usm_contract_address'));
    if (local && !isPlaceholderAddress(local)) return local;
  }
  const fromEnv = normalizeAddress(import.meta.env.VITE_CONTRACT_ADDRESS);
  if (fromEnv && !isPlaceholderAddress(fromEnv)) return fromEnv;
  return '0x1234567890123456789012345678901234567890';
};

export const setContractAddress = (address) => {
  const norm = normalizeAddress(address);
  if (typeof window !== 'undefined' && norm) {
    localStorage.setItem('usm_contract_address', norm);
    window.dispatchEvent(new CustomEvent('usm_contract_address_updated', { detail: norm }));
  }
  return norm;
};

/**
 * Proveedor RPC público de sólo lectura para la red Ethereum Sepolia
 */
export const getPublicSepoliaProvider = (rpcUrl = SEPOLIA_RPC_URL) => {
  return new ethers.JsonRpcProvider(rpcUrl, SEPOLIA_CHAIN_ID, { staticNetwork: true });
};

/**
 * Ejecuta una consulta de sólo lectura en Ethereum Sepolia con failover automático entre RPCs públicos.
 * Nunca depende de la red que el usuario tenga seleccionada en MetaMask.
 */
export const withSepoliaRpcFallback = async (fn) => {
  let lastError = null;
  for (const rpcUrl of SEPOLIA_RPC_URLS) {
    try {
      const provider = getPublicSepoliaProvider(rpcUrl);
      return await fn(provider, rpcUrl);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('No se pudo conectar a los nodos RPC de Ethereum Sepolia.');
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
 * Garantiza un Signer fresco de MetaMask conectado específicamente a Sepolia (evita NETWORK_ERROR en ethers v6).
 */
const ensureFreshSepoliaSigner = async (existingSigner = null) => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask no está instalado en este navegador.');
  }
  let signer = existingSigner;
  if (!signer) {
    const conn = await connectWallet();
    signer = conn.signer;
  }
  const network = await signer.provider.getNetwork();
  if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
    await switchToSepolia();
    const freshProvider = new ethers.BrowserProvider(window.ethereum);
    signer = await freshProvider.getSigner();
  }
  return signer;
};

/**
 * Inspecciona en vivo el estado real del contrato USMDocumentRegistry en Ethereum Sepolia.
 */
export const getContractStatusOnSepolia = async (addressOverride = null) => {
  const addr = normalizeAddress(addressOverride || getContractAddress());
  if (!addr || isPlaceholderAddress(addr)) {
    return {
      contractAddress: addr || getContractAddress(),
      isPlaceholder: true,
      deployed: false,
      admin: null,
      totalDocumentsCount: 0,
      blockNumber: null,
      explorerUrl: null,
    };
  }

  try {
    return await withSepoliaRpcFallback(async (provider) => {
      const [code, blockNumber] = await Promise.all([
        provider.getCode(addr),
        provider.getBlockNumber(),
      ]);
      const deployed = Boolean(code && code !== '0x' && code.length > 4);
      if (!deployed) {
        return {
          contractAddress: addr,
          isPlaceholder: false,
          deployed: false,
          admin: null,
          totalDocumentsCount: 0,
          blockNumber,
          explorerUrl: null,
        };
      }
      const contract = new ethers.Contract(addr, CONTRACT_ABI, provider);
      const [admin, count] = await Promise.all([
        contract.institutionAdmin().catch(() => null),
        contract.totalDocumentsCount().catch(() => 0n),
      ]);
      return {
        contractAddress: addr,
        isPlaceholder: false,
        deployed: true,
        admin: normalizeAddress(admin),
        totalDocumentsCount: Number(count || 0n),
        blockNumber,
        explorerUrl: `${SEPOLIA_EXPLORER_URL}/address/${addr}`,
      };
    });
  } catch (err) {
    return {
      contractAddress: addr,
      isPlaceholder: false,
      deployed: false,
      admin: null,
      totalDocumentsCount: 0,
      blockNumber: null,
      explorerUrl: null,
      error: err.message,
    };
  }
};

/**
 * Verifica en vivo contra Ethereum Sepolia RPC si una transacción realmente existe y está confirmada.
 */
export const verifyTransactionOnSepolia = async (txHash, docHash = null) => {
  if (!isPlausibleTxHash(txHash, docHash)) {
    return { exists: false, confirmed: false, reason: 'Sin hash de transacción real en Sepolia' };
  }
  const clean = txHash.trim();
  try {
    return await withSepoliaRpcFallback(async (provider) => {
      const receipt = await provider.getTransactionReceipt(clean);
      if (receipt) {
        return {
          exists: true,
          confirmed: true,
          statusSuccess: receipt.status === 1,
          blockNumber: receipt.blockNumber,
          from: normalizeAddress(receipt.from),
          to: normalizeAddress(receipt.to),
          txHash: clean,
          explorerUrl: `${SEPOLIA_EXPLORER_URL}/tx/${clean}`,
        };
      }
      const tx = await provider.getTransaction(clean);
      if (tx) {
        return {
          exists: true,
          confirmed: false,
          pending: true,
          from: normalizeAddress(tx.from),
          to: normalizeAddress(tx.to),
          txHash: clean,
          explorerUrl: `${SEPOLIA_EXPLORER_URL}/tx/${clean}`,
        };
      }
      return { exists: false, confirmed: false, reason: 'Transacción no encontrada en Ethereum Sepolia' };
    });
  } catch (err) {
    return { exists: false, confirmed: false, reason: err.message };
  }
};

/**
 * Despliega el contrato USMDocumentRegistry en Sepolia con 1 clic usando el Signer de MetaMask
 */
export const deployContractOnSepolia = async (signer = null) => {
  const activeSigner = await ensureFreshSepoliaSigner(signer);
  const factory = new ethers.ContractFactory(CONTRACT_ABI, CONTRACT_BYTECODE, activeSigner);
  const contract = await factory.deploy();
  const deployTx = contract.deploymentTransaction();
  await contract.waitForDeployment();

  const deployedAddress = normalizeAddress(await contract.getAddress());
  setContractAddress(deployedAddress);

  return {
    success: true,
    contractAddress: deployedAddress,
    txHash: deployTx?.hash || null,
    explorerUrl: `${SEPOLIA_EXPLORER_URL}/address/${deployedAddress}`,
  };
};

/**
 * Registra un documento en el contrato inteligente en Sepolia (100% On-Chain real)
 */
export const registerDocumentOnChain = async (docHash, ownerName, cedula, docType, signer = null) => {
  const activeSigner = await ensureFreshSepoliaSigner(signer);
  const contractAddr = normalizeAddress(getContractAddress());
  if (!contractAddr || isPlaceholderAddress(contractAddr)) {
    throw new Error('No hay una dirección de contrato USMDocumentRegistry configurada. Despliega el contrato desde Billetera Web3.');
  }

  const code = await activeSigner.provider.getCode(contractAddr);
  if (!code || code === '0x') {
    throw new Error(`No existe ningún contrato desplegado en Sepolia en la dirección ${contractAddr}. Despliégalo primero desde el botón Conectar MetaMask.`);
  }

  const contract = new ethers.Contract(contractAddr, CONTRACT_ABI, activeSigner);
  const cleanHash = docHash.startsWith('0x') ? docHash : `0x${docHash}`;

  // Verificar si ya existe on-chain para evitar revert por duplicado
  try {
    const existing = await contract.verifyDocument(cleanHash);
    if (existing && existing[0]) {
      return {
        success: true,
        alreadyRegistered: true,
        txHash: null,
        contractAddress: contractAddr,
      };
    }
  } catch (_) {}

  const tx = await contract.registerDocument(cleanHash, ownerName, cedula, docType);
  const receipt = await tx.wait(1);

  return {
    success: true,
    txHash: tx.hash,
    blockNumber: receipt?.blockNumber,
    contractAddress: contractAddr,
    explorerUrl: `${SEPOLIA_EXPLORER_URL}/tx/${tx.hash}`,
  };
};

/**
 * Verifica la existencia y estado de un documento directamente en el contrato inteligente en Sepolia
 * (Consulta de sólo lectura sin consumo de Gas y sin depender de la red de MetaMask)
 */
export const verifyDocumentOnChain = async (docHash, addressOverride = null) => {
  const contractAddr = normalizeAddress(addressOverride || getContractAddress());
  if (!contractAddr || isPlaceholderAddress(contractAddr)) {
    return { exists: false, contractDeployed: false, error: 'Dirección del contrato inteligente no configurada.' };
  }

  try {
    return await withSepoliaRpcFallback(async (provider) => {
      const code = await provider.getCode(contractAddr);
      if (!code || code === '0x') {
        return {
          exists: false,
          contractDeployed: false,
          contractAddress: contractAddr,
          error: `Sin contrato inteligente desplegado en ${contractAddr} (Sepolia).`,
        };
      }

      const contract = new ethers.Contract(contractAddr, CONTRACT_ABI, provider);
      const raw = docHash.trim();
      const stripped = raw.replace(/^0x/i, '');
      const candidates = Array.from(new Set([
        raw,
        `0x${stripped}`,
        `0x${stripped.toUpperCase()}`,
        `0x${stripped.toLowerCase()}`,
        stripped.toUpperCase(),
        stripped.toLowerCase(),
      ]));

      for (const candidate of candidates) {
        const res = await contract.verifyDocument(candidate);
        const [exists, isRevoked, ownerName, cedula, docType, timestamp] = res;
        if (exists) {
          return {
            exists: true,
            contractDeployed: true,
            isRevoked: Boolean(isRevoked),
            ownerName,
            cedula,
            documentType: docType,
            timestamp: Number(timestamp),
            contractAddress: contractAddr,
          };
        }
      }

      return { exists: false, contractDeployed: true, contractAddress: contractAddr };
    });
  } catch (err) {
    console.warn('verifyDocumentOnChain error:', err);
    return { exists: false, error: err.message };
  }
};

/**
 * Revoca un documento en el contrato inteligente
 */
export const revokeDocumentOnChain = async (docHash, signer = null) => {
  const activeSigner = await ensureFreshSepoliaSigner(signer);
  const contractAddr = normalizeAddress(getContractAddress());
  if (!contractAddr || isPlaceholderAddress(contractAddr)) {
    throw new Error('Dirección del contrato inteligente no configurada.');
  }

  const contract = new ethers.Contract(contractAddr, CONTRACT_ABI, activeSigner);
  const cleanHash = docHash.startsWith('0x') ? docHash : `0x${docHash}`;

  const tx = await contract.revokeDocument(cleanHash);
  const receipt = await tx.wait(1);

  return {
    success: true,
    txHash: tx.hash,
    blockNumber: receipt?.blockNumber,
    explorerUrl: `${SEPOLIA_EXPLORER_URL}/tx/${tx.hash}`,
  };
};
