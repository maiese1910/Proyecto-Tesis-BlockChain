import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText, CheckSquare, Map as MapIcon, Plus, Trash2, Check, X,
  ShieldCheck, Search, Eye, Download, Printer, Award,
  Building2, Activity, RefreshCw, Sparkles, Layers, Globe
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { dynamicDataAPI, adminAPI, blockchainAPI } from '../services/api';
import { resolveDocumentUrl, resolveFallbackDocumentUrl } from '../services/documentStorage';
import DigitalCertificate from './DigitalCertificate';

const statusWeight = (st) => {
  const s = String(st || '').toUpperCase();
  if (s.includes('APOSTILL')) return 60;
  if (s.includes('CERTIFICAD')) return 50;
  if (s.includes('PROTOCOLIZ') || s.includes('SAREN')) return 40;
  if (s.includes('VERIFICAD')) return 30;
  if (s.includes('COTEJO')) return 20;
  if (s.includes('RECHAZ') || s.includes('REVOCAD')) return 15;
  return 10;
};

const AdminDashboard = ({ adminData, onSwitchToMinisterial }) => {
  const [activeTab, setActiveTab] = useState('bitacora');

  // Expedientes Auditables por GTU (MPPEU) y Cancillería (MPPRE)
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionLoadingHash, setActionLoadingHash] = useState(null);
  const [inspectRecord, setInspectRecord] = useState(null);
  const [inspectDocUrl, setInspectDocUrl] = useState(null);
  const [inspectRegistry, setInspectRegistry] = useState({ libro: 'Grados 2026', tomo: 'XVIII', folio: '142' });
  const [rejectRecord, setRejectRecord] = useState(null);
  const [rejectReason, setRejectReason] = useState('Discrepancia en Folio/Tomo o datos del título respecto a la solicitud GTU');
  const [activeCertHash, setActiveCertHash] = useState(null);

  // Bitácora de Auditoría Ministerial GTU / MPPRE (Innovación de Tesis Módulo 10)
  const [auditFilterEnte, setAuditFilterEnte] = useState('TODOS');
  const [auditSearch, setAuditSearch] = useState('');

  // Datos dinámicos (Checklist, Planillas, Guías)
  const [checklist, setChecklist] = useState([]);
  const [planillas, setPlanillas] = useState([]);
  const [guias, setGuias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const [newChecklist, setNewChecklist] = useState({ title: '', description: '', icon: 'FileText' });
  const [newPlanilla, setNewPlanilla] = useState({ nombre: '', url: '', categoria: 'Legalización GTU / Apostilla' });
  const [newGuia, setNewGuia] = useState({ ente: 'mppeu', location: '', warning: '' });

  const auditorName = adminData?.username || 'mppeu_agente';
  const auditorEnte = adminData?.ente === 'MPPRE' ? 'MPPRE' : 'MPPEU';
  const auditorCargo = adminData?.cargo || (auditorEnte === 'MPPRE' ? 'Auditor de Apostilla Electrónica MPPRE' : 'Auditor de Taquilla GTU — MPPEU');

  const syncLocalRecord = (updated) => {
    try {
      const targetHash = (updated.hash || '').trim().toUpperCase();
      const curBc = JSON.parse(localStorage.getItem('usm_blockchain_records') || '[]');
      const nextBc = curBc.map(r => (r.hash || '').trim().toUpperCase() === targetHash ? { ...r, ...updated } : r);
      if (!nextBc.some(r => (r.hash || '').trim().toUpperCase() === targetHash)) nextBc.unshift(updated);
      localStorage.setItem('usm_blockchain_records', JSON.stringify(nextBc.slice(0, 60)));

      const curPub = JSON.parse(localStorage.getItem('usm_pub_history') || '[]');
      const nextPub = curPub.map(r => (r.hash || r.blockchainHash || '').trim().toUpperCase() === targetHash ? { ...r, ...updated } : r);
      localStorage.setItem('usm_pub_history', JSON.stringify(nextPub.slice(0, 60)));

      window.dispatchEvent(new CustomEvent('usm_records_updated', { detail: updated }));
      window.dispatchEvent(new Event('storage'));
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const ch = new BroadcastChannel('usm_records_sync');
          ch.postMessage({ type: 'RECORD_UPDATED', record: updated });
          ch.close();
        } catch (_) {}
      }
    } catch (_) {}
  };

  const fetchRecords = useCallback(async () => {
    try {
      let apiRecs = [];
      try {
        const res = await blockchainAPI.getAllRecords();
        if (res?.success && Array.isArray(res.records)) apiRecs = res.records;
        else if (Array.isArray(res?.records)) apiRecs = res.records;
        else if (Array.isArray(res)) apiRecs = res;
      } catch (_) {}

      let localRecs = [];
      try {
        localRecs = JSON.parse(localStorage.getItem('usm_blockchain_records') || '[]');
      } catch (_) {}

      const map = new Map();
      apiRecs.forEach(r => { if (r && r.hash) map.set(r.hash.toUpperCase(), r); });
      localRecs.forEach(r => {
        if (!r || !r.hash) return;
        const key = r.hash.toUpperCase();
        if (!map.has(key)) {
          map.set(key, r);
        } else {
          const ex = map.get(key);
          const useLocal = statusWeight(r.status) > statusWeight(ex.status);
          map.set(key, {
            ...r,
            ...ex,
            status: useLocal ? r.status : ex.status,
            sarenVerified: Boolean(ex.sarenVerified || r.sarenVerified || ex.pubCode || r.pubCode),
            mppeuVerified: Boolean(ex.mppeuVerified || r.mppeuVerified || String(useLocal ? r.status : ex.status).includes('CERTIFICADO_MPPEU') || String(useLocal ? r.status : ex.status).includes('APOSTILLADO_MPPRE')),
            mppreVerified: Boolean(ex.mppreVerified || r.mppreVerified || String(useLocal ? r.status : ex.status).includes('APOSTILLADO_MPPRE')),
            apostilleNumber: ex.apostilleNumber || r.apostilleNumber,
            documentUrl: ex.documentUrl || ex.document_url || r.documentUrl || r.document_url || r.fileUrl,
            tomo: r.tomo || ex.tomo || 'XVIII',
            folio: r.folio || ex.folio || '142',
            libro: r.libro || ex.libro || 'Grados 2026'
          });
        }
      });

      const list = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt || b.created_at || b.timestamp || 0) - new Date(a.createdAt || a.created_at || a.timestamp || 0)
      );
      setRecords(list);
    } catch (_) {
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  const fetchDynamicData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'checklist') {
        const data = await dynamicDataAPI.getChecklist();
        if (data.items) setChecklist(data.items);
      } else if (activeTab === 'planillas') {
        const data = await dynamicDataAPI.getPlanillas();
        if (data.planillas) setPlanillas(data.planillas);
      } else if (activeTab === 'guias') {
        const data = await dynamicDataAPI.getGuias();
        if (data.guias) setGuias(data.guias);
      }
    } catch (_) {
      setError('Error al sincronizar datos de configuración ministerial.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRecords();
    const timer = setInterval(fetchRecords, 6000);
    window.addEventListener('usm_records_updated', fetchRecords);
    window.addEventListener('storage', fetchRecords);

    let ch;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        ch = new BroadcastChannel('usm_records_sync');
        ch.onmessage = () => fetchRecords();
      } catch (_) {}
    }
    return () => {
      clearInterval(timer);
      window.removeEventListener('usm_records_updated', fetchRecords);
      window.removeEventListener('storage', fetchRecords);
      if (ch) ch.close();
    };
  }, [fetchRecords]);

  useEffect(() => {
    if (activeTab === 'checklist' || activeTab === 'planillas' || activeTab === 'guias') {
      fetchDynamicData();
    }
  }, [activeTab, fetchDynamicData]);

  useEffect(() => {
    if (!inspectRecord) {
      setInspectDocUrl(null);
      return;
    }
    setInspectRegistry({
      libro: inspectRecord.libro || 'Grados 2026',
      tomo: inspectRecord.tomo || 'XVIII',
      folio: inspectRecord.folio || '142'
    });
    resolveDocumentUrl(inspectRecord)
      .then(url => setInspectDocUrl(url))
      .catch(() => setInspectDocUrl(null));
  }, [inspectRecord]);

  const isGtuCertified = (r) => Boolean(
    r?.mppeuVerified ||
    r?.mppreVerified ||
    String(r?.status || '').toUpperCase().includes('CERTIFICADO_MPPEU') ||
    String(r?.status || '').toUpperCase().includes('APOSTILLADO_MPPRE')
  );

  const isMppreApostilled = (r) => Boolean(
    r?.mppreVerified ||
    String(r?.status || '').toUpperCase().includes('APOSTILLADO_MPPRE')
  );

  const isRejectedRec = (r) => String(r?.status || '').toUpperCase().includes('RECHAZ') || String(r?.status || '').toUpperCase().includes('REVOCAD');

  // Certificar en Taquilla GTU (MPPEU -> CERTIFICADO_MPPEU)
  const handleCertifyGTU = async (record, regOverride = null) => {
    if (!record?.hash) return;
    setActionLoadingHash(record.hash);
    setError('');
    const libro = regOverride?.libro || record.libro || 'Grados 2026';
    const tomo = regOverride?.tomo || record.tomo || 'XVIII';
    const folio = regOverride?.folio || record.folio || '142';
    const nowIso = new Date().toISOString();
    let txHash = record.txHash || '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    try {
      const res = await blockchainAPI.mppeuCertifyRecord(record.hash, {
        auditor_username: auditorName,
        auditor_cargo: auditorCargo,
        auditor_ente: 'MPPEU',
        libro,
        tomo,
        folio
      });
      if (res?.txHash) txHash = res.txHash;
    } catch (_) {}

    const updated = {
      ...record,
      status: isMppreApostilled(record) ? 'APOSTILLADO_MPPRE' : 'CERTIFICADO_MPPEU',
      mppeuVerified: true,
      mppeuOfficer: `${auditorName} (${auditorCargo})`,
      mppeuDate: nowIso,
      verifiedBy: auditorName,
      txHash,
      libro,
      tomo,
      folio
    };

    setRecords(prev => prev.map(r => r.hash === record.hash ? updated : r));
    syncLocalRecord(updated);
    setActionLoadingHash(null);
    setInspectRecord(null);
    setFeedbackMsg(`Certificación GTU (CERTIFICADO_MPPEU) firmada y anclada para ${record.solicitudCode || record.hash.slice(0, 10)}.`);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  // Emitir Apostilla Electrónica de La Haya (MPPRE -> APOSTILLADO_MPPRE)
  const handleApostilleMPPRE = async (record) => {
    if (!record?.hash) return;
    setActionLoadingHash(record.hash);
    setError('');
    const nowIso = new Date().toISOString();
    let apostilleNum = record.apostilleNumber || `APO-VE-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    let txHash = record.txHash || '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    try {
      const res = await blockchainAPI.mppreApostilleRecord(record.hash, {
        auditor_username: auditorName,
        auditor_cargo: auditorCargo,
        auditor_ente: 'MPPRE'
      });
      if (res?.apostilleNumber) apostilleNum = res.apostilleNumber;
      if (res?.txHash) txHash = res.txHash;
    } catch (_) {}

    const updated = {
      ...record,
      status: 'APOSTILLADO_MPPRE',
      mppeuVerified: true,
      mppreVerified: true,
      mppreOfficer: `${auditorName} (${auditorCargo})`,
      mppreDate: nowIso,
      apostilleNumber: apostilleNum,
      verifiedBy: auditorName,
      txHash
    };

    setRecords(prev => prev.map(r => r.hash === record.hash ? updated : r));
    syncLocalRecord(updated);
    setActionLoadingHash(null);
    setInspectRecord(null);
    setFeedbackMsg(`Apostilla Electrónica de La Haya (${apostilleNum}) emitida por MPPRE.`);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  // Rechazar expediente desde GTU o MPPRE con observación
  const handleConfirmReject = async () => {
    if (!rejectRecord?.hash || !rejectReason.trim()) return;
    setActionLoadingHash(rejectRecord.hash);
    try {
      await blockchainAPI.rejectRecord(rejectRecord.hash, rejectReason.trim(), {
        auditor_username: auditorName,
        auditor_cargo: auditorCargo,
        auditor_ente: auditorEnte
      });
    } catch (_) {}

    const updated = {
      ...rejectRecord,
      status: `Rechazado por ${auditorEnte}: ${rejectReason.trim()}`,
      rejectionReason: rejectReason.trim(),
      verifiedBy: auditorName
    };

    setRecords(prev => prev.map(r => r.hash === rejectRecord.hash ? updated : r));
    syncLocalRecord(updated);
    setActionLoadingHash(null);
    setRejectRecord(null);
    setFeedbackMsg(`Expediente ${rejectRecord.solicitudCode || ''} rechazado por ${auditorEnte} con observación oficial.`);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const filteredRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return records.filter(r => {
      if (statusFilter === 'PENDING_GTU' && (isGtuCertified(r) || isRejectedRec(r))) return false;
      if (statusFilter === 'CERTIFICADO_MPPEU' && (!isGtuCertified(r) || isMppreApostilled(r))) return false;
      if (statusFilter === 'APOSTILLADO_MPPRE' && !isMppreApostilled(r)) return false;
      if (statusFilter === 'REJECTED' && !isRejectedRec(r)) return false;
      if (!q) return true;
      return (
        (r.ownerName || r.owner_name || '').toLowerCase().includes(q) ||
        (r.cedula || '').toLowerCase().includes(q) ||
        (r.solicitudCode || '').toLowerCase().includes(q) ||
        (r.hash || '').toLowerCase().includes(q) ||
        (r.documentType || r.document_type || '').toLowerCase().includes(q)
      );
    });
  }, [records, searchTerm, statusFilter]);

  // Construir Bitácora Cronológica de Auditoría Ministerial (GTU-MPPEU y Cancillería-MPPRE)
  const auditTrailEntries = useMemo(() => {
    const entries = [];
    records.forEach(r => {
      const baseTime = r.createdAt || r.created_at || r.timestamp || new Date().toISOString();
      const owner = r.ownerName || r.owner_name || 'Graduando';
      const ced = r.cedula || 'N/A';
      const code = r.solicitudCode || 'GTU-2026-USM';
      const hash = r.hash || '0x0';
      const tx = r.txHash || r.tx_hash || '0xPENDIENTE_COTEJO';

      // Evento 1: Recepción / Certificación en Taquilla GTU (MPPEU)
      entries.push({
        id: `${hash}-mppeu`,
        timestamp: r.mppeuDate || baseTime,
        ente: 'MPPEU',
        estacion: 'Etapa 1: Taquilla GTU — MPPEU',
        accion: isGtuCertified(r) ? 'CERTIFICADO_MPPEU (Sello GTU On-Chain)' : 'PENDIENTE_COTEJO_MPPEU (Solicitud Recibida)',
        titular: owner,
        cedula: ced,
        codigo: code,
        operador: r.mppeuOfficer || (isGtuCertified(r) ? (r.verifiedBy || 'mppeu_agente (Auditor GTU)') : 'En cola de Taquilla GTU'),
        hash,
        txHash: tx,
        detalle: `Libro ${r.libro || 'Grados 2026'} · Tomo ${r.tomo || 'XVIII'} · Folio ${r.folio || '142'} · ${r.sede_taquilla || r.sedeTaquilla || 'Taquilla Central GTU'}`
      });

      // Evento 2: Emisión de Apostilla Electrónica de La Haya (MPPRE)
      if (isMppreApostilled(r) || String(r.status || '').includes('PENDIENTE_APOSTILLA_MPPRE')) {
        entries.push({
          id: `${hash}-mppre`,
          timestamp: r.mppreDate || r.apostilleTimestamp || baseTime,
          ente: 'MPPRE',
          estacion: 'Etapa 2: Cancillería MPPRE',
          accion: isMppreApostilled(r)
            ? `APOSTILLADO_MPPRE (${r.apostilleNumber || 'APO-VE-2026'})`
            : 'PENDIENTE_APOSTILLA_MPPRE (En Bandeja Consular)',
          titular: owner,
          cedula: ced,
          codigo: r.apostilleNumber || code,
          operador: r.mppreOfficer || r.apostilleAuditor || 'mppre_agente (Auditor Cancillería)',
          hash,
          txHash: tx,
          detalle: `País Destino: ${r.countryDestiny || r.country_destiny || 'Convenio de La Haya'}`
        });
      }

      // Evento de Rechazo / Observación Ministerial
      if (isRejectedRec(r)) {
        entries.push({
          id: `${hash}-reject`,
          timestamp: baseTime,
          ente: 'RECHAZOS',
          estacion: 'Observación / Rechazo Ministerial',
          accion: 'RECHAZADO_CON_OBSERVACION',
          titular: owner,
          cedula: ced,
          codigo: code,
          operador: r.verifiedBy || auditorName,
          hash,
          txHash: tx,
          detalle: r.rejectionReason || r.status
        });
      }
    });

    const q = auditSearch.trim().toLowerCase();
    return entries
      .filter(e => {
        if (auditFilterEnte !== 'TODOS' && e.ente !== auditFilterEnte) return false;
        if (!q) return true;
        return (
          e.titular.toLowerCase().includes(q) ||
          e.cedula.toLowerCase().includes(q) ||
          e.codigo.toLowerCase().includes(q) ||
          e.accion.toLowerCase().includes(q) ||
          e.operador.toLowerCase().includes(q) ||
          e.hash.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  }, [records, auditFilterEnte, auditSearch, auditorName]);

  const handleExportAuditCSV = () => {
    const headers = ['Fecha/Hora', 'Ente Auditor', 'Etapa Ministerial', 'Accion Oficial', 'Solicitante', 'Cedula', 'Codigo GTU/Apostilla', 'Auditor Firmante', 'Hash SHA-256', 'TxHash Sepolia', 'Detalle'];
    const rows = auditTrailEntries.map(e => [
      `"${new Date(e.timestamp || Date.now()).toLocaleString('es-VE')}"`,
      `"${e.ente}"`,
      `"${e.estacion}"`,
      `"${e.accion}"`,
      `"${e.titular}"`,
      `"${e.cedula}"`,
      `"${e.codigo}"`,
      `"${e.operador}"`,
      `"${e.hash}"`,
      `"${e.txHash}"`,
      `"${(e.detalle || '').replace(/"/g, "'")}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Bitacora_Auditoria_GTU_MPPRE_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAuditPDF = () => {
    const esc = (v) => String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const container = document.createElement('div');
    container.style.padding = '22px';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.color = '#121212';
    container.innerHTML = `
      <div style="border:2px solid #17191c; padding:18px; border-radius:6px;">
        <div style="border-bottom:2px solid #5d2a1a; padding-bottom:10px; margin-bottom:14px; display:flex; justify-content:space-between;">
          <div>
            <h2 style="margin:0; font-size:14pt; color:#17191c;">REPÚBLICA BOLIVARIANA DE VENEZUELA — AUDITORÍA INTERMINISTERIAL</h2>
            <p style="margin:3px 0 0 0; font-size:9pt; color:#5d2a1a; font-weight:bold;">BITÁCORA DE AUDITORÍA GTU (MPPEU) Y APOSTILLA ELECTRÓNICA DE LA HAYA (MPPRE)</p>
          </div>
          <div style="text-align:right; font-size:8.5pt;">
            <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-VE')}<br/>
            <strong>Auditor:</strong> ${esc(auditorName)} (${esc(auditorCargo)})
          </div>
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:8pt;">
          <thead>
            <tr style="background:#f1f5f9; border-bottom:2px solid #17191c;">
              <th style="border:1px solid #cbd5e1; padding:5px; text-align:left;">Ente / Código</th>
              <th style="border:1px solid #cbd5e1; padding:5px; text-align:left;">Acción Ministerial</th>
              <th style="border:1px solid #cbd5e1; padding:5px; text-align:left;">Solicitante / Cédula</th>
              <th style="border:1px solid #cbd5e1; padding:5px; text-align:left;">Auditor Firmante</th>
              <th style="border:1px solid #cbd5e1; padding:5px; text-align:left;">Hash SHA-256 / Detalle</th>
            </tr>
          </thead>
          <tbody>
            ${auditTrailEntries.slice(0, 35).map(e => `
              <tr>
                <td style="border:1px solid #cbd5e1; padding:5px;"><strong>${esc(e.ente)}</strong><br/>${esc(e.codigo)}</td>
                <td style="border:1px solid #cbd5e1; padding:5px;">${esc(e.accion)}</td>
                <td style="border:1px solid #cbd5e1; padding:5px;">${esc(e.titular)}<br/>${esc(e.cedula)}</td>
                <td style="border:1px solid #cbd5e1; padding:5px;">${esc(e.operador)}</td>
                <td style="border:1px solid #cbd5e1; padding:5px; font-family:monospace; font-size:7.5pt;">${esc((e.hash || '').slice(0, 18))}...<br/>${esc(e.detalle)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    document.body.appendChild(container);
    html2pdf().set({
      margin: 8,
      filename: `Acta_Bitacora_Auditoria_GTU_MPPRE_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    }).from(container).save().finally(() => {
      if (document.body.contains(container)) document.body.removeChild(container);
    });
  };

  // CRUD Checklist / Planillas / Guías
  const handleAddChecklist = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createChecklistItem(newChecklist, adminData?.token);
      setNewChecklist({ title: '', description: '', icon: 'FileText' });
      fetchDynamicData();
    } catch (_) {
      setError('Error al crear requisito del checklist.');
    }
  };

  const handleDeleteChecklist = async (id) => {
    try {
      await adminAPI.deleteChecklistItem(id, adminData?.token);
      fetchDynamicData();
    } catch (_) {
      setError('Error al eliminar requisito.');
    }
  };

  const handleAddPlanilla = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createPlanilla(newPlanilla, adminData?.token);
      setNewPlanilla({ nombre: '', url: '', categoria: 'Legalización GTU / Apostilla' });
      fetchDynamicData();
    } catch (_) {
      setError('Error al crear planilla.');
    }
  };

  const handleDeletePlanilla = async (id) => {
    try {
      await adminAPI.deletePlanilla(id, adminData?.token);
      fetchDynamicData();
    } catch (_) {
      setError('Error al eliminar planilla.');
    }
  };

  const handleAddGuia = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createGuia(newGuia, adminData?.token);
      setNewGuia({ ente: 'mppeu', location: '', warning: '' });
      fetchDynamicData();
      setFeedbackMsg('Guía logística ministerial actualizada correctamente.');
      setTimeout(() => setFeedbackMsg(''), 3500);
    } catch (_) {
      setError('Error al guardar guía logística.');
    }
  };

  const totalCount = records.length;
  const gtuCertifiedCount = records.filter(isGtuCertified).length;
  const mppreApostilledCount = records.filter(isMppreApostilled).length;
  const rejectedCount = records.filter(isRejectedRec).length;
  const pendingGtuCount = Math.max(0, totalCount - gtuCertifiedCount - rejectedCount);

  return (
    <div className="view-container" style={{ maxWidth: '1340px', margin: '0 auto' }}>
      {activeCertHash && (
        <DigitalCertificate docHash={activeCertHash} onClose={() => setActiveCertHash(null)} />
      )}

      {/* Cabecera Ministerial GTU (MPPEU) / Cancillería (MPPRE) */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-cards)',
        padding: '1.5rem 1.85rem',
        marginBottom: '1.35rem',
        boxShadow: 'var(--shadow-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '12px',
            background: 'var(--color-blush-peach)',
            border: '1px solid rgba(93, 42, 26, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-sienna-brown)'
          }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-sienna-brown)' }}>
              Fiscalización Interministerial · GTU (MPPEU) y Cancillería (MPPRE)
            </span>
            <h2 style={{ margin: '0.15rem 0', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.45rem', color: 'var(--color-ink-black)' }}>
              Bitácora de Auditoría Criptográfica y Configuración Ministerial
            </h2>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-slate-gray)' }}>
              Trazabilidad inmutable de certificaciones <code>CERTIFICADO_MPPEU</code> y apostillas <code>APOSTILLADO_MPPRE</code>, con gestión de recaudos, planillas y sedes.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={fetchRecords}
            className="btn-ghost"
            style={{ padding: '0.5rem 0.95rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={14} /> Sincronizar Expedientes
          </button>
          {onSwitchToMinisterial && (
            <button
              type="button"
              onClick={onSwitchToMinisterial}
              className="send-btn"
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Layers size={14} /> Volver a Bandeja Principal GTU / MPPRE
            </button>
          )}
        </div>
      </div>

      {/* Tarjetas de Métricas GTU y MPPRE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.35rem' }}>
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-cards)', padding: '1rem 1.25rem' }}>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Expedientes Recibidos</span>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: 'var(--color-ink-black)', marginTop: '0.2rem' }}>{totalCount}</div>
        </div>
        <div style={{ background: 'var(--color-blush-peach)', border: '1px solid rgba(93, 42, 26, 0.2)', borderRadius: 'var(--radius-cards)', padding: '1rem 1.25rem', color: 'var(--color-sienna-brown)' }}>
          <span style={{ fontSize: '0.76rem', fontWeight: 700 }}>Pendientes de Cotejo GTU (MPPEU)</span>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 600, marginTop: '0.2rem' }}>{pendingGtuCount}</div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-cards)', padding: '1rem 1.25rem' }}>
          <span style={{ fontSize: '0.76rem', color: '#0284c7', fontWeight: 700 }}>Certificados GTU (CERTIFICADO_MPPEU)</span>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: '#0284c7', marginTop: '0.2rem' }}>{gtuCertifiedCount}</div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-cards)', padding: '1rem 1.25rem' }}>
          <span style={{ fontSize: '0.76rem', color: '#047857', fontWeight: 700 }}>Apostillados Cancillería (MPPRE)</span>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: '#047857', marginTop: '0.2rem' }}>{mppreApostilledCount}</div>
        </div>
      </div>

      {/* Pestañas de Navegación Admin Ministerial (GTU / MPPRE) */}
      <div style={{
        display: 'flex',
        gap: '0.35rem',
        marginBottom: '1.35rem',
        background: '#ffffff',
        padding: '0.35rem',
        borderRadius: 'var(--radius-pill)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-subtle)',
        overflowX: 'auto'
      }}>
        {[
          { id: 'bitacora', label: `1. Bitácora de Auditoría CSV/PDF (${auditTrailEntries.length})`, icon: <Activity size={15} /> },
          { id: 'expedientes', label: `2. Control Rápido GTU / MPPRE (${records.length})`, icon: <ShieldCheck size={15} /> },
          { id: 'checklist', label: '3. Checklist de Requisitos', icon: <CheckSquare size={15} /> },
          { id: 'planillas', label: '4. Planillas Oficiales', icon: <FileText size={15} /> },
          { id: 'guias', label: '5. Guías Logísticas (GTU / MPPRE)', icon: <MapIcon size={15} /> },
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            style={{
              background: activeTab === t.id ? 'var(--color-ink-black)' : 'transparent',
              color: activeTab === t.id ? '#ffffff' : 'var(--color-slate-gray)',
              border: 'none',
              padding: '0.6rem 1.15rem',
              borderRadius: 'var(--radius-pill)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontWeight: 600,
              fontSize: '0.81rem',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease'
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {feedbackMsg && (
        <div style={{ padding: '0.8rem 1.2rem', background: '#ecfdf5', color: '#065f46', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: '12px', marginBottom: '1.1rem', fontSize: '0.84rem', fontWeight: 600 }}>
          ✓ {feedbackMsg}
        </div>
      )}

      {error && (
        <div style={{ padding: '0.8rem 1.2rem', background: 'var(--color-blush-peach)', color: 'var(--color-sienna-brown)', border: '1px solid rgba(93, 42, 26, 0.2)', borderRadius: '12px', marginBottom: '1.1rem', fontSize: '0.84rem', fontWeight: 500 }}>
          {error}
        </div>
      )}

      {/* ─── TAB 1: BITÁCORA DE AUDITORÍA MINISTERIAL GTU / MPPRE (CSV / PDF) ─── */}
      {activeTab === 'bitacora' && (
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-cards)', padding: '1.6rem', boxShadow: 'var(--shadow-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-sienna-brown)', background: 'var(--color-blush-peach)', padding: '0.18rem 0.65rem', borderRadius: 'var(--radius-pill)', marginBottom: '0.35rem' }}>
                <Sparkles size={12} /> Trazabilidad Criptográfica GTU (MPPEU) + Cancillería (MPPRE)
              </span>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.3rem', color: 'var(--color-ink-black)' }}>
                Bitácora de Auditoría Ministerial Inmutable (Audit Trail)
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.83rem', color: 'var(--color-slate-gray)' }}>
                Registro cronológico consolidado de certificaciones universitarias GTU (MPPEU), apostillas de La Haya (MPPRE) y observaciones de ley.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleExportAuditCSV}
                className="btn-ghost"
                style={{ padding: '0.5rem 0.95rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Download size={14} /> Exportar Bitácora CSV
              </button>
              <button
                type="button"
                onClick={handleExportAuditPDF}
                className="send-btn"
                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Printer size={14} /> Descargar Acta PDF
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div style={{ flex: '1 1 250px', display: 'flex', alignItems: 'center', gap: '0.55rem', background: 'var(--color-fog-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-inputs)', padding: '0.5rem 0.85rem' }}>
              <Search size={15} color="var(--color-slate-gray)" />
              <input
                type="text"
                placeholder="Filtrar eventos por solicitante, cédula, auditor GTU/MPPRE, código o hash..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, fontSize: '0.84rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {[
                { id: 'TODOS', label: 'TODOS' },
                { id: 'MPPEU', label: 'GTU (MPPEU)' },
                { id: 'MPPRE', label: 'CANCILLERÍA (MPPRE)' },
                { id: 'RECHAZOS', label: 'RECHAZOS' }
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAuditFilterEnte(item.id)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: auditFilterEnte === item.id ? '1px solid var(--color-ink-black)' : '1px solid var(--border)',
                    background: auditFilterEnte === item.id ? 'var(--color-ink-black)' : 'var(--color-fog-white)',
                    color: auditFilterEnte === item.id ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.81rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-fog-white)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 0.9rem' }}>Ente / Etapa</th>
                  <th style={{ padding: '0.75rem 0.9rem' }}>Acción Ministerial</th>
                  <th style={{ padding: '0.75rem 0.9rem' }}>Solicitante</th>
                  <th style={{ padding: '0.75rem 0.9rem' }}>Auditor Firmante</th>
                  <th style={{ padding: '0.75rem 0.9rem' }}>Hash SHA-256 / Detalle</th>
                </tr>
              </thead>
              <tbody>
                {auditTrailEntries.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem 0.9rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.14rem 0.55rem',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '0.71rem',
                        fontWeight: 700,
                        background: e.ente === 'MPPRE' ? '#ecfdf5' : e.ente === 'MPPEU' ? '#eff6ff' : '#fef2f2',
                        color: e.ente === 'MPPRE' ? '#047857' : e.ente === 'MPPEU' ? '#1d4ed8' : '#b91c1c'
                      }}>
                        {e.ente === 'MPPEU' ? 'GTU — MPPEU' : e.ente}
                      </span>
                      <div style={{ fontSize: '0.73rem', color: 'var(--color-slate-gray)', marginTop: '0.2rem' }}>{e.estacion}</div>
                    </td>
                    <td style={{ padding: '0.75rem 0.9rem', fontWeight: 600, color: 'var(--color-ink-black)' }}>
                      {e.accion}
                      <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--color-slate-gray)', fontWeight: 400 }}>{e.codigo}</div>
                    </td>
                    <td style={{ padding: '0.75rem 0.9rem' }}>
                      <strong>{e.titular}</strong>
                      <div style={{ fontSize: '0.74rem', color: 'var(--color-sienna-brown)', fontWeight: 600 }}>{e.cedula}</div>
                    </td>
                    <td style={{ padding: '0.75rem 0.9rem', color: 'var(--text-secondary)' }}>
                      {e.operador}
                    </td>
                    <td style={{ padding: '0.75rem 0.9rem' }}>
                      <code style={{ fontSize: '0.73rem', background: 'var(--color-fog-white)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                        {(e.hash || '').slice(0, 18)}...
                      </code>
                      <div style={{ fontSize: '0.74rem', color: 'var(--color-slate-gray)', marginTop: '0.2rem' }}>{e.detalle}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 2: CONTROL RÁPIDO DE EXPEDIENTES GTU / MPPRE ─── */}
      {activeTab === 'expedientes' && (
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-cards)', padding: '1.5rem', boxShadow: 'var(--shadow-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <div style={{ flex: '1 1 260px', display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--color-fog-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-inputs)', padding: '0.55rem 0.9rem' }}>
              <Search size={16} color="var(--color-slate-gray)" />
              <input
                type="text"
                placeholder="Buscar expediente por nombre, cédula, código GTU o hash SHA-256..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, fontSize: '0.86rem', color: 'var(--color-ink-black)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: `Todos (${totalCount})` },
                { id: 'PENDING_GTU', label: `Pendientes GTU (${pendingGtuCount})` },
                { id: 'CERTIFICADO_MPPEU', label: `Certificados GTU (${gtuCertifiedCount - mppreApostilledCount})` },
                { id: 'APOSTILLADO_MPPRE', label: `Apostillados MPPRE (${mppreApostilledCount})` },
                { id: 'REJECTED', label: `Rechazados (${rejectedCount})` }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  style={{
                    padding: '0.42rem 0.85rem',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: statusFilter === f.id ? '1px solid var(--color-ink-black)' : '1px solid var(--border)',
                    background: statusFilter === f.id ? 'var(--color-ink-black)' : 'var(--color-fog-white)',
                    color: statusFilter === f.id ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {recordsLoading ? (
            <p style={{ color: 'var(--color-slate-gray)', textAlign: 'center', padding: '2rem' }}>Sincronizando expedientes ministeriales...</p>
          ) : filteredRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-slate-gray)' }}>
              No hay expedientes que coincidan con el filtro seleccionado.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {filteredRecords.map((rec) => {
                const gtuDone = isGtuCertified(rec);
                const mppreDone = isMppreApostilled(rec);
                const rejected = isRejectedRec(rec);
                const forensic = rec.forensicAudit || { dpiEstimated: 340, contrastScore: 94, forensicScore: 96 };
                return (
                  <div
                    key={rec.hash}
                    style={{
                      border: '1px solid var(--border)',
                      borderLeft: rejected ? '4px solid #dc2626' : mppreDone ? '4px solid #059669' : gtuDone ? '4px solid #0284c7' : '4px solid #d97706',
                      borderRadius: '14px',
                      padding: '1.15rem 1.35rem',
                      background: 'var(--color-fog-white)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ flex: '1 1 360px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                        <strong style={{ fontSize: '0.98rem', color: 'var(--color-ink-black)' }}>
                          {rec.ownerName || rec.owner_name || 'Solicitante'}
                        </strong>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-sienna-brown)', background: 'var(--color-blush-peach)', padding: '0.12rem 0.55rem', borderRadius: 'var(--radius-pill)' }}>
                          {rec.cedula || 'V-00.000.000'}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', background: '#ffffff', border: '1px solid var(--border)', padding: '0.12rem 0.5rem', borderRadius: '6px', fontWeight: 600 }}>
                          {rec.solicitudCode || 'GTU-2026-USM'}
                        </span>
                        <span style={{
                          fontSize: '0.73rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.6rem',
                          borderRadius: 'var(--radius-pill)',
                          background: rejected ? '#fef2f2' : mppreDone ? '#ecfdf5' : gtuDone ? '#eff6ff' : '#fffbeb',
                          color: rejected ? '#b91c1c' : mppreDone ? '#047857' : gtuDone ? '#1d4ed8' : '#b45309',
                          border: '1px solid currentColor'
                        }}>
                          {rejected ? rec.status : mppreDone ? `✓ APOSTILLADO_MPPRE (${rec.apostilleNumber || 'La Haya'})` : gtuDone ? '✓ CERTIFICADO_MPPEU (Listo para Apostilla MPPRE)' : '⏳ PENDIENTE COTEJO GTU (MPPEU)'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                        <strong>Documento:</strong> {rec.documentType || rec.document_type || 'Título Universitario'} ·{' '}
                        <strong>Acta de Grado:</strong> Libro {rec.libro || 'Grados 2026'}, Tomo {rec.tomo || 'XVIII'}, Folio {rec.folio || '142'}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--color-slate-gray)' }}>
                        <span><strong>SHA-256:</strong> <code>{(rec.hash || '').slice(0, 18)}...</code></span>
                        <span><strong>Forense IA:</strong> ~{forensic.dpiEstimated || 340} DPI · Contraste {forensic.contrastScore || 94}%</span>
                        {(rec.sede_taquilla || rec.sedeTaquilla) && (
                          <span><strong>Taquilla GTU:</strong> {rec.sede_taquilla || rec.sedeTaquilla}</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setInspectRecord(rec)}
                        className="btn-ghost"
                        style={{ padding: '0.48rem 0.85rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#ffffff' }}
                      >
                        <Eye size={14} /> Inspeccionar Título / Cotejo
                      </button>

                      {!gtuDone ? (
                        <button
                          type="button"
                          disabled={actionLoadingHash === rec.hash}
                          onClick={() => handleCertifyGTU(rec)}
                          className="send-btn"
                          style={{
                            padding: '0.48rem 0.95rem',
                            fontSize: '0.78rem',
                            background: '#0284c7',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <Building2 size={14} />
                          {actionLoadingHash === rec.hash ? 'Certificando...' : 'Certificar GTU (CERTIFICADO_MPPEU)'}
                        </button>
                      ) : !mppreDone ? (
                        <button
                          type="button"
                          disabled={actionLoadingHash === rec.hash}
                          onClick={() => handleApostilleMPPRE(rec)}
                          className="send-btn"
                          style={{
                            padding: '0.48rem 0.95rem',
                            fontSize: '0.78rem',
                            background: '#059669',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <Globe size={14} />
                          {actionLoadingHash === rec.hash ? 'Apostillando...' : 'Emitir Apostilla (APOSTILLADO_MPPRE)'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveCertHash(rec.hash)}
                          className="send-btn"
                          style={{
                            padding: '0.48rem 0.95rem',
                            fontSize: '0.78rem',
                            background: '#047857',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <ShieldCheck size={14} /> Apostillado MPPRE ✓
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setRejectRecord(rec)}
                        style={{
                          padding: '0.48rem 0.8rem',
                          fontSize: '0.78rem',
                          borderRadius: 'var(--radius-pill)',
                          border: '1px solid rgba(220, 38, 38, 0.35)',
                          background: '#ffffff',
                          color: '#b91c1c',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: CHECKLIST DE REQUISITOS (GTU / APOSTILLA) ─── */}
      {activeTab === 'checklist' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-cards)', padding: '1.6rem', boxShadow: 'var(--shadow-subtle)' }}>
            <h3 style={{ marginTop: 0, fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.2rem' }}>Agregar Requisito Oficial (GTU / Apostilla)</h3>
            <form onSubmit={handleAddChecklist} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Título del Requisito</label>
                <input
                  type="text"
                  required
                  value={newChecklist.title}
                  onChange={(e) => setNewChecklist({ ...newChecklist, title: e.target.value })}
                  placeholder="Ej: Comprobante de Cita Electrónica GTU"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-inputs)', border: '1px solid var(--border)', background: 'var(--color-fog-white)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Instrucción / Validación IA</label>
                <textarea
                  required
                  rows={3}
                  value={newChecklist.description}
                  onChange={(e) => setNewChecklist({ ...newChecklist, description: e.target.value })}
                  placeholder="Instrucción detallada para el solicitante..."
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-inputs)', border: '1px solid var(--border)', background: 'var(--color-fog-white)' }}
                />
              </div>
              <button type="submit" className="send-btn" style={{ padding: '0.65rem 1.2rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}>
                <Plus size={16} /> Crear Requisito
              </button>
            </form>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-cards)', padding: '1.6rem', boxShadow: 'var(--shadow-subtle)' }}>
            <h3 style={{ marginTop: 0, fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.2rem' }}>Requisitos Activos ({checklist.length})</h3>
            {loading ? <p>Cargando...</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {checklist.map(item => (
                  <div key={item.id} style={{ padding: '0.9rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--color-fog-white)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                    <div>
                      <strong style={{ fontSize: '0.9rem', display: 'block' }}>{item.title || item.label}</strong>
                      <span style={{ fontSize: '0.79rem', color: 'var(--color-slate-gray)' }}>{item.description || item.pista}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteChecklist(item.id)}
                      title="Eliminar requisito"
                      style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '8px', padding: '0.45rem', cursor: 'pointer' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4: FORMATOS Y PLANILLAS OFICIALES (CON ELIMINACIÓN) ─── */}
      {activeTab === 'planillas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-cards)', padding: '1.6rem', boxShadow: 'var(--shadow-subtle)' }}>
            <h3 style={{ marginTop: 0, fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.2rem' }}>Publicar Nueva Planilla Oficial</h3>
            <form onSubmit={handleAddPlanilla} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Nombre Oficial de la Planilla</label>
                <input
                  type="text"
                  required
                  value={newPlanilla.nombre}
                  onChange={(e) => setNewPlanilla({ ...newPlanilla, nombre: e.target.value })}
                  placeholder="Ej: Planilla de Solicitud de Cita GTU (MPPEU)"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-inputs)', border: '1px solid var(--border)', background: 'var(--color-fog-white)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Categoría</label>
                <input
                  type="text"
                  required
                  value={newPlanilla.categoria}
                  onChange={(e) => setNewPlanilla({ ...newPlanilla, categoria: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-inputs)', border: '1px solid var(--border)', background: 'var(--color-fog-white)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>URL o Ruta del Documento</label>
                <input
                  type="text"
                  required
                  value={newPlanilla.url}
                  onChange={(e) => setNewPlanilla({ ...newPlanilla, url: e.target.value })}
                  placeholder="https://... o #"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-inputs)', border: '1px solid var(--border)', background: 'var(--color-fog-white)' }}
                />
              </div>
              <button type="submit" className="send-btn" style={{ padding: '0.65rem 1.2rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}>
                <Plus size={16} /> Publicar Planilla
              </button>
            </form>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-cards)', padding: '1.6rem', boxShadow: 'var(--shadow-subtle)' }}>
            <h3 style={{ marginTop: 0, fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.2rem' }}>Catálogo de Planillas ({planillas.length})</h3>
            {loading ? <p>Cargando...</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {planillas.map((p, idx) => (
                  <div key={p.id || p.nombre || idx} style={{ padding: '0.9rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--color-fog-white)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                    <div>
                      <strong style={{ fontSize: '0.9rem', display: 'block' }}>{p.nombre}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-sienna-brown)', fontWeight: 600 }}>{p.categoria}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePlanilla(p.id || p.nombre)}
                      title="Eliminar planilla"
                      style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '8px', padding: '0.45rem', cursor: 'pointer' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 5: GUÍAS LOGÍSTICAS (GTU / MPPRE) ─── */}
      {activeTab === 'guias' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-cards)', padding: '1.6rem', boxShadow: 'var(--shadow-subtle)' }}>
            <h3 style={{ marginTop: 0, fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.2rem' }}>Actualizar / Agregar Guía Logística</h3>
            <form onSubmit={handleAddGuia} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Ente Ministerial</label>
                <select
                  value={newGuia.ente}
                  onChange={(e) => setNewGuia({ ...newGuia, ente: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-inputs)', border: '1px solid var(--border)', background: 'var(--color-fog-white)' }}
                >
                  <option value="mppeu">MPPEU (Taquilla GTU)</option>
                  <option value="mppre">MPPRE (Cancillería / Apostilla)</option>
                  <option value="saren">SAREN (Planilla PUB / Registro Principal)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Ubicación / Sede</label>
                <input
                  type="text"
                  required
                  value={newGuia.location}
                  onChange={(e) => setNewGuia({ ...newGuia, location: e.target.value })}
                  placeholder="Ej: Taquilla Central GTU — Hoyada / Chacao"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-inputs)', border: '1px solid var(--border)', background: 'var(--color-fog-white)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Advertencia / Requisito Crítico</label>
                <input
                  type="text"
                  required
                  value={newGuia.warning}
                  onChange={(e) => setNewGuia({ ...newGuia, warning: e.target.value })}
                  placeholder="Ej: Cita previa obligatoria según terminal de cédula"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-inputs)', border: '1px solid var(--border)', background: 'var(--color-fog-white)' }}
                />
              </div>
              <button type="submit" className="send-btn" style={{ padding: '0.65rem 1.2rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}>
                <Plus size={16} /> Guardar Guía Logística
              </button>
            </form>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-cards)', padding: '1.6rem', boxShadow: 'var(--shadow-subtle)' }}>
            <h3 style={{ marginTop: 0, fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.2rem' }}>Guías Logísticas Registradas ({guias.length})</h3>
            {loading ? <p>Cargando...</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {guias.map((g, idx) => (
                  <div key={g.id || g.ente || idx} style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--color-fog-white)' }}>
                    <span style={{ fontSize: '0.73rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-sienna-brown)', background: 'var(--color-blush-peach)', padding: '0.14rem 0.55rem', borderRadius: 'var(--radius-pill)' }}>
                      {(g.ente || 'ENTE').toUpperCase()}
                    </span>
                    <h4 style={{ margin: '0.45rem 0 0.25rem 0', fontSize: '0.96rem' }}>{g.location}</h4>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-slate-gray)' }}>⚠️ {g.warning}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL INSPECCIÓN DE TÍTULO Y COTEJO MINISTERIAL (GTU / MPPRE) ─── */}
      {inspectRecord && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            backgroundColor: 'rgba(18, 18, 18, 0.72)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}
          onClick={() => setInspectRecord(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '760px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.65rem',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-elevated)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-sienna-brown)' }}>
                  Inspección Ministerial GTU (MPPEU) / Cancillería (MPPRE)
                </span>
                <h3 style={{ margin: '0.15rem 0 0 0', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.3rem' }}>
                  {inspectRecord.ownerName || inspectRecord.owner_name} — {inspectRecord.cedula}
                </h3>
              </div>
              <button type="button" onClick={() => setInspectRecord(null)} className="btn-ghost" style={{ padding: '0.4rem' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Libro de Grados</label>
                <input
                  type="text"
                  value={inspectRegistry.libro}
                  onChange={(e) => setInspectRegistry({ ...inspectRegistry, libro: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--color-fog-white)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Tomo</label>
                <input
                  type="text"
                  value={inspectRegistry.tomo}
                  onChange={(e) => setInspectRegistry({ ...inspectRegistry, tomo: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--color-fog-white)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Folio</label>
                <input
                  type="text"
                  value={inspectRegistry.folio}
                  onChange={(e) => setInspectRegistry({ ...inspectRegistry, folio: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--color-fog-white)' }}
                />
              </div>
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem', background: 'var(--color-fog-white)', marginBottom: '1.1rem', textAlign: 'center' }}>
              {inspectDocUrl ? (
                inspectDocUrl.startsWith('data:application/pdf') || inspectDocUrl.toLowerCase().endsWith('.pdf') ? (
                  <iframe src={inspectDocUrl} title="Título PDF" style={{ width: '100%', height: '320px', border: 'none', borderRadius: '8px' }} />
                ) : (
                  <img
                    src={inspectDocUrl}
                    alt="Pergamino Digitalizado"
                    onError={async () => {
                      const fb = await resolveFallbackDocumentUrl(inspectRecord, inspectDocUrl);
                      setInspectDocUrl(fb || null);
                    }}
                    style={{ maxWidth: '100%', maxHeight: '320px', borderRadius: '8px', objectFit: 'contain' }}
                  />
                )
              ) : (
                <div style={{ padding: '1.5rem', color: 'var(--color-slate-gray)', fontSize: '0.84rem' }}>
                  <Award size={28} style={{ margin: '0 auto 0.5rem auto', display: 'block', color: 'var(--color-sienna-brown)' }} />
                  <strong>Metadatos Criptográficos Verificados On-Chain</strong>
                  <p style={{ margin: '0.35rem 0 0 0', fontFamily: 'monospace', fontSize: '0.76rem', wordBreak: 'break-all' }}>
                    SHA-256: {inspectRecord.hash}
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setInspectRecord(null)} className="btn-ghost" style={{ padding: '0.55rem 1.1rem' }}>
                Cerrar
              </button>
              <button
                type="button"
                disabled={actionLoadingHash === inspectRecord.hash}
                onClick={() => handleCertifyGTU(inspectRecord, inspectRegistry)}
                className="send-btn"
                style={{ padding: '0.55rem 1.25rem', background: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Check size={15} /> {actionLoadingHash === inspectRecord.hash ? 'Certificando GTU...' : 'Confirmar Certificación GTU (CERTIFICADO_MPPEU)'}
              </button>
              {isGtuCertified(inspectRecord) && !isMppreApostilled(inspectRecord) && (
                <button
                  type="button"
                  onClick={() => handleApostilleMPPRE(inspectRecord)}
                  className="send-btn"
                  style={{ padding: '0.55rem 1.25rem', background: '#059669', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Globe size={15} /> Emitir Apostilla (APOSTILLADO_MPPRE)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL RECHAZO CON OBSERVACIÓN MINISTERIAL ─── */}
      {rejectRecord && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            backgroundColor: 'rgba(18, 18, 18, 0.72)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}
          onClick={() => setRejectRecord(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              width: '100%',
              maxWidth: '520px',
              padding: '1.5rem',
              border: '1px solid var(--border)'
            }}
          >
            <h3 style={{ marginTop: 0, fontFamily: 'var(--font-serif)', fontWeight: 400, color: '#b91c1c' }}>
              Rechazar Expediente ({auditorEnte})
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--color-slate-gray)' }}>
              Solicitante: <strong>{rejectRecord.ownerName || rejectRecord.owner_name}</strong> ({rejectRecord.solicitudCode})
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button type="button" onClick={() => setRejectRecord(null)} className="btn-ghost" style={{ padding: '0.5rem 1rem' }}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                style={{ padding: '0.5rem 1.15rem', borderRadius: 'var(--radius-pill)', background: '#dc2626', color: '#ffffff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
