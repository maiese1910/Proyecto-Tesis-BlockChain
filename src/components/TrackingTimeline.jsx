import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, Clock, ShieldCheck, MapPin, Globe, FileText, X, Send,
  AlertCircle, Building, Sparkles, Printer, ExternalLink, Layers, FolderOpen, ArrowRight
} from 'lucide-react';
import { blockchainAPI } from '../services/api';
import DigitalCertificate from './DigitalCertificate';
import ApostilleCertificate from './ApostilleCertificate';
import { PAISES_CONVENIO_HAYA } from '../data/venezuelaLocations';

const TrackingTimeline = ({ user, onNavigate, onVerifyHash }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState(0);
  const [activeCertHash, setActiveCertHash] = useState(null);
  const [activeApostilleRecord, setActiveApostilleRecord] = useState(null);
  const [requestingApostille, setRequestingApostille] = useState(false);
  const [isApostilleModalOpen, setIsApostilleModalOpen] = useState(false);
  const [selectedApostilleCountry, setSelectedApostilleCountry] = useState('España');
  const [apostilleMotivo, setApostilleMotivo] = useState('Estudios de Posgrado y Homologación Profesional');
  const [apostilleNotes, setApostilleNotes] = useState('');
  const [apostilleError, setApostilleError] = useState('');

  const handleOpenApostilleModal = (record) => {
    if (!record?.hash) return;
    setApostilleError('');
    setSelectedApostilleCountry(record.countryDestiny || record.country_destiny || 'España');
    setIsApostilleModalOpen(true);
  };

  const getStatusWeight = (status) => {
    if (!status) return 0;
    const s = String(status).toUpperCase();
    if (s.includes('APOSTILLADO')) return 60;
    if (s.includes('PENDIENTE_APOSTILLA')) return 50;
    if (s.includes('SAREN') || s.includes('PROTOCOLIZ')) return 45;
    if (s.includes('CERTIFICAD')) return 40;
    if (s.includes('VERIFICAD')) return 30;
    if (s.includes('COTEJO')) return 20;
    if (s.includes('SOLICITUD') || s.includes('EMITID')) return 10;
    if (s.includes('RECHAZ')) return 5;
    return 15;
  };

  const fetchRecords = async () => {
    try {
      let combined = [];

      const userCedClean = (user?.cedula || '').replace(/\D/g, '');
      const userNameNorm = (user?.nombre || user?.ownerName || '').toLowerCase().trim();
      const userEmailNorm = (user?.email || '').toLowerCase().trim();

      const isRecordOfUser = (item) => {
        if (!item) return false;
        const recCed = (item.cedula || item.formData?.cedula || '').replace(/\D/g, '');
        const recAccCed = (item.accountCedula || item.account_cedula || '').replace(/\D/g, '');
        if (userCedClean && (recCed === userCedClean || recAccCed === userCedClean)) {
          return true;
        }
        const recAccName = (item.accountNombre || item.account_nombre || '').toLowerCase().trim();
        if (userNameNorm && recAccName && (recAccName.includes(userNameNorm) || userNameNorm.includes(recAccName))) {
          return true;
        }
        const recAccEmail = (item.accountEmail || item.account_email || '').toLowerCase().trim();
        if (userEmailNorm && recAccEmail && userEmailNorm === recAccEmail) {
          return true;
        }
        const recName = (item.ownerName || item.owner_name || item.nombre || item.formData?.nombre_completo || '').toLowerCase().trim();
        if (userNameNorm && recName && (recName.includes(userNameNorm) || userNameNorm.includes(recName))) {
          return true;
        }
        return false;
      };

      // 1. Consultar registros del backend EXCLUSIVOS para este estudiante
      if (user?.cedula) {
        try {
          const data = await blockchainAPI.getRecordsByCedula(user.cedula);
          if (data && data.success && Array.isArray(data.records)) {
            data.records.forEach(r => {
              if (r && r.hash && isRecordOfUser(r)) combined.push(r);
            });
          }
        } catch (e) {
          console.warn('Backend records offline, checking local records:', e);
        }
      }

      // 2. Cargar registros locales de usm_blockchain_records exclusivos de este estudiante
      try {
        const bcRecordsStr = localStorage.getItem('usm_blockchain_records');
        if (bcRecordsStr) {
          const bcList = JSON.parse(bcRecordsStr);
          if (Array.isArray(bcList)) {
            bcList.forEach(item => {
              if (!item || !item.hash || !isRecordOfUser(item)) return;
              combined.push({
                ...item,
                hash: item.hash,
                ownerName: item.ownerName || item.owner_name || user?.nombre || 'Graduando',
                cedula: item.cedula || user?.cedula || 'V-00.000.000',
                documentType: item.documentType || item.document_type || 'Título Universitario',
                solicitudCode: item.solicitudCode || item.solicitud_code || 'GTU-2026-USM',
                txHash: item.txHash || item.tx_hash || '0xPENDIENTE_COTEJO',
                timestamp: item.createdAt || item.created_at || item.timestamp || new Date().toISOString(),
                status: item.status || 'PENDIENTE_COTEJO_MPPEU',
                usmVerified: Boolean(item.usmVerified || item.usm_verified || true),
                mppeuVerified: Boolean(item.mppeuVerified || item.mppeu_verified),
                sarenVerified: Boolean(item.sarenVerified || item.saren_verified),
                mppreVerified: Boolean(item.mppreVerified || item.mppre_verified),
                apostilleNumber: item.apostilleNumber || item.apostille_number || null,
                tomo: item.tomo || 'XVIII',
                folio: item.folio || '142',
                libro: item.libro || 'Grados 2026',
                documentUrl: item.documentUrl || item.document_url || item.fileUrl || null,
                document_url: item.documentUrl || item.document_url || item.fileUrl || null
              });
            });
          }
        }
      } catch (e) {
        console.warn('Error reading usm_blockchain_records:', e);
      }

      // 3. Cargar registros locales de usm_pub_history exclusivos de este estudiante
      try {
        const localHistoryStr = localStorage.getItem('usm_pub_history');
        if (localHistoryStr) {
          const localList = JSON.parse(localHistoryStr);
          if (Array.isArray(localList)) {
            localList.forEach(item => {
              if (!item || !isRecordOfUser(item)) return;
              const h = item.hash || item.blockchainHash;
              if (!h) return;
              combined.push({
                ...item,
                hash: h,
                ownerName: item.nombre || item.ownerName || item.formData?.nombre_completo || user?.nombre || 'Graduando',
                cedula: item.cedula || item.formData?.cedula || user?.cedula || 'V-00.000.000',
                documentType: item.tramite || item.documentType || 'Título Universitario',
                solicitudCode: item.solicitudCode || item.stablePubCode || 'GTU-2026-USM',
                txHash: item.txHash || '0xPENDIENTE_COTEJO',
                timestamp: item.timestamp || item.fecha || item.created_at || new Date().toISOString(),
                status: item.status || 'SOLICITUD_GTU_EMITIDA',
                usmVerified: Boolean(item.usmVerified || true),
                mppeuVerified: Boolean(item.mppeuVerified),
                sarenVerified: Boolean(item.sarenVerified || item.stablePubCode || item.solicitudCode),
                mppreVerified: Boolean(item.mppreVerified),
                apostilleNumber: item.apostilleNumber || null,
                documentUrl: item.documentUrl || item.document_url || item.fileUrl || null,
                document_url: item.documentUrl || item.document_url || item.fileUrl || null
              });
            });
          }
        }
      } catch (e) {
        console.warn('Error merging local pub history:', e);
      }

      // 4. Desduplicar registros por hash SHA-256 canónico respetando la jerarquía estricta de estatus
      const map = new Map();
      combined.forEach(rec => {
        if (!rec || !rec.hash) return;
        const key = rec.hash.toUpperCase();
        if (!map.has(key)) {
          map.set(key, { ...rec });
        } else {
          const existing = map.get(key);
          const wExisting = getStatusWeight(existing.status);
          const wNew = getStatusWeight(rec.status);
          const chosenStatus = wNew >= wExisting ? rec.status : existing.status;
          const stStr = String(chosenStatus || '').toUpperCase();
          const isMppeu = Boolean(existing.mppeuVerified || rec.mppeuVerified || stStr.includes('CERTIFICADO') || stStr.includes('APOSTILLADO') || stStr.includes('PENDIENTE_APOSTILLA'));
          const isSaren = Boolean(existing.sarenVerified || rec.sarenVerified || stStr.includes('SAREN') || isMppeu);
          const isMppre = Boolean(existing.mppreVerified || rec.mppreVerified || stStr.includes('APOSTILLADO'));
          const rTx = String(rec.txHash || rec.tx_hash || '');
          const exTx = String(existing.txHash || existing.tx_hash || '');
          const chosenTx = (rTx && !rTx.includes('PENDIENTE'))
            ? rTx
            : ((exTx && !exTx.includes('PENDIENTE')) ? exTx : (rTx || exTx || '0xPENDIENTE_COTEJO'));

          map.set(key, {
            ...existing,
            ...rec,
            ownerName: rec.ownerName || existing.ownerName,
            cedula: rec.cedula || existing.cedula,
            documentType: rec.documentType || existing.documentType,
            status: chosenStatus,
            mppeuVerified: isMppeu,
            sarenVerified: isSaren,
            mppreVerified: isMppre,
            apostilleNumber: rec.apostilleNumber || existing.apostilleNumber || null,
            solicitudCode: rec.solicitudCode || existing.solicitudCode,
            txHash: chosenTx,
            timestamp: existing.timestamp || rec.timestamp
          });
        }
      });

      const list = Array.from(map.values());

      // Sincronizar en localStorage sin borrar otros usuarios ni campos extendidos
      try {
        const existingBc = JSON.parse(localStorage.getItem('usm_blockchain_records') || '[]');
        const bcMap = new Map();
        existingBc.forEach(item => {
          if (item && item.hash) bcMap.set(item.hash.toUpperCase(), item);
        });
        list.forEach(r => {
          const k = r.hash.toUpperCase();
          const prev = bcMap.get(k) || {};
          bcMap.set(k, {
            ...prev,
            ...r,
            createdAt: prev.createdAt || r.timestamp
          });
        });
        localStorage.setItem('usm_blockchain_records', JSON.stringify(Array.from(bcMap.values()).slice(0, 80)));
      } catch (_) {}

      // 5. Ordenar por fecha más reciente (descendente)
      list.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

      setRecords(list);

      // Enfocar automáticamente el trámite activo si existe en memoria
      try {
        const activeHash = (localStorage.getItem('usm_active_tramite_hash') || sessionStorage.getItem('usm_active_tramite_hash') || '').trim().toUpperCase();
        if (activeHash) {
          const targetIdx = list.findIndex(r => (r.hash || '').trim().toUpperCase() === activeHash);
          if (targetIdx !== -1) {
            setSelectedRecordIndex(targetIdx);
          }
        }
      } catch (_) {}
    } catch (err) {
      console.error('Error fetching user records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    const interval = setInterval(fetchRecords, 5000);

    let channel;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('usm_records_sync');
        channel.onmessage = (event) => {
          if (event.data?.type === 'RECORD_ADDED' || event.data?.type === 'RECORD_UPDATED') {
            fetchRecords();
          }
        };
      } catch (_) {}
    }

    const handleStorageChange = (e) => {
      if (e.key === 'usm_blockchain_records' || e.key === 'usm_pub_history' || e.key === 'usm_active_tramite_hash') {
        fetchRecords();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const handleCustomUpdate = () => {
      fetchRecords();
    };
    window.addEventListener('usm_records_updated', handleCustomUpdate);

    return () => {
      clearInterval(interval);
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('usm_records_updated', handleCustomUpdate);
    };
  }, [user]);

  const safeIndex = selectedRecordIndex >= records.length ? 0 : selectedRecordIndex;
  const latestRecord = records[safeIndex] || records[0];

  const handleSelectRecord = (idx) => {
    setSelectedRecordIndex(idx);
    const chosen = records[idx];
    if (chosen?.hash) {
      localStorage.setItem('usm_active_tramite_hash', chosen.hash);
      sessionStorage.setItem('usm_active_tramite_hash', chosen.hash);
      window.dispatchEvent(new CustomEvent('usm_active_tramite_changed', { detail: chosen }));
    }
  };

  const handleSubmitApostilleRequest = async () => {
    if (!latestRecord?.hash) return;
    if (!selectedApostilleCountry) {
      setApostilleError('Debes seleccionar un país miembro del Convenio de La Haya.');
      return;
    }
    setRequestingApostille(true);
    setApostilleError('');
    try {
      const fullMotivo = apostilleNotes.trim() ? (apostilleMotivo + ' - ' + apostilleNotes.trim()) : apostilleMotivo;
      const res = await blockchainAPI.requestApostille(latestRecord.hash, {
        country_destiny: selectedApostilleCountry,
        countryDestiny: selectedApostilleCountry,
        motivo_apostille: fullMotivo,
        motivoApostille: fullMotivo
      });
      if (res && (res.success || res.status === 'PENDIENTE_APOSTILLA_MPPRE' || res.message)) {
        const updated = {
          ...latestRecord,
          status: 'PENDIENTE_APOSTILLA_MPPRE',
          country_destiny: selectedApostilleCountry,
          countryDestiny: selectedApostilleCountry,
          motivo_apostille: fullMotivo
        };
        setRecords(prev => prev.map(r => r.hash === latestRecord.hash ? updated : r));
        setIsApostilleModalOpen(false);

        try {
          const bc = JSON.parse(localStorage.getItem('usm_blockchain_records') || '[]');
          const nextBc = bc.map(r => r.hash === latestRecord.hash ? { ...r, ...updated } : r);
          localStorage.setItem('usm_blockchain_records', JSON.stringify(nextBc));

          const pub = JSON.parse(localStorage.getItem('usm_pub_history') || '[]');
          const nextPub = pub.map(r => ((r.hash || r.blockchainHash) === latestRecord.hash) ? { ...r, ...updated, status: 'PENDIENTE_APOSTILLA_MPPRE' } : r);
          localStorage.setItem('usm_pub_history', JSON.stringify(nextPub));

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('usm_records_updated', { detail: updated }));
            window.dispatchEvent(new Event('storage'));
          }

          if (typeof BroadcastChannel !== 'undefined') {
            try {
              const ch = new BroadcastChannel('usm_records_sync');
              ch.postMessage({ type: 'RECORD_UPDATED', record: updated });
              ch.close();
            } catch (_) {}
          }
        } catch (_) {}
      } else {
        setApostilleError(res?.message || 'Error al enviar la solicitud de apostilla');
      }
    } catch (err) {
      setApostilleError('Error al conectar con la Cancillería (MPPRE): ' + (err.message || 'Error de conexión'));
    } finally {
      setRequestingApostille(false);
    }
  };

  // Imprimir Hoja de Ruta / Comprobante de Seguimiento de las 4 Estaciones
  const handlePrintRoadmap = () => {
    if (!latestRecord) return;
    const win = window.open('', '_blank', 'width=850,height=750');
    if (!win) return;
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Hoja de Ruta de Trámite — ${latestRecord.solicitudCode || 'USM'}</title>
        <style>
          body { font-family: 'Georgia', serif; color: #121212; padding: 36px; max-width: 760px; margin: 0 auto; }
          .header { border-bottom: 2px solid #121212; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 20px; font-weight: bold; margin: 0 0 4px 0; }
          .subtitle { font-family: Arial, sans-serif; font-size: 12px; color: #555; margin: 0; }
          .box { background: #f8f8f7; border: 1px solid #d4d4d8; border-radius: 8px; padding: 14px 18px; margin-bottom: 18px; font-family: Arial, sans-serif; font-size: 13px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
          .step { border-left: 3px solid #121212; padding: 8px 0 8px 14px; margin-bottom: 12px; font-family: Arial, sans-serif; }
          .step h4 { margin: 0 0 4px 0; font-size: 14px; }
          .step p { margin: 0; font-size: 12px; color: #444; }
          .hash { font-family: monospace; font-size: 11px; word-break: break-all; background: #eee; padding: 6px 8px; border-radius: 4px; margin-top: 8px; }
          .footer { margin-top: 28px; border-top: 1px solid #ccc; padding-top: 10px; font-family: Arial, sans-serif; font-size: 11px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <p class="title">UNIVERSIDAD SANTA MARÍA</p>
            <p class="subtitle">Hoja de Ruta y Trazabilidad Criptográfica de Trámite Universitario</p>
          </div>
          <div style="text-align:right; font-family:Arial,sans-serif; font-size:12px;">
            <strong>Código: ${latestRecord.solicitudCode || 'GTU-2026-USM'}</strong><br/>
            Fecha: ${new Date().toLocaleDateString('es-VE')}
          </div>
        </div>
        <div class="box">
          <div class="row"><span><strong>Titular:</strong> ${latestRecord.ownerName || user?.nombre || 'Graduando USM'}</span><span><strong>Cédula:</strong> ${latestRecord.cedula || user?.cedula || 'N/A'}</span></div>
          <div class="row"><span><strong>Documento:</strong> ${latestRecord.documentType || 'Título Universitario'}</span><span><strong>Estatus Actual:</strong> ${latestRecord.status || 'EN PROCESO'}</span></div>
          ${(latestRecord.sede_taquilla || latestRecord.sedeTaquilla) ? `<div class="row"><span><strong>Taquilla Asignada:</strong> ${latestRecord.sede_taquilla || latestRecord.sedeTaquilla}</span><span><strong>Ubicación:</strong> ${latestRecord.estado || 'Distrito Capital'}</span></div>` : ''}
          <div class="hash"><strong>Hash SHA-256 Canónico:</strong> ${latestRecord.hash || 'N/A'}<br/><strong>Tx Ethereum Sepolia:</strong> ${latestRecord.txHash || 'Pendiente de Anclaje'}</div>
        </div>
        <h3 style="font-family:Arial,sans-serif; font-size:14px; text-transform:uppercase; letter-spacing:0.05em;">Estaciones de Validación Interinstitucional</h3>
        ${steps.map((s) => `
          <div class="step">
            <h4>${s.title} — [${s.status === 'completed' ? 'COMPLETADO ✓' : s.status === 'current' ? 'EN CURSO ⏳' : 'PENDIENTE'}]</h4>
            <p>${s.desc}</p>
          </div>
        `).join('')}
        <div class="footer">
          Documento de control emitido por la Plataforma Descentralizada de Validación y Apostilla USM — Red Ethereum Sepolia.
        </div>
        <script>window.onload = () => { window.print(); };</script>
      </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  };

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.92rem' }}>
          Consultando estatus de trámites en la red...
        </p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '2.25rem 1.75rem', textAlign: 'center' }}>
        <Clock size={32} color="var(--color-slate-gray)" style={{ margin: '0 auto 0.75rem auto' }} />
        <p style={{ color: 'var(--color-ink-black)', fontWeight: 600, fontSize: '1rem', margin: '0 0 0.35rem 0' }}>
          No tienes trámites registrados aún
        </p>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
          Escanea tu título o notas con el Motor de Visión IA (OCR) o genera tu Planilla Única Bancaria (PUB) para iniciar tu cadena de custodia en Blockchain.
        </p>
        {onNavigate && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onNavigate('ocr')}
              className="send-btn"
              style={{ padding: '0.6rem 1.1rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Escanear con Motor OCR <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('pub')}
              className="btn-ghost"
              style={{ padding: '0.6rem 1.1rem', fontSize: '0.82rem' }}
            >
              Emitir Planilla PUB
            </button>
          </div>
        )}
      </div>
    );
  }

  const stUpper = String(latestRecord?.status || '').toUpperCase();
  const isPendingMppre = stUpper === 'PENDIENTE_APOSTILLA_MPPRE';
  const isMppreDone = Boolean(latestRecord?.mppreVerified || stUpper.includes('APOSTILLADO_MPPRE'));
  const isMppeuDone = Boolean(
    latestRecord?.mppeuVerified ||
    stUpper.includes('CERTIFICADO_MPPEU') ||
    isPendingMppre ||
    isMppreDone ||
    stUpper.includes('VERIFICADO')
  );
  const pubCodeDisplay = latestRecord?.pubCode || latestRecord?.stablePubCode || (String(latestRecord?.solicitudCode || '').startsWith('PUB-') ? latestRecord.solicitudCode : '');
  const paymentRefDisplay = latestRecord?.paymentReference || latestRecord?.formData?.referencia_bancaria || '';
  const isSarenDone = Boolean(
    latestRecord?.sarenVerified ||
    pubCodeDisplay ||
    paymentRefDisplay ||
    stUpper.includes('SAREN') ||
    isMppeuDone
  );

  const hashDisplay = latestRecord?.hash ? latestRecord.hash.substring(0, 12) : 'N/A';
  const docTypeDisplay = latestRecord?.documentType || 'Título Universitario USM';
  const solicitudDisplay = latestRecord?.solicitudCode || 'GTU-2026-USM-8492';
  const apostilleDisplay = latestRecord?.apostilleNumber || 'APO-VE-2026-PENDIENTE';

  const progressPct = isMppreDone ? 100 : isPendingMppre ? 85 : isMppeuDone ? 75 : isSarenDone ? 50 : 25;

  const steps = [
    {
      title: 'Estación 1: Emisión y Pre-Validación Rectorado USM',
      desc: `Expediente digitalizado (${solicitudDisplay}) con Folio ${latestRecord?.folio || '142'} / Tomo ${latestRecord?.tomo || 'XVIII'} y Hash SHA-256 preliminar.`,
      status: 'completed',
      icon: <CheckCircle size={17} />
    },
    {
      title: 'Estación 2: Liquidación PUB y Registro Principal (SAREN)',
      desc: isSarenDone
        ? `Planilla Única Bancaria (${pubCodeDisplay || solicitudDisplay}) liquidada y conciliada${paymentRefDisplay ? ` · Ref. SENIAT #${paymentRefDisplay}` : ''}.`
        : 'Pendiente de liquidación y conciliación de Planilla Única Bancaria (PUB) para protocolo estatal.',
      status: isSarenDone ? 'completed' : 'current',
      icon: isSarenDone ? <CheckCircle size={17} /> : <FileText size={17} />
    },
    {
      title: 'Estación 3: Cotejo Ministerial GTU y Anclaje Blockchain (MPPEU)',
      desc: isMppeuDone
        ? `Certificado con sello digital GTU y firma en Ethereum Sepolia (Tx: ${latestRecord?.txHash && !String(latestRecord.txHash).includes('PENDIENTE') ? latestRecord.txHash.substring(0, 12) + '...' : 'Sepolia On-Chain'}).`
        : 'Presenta tu título original (pergamino) en la taquilla asignada para el cotejo físico y firma criptográfica.',
      status: isMppeuDone ? 'completed' : 'current',
      icon: isMppeuDone ? <CheckCircle size={17} /> : <Clock size={17} />
    },
    {
      title: 'Estación 4: Apostilla Electrónica de La Haya (MPPRE)',
      desc: isMppreDone
        ? `Apostilla de La Haya N° ${apostilleDisplay} emitida y validada on-chain para ${latestRecord?.countryDestiny || latestRecord?.country_destiny || 'país destino'}.`
        : isPendingMppre
        ? `Solicitud radicada ante Cancillería para ${latestRecord?.countryDestiny || latestRecord?.country_destiny || 'exterior'}. En revisión diplomática por el MPPRE.`
        : isMppeuDone
        ? "Trámite 100% digital en Cancillería habilitado. Haz clic en 'Solicitar Apostilla MPPRE' para radicar tu expediente."
        : 'Se habilitará automáticamente tras la certificación del MPPEU.',
      status: isMppreDone ? 'completed' : (isPendingMppre || isMppeuDone) ? 'current' : 'upcoming',
      icon: isMppreDone ? <CheckCircle size={17} /> : isPendingMppre ? <Clock size={17} /> : <Globe size={17} />
    }
  ];

  return (
    <div className="glass-panel">
      {activeCertHash && (
        <DigitalCertificate docHash={activeCertHash} onClose={() => setActiveCertHash(null)} />
      )}
      {activeApostilleRecord && (
        <ApostilleCertificate record={activeApostilleRecord} onClose={() => setActiveApostilleRecord(null)} />
      )}

      {/* Cabecera con Selector de Trámite y Botón de Hoja de Ruta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h3 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1.25rem',
          fontWeight: 400,
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          color: 'var(--color-ink-black)'
        }}>
          <Clock size={18} color="var(--color-ink-black)" /> Tracking de Trámite (4 Estaciones)
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handlePrintRoadmap}
            className="btn-ghost"
            title="Imprimir o guardar en PDF la Hoja de Ruta del Trámite"
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.76rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Printer size={13} /> Hoja de Ruta PDF
          </button>

          {onVerifyHash && latestRecord?.hash && (
            <button
              type="button"
              onClick={() => onVerifyHash(latestRecord.hash)}
              className="btn-ghost"
              title="Auditar este Hash directamente en el Verificador Blockchain"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.76rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: 'var(--color-sienna-brown)',
                borderColor: 'rgba(93, 42, 26, 0.25)'
              }}
            >
              <Layers size={13} /> Auditar Hash
            </button>
          )}
        </div>
      </div>

      {/* Selector Desplegable + Píldoras de Trámites */}
      <div style={{
        marginBottom: '1rem',
        padding: '0.75rem 1rem',
        backgroundColor: 'var(--color-fog-white)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-inputs)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FolderOpen size={14} color="var(--color-sienna-brown)" />
            Selector de Expediente Activo ({records.length} {records.length === 1 ? 'documento' : 'documentos'}):
          </label>
          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--color-sienna-brown)' }}>
            Avance Total: {progressPct}%
          </span>
        </div>

        <select
          value={safeIndex}
          onChange={(e) => handleSelectRecord(Number(e.target.value))}
          style={{
            width: '100%',
            padding: '0.6rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            backgroundColor: '#ffffff',
            color: 'var(--color-ink-black)',
            fontSize: '0.84rem',
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          {records.map((r, idx) => {
            const st = String(r.status || '').toUpperCase();
            const labelStatus = st.includes('APOSTILLADO')
              ? '✓ Apostillado MPPRE (100%)'
              : st.includes('PENDIENTE_APOSTILLA')
              ? '⏳ En Cancillería MPPRE (85%)'
              : (st.includes('CERTIFICADO') || r.mppeuVerified)
              ? '✓ Certificado MPPEU (75%)'
              : '⏳ En Cotejo Ministerial (50%)';
            return (
              <option key={r.hash || idx} value={idx}>
                {idx + 1}. {r.solicitudCode || 'GTU-2026'} — {r.documentType || 'Título Universitario'} ({labelStatus})
              </option>
            );
          })}
        </select>

        {/* Barra de progreso porcentual */}
        <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border)', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{
            width: `${progressPct}%`,
            height: '100%',
            backgroundColor: progressPct === 100 ? '#10b981' : 'var(--color-ink-black)',
            transition: 'width 0.4s ease'
          }} />
        </div>
      </div>

      {/* Banner de Trámite Seleccionado */}
      <motion.div
        style={{
          marginBottom: '1.35rem',
          padding: '1.1rem 1.25rem',
          backgroundColor: 'var(--color-fog-white)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-inputs)',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-ink-black)', margin: 0 }}>
                {docTypeDisplay}
              </p>
              <span style={{ fontSize: '0.73rem', background: 'var(--color-mist-gray)', color: 'var(--color-ink-black)', border: '1px solid var(--border)', padding: '0.15rem 0.55rem', borderRadius: 'var(--radius-pill)', fontWeight: 600 }}>
                {solicitudDisplay}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
              Titular: <strong>{latestRecord?.ownerName || user?.nombre || 'Graduando'}</strong> ({latestRecord?.cedula || user?.cedula || 'N/A'}) · Hash: <code>{hashDisplay}...</code>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {isMppeuDone && (
              <button
                onClick={() => setActiveCertHash(latestRecord.hash)}
                className="btn-ghost"
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.78rem'
                }}
              >
                Certificado GTU
              </button>
            )}

            {isMppeuDone && !isPendingMppre && !isMppreDone && (
              <button
                disabled={requestingApostille}
                onClick={() => handleOpenApostilleModal(latestRecord)}
                style={{
                  background: 'var(--color-ink-black)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Globe size={13} /> Solicitar Apostilla MPPRE (100% Digital)
              </button>
            )}

            {isPendingMppre && (
              <span
                style={{
                  background: 'var(--color-blush-peach)',
                  color: 'var(--color-sienna-brown)',
                  border: '1px solid rgba(93, 42, 26, 0.25)',
                  padding: '0.35rem 0.8rem',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Clock size={13} className="animate-spin" /> En Revisión por MPPRE ({latestRecord.countryDestiny || latestRecord.country_destiny || 'Exterior'})
              </span>
            )}

            {isMppreDone && (
              <button
                onClick={() => setActiveApostilleRecord(latestRecord)}
                style={{
                  background: 'var(--color-blush-peach)',
                  color: 'var(--color-sienna-brown)',
                  border: '1px solid rgba(93, 42, 26, 0.25)',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Globe size={13} /> Ver Apostilla de La Haya
              </button>
            )}

            <span style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.25rem 0.75rem',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: isMppreDone || isPendingMppre || isMppeuDone ? 'var(--color-blush-peach)' : '#ffffff',
              color: isMppreDone || isPendingMppre || isMppeuDone ? 'var(--color-sienna-brown)' : 'var(--color-ink-black)',
              border: isMppreDone || isPendingMppre || isMppeuDone ? '1px solid rgba(93, 42, 26, 0.2)' : '1px solid var(--border)'
            }}>
              {isMppreDone ? 'Apostillado 100%' : isPendingMppre ? 'En Revisión MPPRE' : isMppeuDone ? 'Certificado MPPEU' : 'En Cotejo MPPEU'}
            </span>
          </div>
        </div>

        {/* Tarjeta de Taquilla de Consignación Presencial (GTU) */}
        {(latestRecord?.sede_taquilla || latestRecord?.sedeTaquilla) && (
          <div style={{
            marginTop: '0.9rem',
            padding: '0.75rem 0.95rem',
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid rgba(93, 42, 26, 0.15)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem'
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: 'var(--color-blush-peach)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-sienna-brown)',
              flexShrink: 0
            }}>
              <MapPin size={16} />
            </div>
            <div style={{ flex: 1, fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.2rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-ink-black)' }}>
                  🏛️ Sede Asignada para Cotejo Presencial del Título Físico (GTU):
                </span>
                <span style={{ fontSize: '0.72rem', background: 'var(--color-mist-gray)', padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-pill)', color: 'var(--color-ink-black)', fontWeight: 600 }}>
                  {latestRecord.estado} · {latestRecord.municipio}
                </span>
              </div>
              <p style={{ margin: '0 0 0.15rem 0', color: 'var(--color-sienna-brown)', fontWeight: 600 }}>
                {latestRecord.sede_taquilla || latestRecord.sedeTaquilla}
              </p>
              {(latestRecord.sede_direccion || latestRecord.sedeDireccion) && (
                <p style={{ margin: '0 0 0.15rem 0', color: 'var(--text-secondary)', fontSize: '0.76rem' }}>
                  📍 {latestRecord.sede_direccion || latestRecord.sedeDireccion}
                </p>
              )}
              {(latestRecord.sede_horario || latestRecord.sedeHorario) && (
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.74rem' }}>
                  🕒 Horario de Taquilla: {latestRecord.sede_horario || latestRecord.sedeHorario}
                </p>
              )}
            </div>
          </div>
        )}
      </motion.div>

      <div className="timeline" style={{ marginLeft: '0.75rem', marginTop: '1.1rem', borderLeft: '2px solid var(--border)' }}>
        {steps.map((step, idx) => {
          let iconColor = 'var(--color-slate-gray)';
          let iconBg = 'var(--color-mist-gray)';
          let iconBorder = 'var(--border)';
          let isCurrent = step.status === 'current';
          let isDone = step.status === 'completed';

          if (isDone) {
            iconColor = '#ffffff';
            iconBg = 'var(--color-ink-black)';
            iconBorder = 'var(--color-ink-black)';
          } else if (isCurrent) {
            iconColor = 'var(--color-sienna-brown)';
            iconBg = 'var(--color-blush-peach)';
            iconBorder = 'rgba(93, 42, 26, 0.3)';
          }

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.06 }}
              whileHover={{ x: 4 }}
              style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '1.15rem',
                position: 'relative',
                cursor: 'default',
                padding: '0.3rem 0.5rem',
                borderRadius: '8px',
                transition: 'background-color 0.2s ease'
              }}
            >
              {idx !== steps.length - 1 && (
                <div style={{
                  position: 'absolute',
                  left: '21px',
                  top: '36px',
                  bottom: '-14px',
                  width: '2px',
                  background: isDone ? 'var(--color-ink-black)' : 'var(--border)',
                  zIndex: 0
                }} />
              )}

              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: iconBg,
                color: iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
                border: `1px solid ${iconBorder}`,
                boxShadow: isCurrent ? '0 0 0 3px rgba(251, 225, 209, 0.4)' : 'none',
                flexShrink: 0
              }}>
                {step.icon}
              </div>

              <div style={{ paddingTop: '0.15rem' }}>
                <h4 style={{
                  margin: 0,
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  color: step.status === 'upcoming' ? 'var(--color-slate-gray)' : 'var(--color-ink-black)'
                }}>
                  {step.title}
                </h4>
                <p style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  marginTop: '0.2rem',
                  margin: 0,
                  lineHeight: 1.4
                }}>
                  {step.desc}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modal para Solicitar Apostilla ante MPPRE */}
      <AnimatePresence>
        {isApostilleModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(23, 25, 28, 0.65)',
              backdropFilter: 'blur(6px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              overflowY: 'auto'
            }}
            onClick={(e) => { if (e.target === e.currentTarget && !requestingApostille) setIsApostilleModalOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '560px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{
                padding: '1.25rem 1.5rem',
                background: 'linear-gradient(135deg, #fffbf6 0%, #fdf3e7 100%)',
                borderBottom: '1px solid rgba(93, 42, 26, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: '10px',
                    background: 'var(--color-blush-peach)',
                    color: 'var(--color-sienna-brown)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(93, 42, 26, 0.2)'
                  }}>
                    <Globe size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-ink-black)', fontFamily: 'var(--font-serif)' }}>
                      Solicitud de Apostilla de La Haya
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      Ministerio del Poder Popular para Relaciones Exteriores (MPPRE)
                    </p>
                  </div>
                </div>
                <button
                  disabled={requestingApostille}
                  onClick={() => setIsApostilleModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-slate-gray)',
                    cursor: 'pointer',
                    padding: '0.35rem',
                    borderRadius: '6px'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div style={{
                  padding: '0.9rem 1.1rem',
                  background: 'var(--color-fog-white)',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  fontSize: '0.82rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Expediente GTU:</span>
                    <strong style={{ color: 'var(--color-ink-black)' }}>{solicitudDisplay}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Titular:</span>
                    <strong style={{ color: 'var(--color-ink-black)' }}>{latestRecord?.ownerName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Cédula:</span>
                    <span>{latestRecord?.cedula}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#047857', fontWeight: 600, fontSize: '0.76rem', paddingTop: '0.3rem', borderTop: '1px dashed var(--border)' }}>
                    <CheckCircle size={14} /> Sello de Certificación Ministerial MPPEU Acreditado
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.4rem' }}>
                    País de Destino (Convenio de La Haya de 1961) *
                  </label>
                  <select
                    value={selectedApostilleCountry}
                    onChange={(e) => setSelectedApostilleCountry(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      outline: 'none',
                      background: '#ffffff',
                      color: 'var(--color-ink-black)'
                    }}
                  >
                    {PAISES_CONVENIO_HAYA.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.4rem' }}>
                    Motivo de la Solicitud
                  </label>
                  <select
                    value={apostilleMotivo}
                    onChange={(e) => setApostilleMotivo(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      fontSize: '0.84rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      outline: 'none',
                      background: '#ffffff',
                      color: 'var(--color-ink-black)'
                    }}
                  >
                    <option value="Estudios de Posgrado y Homologación Profesional">Estudios de Posgrado y Homologación Profesional</option>
                    <option value="Oferta Laboral / Empleo en el Exterior">Oferta Laboral / Empleo en el Exterior</option>
                    <option value="Trámite Migratorio / Residencia Legal">Trámite Migratorio / Residencia Legal</option>
                    <option value="Reagrupación Familiar y Doble Nacionalidad">Reagrupación Familiar y Doble Nacionalidad</option>
                    <option value="Otro Motivo Académico o Laboral">Otro Motivo Académico o Laboral</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-ink-black)', marginBottom: '0.4rem' }}>
                    Observaciones Consulares (Opcional)
                  </label>
                  <input
                    type="text"
                    value={apostilleNotes}
                    onChange={(e) => setApostilleNotes(e.target.value)}
                    placeholder="Ej. Dirigido a la Universidad o Colegio Profesional de destino..."
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      fontSize: '0.82rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      outline: 'none',
                      background: '#ffffff'
                    }}
                  />
                </div>

                <div style={{
                  padding: '0.75rem 0.95rem',
                  background: 'rgba(251, 225, 209, 0.4)',
                  borderRadius: '8px',
                  border: '1px solid rgba(93, 42, 26, 0.2)',
                  fontSize: '0.76rem',
                  color: 'var(--color-sienna-brown)',
                  lineHeight: 1.45
                }}>
                  ℹ️ <strong>Trámite 100% Digital ante el MPPRE:</strong> Tu solicitud será asignada a la bandeja diplomática de la Cancillería. El oficial consular cotejará el sello digital GTU del MPPEU y firmará la Apostilla internacionalmente válida.
                </div>

                {apostilleError && (
                  <div style={{
                    padding: '0.65rem 0.85rem',
                    background: '#fee2e2',
                    borderRadius: '8px',
                    border: '1px solid #f87171',
                    fontSize: '0.8rem',
                    color: '#991b1b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}>
                    <AlertCircle size={15} /> {apostilleError}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--border)',
                background: '#fafafa',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.65rem'
              }}>
                <button
                  type="button"
                  disabled={requestingApostille}
                  onClick={() => setIsApostilleModalOpen(false)}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: '#ffffff',
                    color: 'var(--color-ink-black)',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 500
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={requestingApostille}
                  onClick={handleSubmitApostilleRequest}
                  style={{
                    padding: '0.55rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--color-ink-black)',
                    color: '#ffffff',
                    cursor: requestingApostille ? 'wait' : 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: 'var(--shadow-subtle)'
                  }}
                >
                  {requestingApostille ? (
                    <>Enviando a Cancillería...</>
                  ) : (
                    <><Send size={14} /> Confirmar y Radicar ante MPPRE</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrackingTimeline;
