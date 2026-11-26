import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Settings, FileText, CheckSquare, Map as MapIcon, Plus, Trash2, Check, X,
  ShieldCheck, Search, Eye, Download, Printer, Clock, Award,
  AlertTriangle, Building2, Activity, RefreshCw, Sparkles, Layers
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { dynamicDataAPI, adminAPI, blockchainAPI } from '../services/api';
import { resolveDocumentUrl } from '../services/documentStorage';
import DigitalCertificate from './DigitalCertificate';

const statusWeight = (st) => {
  const s = String(st || '').toUpperCase();
  if (s.includes('APOSTILL')) return 60;
  if (s.includes('CERTIFICAD')) return 50;
  if (s.includes('PROTOCOLIZ') || s.includes('SAREN')) return 40;
  if (s.includes('VERIFICADO_USM') || s.includes('VERIFICAD')) return 30;
  if (s.includes('COTEJO')) return 20;
  if (s.includes('RECHAZ') || s.includes('REVOCAD')) return 15;
  return 10;
};

const AdminDashboard = ({ adminData, onSwitchToMinisterial }) => {
  const [activeTab, setActiveTab] = useState('expedientes');

  // Expedientes USM (Estación 1: Refrendo Rectoral)
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionLoadingHash, setActionLoadingHash] = useState(null);
  const [inspectRecord, setInspectRecord] = useState(null);
  const [inspectDocUrl, setInspectDocUrl] = useState(null);
  const [inspectRegistry, setInspectRegistry] = useState({ libro: 'Grados 2026', tomo: 'XVIII', folio: '142' });
  const [rejectRecord, setRejectRecord] = useState(null);
  const [rejectReason, setRejectReason] = useState('Discrepancia en Folio/Tomo del Libro de Actas de Grado USM');
  const [activeCertHash, setActiveCertHash] = useState(null);

  // Bitácora de Auditoría Institucional (Innovación de Tesis Módulo 10)
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
  const [newPlanilla, setNewPlanilla] = useState({ nombre: '', url: '', categoria: 'Trámite Académico' });
  const [newGuia, setNewGuia] = useState({ ente: 'saren', location: '', warning: '' });

  const auditorName = adminData?.username || 'admin';
  const auditorCargo = adminData?.cargo || 'Secretaría General / Rectorado USM';

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
            usmVerified: Boolean(ex.usmVerified || r.usmVerified || String(useLocal ? r.status : ex.status).includes('VERIFICADO_USM')),
            sarenVerified: Boolean(ex.sarenVerified || r.sarenVerified || ex.pubCode || r.pubCode),
            mppeuVerified: Boolean(ex.mppeuVerified || r.mppeuVerified),
            mppreVerified: Boolean(ex.mppreVerified || r.mppreVerified),
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
      setError('Error al sincronizar datos de configuración.');
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

  // Otorgar Refrendo Rectoral (Estación 1 -> VERIFICADO_USM)
  const handleEndorseUSM = async (record, regOverride = null) => {
    if (!record?.hash) return;
    setActionLoadingHash(record.hash);
    setError('');
    const libro = regOverride?.libro || record.libro || 'Grados 2026';
    const tomo = regOverride?.tomo || record.tomo || 'XVIII';
    const folio = regOverride?.folio || record.folio || '142';
    const nowIso = new Date().toISOString();

    try {
      await blockchainAPI.verifyRecord(record.hash, {
        auditor_username: auditorName,
        auditor_cargo: auditorCargo,
        auditor_ente: 'USM',
        libro,
        tomo,
        folio
      });
    } catch (_) {}

    const keepHigherStatus = record.mppeuVerified || record.mppreVerified || String(record.status || '').includes('CERTIFICADO') || String(record.status || '').includes('APOSTILLADO');
    const updated = {
      ...record,
      status: keepHigherStatus ? record.status : 'VERIFICADO_USM',
      usmVerified: true,
      usmOfficer: `${auditorName} (${auditorCargo})`,
      usmDate: nowIso,
      verifiedBy: auditorName,
      libro,
      tomo,
      folio
    };

    setRecords(prev => prev.map(r => r.hash === record.hash ? updated : r));
    syncLocalRecord(updated);
    setActionLoadingHash(null);
    setInspectRecord(null);
    setFeedbackMsg(`Refrendo Rectoral (VERIFICADO_USM) acreditado al expediente ${record.solicitudCode || record.hash.slice(0, 10)}.`);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  // Rechazar expediente desde Rectorado USM con observación
  const handleConfirmRejectUSM = async () => {
    if (!rejectRecord?.hash || !rejectReason.trim()) return;
    setActionLoadingHash(rejectRecord.hash);
    try {
      await blockchainAPI.rejectRecord(rejectRecord.hash, rejectReason.trim(), {
        auditor_username: auditorName,
        auditor_cargo: auditorCargo,
        auditor_ente: 'USM'
      });
    } catch (_) {}

    const updated = {
      ...rejectRecord,
      status: `Rechazado por Rectorado USM: ${rejectReason.trim()}`,
      rejectionReason: rejectReason.trim(),
      usmVerified: false,
      verifiedBy: auditorName
    };

    setRecords(prev => prev.map(r => r.hash === rejectRecord.hash ? updated : r));
    syncLocalRecord(updated);
    setActionLoadingHash(null);
    setRejectRecord(null);
    setFeedbackMsg(`Expediente ${rejectRecord.solicitudCode || ''} rechazado con observación rectoral.`);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const isUsmEndorsed = (r) => Boolean(
    r?.usmVerified ||
    String(r?.status || '').toUpperCase().includes('VERIFICADO_USM') ||
    r?.mppeuVerified ||
    r?.mppreVerified ||
    String(r?.status || '').toUpperCase().includes('CERTIFICADO') ||
    String(r?.status || '').toUpperCase().includes('APOSTILLADO')
  );

  const isRejectedRec = (r) => String(r?.status || '').toUpperCase().includes('RECHAZ') || String(r?.status || '').toUpperCase().includes('REVOCAD');

  const filteredRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return records.filter(r => {
      if (statusFilter === 'PENDING_USM' && (isUsmEndorsed(r) || isRejectedRec(r))) return false;
      if (statusFilter === 'VERIFICADO_USM' && !isUsmEndorsed(r)) return false;
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

  // Construir Bitácora Cronológica de Auditoría Institucional (4 Estaciones)
  const auditTrailEntries = useMemo(() => {
    const entries = [];
    records.forEach(r => {
      const baseTime = r.createdAt || r.created_at || r.timestamp || new Date().toISOString();
      const owner = r.ownerName || r.owner_name || 'Graduando USM';
      const ced = r.cedula || 'N/A';
      const code = r.solicitudCode || 'GTU-2026-USM';
      const hash = r.hash || '0x0';
      const tx = r.txHash || r.tx_hash || '0xPENDIENTE_COTEJO';

      // Evento 1: Emisión / Refrendo Rectoral USM
      entries.push({
        id: `${hash}-usm`,
        timestamp: r.usmDate || baseTime,
        ente: 'USM',
        estacion: 'Estación 1: Rectorado USM',
        accion: isUsmEndorsed(r) ? 'VERIFICADO_USM (Refrendo Rectoral)' : 'EXPEDIENTE_DIGITALIZADO_OCR',
        titular: owner,
        cedula: ced,
        codigo: code,
        operador: r.usmOfficer || 'Secretaría General USM (admin)',
        hash,
        txHash: tx,
        detalle: `Libro ${r.libro || 'Grados 2026'} · Tomo ${r.tomo || 'XVIII'} · Folio ${r.folio || '142'}`
      });

      // Evento 2: Conciliación PUB SAREN
      if (r.sarenVerified || r.pubCode || r.paymentReference) {
        entries.push({
          id: `${hash}-saren`,
          timestamp: baseTime,
          ente: 'SAREN',
          estacion: 'Estación 2: Registro Principal SAREN',
          accion: 'PUB_LIQUIDADA_CONCILIADA',
          titular: owner,
          cedula: ced,
          codigo: r.pubCode || code,
          operador: 'saren_admin (Registrador Principal)',
          hash,
          txHash: tx,
          detalle: `Ref. SENIAT #${r.paymentReference || 'CONCILIADA'} · ${r.bancoReceptor || 'Banco de Venezuela'}`
        });
      }

      // Evento 3: Certificación Ministerial GTU (MPPEU)
      if (r.mppeuVerified || String(r.status || '').includes('CERTIFICADO') || String(r.status || '').includes('APOSTILLADO')) {
        entries.push({
          id: `${hash}-mppeu`,
          timestamp: r.mppeuDate || baseTime,
          ente: 'MPPEU',
          estacion: 'Estación 3: Taquilla GTU MPPEU',
          accion: 'CERTIFICADO_MPPEU (Anclaje Sepolia)',
          titular: owner,
          cedula: ced,
          codigo: code,
          operador: r.mppeuOfficer || r.verifiedBy || 'mppeu_agente',
          hash,
          txHash: tx,
          detalle: `Sede: ${r.sede_taquilla || r.sedeTaquilla || 'Taquilla Central MPPEU'}`
        });
      }

      // Evento 4: Apostilla Electrónica de La Haya (MPPRE)
      if (r.mppreVerified || String(r.status || '').includes('APOSTILLADO')) {
        entries.push({
          id: `${hash}-mppre`,
          timestamp: r.mppreDate || r.apostilleTimestamp || baseTime,
          ente: 'MPPRE',
          estacion: 'Estación 4: Cancillería MPPRE',
          accion: `APOSTILLADO_MPPRE (${r.apostilleNumber || 'APO-VE-2026'})`,
          titular: owner,
          cedula: ced,
          codigo: r.apostilleNumber || code,
          operador: r.mppreOfficer || r.apostilleAuditor || 'mppre_agente',
          hash,
          txHash: tx,
          detalle: `País Destino: ${r.countryDestiny || r.country_destiny || 'Convenio de La Haya'}`
        });
      }

      // Evento de Rechazo / Revocación
      if (isRejectedRec(r)) {
        entries.push({
          id: `${hash}-reject`,
          timestamp: baseTime,
          ente: 'RECHAZOS',
          estacion: 'Observación / Rechazo Oficial',
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
    const headers = ['Fecha/Hora', 'Ente', 'Estacion', 'Accion Oficial', 'Graduando', 'Cedula', 'Codigo Tramite', 'Funcionario Firmante', 'Hash SHA-256', 'TxHash Sepolia', 'Detalle'];
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
    link.setAttribute('download', `Bitacora_Auditoria_Institucional_USM_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <h2 style="margin:0; font-size:14pt; color:#17191c;">UNIVERSIDAD SANTA MARÍA — RECTORADO Y SECRETARÍA GENERAL</h2>
            <p style="margin:3px 0 0 0; font-size:9pt; color:#5d2a1a; font-weight:bold;">BITÁCORA DE AUDITORÍA INTERINSTITUCIONAL (USM · SAREN · MPPEU · MPPRE)</p>
          </div>
          <div style="text-align:right; font-size:8.5pt;">
            <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-VE')}<br/>
            <strong>Auditor:</strong> ${esc(auditorName)} (${esc(auditorCargo)})
          </div>
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:8pt;">
          <thead>
            <tr style="background:#f1f5f9; border-bottom:2px solid #17191c;">
              <th style="border:1px solid #cbd5e1; padding:5px; text-align:left;">Estación / Ente</th>
              <th style="border:1px solid #cbd5e1; padding:5px; text-align:left;">Acción Oficial</th>
              <th style="border:1px solid #cbd5e1; padding:5px; text-align:left;">Graduando / Cédula</th>
              <th style="border:1px solid #cbd5e1; padding:5px; text-align:left;">Operador Firmante</th>
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
      filename: `Acta_Bitacora_Auditoria_USM_${new Date().toISOString().slice(0, 10)}.pdf`,
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
      setNewPlanilla({ nombre: '', url: '', categoria: 'Trámite Académico' });
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
      setNewGuia({ ente: 'saren', location: '', warning: '' });
      fetchDynamicData();
      setFeedbackMsg('Guía logística actualizada correctamente.');
      setTimeout(() => setFeedbackMsg(''), 3500);
    } catch (_) {
      setError('Error al guardar guía logística.');
    }
  };

  const totalCount = records.length;
  const usmEndorsedCount = records.filter(isUsmEndorsed).length;
  const rejectedCount = records.filter(isRejectedRec).length;
  const pendingUsmCount = Math.max(0, totalCount - usmEndorsedCount - rejectedCount);

  return (
    <div className="view-container" style={{ maxWidth: '1340px', margin: '0 auto' }}>
      {activeCertHash && (
        <DigitalCertificate docHash={activeCertHash} onClose={() => setActiveCertHash(null)} />
      )}

      {/* Cabecera Institucional Rectorado USM */}
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
              Estación 1 · Secretaría General y Control de Estudios USM
            </span>
            <h2 style={{ margin: '0.15rem 0', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.45rem', color: 'var(--color-ink-black)' }}>
              Centro de Refrendo Rectoral y Auditoría Institucional
            </h2>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-slate-gray)' }}>
              Verifica actas de grado (Libro / Tomo / Folio), otorga el sello rectoral <code>VERIFICADO_USM</code> y audita la trazabilidad de las 4 estaciones.
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
              <Layers size={14} /> Abrir Bandeja Interministerial (4 Estaciones)
            </button>
          )}
        </div>
      </div>

      {/* Tarjetas de Métricas Rectorales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.35rem' }}>
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-cards)', padding: '1rem 1.25rem' }}>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Expedientes Recibidos</span>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: 'var(--color-ink-black)', marginTop: '0.2rem' }}>{totalCount}</div>
        </div>
        <div style={{ background: 'var(--color-blush-peach)', border: '1px solid rgba(93, 42, 26, 0.2)', borderRadius: 'var(--radius-cards)', padding: '1rem 1.25rem', color: 'var(--color-sienna-brown)' }}>
          <span style={{ fontSize: '0.76rem', fontWeight: 700 }}>Pendientes de Refrendo USM</span>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 600, marginTop: '0.2rem' }}>{pendingUsmCount}</div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-cards)', padding: '1rem 1.25rem' }}>
          <span style={{ fontSize: '0.76rem', color: '#047857', fontWeight: 700 }}>Refrendados (VERIFICADO_USM)</span>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: '#047857', marginTop: '0.2rem' }}>{usmEndorsedCount}</div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-cards)', padding: '1rem 1.25rem' }}>
          <span style={{ fontSize: '0.76rem', color: '#b91c1c', fontWeight: 600 }}>Observados / Rechazados</span>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: '#b91c1c', marginTop: '0.2rem' }}>{rejectedCount}</div>
        </div>
      </div>

      {/* Pestañas de Navegación Admin USM */}
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
          { id: 'expedientes', label: `1. Bandeja Refrendo Rectoral USM (${records.length})`, icon: <ShieldCheck size={15} /> },
          { id: 'bitacora', label: `2. Bitácora de Auditoría CSV/PDF (${auditTrailEntries.length})`, icon: <Activity size={15} /> },
          { id: 'checklist', label: '3. Checklist SAREN', icon: <CheckSquare size={15} /> },
          { id: 'planillas', label: '4. Planillas Universitarias', icon: <FileText size={15} /> },
          { id: 'guias', label: '5. Guías Logísticas', icon: <MapIcon size={15} /> },
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

      {/* ─── TAB 1: BANDEJA DE REFRENDO RECTORAL USM (ESTACIÓN 1) ─── */}
      {activeTab === 'expedientes' && (
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-cards)', padding: '1.5rem', boxShadow: 'var(--shadow-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <div style={{ flex: '1 1 260px', display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--color-fog-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-inputs)', padding: '0.55rem 0.9rem' }}>
              <Search size={16} color="var(--color-slate-gray)" />
              <input
                type="text"
                placeholder="Buscar graduando por nombre, cédula, código GTU o hash SHA-256..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, fontSize: '0.86rem', color: 'var(--color-ink-black)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: `Todos (${totalCount})` },
                { id: 'PENDING_USM', label: `Pendientes Refrendo (${pendingUsmCount})` },
                { id: 'VERIFICADO_USM', label: `Refrendados USM (${usmEndorsedCount})` },
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
            <p style={{ color: 'var(--color-slate-gray)', textAlign: 'center', padding: '2rem' }}>Sincronizando expedientes estudiantiles...</p>
          ) : filteredRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-slate-gray)' }}>
              No hay expedientes que coincidan con el filtro seleccionado.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {filteredRecords.map((rec) => {
                const endorsed = isUsmEndorsed(rec);
                const rejected = isRejectedRec(rec);
                const forensic = rec.forensicAudit || { dpiEstimated: 340, contrastScore: 94, forensicScore: 96 };
                return (
                  <div
                    key={rec.hash}
                    style={{
                      border: '1px solid var(--border)',
                      borderLeft: rejected ? '4px solid #dc2626' : endorsed ? '4px solid #059669' : '4px solid #d97706',
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
                          {rec.ownerName || rec.owner_name || 'Graduando USM'}
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
                          background: rejected ? '#fef2f2' : endorsed ? '#ecfdf5' : '#fffbeb',
                          color: rejected ? '#b91c1c' : endorsed ? '#047857' : '#b45309',
                          border: '1px solid currentColor'
                        }}>
                          {rejected ? rec.status : endorsed ? `✓ VERIFICADO_USM (${rec.status})` : '⏳ PENDIENTE REFRENDO USM'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                        <strong>Título:</strong> {rec.documentType || rec.document_type || 'Título Universitario USM'} ·{' '}
                        <strong>Registro USM:</strong> Libro {rec.libro || 'Grados 2026'}, Tomo {rec.tomo || 'XVIII'}, Folio {rec.folio || '142'}
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
                        <Eye size={14} /> Inspeccionar Pergamino / Folio
                      </button>

                      <button
                        type="button"
                        disabled={actionLoadingHash === rec.hash}
                        onClick={() => handleEndorseUSM(rec)}
                        className="send-btn"
                        style={{
                          padding: '0.48rem 0.95rem',
                          fontSize: '0.78rem',
                          background: endorsed ? '#059669' : 'var(--color-ink-black)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <ShieldCheck size={14} />
                        {actionLoadingHash === rec.hash ? 'Firmando...' : endorsed ? 'Refrendado USM ✓' : 'Refrendar (VERIFICADO_USM)'}
                      </button>

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

      {/* ─── TAB 2: BITÁCORA DE AUDITORÍA INSTITUCIONAL (INNOVACIÓN DE TESIS MÓDULO 10) ─── */}
      {activeTab === 'bitacora' && (
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-cards)', padding: '1.6rem', boxShadow: 'var(--shadow-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-sienna-brown)', background: 'var(--color-blush-peach)', padding: '0.18rem 0.65rem', borderRadius: 'var(--radius-pill)', marginBottom: '0.35rem' }}>
                <Sparkles size={12} /> Trazabilidad Criptográfica 4 Estaciones
              </span>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.3rem', color: 'var(--color-ink-black)' }}>
                Bitácora de Auditoría Institucional Inmutable (Audit Trail)
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.83rem', color: 'var(--color-slate-gray)' }}>
                Registro cronológico consolidado de firmas rectorales USM, conciliaciones SAREN, certificaciones GTU (MPPEU) y apostillas MPPRE.
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
                placeholder="Filtrar eventos por graduando, cédula, funcionario, código o hash..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, fontSize: '0.84rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {['TODOS', 'USM', 'SAREN', 'MPPEU', 'MPPRE', 'RECHAZOS'].map(ente => (
                <button
                  key={ente}
                  type="button"
                  onClick={() => setAuditFilterEnte(ente)}
                  style={{
                    padding: '0.38rem 0.75rem',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: auditFilterEnte === ente ? '1px solid var(--color-ink-black)' : '1px solid var(--border)',
                    background: auditFilterEnte === ente ? 'var(--color-ink-black)' : '#ffffff',
                    color: auditFilterEnte === ente ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  {ente}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '720px' }}>
              <thead>
                <tr style={{ background: 'var(--color-fog-white)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '0.7rem 0.85rem' }}>Estación / Ente</th>
                  <th style={{ padding: '0.7rem 0.85rem' }}>Resolución / Acción</th>
                  <th style={{ padding: '0.7rem 0.85rem' }}>Titular / Cédula</th>
                  <th style={{ padding: '0.7rem 0.85rem' }}>Operador Firmante</th>
                  <th style={{ padding: '0.7rem 0.85rem' }}>Huella SHA-256 / Detalle</th>
                </tr>
              </thead>
              <tbody>
                {auditTrailEntries.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? '#ffffff' : 'rgba(248, 250, 252, 0.5)' }}>
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <span style={{ display: 'inline-block', padding: '0.12rem 0.55rem', borderRadius: 'var(--radius-pill)', background: 'var(--color-blush-peach)', color: 'var(--color-sienna-brown)', fontWeight: 700, fontSize: '0.72rem' }}>
                        {item.ente}
                      </span>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{item.estacion}</div>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: item.ente === 'RECHAZOS' ? '#b91c1c' : 'var(--color-ink-black)' }}>
                      {item.accion}
                      <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{item.codigo}</div>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <strong>{item.titular}</strong>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{item.cedula}</div>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', fontSize: '0.77rem' }}>{item.operador}</td>
                    <td style={{ padding: '0.65rem 0.85rem', fontSize: '0.75rem' }}>
                      <code style={{ fontFamily: 'monospace' }}>{(item.hash || '').slice(0, 16)}...</code>
                      <div style={{ color: 'var(--text-secondary)', marginTop: '0.12rem' }}>{item.detalle}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: CHECKLIST SAREN ─── */}
      {activeTab === 'checklist' && (
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-cards)', padding: '1.75rem', boxShadow: 'var(--shadow-subtle)' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.25rem' }}>Agregar Requisito SAREN / Pre-Validación</h3>
          <form onSubmit={handleAddChecklist} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <input
              type="text" required placeholder="Título del Requisito"
              style={{ flex: 1, minWidth: '200px', padding: '0.65rem 1rem', background: 'var(--color-fog-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-inputs)', fontSize: '0.86rem' }}
              value={newChecklist.title} onChange={e => setNewChecklist({ ...newChecklist, title: e.target.value })}
            />
            <input
              type="text" required placeholder="Descripción o pista técnica"
              style={{ flex: 2, minWidth: '250px', padding: '0.65rem 1rem', background: 'var(--color-fog-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-inputs)', fontSize: '0.86rem' }}
              value={newChecklist.description} onChange={e => setNewChecklist({ ...newChecklist, description: e.target.value })}
            />
            <button type="submit" className="send-btn" style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={16} /> Agregar
            </button>
          </form>

          {loading ? <p>Cargando requisitos...</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {checklist.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-fog-white)', padding: '0.9rem 1.15rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.2rem 0', fontWeight: 600, fontSize: '0.92rem' }}>{item.title || item.label}</h4>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-slate-gray)' }}>{item.description || item.pista}</p>
                  </div>
                  <button onClick={() => handleDeleteChecklist(item.id)} style={{ background: '#ffffff', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#b91c1c', padding: '0.42rem', borderRadius: '50%', cursor: 'pointer' }} title="Eliminar requisito">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: PLANILLAS UNIVERSITARIAS ─── */}
      {activeTab === 'planillas' && (
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-cards)', padding: '1.75rem', boxShadow: 'var(--shadow-subtle)' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.25rem' }}>Agregar Nueva Planilla Institucional</h3>
          <form onSubmit={handleAddPlanilla} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <input
              type="text" required placeholder="Nombre de la Planilla"
              style={{ flex: 1, minWidth: '200px', padding: '0.65rem 1rem', background: 'var(--color-fog-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-inputs)', fontSize: '0.86rem' }}
              value={newPlanilla.nombre} onChange={e => setNewPlanilla({ ...newPlanilla, nombre: e.target.value })}
            />
            <input
              type="text" required placeholder="URL o referencia (# para formato autogenerado)"
              style={{ flex: 2, minWidth: '240px', padding: '0.65rem 1rem', background: 'var(--color-fog-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-inputs)', fontSize: '0.86rem' }}
              value={newPlanilla.url} onChange={e => setNewPlanilla({ ...newPlanilla, url: e.target.value })}
            />
            <button type="submit" className="send-btn" style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={16} /> Agregar Planilla
            </button>
          </form>

          {loading ? <p>Cargando planillas...</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {planillas.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-fog-white)', padding: '0.9rem 1.15rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.2rem 0', fontWeight: 600, fontSize: '0.92rem' }}>{item.nombre}</h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-slate-gray)' }}>{item.categoria || 'Oficial'} · {item.url}</span>
                  </div>
                  <button onClick={() => handleDeletePlanilla(item.id)} style={{ background: '#ffffff', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#b91c1c', padding: '0.42rem', borderRadius: '50%', cursor: 'pointer' }} title="Eliminar planilla">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 5: GUÍAS LOGÍSTICAS ─── */}
      {activeTab === 'guias' && (
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-cards)', padding: '1.75rem', boxShadow: 'var(--shadow-subtle)' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.25rem' }}>Actualizar / Agregar Guía Logística</h3>
          <form onSubmit={handleAddGuia} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <select
              value={newGuia.ente}
              onChange={(e) => setNewGuia({ ...newGuia, ente: e.target.value })}
              style={{ padding: '0.65rem 1rem', background: 'var(--color-fog-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-inputs)', fontSize: '0.86rem' }}
            >
              <option value="saren">SAREN (Registro Principal)</option>
              <option value="mppre">MPPRE (Cancillería)</option>
              <option value="mppeu">MPPEU (Taquilla GTU)</option>
            </select>
            <input
              type="text" required placeholder="Ubicación / Sede Oficial"
              style={{ flex: 1, minWidth: '220px', padding: '0.65rem 1rem', background: 'var(--color-fog-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-inputs)', fontSize: '0.86rem' }}
              value={newGuia.location} onChange={e => setNewGuia({ ...newGuia, location: e.target.value })}
            />
            <input
              type="text" required placeholder="Advertencia o requisito obligatorio"
              style={{ flex: 1, minWidth: '220px', padding: '0.65rem 1rem', background: 'var(--color-fog-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-inputs)', fontSize: '0.86rem' }}
              value={newGuia.warning} onChange={e => setNewGuia({ ...newGuia, warning: e.target.value })}
            />
            <button type="submit" className="send-btn" style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={16} /> Guardar Guía
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {guias.map((item, idx) => (
              <div key={item.id || idx} style={{ background: 'var(--color-fog-white)', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 700, fontSize: '0.94rem', textTransform: 'uppercase' }}>{item.ente}</h4>
                <p style={{ margin: '0 0 0.2rem 0', fontSize: '0.84rem', color: 'var(--color-slate-gray)' }}><strong>Ubicación:</strong> {item.location}</p>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-sienna-brown)' }}><strong>Advertencia:</strong> {item.warning}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── MODAL DE INSPECCIÓN Y REFRENDO RECTORAL USM ─── */}
      {inspectRecord && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={(e) => { if (e.target === e.currentTarget) setInspectRecord(null); }}
        >
          <div style={{ background: '#ffffff', borderRadius: '18px', maxWidth: '880px', width: '100%', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', boxShadow: 'var(--shadow-hover)' }}>
            <div style={{ padding: '1.1rem 1.5rem', background: 'var(--color-fog-white)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-sienna-brown)', textTransform: 'uppercase' }}>
                  Inspección Rectoral USM · Estación 1
                </span>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 400 }}>
                  {inspectRecord.ownerName || inspectRecord.owner_name} ({inspectRecord.cedula})
                </h3>
              </div>
              <button onClick={() => setInspectRecord(null)} style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '1.4rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', padding: '0.9rem 1rem', background: 'var(--color-fog-white)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Libro de Grado USM</label>
                  <input type="text" value={inspectRegistry.libro} onChange={(e) => setInspectRegistry(p => ({ ...p, libro: e.target.value }))} style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.84rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Tomo</label>
                  <input type="text" value={inspectRegistry.tomo} onChange={(e) => setInspectRegistry(p => ({ ...p, tomo: e.target.value }))} style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.84rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Folio</label>
                  <input type="text" value={inspectRegistry.folio} onChange={(e) => setInspectRegistry(p => ({ ...p, folio: e.target.value }))} style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.84rem' }} />
                </div>
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem', background: '#0f172a', color: '#f8fafc', textAlign: 'center', minHeight: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {inspectDocUrl ? (
                  inspectDocUrl.startsWith('data:application/pdf') || inspectDocUrl.toLowerCase().includes('.pdf') ? (
                    <iframe src={inspectDocUrl} title="Documento PDF" style={{ width: '100%', height: '340px', border: 'none', borderRadius: '8px', background: '#ffffff' }} />
                  ) : (
                    <img src={inspectDocUrl} alt="Pergamino del graduando" style={{ maxHeight: '340px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }} />
                  )
                ) : (
                  <div style={{ padding: '1.5rem' }}>
                    <FileText size={36} color="#94a3b8" style={{ margin: '0 auto 0.5rem auto' }} />
                    <p style={{ margin: 0, fontSize: '0.86rem', color: '#cbd5e1' }}>
                      Expediente registrado con Hash SHA-256: <code>{inspectRecord.hash}</code>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '1rem 1.5rem', background: 'var(--color-fog-white)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setActiveCertHash(inspectRecord.hash)}
                className="btn-ghost"
                style={{ padding: '0.55rem 1rem', fontSize: '0.82rem' }}
              >
                Ver Certificado Digital
              </button>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => { setRejectRecord(inspectRecord); setInspectRecord(null); }}
                  style={{ padding: '0.55rem 1rem', fontSize: '0.82rem', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(220,38,38,0.4)', background: '#ffffff', color: '#b91c1c', fontWeight: 600, cursor: 'pointer' }}
                >
                  Rechazar con Observación
                </button>
                <button
                  type="button"
                  onClick={() => handleEndorseUSM(inspectRecord, inspectRegistry)}
                  className="send-btn"
                  style={{ padding: '0.55rem 1.25rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <ShieldCheck size={15} /> Confirmar Refrendo Rectoral (VERIFICADO_USM)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL DE RECHAZO RECTORAL USM ─── */}
      {rejectRecord && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={(e) => { if (e.target === e.currentTarget) setRejectRecord(null); }}
        >
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '500px', width: '100%', padding: '1.5rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow-hover)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: '#b91c1c' }}>
              Rechazar Expediente con Observación Rectoral
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Titular: <strong>{rejectRecord.ownerName || rejectRecord.owner_name}</strong> ({rejectRecord.cedula})
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.86rem', marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button type="button" onClick={() => setRejectRecord(null)} className="btn-ghost" style={{ padding: '0.55rem 1rem', fontSize: '0.82rem' }}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectUSM}
                style={{ padding: '0.55rem 1.15rem', fontSize: '0.82rem', borderRadius: 'var(--radius-pill)', border: 'none', background: '#dc2626', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
              >
                Confirmar Rechazo Rectoral
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
