# Especificación de Roles, Estructura y Eventos On-Chain

## Roles Criptográficos
- `DEFAULT_ADMIN_ROLE`: Gobernanza raíz del contrato.
- `UNIVERSITY_ISSUER_ROLE`: Autoridad universitaria (ej. Rectoría / Secretaría USM) autorizada para registrar el hash inicial del título.
- `MPPEU_VALIDATOR_ROLE`: Funcionario o nodo validador del Ministerio del Poder Popular para la Educación Universitaria (GTU).
- `MPPRE_APOSTILLE_ROLE`: Funcionario o nodo validador del Ministerio del Poder Popular para Relaciones Exteriores (Apostilla de La Haya).

## Estructura de Datos (`struct CredencialAcademica`)
- `bytes32 docHash`: Hash SHA-256 canónico del PDF original validado.
- `string ipfsCid`: CIDv1 del paquete cifrado alojado en IPFS.
- `uint8 estado`: `0 = Inexistente`, `1 = EmitidoUniversidad`, `2 = ValidadoMPPEU`, `3 = ApostilladoMPPRE`, `4 = Revocado`.
- `address emisorUniversidad`: Dirección que registró el título.
- `address validadorMPPEU`: Dirección que certificó la validez en el MPPEU.
- `address apostilladorMPPRE`: Dirección que emitió la apostilla transfronteriza.
- `uint64 fechaEmision`: Timestamp de registro inicial.
- `uint64 fechaApostilla`: Timestamp de apostilla final.

## Eventos Indexados Requeridos
- `event TituloEmitido(bytes32 indexed docHash, address indexed universidad, string ipfsCid, uint64 timestamp);`
- `event TituloValidadoMPPEU(bytes32 indexed docHash, address indexed validador, uint64 timestamp);`
- `event TituloApostilladoMPPRE(bytes32 indexed docHash, address indexed apostillador, string codigoApostillaHash, uint64 timestamp);`
- `event TituloRevocado(bytes32 indexed docHash, address indexed autoridad, string motivoCodigo, uint64 timestamp);`

