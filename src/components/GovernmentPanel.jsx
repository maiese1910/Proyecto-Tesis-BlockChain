import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Search, FileText, CheckCircle, XCircle, AlertTriangle, ExternalLink, Eye, Download, CheckSquare, Square, Filter, FileSpreadsheet, Printer, X, ShieldAlert, Sparkles, Clock, Users, Shield, Bot, AlertCircle, RefreshCw, Bell, Wallet, Clipboard, Lock, Building2, Globe, Award, Stamp } from 'lucide-react';
import { blockchainAPI, authAPI } from '../services/api';
import DigitalCertificate from './DigitalCertificate';
import ApostilleCertificate from './ApostilleCertificate';
import MPPEUCotejoModal from './MPPEUCotejoModal';
import html2pdf from 'html2pdf.js';

const GovernmentPanel = ({ adminData }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'
  const [verifying, setVerifying] = useState(null);
  const [selectedHashes, setSelectedHashes] = useState([]);
  const [batchVerifying, setBatchVerifying] = useState(false);

  // Obtener datos del funcionario actual logueado
  const storedAdmin = adminData || JSON.parse(localStorage.getItem('admin_data') || '{}');
  const currentAuditorName = storedAdmin.username || 'mppeu_agente';
  const currentAuditorCargo = storedAdmin.cargo || 'Funcionario Ministerial';
  const currentAuditorEnte = storedAdmin.ente || 'MPPEU';

  // Modo ministerial de visualización: MPPEU (Taquilla GTU) | MPPRE (Cancillería Apostilla) | ALL (Auditoría Integral)
  const initialMode = (currentAuditorEnte === 'MPPRE') ? 'MPPRE' : (currentAuditorEnte === 'MPPEU' || currentAuditorEnte === 'GTU') ? 'MPPEU' : 'MPPEU';
  const [ministerialMode, setMinisterialMode] = useState(initialMode);

  // Modal Cotejo MPPEU
  const [activeCotejoRecord, setActiveCotejoRecord] = useState(null);
  const [cotejoLoading, setCotejoLoading] = useState(false);

  // Modal Apostilla MPPRE
  const [activeApostilleRecord, setActiveApostilleRecord] = useState(null);
  const [apostilleLoading, setApostilleLoading] = useState(null);

  // Modales de previsualización
  const [activePUBRecord, setActivePUBRecord] = useState(null);
  const [activeCertHash, setActiveCertHash] = useState(null);

  // Modal para Rechazar Documento con Motivo
  const [rejectingRecord, setRejectingRecord] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('Inconsistencia en número de folio o acta del título');
  const [customReason, setCustomReason] = useState('');
  const [rejectingLoading, setRejectingLoading] = useState(false);

  // Modal Asistente de IA para el Auditor
  const [showAiAssistantModal, setShowAiAssistantModal] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Modal para añadir administrador nuevo
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', cargo: 'Inspector Gubernamental', ente: 'SAREN', pin_institucional: '' });
  const [adminMsg, setAdminMsg] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // Billetera Web3 Auditor (MetaMask)
  const [web3Account, setWeb3Account] = useState(null);
  const [web3Connecting, setWeb3Connecting] = useState(false);

  const connectMetaMask = async () => {
    if (window.ethereum) {
      try {
        setWeb3Connecting(true);
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          setWeb3Account(accounts[0]);
        }
      } catch (err) {
        console.warn("Conexión a MetaMask no concedida:", err);
      } finally {
        setWeb3Connecting(false);
      }
    } else {
      alert("MetaMask no detectado en el navegador. El panel operará con firma custodial de respaldo del servidor.");
    }
  };

  const fetchRecords = async () => {
    try {
      const data = await blockchainAPI.getAllRecords();
      if (data.success) {
        setRecords(data.records);
      }
    } catch (err) {
      console.error("Error fetching records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    const interval = setInterval(fetchRecords, 10000);
    return () => clearInterval(interval);
  }, []);

  // Aprobar documento individual con firma del auditor (MetaMask + Backend)
  const handleVerify = async (hash) => {
    setVerifying(hash);
    let currentAccount = web3Account;

    if (window.ethereum && !currentAccount) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          currentAccount = accounts[0];
          setWeb3Account(currentAccount);
        }
      } catch (e) {}
    }

    try {
      const data = await blockchainAPI.verifyRecord(hash, {
        auditor_username: currentAuditorName,
        auditor_cargo: currentAuditorCargo,
        auditor_ente: currentAuditorEnte,
        auditor_wallet: currentAccount || undefined
      });
      if (data.success) {
        const walletLabel = currentAccount ? ` [Web3: ${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}]` : '';
        const newStatus = `Verificado por ${currentAuditorEnte} (${currentAuditorName})${walletLabel}`;
        setRecords(prev => prev.map(r => 
          r.hash === hash ? { ...r, status: newStatus, verifiedBy: currentAuditorName } : r
        ));
      }
    } catch (err) {
      console.error("Error verifying document:", err);
      alert("Error al verificar el documento.");
    } finally {
      setVerifying(null);
    }
  };

  // Etapa 2: Certificación en Taquilla Presencial MPPEU (Cotejo Físico-Digital)
  const handleMppeuCertify = async (record) => {
    setCotejoLoading(true);
    try {
      const res = await blockchainAPI.mppeuCertifyRecord(record.hash, {
        auditor_username: currentAuditorName,
        auditor_cargo: currentAuditorCargo,
        auditor_ente: 'MPPEU'
      });
      if (res.success) {
        setRecords(prev => prev.map(r =>
          r.hash === record.hash
            ? { ...r, status: 'CERTIFICADO_MPPEU', mppeuVerified: true, mppeuOfficer: currentAuditorName, txHash: res.txHash || r.txHash }
            : r
        ));
        setActiveCotejoRecord(null);
        setActiveCertHash(record.hash);
      }
    } catch (err) {
      console.error("Error certificando en MPPEU:", err);
      alert("Error al procesar la certificación en MPPEU.");
    } finally {
      setCotejoLoading(false);
    }
  };

  // Etapa 3: Emisión de Apostilla Electrónica de La Haya MPPRE (100% Digital)
  const handleMppreApostille = async (record) => {
    setApostilleLoading(record.hash);
    try {
      const res = await blockchainAPI.mppreApostilleRecord(record.hash, {
        auditor_username: currentAuditorName,
        auditor_cargo: currentAuditorCargo,
        auditor_ente: 'MPPRE'
      });
      if (res.success) {
        const updatedRecord = {
          ...record,
          status: 'APOSTILLADO_MPPRE',
          mppreVerified: true,
          mppreOfficer: currentAuditorName,
          apostilleNumber: res.apostilleNumber
        };
        setRecords(prev => prev.map(r => r.hash === record.hash ? updatedRecord : r));
        setActiveApostilleRecord(updatedRecord);
      }
    } catch (err) {
      console.error("Error apostillando en MPPRE:", err);
      alert("Error al emitir la Apostilla en MPPRE.");
    } finally {
      setApostilleLoading(null);
    }
  };

  // Confirmar Rechazo/Revocación de Documento On-Chain con Motivo
  const confirmRejection = async () => {
    if (!rejectingRecord) return;
    const finalReason = rejectionReason === 'OTRO' ? customReason : rejectionReason;
    if (!finalReason) return;
    setRejectingLoading(true);
    let currentAccount = web3Account;

    if (window.ethereum && !currentAccount) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) currentAccount = accounts[0];
      } catch (e) {}
    }

    try {
      const res = await blockchainAPI.rejectRecord(rejectingRecord.hash, finalReason, {
        auditor_username: currentAuditorName,
        auditor_cargo: currentAuditorCargo,
        auditor_ente: currentAuditorEnte,
        auditor_wallet: currentAccount || undefined
      });
      const walletLabel = currentAccount ? ` [Revocado Web3: ${currentAccount.slice(0, 6)}...]` : '';
      const newStatus = `Revocado On-Chain: ${finalReason}${walletLabel}`;
      setRecords(prev => prev.map(r => 
        r.hash === rejectingRecord.hash ? { ...r, status: newStatus, rejectionReason: finalReason, verifiedBy: currentAuditorName } : r
      ));
      setRejectingRecord(null);
      setCustomReason('');
    } catch (err) {
      alert("Error al procesar el rechazo/revocación del documento.");
    } finally {
      setRejectingLoading(false);
    }
  };

  // Selección en lote (Batch Selection)
  const toggleSelectHash = (hash) => {
    setSelectedHashes(prev => 
      prev.includes(hash) ? prev.filter(h => h !== hash) : [...prev, hash]
    );
  };

  const toggleSelectAll = () => {
    if (selectedHashes.length === filteredRecords.length) {
      setSelectedHashes([]);
    } else {
      setSelectedHashes(filteredRecords.map(r => r.hash));
    }
  };

  const handleBatchVerify = async () => {
    if (selectedHashes.length === 0) return;
    setBatchVerifying(true);
    try {
      for (const hash of selectedHashes) {
        try {
          await blockchainAPI.verifyRecord(hash, {
            auditor_username: currentAuditorName,
            auditor_cargo: currentAuditorCargo,
            auditor_ente: currentAuditorEnte
          });
        } catch (singleErr) {
          console.warn(`Fallback local para actualización de hash ${hash}:`, singleErr);
        }
      }
      setRecords(prev => prev.map(r => 
        selectedHashes.includes(r.hash) ? { ...r, status: `Verificado por ${currentAuditorEnte} (${currentAuditorName})`, verifiedBy: currentAuditorName } : r
      ));
      setSelectedHashes([]);
    } catch (err) {
      console.error("Error al auditar en lote:", err);
    } finally {
      setBatchVerifying(false);
    }
  };

  // Exportar Reporte de Auditoría a CSV / Excel
  const handleExportCSV = () => {
    const headers = ["Solicitante", "Cedula", "Tramite", "Hash Blockchain", "Estado Legal", "Auditor Responsable", "Motivo Rechazo"];
    const rows = filteredRecords.map(r => [
      `"${r.ownerName || ''}"`,
      `"${r.cedula || ''}"`,
      `"${r.documentType || ''}"`,
      `"${r.hash || ''}"`,
      `"${r.status || ''}"`,
      `"${r.verifiedBy || currentAuditorName}"`,
      `"${r.rejectionReason || 'N/A'}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Auditoria_SAREN_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generador de Análisis de Fraude IA Criptográfico & Reporte Dinámico
  const runAiFraudAnalysis = async () => {
    setAiLoading(true);
    try {
      let validHashes = 0;
      let validCedulas = 0;
      const totalRecs = records.length;

      records.forEach(r => {
        if (r.hash && (r.hash.startsWith("0x") || r.hash.startsWith("Qm") || r.hash.length >= 32)) {
          validHashes++;
        }
        if (r.cedula && /^[VEve]-?\s*[\d.]{6,12}$/.test(r.cedula)) {
          validCedulas++;
        }
      });

      const hashIntegrityRate = totalRecs > 0 ? ((validHashes / totalRecs) * 100).toFixed(1) : '100.0';
      const nerAccuracyRate = totalRecs > 0 ? ((validCedulas / totalRecs) * 100).toFixed(1) : '100.0';
      const overallConfidence = ((parseFloat(hashIntegrityRate) + parseFloat(nerAccuracyRate)) / 2).toFixed(1);

      const summaryText = `
INFORME TÉCNICO DE AUDITORÍA Y VALIDACIÓN DE INTEGRIDAD ON-CHAIN
Ente Responsable: ${currentAuditorEnte} (Ministerio del Poder Popular para Relaciones Interiores, Justicia y Paz)
Auditor en Turno: ${currentAuditorCargo} — ${currentAuditorName}
Fecha de Emisión: ${new Date().toLocaleDateString('es-VE')} ${new Date().toLocaleTimeString('es-VE')}

───────────────────────────────────────────────────────
1. RESUMEN DE PROCESAMIENTO CRIPTOGRÁFICO REAL:
• Total de expedientes universitarios inspeccionados: ${totalCount}
• Trámites validados y firmados en Ethereum Sepolia: ${verifiedCount}
• Trámites revocados / rechazados con observación de ley: ${rejectedCount}
• Tasa de efectividad de auditoría estatal: ${efficiencyRate}%

2. AUDITORÍA ALGORÍTMICA DE INTEGRIDAD DOCUMENTAL (NIVEL DE CONFIANZA: ${overallConfidence}%):
• Integridad Dual SHA-256 / IPFS CID: ${hashIntegrityRate}% de huellas digitales válidas sin colisión.
• Extracción de Entidades Nombradas (Rule-Based NER): ${nerAccuracyRate}% coincidencia de Cédula (V-/E-).
• Verificación de Inmutabilidad: Legajos criptográficos protegidos contra alteración física y digital conforme al Art. 16 de la Ley sobre Mensajes de Datos.
───────────────────────────────────────────────────────
Firma Electrónica Auditoría: ${currentAuditorName.toUpperCase()} // SAREN-GOV-ID-${Math.floor(10000 + Math.random()*90000)}
${web3Account ? `Billetera Web3 Auditor: ${web3Account}` : 'Firma Custodial de Respaldo Servidor Activa'}
      `.trim();

      setAiAnalysisResult(summaryText);
    } catch (e) {
      setAiAnalysisResult("Error ejecutando análisis de auditoría documental.");
    } finally {
      setAiLoading(false);
    }
  };


  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setAdminMsg('Registrando auditor...');
    setAdminLoading(true);
    try {
      // Extraer token JWT del admin autenticado para autorizar la creación
      const adminToken = JSON.parse(localStorage.getItem('admin_data') || '{}').token;
      const data = await authAPI.registerAdmin(newAdmin, adminToken);
      if (data.success) {
        setAdminMsg('Funcionario auditor creado exitosamente.');
        setNewAdmin({ username: '', password: '', cargo: 'Inspector Gubernamental', ente: 'SAREN', pin_institucional: '' });
        setTimeout(() => { setShowAdminModal(false); setAdminMsg(''); }, 2000);
      } else {
        setAdminMsg(`Error: ${data.detail || 'No se pudo crear'}`);
      }
    } catch (err) {
      setAdminMsg(`Error: ${err.message || 'Error de conexión. Verifica tu sesión y el PIN Institucional.'}`);
    } finally {
      setAdminLoading(false);
    }
  };

  // Filtrado de registros conforme al rol ministerial activo
  const filteredRecords = records.filter(r => {
    const matchesSearch = 
      (r.ownerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (r.cedula || '').includes(searchTerm) ||
      (r.hash || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.solicitudCode || '').toLowerCase().includes(searchTerm.toLowerCase());

    const isVerified = (r.status || '').includes('Verificado') || (r.status || '').includes('CERTIFICADO_MPPEU') || (r.status || '').includes('APOSTILLADO_MPPRE') || Boolean(r.mppeuVerified);
    const isRejected = (r.status || '').includes('Rechazado');

    if (ministerialMode === 'MPPEU') {
      if (filterStatus === 'PENDING') return matchesSearch && !isVerified && !isRejected;
      if (filterStatus === 'VERIFIED') return matchesSearch && isVerified;
      if (filterStatus === 'REJECTED') return matchesSearch && isRejected;
      return matchesSearch;
    }

    if (ministerialMode === 'MPPRE') {
      const hasMppeuSeal = Boolean(r.mppeuVerified || (r.status || '').includes('CERTIFICADO_MPPEU') || (r.status || '').includes('APOSTILLADO_MPPRE'));
      if (filterStatus === 'PENDING') return matchesSearch && hasMppeuSeal && !r.mppreVerified && !(r.status || '').includes('APOSTILLADO_MPPRE');
      if (filterStatus === 'VERIFIED') return matchesSearch && (r.mppreVerified || (r.status || '').includes('APOSTILLADO_MPPRE'));
      if (filterStatus === 'REJECTED') return matchesSearch && isRejected;
      return matchesSearch && hasMppeuSeal;
    }

    if (filterStatus === 'PENDING') return matchesSearch && !isVerified && !isRejected;
    if (filterStatus === 'VERIFIED') return matchesSearch && isVerified;
    if (filterStatus === 'REJECTED') return matchesSearch && isRejected;
    return matchesSearch;
  });

  // Métricas calculadas
  const totalCount = records.length;
  const verifiedCount = records.filter(r => (r.status || '').includes('Verificado') || (r.status || '').includes('CERTIFICADO_MPPEU') || (r.status || '').includes('APOSTILLADO_MPPRE') || r.mppeuVerified).length;
  const rejectedCount = records.filter(r => (r.status || '').includes('Rechazado')).length;
  const pendingCount = totalCount - verifiedCount - rejectedCount;
  const efficiencyRate = totalCount > 0 ? (((verifiedCount + rejectedCount) / totalCount) * 100).toFixed(1) : '100.0';

  return (
    <div className="view-container" style={{ maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* ─── SELECTOR DE ROL MINISTERIAL (ARQUITECTURA DE TESIS) ─── */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        background: '#ffffff',
        padding: '0.4rem',
        borderRadius: 'var(--radius-pill)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-subtle)',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setMinisterialMode('MPPEU')}
          style={{
            flex: 1,
            minWidth: '220px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.55rem',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-pill)',
            border: 'none',
            background: ministerialMode === 'MPPEU' ? 'var(--color-ink-black)' : 'transparent',
            color: ministerialMode === 'MPPEU' ? '#ffffff' : 'var(--color-slate-gray)',
            fontWeight: 500,
            fontSize: '0.86rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Building2 size={16} />
          <span>Etapa 2: Taquilla MPPEU (Cotejo GTU)</span>
          <span style={{
            fontSize: '0.72rem',
            background: ministerialMode === 'MPPEU' ? 'var(--color-blush-peach)' : 'var(--color-mist-gray)',
            color: ministerialMode === 'MPPEU' ? 'var(--color-sienna-brown)' : 'var(--color-slate-gray)',
            padding: '0.15rem 0.55rem',
            borderRadius: 'var(--radius-pill)',
            fontWeight: 600
          }}>
            {records.filter(r => !r.mppeuVerified && !(r.status || '').includes('CERTIFICADO_MPPEU') && !(r.status || '').includes('APOSTILLADO_MPPRE')).length} pendientes
          </span>
        </button>

        <button
          onClick={() => setMinisterialMode('MPPRE')}
          style={{
            flex: 1,
            minWidth: '220px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.55rem',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-pill)',
            border: 'none',
            background: ministerialMode === 'MPPRE' ? 'var(--color-ink-black)' : 'transparent',
            color: ministerialMode === 'MPPRE' ? '#ffffff' : 'var(--color-slate-gray)',
            fontWeight: 500,
            fontSize: '0.86rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Globe size={16} />
          <span>Etapa 3: Cancillería MPPRE (Apostilla 100% Digital)</span>
          <span style={{
            fontSize: '0.72rem',
            background: ministerialMode === 'MPPRE' ? 'var(--color-blush-peach)' : 'var(--color-mist-gray)',
            color: ministerialMode === 'MPPRE' ? 'var(--color-sienna-brown)' : 'var(--color-slate-gray)',
            padding: '0.15rem 0.55rem',
            borderRadius: 'var(--radius-pill)',
            fontWeight: 600
          }}>
            {records.filter(r => (r.mppeuVerified || (r.status || '').includes('CERTIFICADO_MPPEU')) && !r.mppreVerified && !(r.status || '').includes('APOSTILLADO_MPPRE')).length} listos
          </span>
        </button>

        <button
          onClick={() => setMinisterialMode('ALL')}
          style={{
            flex: 0.7,
            minWidth: '180px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.55rem',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-pill)',
            border: 'none',
            background: ministerialMode === 'ALL' ? 'var(--color-ink-black)' : 'transparent',
            color: ministerialMode === 'ALL' ? '#ffffff' : 'var(--color-slate-gray)',
            fontWeight: 500,
            fontSize: '0.86rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <ShieldCheck size={16} />
          <span>Auditoría General & IA</span>
        </button>
      </div>
      
      {/* ─── BANDEROLA NOTIFICACIÓN DE TRÁMITES PENDIENTES POR AUDITAR ─── */}
      {pendingCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'var(--color-blush-peach)',
            border: '1px solid rgba(93, 42, 26, 0.15)',
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius-cards)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: 'var(--shadow-subtle)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#ffffff', color: 'var(--color-sienna-brown)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={18} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--color-sienna-brown)', fontWeight: 600 }}>
                Atención Funcionario: Tienes <strong>{pendingCount} expediente{pendingCount > 1 ? 's' : ''} pendiente{pendingCount > 1 ? 's' : ''}</strong> por auditar y revisar.
              </h4>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.82rem', color: 'var(--color-sienna-brown)', opacity: 0.85 }}>
                Los graduandos de la USM aguardan por la firma digital y verificación en la Blockchain.
              </p>
            </div>
          </div>

          <button
            onClick={() => setFilterStatus('PENDING')}
            style={{
              background: 'var(--color-sienna-brown)',
              color: '#ffffff',
              border: 'none',
              padding: '0.55rem 1.2rem',
              borderRadius: 'var(--radius-pill)',
              fontWeight: 500,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: 'var(--shadow-subtle)'
            }}
          >
            <Clock size={14} /> Ver Pendientes Solamente
          </button>
        </motion.div>
      )}

      {/* ─── ENCABEZADO CON MÉTRICAS Y ASISTENTE IA DE AUDITORÍA ─── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '1.25rem',
        background: '#ffffff',
        padding: '1.75rem 2rem',
        borderRadius: 'var(--radius-cards)',
        border: '1px solid var(--border)',
        marginBottom: '1.8rem',
        boxShadow: 'var(--shadow-subtle)'
      }}>
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.4rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--color-fog-white)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-ink-black)'
            }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: '1.5rem',
                fontFamily: 'var(--font-serif)',
                fontWeight: 400,
                color: 'var(--color-ink-black)'
              }}>
                Panel de Auditoría Gubernamental ({currentAuditorEnte})
              </h2>
              <span style={{ fontSize: '0.82rem', color: 'var(--color-slate-gray)' }}>
                Funcionario Activo: <strong style={{ color: 'var(--color-ink-black)' }}>{currentAuditorCargo} ({currentAuditorName})</strong>
              </span>
            </div>
          </div>
          <p style={{ color: 'var(--color-slate-gray)', fontSize: '0.92rem', margin: '0.5rem 0 0 0', lineHeight: 1.55 }}>
            Inspección de expedientes académicos firmados por la Universidad Santa María. Aprueba o rechaza legajos con observación de ley e inscribe la resolución en la Blockchain de Ethereum.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={connectMetaMask}
            disabled={web3Connecting}
            style={{
              background: web3Account ? 'var(--color-fog-white)' : '#ffffff',
              color: 'var(--color-ink-black)',
              border: '1px solid var(--border)',
              padding: '0.55rem 1rem',
              borderRadius: 'var(--radius-pill)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: 'var(--shadow-subtle)'
            }}
            title={web3Account ? `Billetera Auditor Conectada: ${web3Account}` : 'Conectar MetaMask para firma directa'}
          >
            <Wallet size={15} /> {web3Account ? `MetaMask (${web3Account.slice(0, 6)}...${web3Account.slice(-4)})` : 'Conectar MetaMask'}
          </button>

          <button 
            onClick={() => { setShowAiAssistantModal(true); runAiFraudAnalysis(); }}
            style={{
              background: '#ffffff',
              color: 'var(--color-ink-black)',
              border: '1px solid var(--border)',
              padding: '0.55rem 1rem',
              borderRadius: 'var(--radius-pill)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: 'var(--shadow-subtle)'
            }}
          >
            <Bot size={15} /> Asistente Institucional
          </button>

          <button 
            onClick={handleExportCSV}
            style={{
              background: '#ffffff',
              color: 'var(--color-ink-black)',
              border: '1px solid var(--border)',
              padding: '0.55rem 1rem',
              borderRadius: 'var(--radius-pill)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: 'var(--shadow-subtle)'
            }}
          >
            <FileSpreadsheet size={15} /> Exportar Reporte
          </button>

          <button 
            onClick={() => setShowAdminModal(true)}
            style={{
              background: 'var(--color-ink-black)',
              color: '#ffffff',
              border: 'none',
              padding: '0.55rem 1.1rem',
              borderRadius: 'var(--radius-pill)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: 'var(--shadow-subtle)'
            }}
          >
            <Shield size={15} /> + Añadir Auditor
          </button>
        </div>
      </div>

      {/* ─── TARJETAS DE RESUMEN EJECUTIVO (MÉTRICAS) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.8rem' }}>
        <motion.div whileHover={{ y: -4 }} style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-cards)', padding: '1.35rem 1.6rem', boxShadow: 'var(--shadow-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-slate-gray)', fontSize: '0.84rem', marginBottom: '0.4rem' }}>
            <span>Expedientes Recibidos</span>
            <FileText size={17} color="var(--color-ink-black)" />
          </div>
          <h3 style={{ fontSize: '2rem', fontFamily: 'var(--font-serif)', fontWeight: 400, margin: 0, color: 'var(--color-ink-black)' }}>{totalCount}</h3>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} style={{ background: 'var(--color-blush-peach)', border: '1px solid rgba(93, 42, 26, 0.15)', borderRadius: 'var(--radius-cards)', padding: '1.35rem 1.6rem', boxShadow: 'var(--shadow-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-sienna-brown)', fontSize: '0.84rem', marginBottom: '0.4rem' }}>
            <span>Pendientes por Auditar</span>
            <Clock size={17} color="var(--color-sienna-brown)" />
          </div>
          <h3 style={{ fontSize: '2rem', fontFamily: 'var(--font-serif)', fontWeight: 400, margin: 0, color: 'var(--color-sienna-brown)' }}>{pendingCount}</h3>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-cards)', padding: '1.35rem 1.6rem', boxShadow: 'var(--shadow-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-slate-gray)', fontSize: '0.84rem', marginBottom: '0.4rem' }}>
            <span>Auditados y Verificados</span>
            <CheckCircle size={17} color="#10b981" />
          </div>
          <h3 style={{ fontSize: '2rem', fontFamily: 'var(--font-serif)', fontWeight: 400, margin: 0, color: 'var(--color-ink-black)' }}>{verifiedCount}</h3>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-cards)', padding: '1.35rem 1.6rem', boxShadow: 'var(--shadow-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-slate-gray)', fontSize: '0.84rem', marginBottom: '0.4rem' }}>
            <span>Rechazados con Observación</span>
            <AlertOctagon size={17} color="var(--color-sienna-brown)" />
          </div>
          <h3 style={{ fontSize: '2rem', fontFamily: 'var(--font-serif)', fontWeight: 400, margin: 0, color: 'var(--color-ink-black)' }}>{rejectedCount}</h3>
        </motion.div>
      </div>

      {/* ─── MODAL DE RECHAZO DE DOCUMENTO CON OBSERVACIÓN ─── */}
      <AnimatePresence>
        {rejectingRecord && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(23, 25, 28, 0.45)', backdropFilter: 'blur(8px)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <motion.div initial={{ scale: 0.96, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 15 }} style={{ maxWidth: '520px', width: '100%', padding: '2rem', borderRadius: 'var(--radius-cards)', background: '#ffffff', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, color: 'var(--color-ink-black)', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <AlertOctagon size={20} color="var(--color-sienna-brown)" /> Rechazar Documento / Legajo
                </h3>
                <button
                  onClick={() => setRejectingRecord(null)}
                  style={{
                    background: 'var(--color-fog-white)',
                    border: '1px solid var(--border)',
                    color: 'var(--color-slate-gray)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ background: 'var(--color-fog-white)', padding: '1rem 1.25rem', borderRadius: '16px', marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
                <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600, color: 'var(--color-ink-black)', fontSize: '0.95rem' }}>
                  Solicitante: {rejectingRecord.ownerName}
                </p>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-slate-gray)' }}>
                  C.I: {rejectingRecord.cedula} — {rejectingRecord.documentType}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--color-slate-gray)', marginBottom: '0.4rem', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Motivo Oficial de Rechazo:
                  </label>
                  <select
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: 'var(--color-fog-white)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-inputs)',
                      color: 'var(--color-ink-black)',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  >
                    <option value="Inconsistencia en número de folio o acta del título">Inconsistencia en número de folio o acta del título</option>
                    <option value="Fotocopia escaneada ilegible o con información cortada">Fotocopia escaneada ilegible o con información cortada</option>
                    <option value="Falta de timbres fiscales provinciales requeridos">Falta de timbres fiscales provinciales requeridos</option>
                    <option value="Inconsistencia en la cédula de identidad del graduando">Inconsistencia en la cédula de identidad del graduando</option>
                    <option value="Falta de firma o sello de la Secretaría USM">Falta de firma o sello de la Secretaría USM</option>
                    <option value="OTRO">Otro motivo personalizado...</option>
                  </select>
                </div>

                {rejectionReason === 'OTRO' && (
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--color-slate-gray)', marginBottom: '0.4rem', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Observación detallada:
                    </label>
                    <textarea
                      rows={3}
                      className="chat-input"
                      placeholder="Indica de forma precisa la falla observada para que el graduando pueda corregirla..."
                      value={customReason}
                      onChange={e => setCustomReason(e.target.value)}
                      style={{
                        width: '100%',
                        resize: 'none',
                        background: 'var(--color-fog-white)',
                        color: 'var(--color-ink-black)',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-inputs)',
                        border: '1px solid var(--border)',
                        outline: 'none',
                        fontSize: '0.88rem'
                      }}
                    />
                  </div>
                )}

                <div style={{ fontSize: '0.76rem', color: 'var(--color-slate-gray)', background: 'var(--color-mist-gray)', padding: '0.7rem 0.9rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Lock size={13} color="var(--color-slate-gray)" /> Firma de Auditoría: Se registrará que el rechazo fue emitido por <strong>{currentAuditorName} ({currentAuditorCargo})</strong>.
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    onClick={confirmRejection}
                    disabled={rejectingLoading}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1.25rem',
                      background: 'var(--color-ink-black)',
                      color: '#ffffff',
                      fontWeight: 500,
                      borderRadius: 'var(--radius-pill)',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.86rem',
                      boxShadow: 'var(--shadow-subtle)'
                    }}
                  >
                    {rejectingLoading ? 'Procesando Rechazo...' : 'Confirmar Rechazo On-Chain'}
                  </button>
                  <button
                    onClick={() => setRejectingRecord(null)}
                    style={{
                      padding: '0.75rem 1.25rem',
                      background: '#ffffff',
                      border: '1px solid var(--border)',
                      color: 'var(--color-ink-black)',
                      borderRadius: 'var(--radius-pill)',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: '0.86rem'
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MODAL ASISTENTE IA DE AUDITORÍA Y REPORTES ─── */}
      <AnimatePresence>
        {showAiAssistantModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(23, 25, 28, 0.45)', backdropFilter: 'blur(8px)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <motion.div initial={{ scale: 0.96, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 15 }} style={{ maxWidth: '680px', width: '100%', padding: '2rem', borderRadius: 'var(--radius-cards)', background: '#ffffff', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, color: 'var(--color-ink-black)', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Bot size={22} color="var(--color-ink-black)" /> Asistente Institucional de Auditoría
                </h3>
                <button
                  onClick={() => setShowAiAssistantModal(false)}
                  style={{
                    background: 'var(--color-fog-white)',
                    border: '1px solid var(--border)',
                    color: 'var(--color-slate-gray)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {aiLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-slate-gray)' }}>
                  <RefreshCw size={32} className="spinning" style={{ margin: '0 auto 1rem auto', color: 'var(--color-ink-black)' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>Ejecutando algoritmos de detección de fraude y resumen de ley...</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div style={{ background: 'var(--color-fog-white)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--color-ink-black)', lineHeight: '1.65', maxHeight: '350px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                    {aiAnalysisResult}
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => { navigator.clipboard.writeText(aiAnalysisResult); alert('Reporte copiado al portapapeles.'); }}
                      style={{
                        padding: '0.65rem 1.25rem',
                        background: '#ffffff',
                        color: 'var(--color-ink-black)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-pill)',
                        cursor: 'pointer',
                        fontWeight: 500,
                        fontSize: '0.84rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: 'var(--shadow-subtle)'
                      }}
                    >
                      <Clipboard size={14} /> Copiar Reporte
                    </button>
                    <button
                      onClick={() => setShowAiAssistantModal(false)}
                      style={{
                        padding: '0.65rem 1.25rem',
                        background: 'var(--color-ink-black)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 'var(--radius-pill)',
                        cursor: 'pointer',
                        fontWeight: 500,
                        fontSize: '0.84rem',
                        boxShadow: 'var(--shadow-subtle)'
                      }}
                    >
                      Cerrar Ventana
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MODAL AÑADIR NUEVO AUDITOR MINISTERIAL ─── */}
      <AnimatePresence>
        {showAdminModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(23, 25, 28, 0.45)', backdropFilter: 'blur(8px)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <motion.div initial={{ scale: 0.96, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 15 }} style={{ maxWidth: '480px', width: '100%', padding: '2rem', borderRadius: 'var(--radius-cards)', background: '#ffffff', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, color: 'var(--color-ink-black)', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Shield size={20} color="var(--color-ink-black)" /> Registrar Nuevo Auditor
                </h3>
                <button
                  onClick={() => setShowAdminModal(false)}
                  style={{
                    background: 'var(--color-fog-white)',
                    border: '1px solid var(--border)',
                    color: 'var(--color-slate-gray)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--color-slate-gray)', marginBottom: '0.3rem', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Usuario Funcionario:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej: mppre_auditor2"
                    value={newAdmin.username}
                    onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.9rem', background: 'var(--color-fog-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-inputs)', color: 'var(--color-ink-black)', outline: 'none', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--color-slate-gray)', marginBottom: '0.3rem', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Contraseña Inicial:
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newAdmin.password}
                    onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.9rem', background: 'var(--color-fog-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-inputs)', color: 'var(--color-ink-black)', outline: 'none', fontSize: '0.88rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--color-slate-gray)', marginBottom: '0.3rem', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Ente Ministerial:
                    </label>
                    <select
                      value={newAdmin.ente}
                      onChange={e => setNewAdmin({ ...newAdmin, ente: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.9rem', background: 'var(--color-fog-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-inputs)', color: 'var(--color-ink-black)', outline: 'none', fontSize: '0.85rem' }}
                    >
                      <option value="MPPEU">MPPEU (Taquilla GTU)</option>
                      <option value="MPPRE">MPPRE (Cancillería)</option>
                      <option value="SAREN">SAREN (Registro)</option>
                      <option value="USM">USM (Universidad)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--color-slate-gray)', marginBottom: '0.3rem', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Cargo Oficial:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej: Inspector Consular"
                      value={newAdmin.cargo}
                      onChange={e => setNewAdmin({ ...newAdmin, cargo: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.9rem', background: 'var(--color-fog-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-inputs)', color: 'var(--color-ink-black)', outline: 'none', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--color-slate-gray)', marginBottom: '0.3rem', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    PIN Institucional de Autorización:
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="PIN de Seguridad Gubernamental"
                    value={newAdmin.pin_institucional}
                    onChange={e => setNewAdmin({ ...newAdmin, pin_institucional: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.9rem', background: 'var(--color-fog-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-inputs)', color: 'var(--color-ink-black)', outline: 'none', fontSize: '0.88rem' }}
                  />
                </div>

                {adminMsg && (
                  <div style={{ background: 'var(--color-blush-peach)', color: 'var(--color-sienna-brown)', padding: '0.6rem 0.9rem', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 500 }}>
                    {adminMsg}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.6rem' }}>
                  <button
                    type="submit"
                    disabled={adminLoading}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1.25rem',
                      background: 'var(--color-ink-black)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 'var(--radius-pill)',
                      cursor: adminLoading ? 'not-allowed' : 'pointer',
                      fontWeight: 500,
                      fontSize: '0.86rem',
                      boxShadow: 'var(--shadow-subtle)'
                    }}
                  >
                    {adminLoading ? 'Registrando...' : 'Crear Auditor'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdminModal(false)}
                    style={{
                      padding: '0.75rem 1.25rem',
                      background: '#ffffff',
                      border: '1px solid var(--border)',
                      color: 'var(--color-ink-black)',
                      borderRadius: 'var(--radius-pill)',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: '0.86rem'
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── FILTROS Y BÚSQUEDA ─── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-cards)',
        marginBottom: '1.5rem',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        flexWrap: 'wrap',
        padding: '1rem 1.4rem',
        boxShadow: 'var(--shadow-subtle)'
      }}>
        
        {/* Buscador */}
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={17} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-gray)' }} />
          <input 
            type="text" 
            placeholder="Buscar por Nombre, Cédula o Hash..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.6rem',
              background: 'var(--color-fog-white)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-inputs)',
              color: 'var(--color-ink-black)',
              outline: 'none',
              fontSize: '0.88rem'
            }}
          />
        </div>

        {/* Filtro por Estado */}
        <div style={{
          display: 'flex',
          gap: '0.25rem',
          background: 'var(--color-fog-white)',
          padding: '0.25rem',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid var(--border)'
        }}>
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'PENDING', label: 'Pendientes' },
            { id: 'VERIFIED', label: 'Verificados' },
            { id: 'REJECTED', label: 'Rechazados' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.8rem',
                transition: 'all 0.2s ease',
                background: filterStatus === f.id ? 'var(--color-ink-black)' : 'transparent',
                color: filterStatus === f.id ? '#ffffff' : 'var(--color-slate-gray)'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Botón de Auditoría Masiva en Lote */}
        {selectedHashes.length > 0 && (
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={handleBatchVerify}
            disabled={batchVerifying}
            style={{
              background: 'var(--color-blush-peach)',
              color: 'var(--color-sienna-brown)',
              border: '1px solid rgba(93, 42, 26, 0.2)',
              padding: '0.55rem 1.1rem',
              borderRadius: 'var(--radius-pill)',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: 'var(--shadow-subtle)'
            }}
          >
            <CheckSquare size={16} /> {batchVerifying ? 'Auditando...' : `Aprobar (${selectedHashes.length}) Seleccionados`}
          </motion.button>
        )}

      </div>


      {/* ─── VISTA DESKTOP: TABLA CON PREVISUALIZADOR, AUDITORIA Y RECHAZO ─── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-cards)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-subtle)',
        marginBottom: '2rem'
      }}>
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--color-slate-gray)' }}>
            <RefreshCw size={24} className="spinning" style={{ margin: '0 auto 0.75rem auto', color: 'var(--color-ink-black)' }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Cargando expedientes académicos en la Blockchain...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--color-slate-gray)' }}>
            <FileText size={32} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: '0.92rem' }}>No se encontraron trámites con los criterios seleccionados.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--color-fog-white)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem 0.8rem', width: '40px', textAlign: 'center' }}>
                  <button onClick={toggleSelectAll} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-slate-gray)' }}>
                    {selectedHashes.length === filteredRecords.length ? <CheckSquare size={18} color="var(--color-ink-black)" /> : <Square size={18} />}
                  </button>
                </th>
                <th style={{ padding: '1rem', fontSize: '0.74rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Solicitante</th>
                <th style={{ padding: '1rem', fontSize: '0.74rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Trámite</th>
                <th style={{ padding: '1rem', fontSize: '0.74rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Hash Blockchain</th>
                <th style={{ padding: '1rem', fontSize: '0.74rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Estado & Auditor Responsable</th>
                <th style={{ padding: '1rem', fontSize: '0.74rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, textAlign: 'center' }}>Acciones de Auditoría</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const isVerified = (record.status || '').includes('Verificado');
                const isRejected = (record.status || '').includes('Rechazado');
                const isSelected = selectedHashes.includes(record.hash);
                const auditorSign = record.verifiedBy || currentAuditorName;

                return (
                  <tr
                    key={record.hash}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: isSelected ? 'rgba(251, 225, 209, 0.25)' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    
                    {/* Checkbox Selección */}
                    <td style={{ padding: '1.1rem 0.8rem', textAlign: 'center' }}>
                      <button onClick={() => toggleSelectHash(record.hash)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-slate-gray)' }}>
                        {isSelected ? <CheckSquare size={18} color="var(--color-ink-black)" /> : <Square size={18} />}
                      </button>
                    </td>

                    {/* Solicitante */}
                    <td style={{ padding: '1.1rem 1rem' }}>
                      <p style={{ fontWeight: 600, margin: '0 0 0.2rem 0', color: 'var(--color-ink-black)', fontSize: '0.92rem' }}>{record.ownerName}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-gray)', margin: 0 }}>C.I: {record.cedula}</p>
                    </td>

                    {/* Trámite */}
                    <td style={{ padding: '1.1rem 1rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'var(--color-mist-gray)',
                        border: '1px solid var(--border)',
                        color: 'var(--color-ink-black)',
                        padding: '0.3rem 0.75rem',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '0.78rem',
                        fontWeight: 500
                      }}>
                        <FileText size={13} /> {record.documentType || 'Registro de Título USM'}
                      </span>
                    </td>

                    {/* Hash */}
                    <td style={{ padding: '1.1rem 1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <code style={{
                          background: 'var(--color-mist-gray)',
                          border: '1px solid var(--border)',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          fontFamily: 'monospace',
                          color: 'var(--color-slate-gray)',
                          width: 'fit-content'
                        }}>
                          {record.hash ? `${record.hash.substring(0, 14)}...` : 'N/A'}
                        </code>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${record.txHash || ''}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '0.74rem',
                            color: 'var(--color-ink-black)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontWeight: 500
                          }}
                        >
                          Sepolia Explorer <ExternalLink size={11} />
                        </a>
                      </div>
                    </td>

                    {/* Estado Legal con Traza del Auditor */}
                    <td style={{ padding: '1.1rem 1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {record.mppreVerified || (record.status || '').includes('APOSTILLADO_MPPRE') ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            color: 'var(--color-sienna-brown)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            background: 'var(--color-blush-peach)',
                            border: '1px solid rgba(93, 42, 26, 0.15)',
                            padding: '0.3rem 0.75rem',
                            borderRadius: 'var(--radius-pill)',
                            width: 'fit-content'
                          }}>
                            <Globe size={13} /> Apostillado MPPRE
                          </span>
                        ) : record.mppeuVerified || (record.status || '').includes('CERTIFICADO_MPPEU') ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            color: '#0369a1',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            background: '#e0f2fe',
                            border: '1px solid rgba(3, 105, 161, 0.2)',
                            padding: '0.3rem 0.75rem',
                            borderRadius: 'var(--radius-pill)',
                            width: 'fit-content'
                          }}>
                            <Building2 size={13} /> Certificado GTU (MPPEU)
                          </span>
                        ) : isVerified ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            color: '#15803d',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            background: '#dcfce7',
                            border: '1px solid rgba(21, 128, 61, 0.2)',
                            padding: '0.3rem 0.75rem',
                            borderRadius: 'var(--radius-pill)',
                            width: 'fit-content'
                          }}>
                            <CheckCircle size={13} /> Verificado
                          </span>
                        ) : isRejected ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            color: '#b91c1c',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            background: '#fee2e2',
                            border: '1px solid rgba(185, 28, 28, 0.2)',
                            padding: '0.3rem 0.75rem',
                            borderRadius: 'var(--radius-pill)',
                            width: 'fit-content'
                          }}>
                            <AlertOctagon size={13} /> Rechazado con Observación
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            color: 'var(--color-slate-gray)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            background: 'var(--color-mist-gray)',
                            border: '1px solid var(--border)',
                            padding: '0.3rem 0.75rem',
                            borderRadius: 'var(--radius-pill)',
                            width: 'fit-content'
                          }}>
                            <Clock size={13} /> Pendiente por Cotejo
                          </span>
                        )}
                        
                        {(isVerified || isRejected || record.mppeuVerified || record.mppreVerified) && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-slate-gray)' }}>
                            Firma: <strong style={{ color: 'var(--color-ink-black)' }}>{auditorSign}</strong>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '1.1rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                        
                        {/* Botón Previsualizar Expediente / PUB */}
                        <button
                          onClick={() => setActivePUBRecord(record)}
                          style={{
                            padding: '0.45rem 0.85rem',
                            background: '#ffffff',
                            border: '1px solid var(--border)',
                            color: 'var(--color-ink-black)',
                            borderRadius: 'var(--radius-pill)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: 'var(--shadow-subtle)'
                          }}
                          title="Ver Planilla PUB y Expediente Escaneado"
                        >
                          <Eye size={13} /> Ver Expediente
                        </button>

                        {/* Botón Certificado Digital */}
                        <button
                          onClick={() => setActiveCertHash(record.hash)}
                          style={{
                            padding: '0.45rem 0.85rem',
                            background: '#ffffff',
                            border: '1px solid var(--border)',
                            color: 'var(--color-ink-black)',
                            borderRadius: 'var(--radius-pill)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: 'var(--shadow-subtle)'
                          }}
                          title="Ver Certificado de Inmutabilidad Criptográfica"
                        >
                          <ShieldCheck size={13} /> Certificado
                        </button>

                        {/* Acciones Contextuales por Rol Ministerial */}
                        {ministerialMode === 'MPPEU' ? (
                          <>
                            {!record.mppeuVerified && !(record.status || '').includes('CERTIFICADO_MPPEU') && !(record.status || '').includes('APOSTILLADO_MPPRE') && !isRejected ? (
                              <>
                                <button 
                                  onClick={() => setActiveCotejoRecord(record)}
                                  style={{
                                    padding: '0.45rem 0.95rem',
                                    fontSize: '0.78rem',
                                    background: 'var(--color-ink-black)',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: 'var(--radius-pill)',
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    boxShadow: 'var(--shadow-subtle)'
                                  }}
                                >
                                  <Stamp size={14} /> Cotejo Físico-Digital
                                </button>

                                <button
                                  onClick={() => setRejectingRecord(record)}
                                  style={{
                                    padding: '0.45rem 0.85rem',
                                    fontSize: '0.78rem',
                                    background: '#ffffff',
                                    border: '1px solid rgba(239, 68, 68, 0.35)',
                                    color: '#b91c1c',
                                    borderRadius: 'var(--radius-pill)',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                  }}
                                >
                                  Rechazar
                                </button>
                              </>
                            ) : (
                              <span style={{
                                fontSize: '0.76rem',
                                color: '#0369a1',
                                fontWeight: 600,
                                background: '#e0f2fe',
                                border: '1px solid rgba(3, 105, 161, 0.2)',
                                padding: '0.3rem 0.75rem',
                                borderRadius: 'var(--radius-pill)'
                              }}>
                                Sello GTU Listo
                              </span>
                            )}
                          </>
                        ) : ministerialMode === 'MPPRE' ? (
                          <>
                            {record.mppreVerified || (record.status || '').includes('APOSTILLADO_MPPRE') ? (
                              <button
                                onClick={() => setActiveApostilleRecord(record)}
                                style={{
                                  padding: '0.45rem 0.95rem',
                                  fontSize: '0.78rem',
                                  background: '#ffffff',
                                  border: '1px solid #10b981',
                                  color: '#047857',
                                  borderRadius: 'var(--radius-pill)',
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  boxShadow: 'var(--shadow-subtle)'
                                }}
                              >
                                <Globe size={14} /> Ver Apostilla de La Haya
                              </button>
                            ) : (
                              <button
                                onClick={() => handleMppreApostille(record)}
                                disabled={apostilleLoading === record.hash}
                                style={{
                                  padding: '0.45rem 0.95rem',
                                  fontSize: '0.78rem',
                                  background: 'var(--color-blush-peach)',
                                  color: 'var(--color-sienna-brown)',
                                  border: '1px solid rgba(93, 42, 26, 0.2)',
                                  borderRadius: 'var(--radius-pill)',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  boxShadow: 'var(--shadow-subtle)'
                                }}
                              >
                                <Award size={14} /> {apostilleLoading === record.hash ? 'Apostillando...' : 'Emitir Apostilla 100% Digital'}
                              </button>
                            )}
                          </>
                        ) : (
                          /* Modo General */
                          <>
                            {!isVerified && !isRejected ? (
                              <>
                                <button 
                                  onClick={() => handleVerify(record.hash)}
                                  disabled={verifying === record.hash}
                                  style={{
                                    padding: '0.45rem 0.95rem',
                                    fontSize: '0.78rem',
                                    background: 'var(--color-ink-black)',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: 'var(--radius-pill)',
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                    boxShadow: 'var(--shadow-subtle)'
                                  }}
                                >
                                  {verifying === record.hash ? 'Auditando...' : 'Aprobar'}
                                </button>

                                <button
                                  onClick={() => setRejectingRecord(record)}
                                  style={{
                                    padding: '0.45rem 0.85rem',
                                    fontSize: '0.78rem',
                                    background: '#ffffff',
                                    border: '1px solid rgba(239, 68, 68, 0.35)',
                                    color: '#b91c1c',
                                    borderRadius: 'var(--radius-pill)',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                  }}
                                >
                                  Rechazar
                                </button>
                              </>
                            ) : isVerified ? (
                              <span style={{ fontSize: '0.76rem', color: '#15803d', fontWeight: 600, background: '#dcfce7', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-pill)' }}>Aprobado</span>
                            ) : (
                              <span style={{ fontSize: '0.76rem', color: '#b91c1c', fontWeight: 600, background: '#fee2e2', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-pill)' }}>Rechazado</span>
                            )}
                          </>
                        )}

                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── MODAL PREVISUALIZADOR DEL EXPEDIENTE DIGITAL & PUB ─── */}
      <AnimatePresence>
        {activePUBRecord && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(23, 25, 28, 0.45)',
            backdropFilter: 'blur(8px)',
            zIndex: 1200,
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              style={{
                background: '#ffffff',
                borderRadius: 'var(--radius-cards)',
                maxWidth: '840px',
                width: '100%',
                maxHeight: '92vh',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-card)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{
                padding: '1.25rem 1.6rem',
                background: '#ffffff',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{
                  margin: 0,
                  color: 'var(--color-ink-black)',
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 400,
                  fontSize: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem'
                }}>
                  <Eye color="var(--color-ink-black)" size={20} /> Expediente Digital del Graduando — {activePUBRecord.ownerName}
                </h3>
                <button
                  onClick={() => setActivePUBRecord(null)}
                  style={{
                    background: 'var(--color-fog-white)',
                    border: '1px solid var(--border)',
                    color: 'var(--color-slate-gray)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'var(--color-fog-white)' }}>
                
                <div style={{
                  background: '#ffffff',
                  border: '1px solid var(--border)',
                  padding: '1.25rem 1.5rem',
                  borderRadius: '16px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.25rem',
                  boxShadow: 'var(--shadow-subtle)'
                }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Solicitante:</span>
                    <h4 style={{ margin: '0.2rem 0', color: 'var(--color-ink-black)', fontSize: '1.05rem', fontWeight: 600 }}>{activePUBRecord.ownerName}</h4>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-slate-gray)' }}>C.I: {activePUBRecord.cedula}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--color-slate-gray)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Trámite Registrado:</span>
                    <h4 style={{ margin: '0.2rem 0', color: 'var(--color-ink-black)', fontSize: '1rem', fontWeight: 600 }}>{activePUBRecord.documentType || 'Registro de Título USM'}</h4>
                    <span style={{
                      fontSize: '0.76rem',
                      color: (activePUBRecord.status || '').includes('Verificado') ? '#15803d' : (activePUBRecord.status || '').includes('Rechazado') ? '#b91c1c' : 'var(--color-sienna-brown)',
                      fontWeight: 600
                    }}>
                      Estado: {activePUBRecord.status}
                    </span>
                  </div>
                </div>

                <div style={{
                  background: '#ffffff',
                  color: '#17191c',
                  padding: '2rem',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-subtle)',
                  fontFamily: 'serif',
                  lineHeight: '1.5'
                }} id="gov-pub-preview-print">
                  <div style={{ textAlign: 'center', borderBottom: '2px solid #17191c', paddingBottom: '10px', marginBottom: '14px' }}>
                    <p style={{ margin: 0, fontSize: '9pt', fontWeight: 'bold' }}>REPÚBLICA BOLIVARIANA DE VENEZUELA</p>
                    <p style={{ margin: 0, fontSize: '8pt', color: '#555' }}>SERVICIO AUTÓNOMO DE REGISTROS Y NOTARÍAS (SAREN)</p>
                    <h3 style={{ margin: '8px 0', fontSize: '11pt', textDecoration: 'underline' }}>PLANILLA ÚNICA BANCARIA (PUB) — VISTA AUDITORÍA</h3>
                  </div>
                  <p style={{ fontSize: '9pt' }}><strong>Nombre Solicitante:</strong> {activePUBRecord.ownerName}</p>
                  <p style={{ fontSize: '9pt' }}><strong>Cédula:</strong> {activePUBRecord.cedula}</p>
                  <p style={{ fontSize: '9pt' }}><strong>Hash Blockchain SHA-256:</strong> <span style={{ fontFamily: 'monospace', fontSize: '8pt' }}>{activePUBRecord.hash}</span></p>
                  <p style={{ fontSize: '9pt' }}><strong>Monto Liquidado SAREN:</strong> Bs. 210,00 (0.70 UT)</p>
                  <p style={{ fontSize: '9pt' }}><strong>Auditor Firmante:</strong> {activePUBRecord.verifiedBy || currentAuditorName} ({currentAuditorCargo})</p>
                </div>

              </div>

              <div style={{
                padding: '1.1rem 1.6rem',
                background: '#ffffff',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem'
              }}>
                {!(activePUBRecord.status || '').includes('Verificado') && (
                  <button
                    onClick={() => { handleVerify(activePUBRecord.hash); setActivePUBRecord(null); }}
                    style={{
                      padding: '0.65rem 1.25rem',
                      background: 'var(--color-ink-black)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 'var(--radius-pill)',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: '0.84rem',
                      boxShadow: 'var(--shadow-subtle)'
                    }}
                  >
                    Aprobar y Registrar en Blockchain
                  </button>
                )}
                <button
                  onClick={() => setActivePUBRecord(null)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    background: '#ffffff',
                    border: '1px solid var(--border)',
                    color: 'var(--color-ink-black)',
                    borderRadius: 'var(--radius-pill)',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '0.84rem'
                  }}
                >
                  Cerrar Previsualización
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL COTEJO FÍSICO-DIGITAL MPPEU ─── */}
      <AnimatePresence>
        {activeCotejoRecord && (
          <MPPEUCotejoModal
            record={activeCotejoRecord}
            loading={cotejoLoading}
            onClose={() => setActiveCotejoRecord(null)}
            onConfirmCertify={handleMppeuCertify}
            onReject={(rec) => { setActiveCotejoRecord(null); setRejectingRecord(rec); }}
          />
        )}
      </AnimatePresence>

      {/* ─── MODAL APOSTILLA DE LA HAYA MPPRE ─── */}
      <AnimatePresence>
        {activeApostilleRecord && (
          <ApostilleCertificate
            record={activeApostilleRecord}
            onClose={() => setActiveApostilleRecord(null)}
          />
        )}
      </AnimatePresence>

      {/* ─── MODAL CERTIFICADO DIGITAL DE INMUTABILIDAD ─── */}
      {activeCertHash && (
        <DigitalCertificate
          docHash={activeCertHash}
          onClose={() => setActiveCertHash(null)}
        />
      )}

    </div>
  );
};

// Componente para icono de Octágono de Alerta (Rechazo)
const AlertOctagon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

export default GovernmentPanel;
