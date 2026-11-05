import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Clock, ShieldCheck, MapPin, ArrowRight, Globe, FileText, X, Send, AlertCircle, Building, Check, Sparkles } from 'lucide-react';
import { blockchainAPI } from '../services/api';
import DigitalCertificate from './DigitalCertificate';
import ApostilleCertificate from './ApostilleCertificate';
import { PAISES_CONVENIO_HAYA } from '../data/venezuelaLocations';

const DEFAULT_THESIS_RECORDS = [
  {
    hash: "0x7F9A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E9F0A",
    ownerName: "MAURO DANIEL MAIESE FERREIRA",
    cedula: "V-28.315.101",
    documentType: "Título de Ingeniero de Sistemas — USM",
    txHash: "0x4b7891a2bc3456def0123456789abcdef0123456789abcdef0123456789abcd1",
    status: "CERTIFICADO_MPPEU",
    timestamp: "2026-10-24T14:32:00Z",
    solicitudCode: "GTU-2026-USM-8492",
    mppeuVerified: true,
    mppreVerified: false,
    mppeuOfficer: "Lic. Carlos Mendoza (Analista GTU)",
    tomo: "XVIII",
    folio: "245",
    libro: "Grados 2026"
  },
  {
    hash: "0x1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B",
    ownerName: "VALENTINA SOFÍA RODRÍGUEZ SILVA",
    cedula: "V-27.890.432",
    documentType: "Título de Ingeniera Civil — USM",
    txHash: "0x9876543210abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    status: "APOSTILLADO_MPPRE",
    timestamp: "2026-10-20T09:12:00Z",
    solicitudCode: "GTU-2026-USM-5120",
    mppeuVerified: true,
    mppreVerified: true,
    mppeuOfficer: "Lic. Carlos Mendoza (Analista GTU)",
    mppreOfficer: "Dr. Fernando Morales (Cancillería)",
    apostilleNumber: "APO-VE-2026-004812",
    tomo: "XIV",
    folio: "112",
    libro: "Grados 2026"
  },
  {
    hash: "0x5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F",
    ownerName: "ALEJANDRO JOSÉ HERNÁNDEZ PEÑA",
    cedula: "V-29.456.789",
    documentType: "Título de Ingeniero Industrial — USM",
    txHash: "0xPENDIENTE_COTEJO",
    status: "PENDIENTE_COTEJO_MPPEU",
    timestamp: "2026-10-26T16:00:00Z",
    solicitudCode: "GTU-2026-USM-9304",
    mppeuVerified: false,
    mppreVerified: false,
    tomo: "XXI",
    folio: "089",
    libro: "Grados 2026"
  }
];

const TrackingTimeline = ({ user }) => {
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

  const handleSubmitApostilleRequest = async () => {
    if (!latestRecord?.hash) return;
    if (!selectedApostilleCountry) {
      setApostilleError('Debes seleccionar un país miembro del Convenio de La Haya.');
      return;
    }
    setRequestingApostille(true);
    setApostilleError('');
    try {
      const fullMotivo = apostilleNotes.trim() ? (apostilleMotivo + " - " + apostilleNotes.trim()) : apostilleMotivo;
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

        // Sincronizar en localStorage
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
      console.error('Error solicitando apostilla:', err);
      setApostilleError('Error al conectar con la Cancillería (MPPRE): ' + (err.message || 'Error de conexión'));
    } finally {
      setRequestingApostille(false);
    }
  };

  const getStatusWeight = (status) => {
    if (!status) return 0;
    const s = String(status).toUpperCase();
    if (s.includes('APOSTILL')) return 50;
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
          console.warn("Backend records offline, checking local records:", e);
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
                hash: item.hash,
                ownerName: item.ownerName || item.owner_name || user?.nombre || 'Graduando',
                cedula: item.cedula || user?.cedula || 'V-00.000.000',
                documentType: item.documentType || item.document_type || 'Título Universitario',
                solicitudCode: item.solicitudCode || item.solicitud_code || 'GTU-2026-USM',
                txHash: item.txHash || item.tx_hash || '0xPENDIENTE_COTEJO',
                timestamp: item.createdAt || item.created_at || item.timestamp || new Date().toISOString(),
                status: item.status || 'PENDIENTE_COTEJO_MPPEU',
                mppeuVerified: Boolean(item.mppeuVerified || item.mppeu_verified),
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
                hash: h,
                ownerName: item.nombre || item.ownerName || item.formData?.nombre_completo || user?.nombre || 'Graduando',
                cedula: item.cedula || item.formData?.cedula || user?.cedula || 'V-00.000.000',
                documentType: item.tramite || item.documentType || 'Título Universitario',
                solicitudCode: item.solicitudCode || item.stablePubCode || 'GTU-2026-USM',
                txHash: item.txHash || '0xPENDIENTE_COTEJO',
                timestamp: item.timestamp || item.fecha || item.created_at || new Date().toISOString(),
                status: item.status || 'SOLICITUD_GTU_EMITIDA',
                mppeuVerified: Boolean(item.mppeuVerified),
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
          const isMppeu = Boolean(existing.mppeuVerified || rec.mppeuVerified || stStr.includes('CERTIFICADO') || stStr.includes('APOSTILLADO'));
          const isMppre = Boolean(existing.mppreVerified || rec.mppreVerified || stStr.includes('APOSTILLADO'));
          const rTx = String(rec.txHash || '');
          const exTx = String(existing.txHash || '');
          const chosenTx = (rTx && !rTx.includes('PENDIENTE'))
            ? rec.txHash
            : ((exTx && !exTx.includes('PENDIENTE')) ? existing.txHash : (rec.txHash || existing.txHash || '0xPENDIENTE_COTEJO'));

          map.set(key, {
            ...existing,
            ...rec,
            ownerName: rec.ownerName || existing.ownerName,
            cedula: rec.cedula || existing.cedula,
            documentType: rec.documentType || existing.documentType,
            status: chosenStatus,
            mppeuVerified: isMppeu,
            mppreVerified: isMppre,
            apostilleNumber: rec.apostilleNumber || existing.apostilleNumber || null,
            solicitudCode: rec.solicitudCode || existing.solicitudCode,
            txHash: chosenTx,
            timestamp: existing.timestamp || rec.timestamp
          });
        }
      });

      const list = Array.from(map.values());

      // Sincronizar en localStorage para mantener los estatus finalizados persistentes
      try {
        const nextLocalBc = list.map(r => ({
          hash: r.hash,
          ownerName: r.ownerName,
          cedula: r.cedula,
          documentType: r.documentType,
          solicitudCode: r.solicitudCode,
          txHash: r.txHash,
          status: r.status,
          mppeuVerified: r.mppeuVerified,
          mppreVerified: r.mppreVerified,
          apostilleNumber: r.apostilleNumber,
          createdAt: r.timestamp
        }));
        localStorage.setItem('usm_blockchain_records', JSON.stringify(nextLocalBc.slice(0, 50)));

        const nextPubHist = list.map(r => ({
          hash: r.hash,
          solicitudCode: r.solicitudCode,
          nombre: r.ownerName,
          cedula: r.cedula,
          tramite: r.documentType,
          txHash: r.txHash,
          status: r.status,
          mppeuVerified: r.mppeuVerified,
          mppreVerified: r.mppreVerified,
          apostilleNumber: r.apostilleNumber,
          timestamp: r.timestamp
        }));
        localStorage.setItem('usm_pub_history', JSON.stringify(nextPubHist.slice(0, 50)));
      } catch (_) {}

      // 5. Ordenar por fecha más reciente (descendente) para que el trámite recién emitido SIEMPRE aparezca de primero
      list.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

      setRecords(list);

      // Enfocar automáticamente el trámite activo si existe en memoria
      try {
        const activeHash = (localStorage.getItem('usm_active_tramite_hash') || sessionStorage.getItem('usm_active_tramite_hash') || '').trim().toUpperCase();
        if (activeHash) {
          const targetIdx = list.findIndex(r => (r.hash || '').trim().toUpperCase() === activeHash);
          if (targetIdx !== -1) {
            setSelectedRecordIndex(targetIdx);
          } else {
            setSelectedRecordIndex(0);
          }
        }
      } catch (_) {}
    } catch (err) {
      console.error("Error fetching user records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    const interval = setInterval(fetchRecords, 5000);

    // Escuchar eventos en tiempo real entre pestañas (BroadcastChannel)
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

    // Escuchar eventos storage si se modifica en otra pestaña
    const handleStorageChange = (e) => {
      if (e.key === 'usm_blockchain_records' || e.key === 'usm_pub_history') {
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
      <div className="glass-panel" style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
        <Clock size={32} color="var(--color-slate-gray)" style={{ margin: '0 auto 0.75rem auto' }} />
        <p style={{ color: 'var(--color-ink-black)', fontWeight: 500, margin: '0 0 0.35rem 0' }}>
          No tienes trámites registrados aún
        </p>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: 0 }}>
          Dirígete a "Planilla Única Bancaria (PUB)" o "Motor OCR" para comenzar tu proceso de legalización.
        </p>
      </div>
    );
  }

  // Tomamos el registro seleccionado (o el más reciente por defecto)
  const safeIndex = selectedRecordIndex >= records.length ? 0 : selectedRecordIndex;
  const latestRecord = records[safeIndex] || records[0];

  const isPendingMppre = (latestRecord?.status || '') === 'PENDIENTE_APOSTILLA_MPPRE';
  const isMppreDone = Boolean(latestRecord?.mppreVerified || (latestRecord?.status || '').includes('APOSTILLADO_MPPRE'));
  const isMppeuDone = Boolean(latestRecord?.mppeuVerified || (latestRecord?.status || '').includes('CERTIFICADO_MPPEU') || isPendingMppre || isMppreDone || (latestRecord?.status || '').includes('Verificado'));
  const hashDisplay = latestRecord?.hash ? latestRecord.hash.substring(0, 10) : 'N/A';
  const docTypeDisplay = latestRecord?.documentType || 'Título Universitario USM';
  const solicitudDisplay = latestRecord?.solicitudCode || 'GTU-2026-USM-8492';
  const apostilleDisplay = latestRecord?.apostilleNumber || 'APO-VE-2026-PENDIENTE';
  const timestampDisplay = latestRecord?.timestamp ? new Date(latestRecord.timestamp).toLocaleString('es-VE') : 'N/A';

  const steps = [
    {
      title: "Etapa 1: Carga OCR y Solicitud GTU (Egresado)",
      desc: `Expediente emitido (${solicitudDisplay}) con huella canónica preliminar`,
      status: "completed",
      icon: <CheckCircle size={17} />
    },
    {
      title: "Etapa 2: Cotejo en Taquilla y Anclaje Blockchain (MPPEU)",
      desc: isMppeuDone ? `Certificado con sello digital GTU (Tx: ${latestRecord?.txHash && latestRecord.txHash !== '0xPENDIENTE_COTEJO' ? latestRecord.txHash.substring(0, 10) + '...' : 'Sepolia On-Chain'})` : "Presenta tu título original (pergamino) en la taquilla ministerial para el cotejo físico",
      status: isMppeuDone ? "completed" : "current",
      icon: isMppeuDone ? <CheckCircle size={17} /> : <Clock size={17} />
    },
    {
      title: "Etapa 3: Emisión de Apostilla 100% Digital (MPPRE)",
      desc: isMppreDone
        ? `Apostilla de La Haya N° ${apostilleDisplay} emitida y validada on-chain para ${latestRecord?.countryDestiny || latestRecord?.country_destiny || 'país destino'}`
        : isPendingMppre
        ? `Solicitud radicada ante Cancillería para ${latestRecord?.countryDestiny || latestRecord?.country_destiny || 'exterior'}. En revisión diplomática y firma consular por el MPPRE.`
        : isMppeuDone
        ? "Trámite 100% digital en Cancillería (habilitado). Haz clic en 'Solicitar Apostilla MPPRE' para radicar tu expediente."
        : "Se habilitará automáticamente tras el cotejo en el MPPEU",
      status: isMppreDone ? "completed" : isPendingMppre || isMppeuDone ? "current" : "upcoming",
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
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
          <Clock size={18} color="var(--color-ink-black)" /> Tracking de Trámite Híbrido (MPPEU / MPPRE)
        </h3>

        {/* Píldoras selectoras si el estudiante tiene más de 1 trámite */}
        {records.length > 1 && (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Trámites ({records.length}):
            </span>
            {records.map((r, idx) => (
              <button
                key={r.hash || idx}
                onClick={() => {
                  setSelectedRecordIndex(idx);
                  if (r.hash) {
                    localStorage.setItem('usm_active_tramite_hash', r.hash);
                    sessionStorage.setItem('usm_active_tramite_hash', r.hash);
                  }
                }}
                style={{
                  padding: '0.28rem 0.75rem',
                  fontSize: '0.74rem',
                  borderRadius: 'var(--radius-pill)',
                  border: safeIndex === idx ? '1px solid var(--color-ink-black)' : '1px solid var(--border)',
                  background: safeIndex === idx ? 'var(--color-ink-black)' : '#ffffff',
                  color: safeIndex === idx ? '#ffffff' : 'var(--color-ink-black)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <span>{r.solicitudCode || ('Trámite ' + (idx + 1))}</span>
                <span style={{ opacity: 0.75, fontSize: '0.7rem' }}>
                  ({(r.ownerName || 'Graduando').split(' ')[0]})
                </span>
                {safeIndex === idx && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Banner de Trámite */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        style={{
          marginBottom: '1.5rem',
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
              <p style={{ fontWeight: 600, fontSize: '0.96rem', color: 'var(--color-ink-black)', margin: 0 }}>
                Trámite: {docTypeDisplay}
              </p>
              <span style={{ fontSize: '0.74rem', background: 'var(--color-mist-gray)', color: 'var(--color-ink-black)', border: '1px solid var(--border)', padding: '0.15rem 0.55rem', borderRadius: 'var(--radius-pill)', fontWeight: 600 }}>
                {solicitudDisplay}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
              Titular: <strong>{latestRecord?.ownerName || 'Graduando'}</strong> ({latestRecord?.cedula || 'N/A'}) · Hash: {hashDisplay}...
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
              fontWeight: 500,
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

      <div className="timeline" style={{ marginLeft: '0.75rem', marginTop: '1.25rem', borderLeft: '2px solid var(--border)' }}>
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
              transition={{ delay: idx * 0.08 }}
              whileHover={{ x: 5 }}
              style={{
                display: 'flex',
                gap: '1.15rem',
                marginBottom: '1.35rem',
                position: 'relative',
                cursor: 'default',
                padding: '0.35rem 0.5rem',
                borderRadius: '8px',
                transition: 'background-color 0.2s ease'
              }}
            >
              {/* Línea conectora */}
              {idx !== steps.length - 1 && (
                <div style={{
                  position: 'absolute',
                  left: '21px',
                  top: '36px',
                  bottom: '-16px',
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

              <div style={{ paddingTop: '0.2rem' }}>
                <h4 style={{
                  margin: 0,
                  fontSize: '0.94rem',
                  fontWeight: 500,
                  color: step.status === 'upcoming' ? 'var(--color-slate-gray)' : 'var(--color-ink-black)'
                }}>
                  {step.title}
                </h4>
                <p style={{
                  fontSize: '0.82rem',
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
                {/* Info Card Expediente */}
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

                {/* País de Destino */}
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

                {/* Motivo del Trámite */}
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

                {/* Observaciones opcionales */}
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

                {/* Info Legal */}
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
