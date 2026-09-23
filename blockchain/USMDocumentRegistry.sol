// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title USMDocumentRegistry
 * @notice Registro inmutable y certificable de documentos validados de la Universidad Santa María.
 *         Implementa control de acceso basado en roles (onlyAdmin), anclado IPFS y revocación de credenciales.
 */
contract USMDocumentRegistry {

    address public institutionAdmin;
    uint256 public totalDocumentsCount;

    struct Document {
        string documentHash;     // CID de IPFS o Hash SHA-256 del documento
        string ownerName;        // Nombre del graduando
        string cedula;           // Cédula de identidad
        string documentType;     // Tipo de documento (PUB, Título, etc.)
        address registeredBy;    // Wallet de la autoridad que registró
        uint256 timestamp;       // Unix timestamp del registro
        bool exists;             // Bandera de existencia
        bool isRevoked;          // Bandera de validez/revocación
    }

    // Hash/CID -> Documento
    mapping(string => Document) private documents;

    // Eventos para el registro de auditoría en la Blockchain
    event DocumentRegistered(
        string indexed documentHash,
        string ownerName,
        string cedula,
        string documentType,
        uint256 timestamp
    );

    event DocumentRevoked(
        string indexed documentHash,
        uint256 timestamp
    );

    // Modificador para restringir la escritura solo a la autoridad institucional
    modifier onlyAdmin() {
        require(msg.sender == institutionAdmin, "Acceso denegado: Solo la autoridad institucional puede ejecutar esta accion");
        _;
    }

    /**
     * @notice Asigna la wallet que despliega el contrato como la autoridad administradora.
     */
    constructor() {
        institutionAdmin = msg.sender;
        totalDocumentsCount = 0;
    }

    /**
     * @notice Registra un nuevo documento o CID IPFS. Protegido por onlyAdmin.
     */
    function registerDocument(
        string calldata _hash,
        string calldata _ownerName,
        string calldata _cedula,
        string calldata _documentType
    ) external onlyAdmin {
        require(!documents[_hash].exists, "El documento ya se encuentra registrado");
        require(bytes(_hash).length > 0, "El hash no puede estar vacio");

        documents[_hash] = Document({
            documentHash: _hash,
            ownerName: _ownerName,
            cedula: _cedula,
            documentType: _documentType,
            registeredBy: msg.sender,
            timestamp: block.timestamp,
            exists: true,
            isRevoked: false
        });

        totalDocumentsCount++;

        emit DocumentRegistered(_hash, _ownerName, _cedula, _documentType, block.timestamp);
    }

    /**
     * @notice Revoca un documento previamente emitido (ej. por fraude o anulacion). Protegido por onlyAdmin.
     */
    function revokeDocument(string calldata _hash) external onlyAdmin {
        require(documents[_hash].exists, "El documento no existe");
        require(!documents[_hash].isRevoked, "El documento ya ha sido revocado");

        documents[_hash].isRevoked = true;

        emit DocumentRevoked(_hash, block.timestamp);
    }

    /**
     * @notice Verifica la existencia y estado de un documento en el registro.
     *         Cualquier usuario o ente gubernamental puede llamar a esta funcion sin costo de Gas.
     */
    function verifyDocument(string calldata _hash)
        external
        view
        returns (
            bool exists,
            bool isRevoked,
            string memory ownerName,
            string memory cedula,
            string memory documentType,
            uint256 timestamp
        )
    {
        Document memory doc = documents[_hash];
        return (doc.exists, doc.isRevoked, doc.ownerName, doc.cedula, doc.documentType, doc.timestamp);
    }
}
