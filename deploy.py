import json
import os
from web3 import Web3
from solcx import compile_standard, install_solc

print("Instalando compilador Solidity...")
install_solc('0.8.20')

with open("blockchain/USMDocumentRegistry.sol", "r", encoding="utf-8") as file:
    contract_source = file.read()

print("Compilando contrato inteligente...")
compiled_sol = compile_standard(
    {
        "language": "Solidity",
        "sources": {"USMDocumentRegistry.sol": {"content": contract_source}},
        "settings": {
            "outputSelection": {
                "*": {"*": ["abi", "metadata", "evm.bytecode", "evm.sourceMap"]}
            }
        },
    },
    solc_version="0.8.20",
)

# Extract ABI and Bytecode
bytecode = compiled_sol["contracts"]["USMDocumentRegistry.sol"]["USMDocumentRegistry"]["evm"]["bytecode"]["object"]
abi = json.loads(compiled_sol["contracts"]["USMDocumentRegistry.sol"]["USMDocumentRegistry"]["metadata"])["output"]["abi"]

# Setup Web3
rpc_url = "https://ethereum-sepolia-rpc.publicnode.com"
w3 = Web3(Web3.HTTPProvider(rpc_url))
print(f"Conectado a Sepolia: {w3.is_connected()}")

private_key = os.getenv("WALLET_PRIVATE_KEY", "0xbd3b273b1e21dc84e9c89227f09fa69cd2f87818d74bfa63cc0504ee1fde3ba3")
account = w3.eth.account.from_key(private_key)
print(f"Desplegando con la cuenta: {account.address}")
print(f"Balance actual: {w3.from_wei(w3.eth.get_balance(account.address), 'ether')} ETH")

if w3.eth.get_balance(account.address) == 0:
    print("--------------------------------------------------")
    print(f"ERROR: La cuenta {account.address} NO TIENE FONDOS (0 Sepolia ETH).")
    print("Ve a https://sepoliafaucet.com/ o https://cloud.google.com/application/web3/faucet/ethereum/sepolia")
    print("Introduce la dirección de arriba y solicita fondos.")
    print("Vuelve a ejecutar este script cuando tengas ETH.")
    print("--------------------------------------------------")
    exit(1)

print("Iniciando despliegue (esto puede tardar unos segundos)...")
USMRegistry = w3.eth.contract(abi=abi, bytecode=bytecode)

nonce = w3.eth.get_transaction_count(account.address)
transaction = USMRegistry.constructor().build_transaction(
    {
        "chainId": 11155111,
        "gasPrice": w3.eth.gas_price,
        "nonce": nonce,
    }
)

signed_txn = w3.eth.account.sign_transaction(transaction, private_key=private_key)
tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
print(f"Transacción de despliegue enviada. Hash: {w3.to_hex(tx_hash)}")
print("Esperando confirmación del bloque...")

tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
print("--------------------------------------------------")
print("¡CONTRATO DESPLEGADO EXITOSAMENTE!")
print(f"Dirección del Contrato: {tx_receipt.contractAddress}")
print("--------------------------------------------------")

# Update .env
env_path = ".env"
with open(env_path, "r", encoding="utf-8") as f:
    lines = f.readlines()
with open(env_path, "w", encoding="utf-8") as f:
    for line in lines:
        if line.startswith("CONTRACT_ADDRESS="):
            f.write(f"CONTRACT_ADDRESS={tx_receipt.contractAddress}\n")
        else:
            f.write(line)
print(".env actualizado con la nueva dirección.")
