// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title USMDocumentRegistry
 * @notice Registro inmutable de documentos validados de la Universidad Santa María.
 *         Desplegado en la red Sepolia Testnet (Ethereum).
 */
contract USMDocumentRegistry {

    struct Document {
        string  documentHash;    // Hash SHA256 del documento
        string  ownerName;       // Nombre del graduando
        string  cedula;          // Cédula de identidad
        string  documentType;    // Tipo de documento (PUB, Título, etc.)
        address registeredBy;    // Wallet que registró
        uint256 timestamp;       // Unix timestamp del registro
        bool    exists;
    }

    // Hash → Documento
    mapping(string => Document) private documents;

    // Índice de hashes para auditoría
    string[] public allHashes;

    // Evento emitido cada vez que se registra un documento
    event DocumentRegistered(
        string indexed documentHash,
        string ownerName,
        string cedula,
        string documentType,
        uint256 timestamp
    );

    /**
     * @notice Registra un nuevo documento. El hash debe ser único.
     */
    function registerDocument(
        string calldata _hash,
        string calldata _ownerName,
        string calldata _cedula,
        string calldata _documentType
    ) external {
        require(!documents[_hash].exists, "Documento ya registrado");
        require(bytes(_hash).length > 0, "Hash invalido");

        documents[_hash] = Document({
            documentHash: _hash,
            ownerName: _ownerName,
            cedula: _cedula,
            documentType: _documentType,
            registeredBy: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });

        allHashes.push(_hash);

        emit DocumentRegistered(_hash, _ownerName, _cedula, _documentType, block.timestamp);
    }

    /**
     * @notice Verifica si un documento existe en el registro.
     * @return exists      ¿Existe el documento?
     * @return ownerName   Nombre del dueño
     * @return cedula      Cédula
     * @return documentType Tipo de documento
     * @return timestamp   Fecha/hora de registro (Unix)
     */
    function verifyDocument(string calldata _hash)
        external
        view
        returns (
            bool exists,
            string memory ownerName,
            string memory cedula,
            string memory documentType,
            uint256 timestamp
        )
    {
        Document memory doc = documents[_hash];
        return (doc.exists, doc.ownerName, doc.cedula, doc.documentType, doc.timestamp);
    }

    /**
     * @notice Retorna el total de documentos registrados.
     */
    function totalDocuments() external view returns (uint256) {
        return allHashes.length;
    }
}
