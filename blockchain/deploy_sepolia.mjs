/**
 * Despliegue real de USMDocumentRegistry.sol en Ethereum Sepolia Testnet
 * usando la llave WALLET_PRIVATE_KEY del archivo .env.
 *
 * Uso:
 *   node blockchain/deploy_sepolia.mjs
 *
 * Requisitos:
 *   - WALLET_PRIVATE_KEY en .env con al menos ~0.005 Sepolia ETH
 *     (Faucet gratuito: https://cloud.google.com/application/web3/faucet/ethereum/sepolia)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const require = createRequire(path.join(rootDir, 'package.json'));
const { ethers } = require('ethers');

function loadEnvFile(envPath) {
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
  }
  return out;
}

function updateEnvAddress(envPath, newAddr) {
  if (!fs.existsSync(envPath)) return;
  let text = fs.readFileSync(envPath, 'utf8');
  if (/^CONTRACT_ADDRESS=/m.test(text)) {
    text = text.replace(/^CONTRACT_ADDRESS=.*$/m, `CONTRACT_ADDRESS=${newAddr}`);
  } else {
    text += `\nCONTRACT_ADDRESS=${newAddr}\n`;
  }
  if (/^VITE_CONTRACT_ADDRESS=/m.test(text)) {
    text = text.replace(/^VITE_CONTRACT_ADDRESS=.*$/m, `VITE_CONTRACT_ADDRESS=${newAddr}`);
  } else {
    text += `VITE_CONTRACT_ADDRESS=${newAddr}\n`;
  }
  fs.writeFileSync(envPath, text, 'utf8');
}

async function main() {
  const envPath = path.join(rootDir, '.env');
  const env = { ...loadEnvFile(envPath), ...process.env };
  const rpc = env.WEB3_PROVIDER_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
  const pkRaw = env.WALLET_PRIVATE_KEY;

  if (!pkRaw || pkRaw.replace(/^0x/, '').length !== 64) {
    console.error('❌ Falta WALLET_PRIVATE_KEY (64 hex) en .env');
    process.exit(1);
  }

  const pk = pkRaw.startsWith('0x') ? pkRaw : `0x${pkRaw}`;
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  const net = await provider.getNetwork();
  const balance = await provider.getBalance(wallet.address);

  console.log(`\n🌐 Red conectada: ${net.name} (chainId ${Number(net.chainId)})`);
  console.log(`🔑 Wallet desplegadora (institutionAdmin): ${wallet.address}`);
  console.log(`💰 Saldo Sepolia ETH: ${ethers.formatEther(balance)} ETH`);

  if (Number(net.chainId) !== 11155111) {
    console.error('❌ El RPC no corresponde a Ethereum Sepolia (chainId 11155111).');
    process.exit(1);
  }

  if (balance === 0n) {
    console.error('\n⚠️ Tu wallet tiene 0.0 ETH en Sepolia y no puede pagar el gas del despliegue.');
    console.error(`👉 Solicita 0.05 Sepolia ETH gratis para ${wallet.address} en:`);
    console.error('   • https://cloud.google.com/application/web3/faucet/ethereum/sepolia');
    console.error('   • https://www.alchemy.com/faucets/ethereum-sepolia');
    console.error('   • https://sepolia-faucet.pk910.de/');
    process.exit(1);
  }

  const artifactPath = path.join(rootDir, 'src', 'contracts', 'USMDocumentRegistry.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  console.log('\n🚀 Desplegando USMDocumentRegistry en Ethereum Sepolia...');
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();
  const deployTx = contract.deploymentTransaction();
  console.log(`⏳ Tx enviada: ${deployTx.hash}`);
  console.log(`🔎 Ver en Etherscan: https://sepolia.etherscan.io/tx/${deployTx.hash}`);

  await contract.waitForDeployment();
  const deployedAddress = ethers.getAddress(await contract.getAddress());

  console.log('\n✅ ¡CONTRATO INTELIGENTE DESPLEGADO CON ÉXITO EN SEPOLIA!');
  console.log(`📜 CONTRACT_ADDRESS: ${deployedAddress}`);
  console.log(`🔗 Etherscan: https://sepolia.etherscan.io/address/${deployedAddress}`);

  updateEnvAddress(envPath, deployedAddress);
  console.log('💾 .env actualizado automáticamente con CONTRACT_ADDRESS y VITE_CONTRACT_ADDRESS.');
  console.log('\n📌 Recuerda pegar esta misma dirección en Vercel → Settings → Environment Variables:');
  console.log(`   CONTRACT_ADDRESS=${deployedAddress}`);
  console.log(`   VITE_CONTRACT_ADDRESS=${deployedAddress}\n`);
}

main().catch((err) => {
  console.error('❌ Error en despliegue:', err.message || err);
  process.exit(1);
});
