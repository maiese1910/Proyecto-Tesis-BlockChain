import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, ShieldCheck, MapPin, ArrowRight } from 'lucide-react';
import { blockchainAPI } from '../services/api';
import DigitalCertificate from './DigitalCertificate';
import ApostilleCertificate from './ApostilleCertificate';

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

  const handleRequestApostille = async (record) => {
    if (!record?.hash) return;
    setRequestingApostille(true);
    try {
      const res = await blockchainAPI.mppreApostilleRecord(record.hash, {
        auditor_username: 'mppre_consular',
        auditor_cargo: 'Oficial Consular de Legalización y Apostilla',
        auditor_ente: 'MPPRE'
      });
      if (res.success) {
        const updated = {
          ...record,
          status: 'APOSTILLADO_MPPRE',
          mppreVerified: true,
          apostilleNumber: res.apostilleNumber,
          mppreOfficer: 'Oficial Consular (MPPRE)'
        };
        setRecords(prev => prev.map(r => r.hash === record.hash ? updated : r));
        setActiveApostilleRecord(updated);

        // Sincronizar en localStorage
        try {
          const bc = JSON.parse(localStorage.getItem('usm_blockchain_records') || '[]');
          const nextBc = bc.map(r => r.hash === record.hash ? { ...r, ...updated } : r);
          localStorage.setItem('usm_blockchain_records', JSON.stringify(nextBc));
        } catch (_) {}
      }
    } catch (err) {
      console.error('Error solicitando apostilla:', err);
      alert('Error al solicitar la Apostilla: ' + (err.message || 'Error de conexión'));
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

      // 1. Consultar registros del backend (tanto globales como específicos por cédula)
      try {
        const allRes = await blockchainAPI.getAllRecords();
        if (allRes?.success && Array.isArray(allRes.records)) {
          allRes.records.forEach(r => {
            if (r && r.hash) combined.push(r);
          });
        }
      } catch (_) {}

      if (user?.cedula) {
        try {
          const data = await blockchainAPI.getRecordsByCedula(user.cedula);
          if (data && data.success && Array.isArray(data.records)) {
            data.records.forEach(r => {
              if (r && r.hash) combined.push(r);
            });
          }
        } catch (e) {
          console.warn("Backend records offline, checking local records:", e);
        }
      }

      // 2. Cargar registros locales de usm_blockchain_records (incluye los emitidos desde OCR)
      try {
        const bcRecordsStr = localStorage.getItem('usm_blockchain_records');
        if (bcRecordsStr) {
          const bcList = JSON.parse(bcRecordsStr);
          if (Array.isArray(bcList)) {
            bcList.forEach(item => {
              if (!item || !item.hash) return;
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
                libro: item.libro || 'Grados 2026'
              });
            });
          }
        }
      } catch (e) {
        console.warn('Error reading usm_blockchain_records:', e);
      }

      // 3. Cargar registros locales de usm_pub_history
      try {
        const localHistoryStr = localStorage.getItem('usm_pub_history');
        if (localHistoryStr) {
          const localList = JSON.parse(localHistoryStr);
          if (Array.isArray(localList)) {
            localList.forEach(item => {
              if (!item) return;
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
                apostilleNumber: item.apostilleNumber || null
              });
            });
          }
        }
      } catch (e) {
        console.warn('Error merging local pub history:', e);
      }

      // Si no hay registros de ninguna fuente, cargar los registros canónicos de la tesis
      if (combined.length === 0) {
        combined = [...DEFAULT_THESIS_RECORDS];
        try {
          localStorage.setItem('usm_blockchain_records', JSON.stringify(DEFAULT_THESIS_RECORDS));
        } catch (_) {}
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
          const isMppeu = Boolean(existing.mppeuVerified || rec.mppeuVerified || chosenStatus.includes('CERTIFICADO') || chosenStatus.includes('APOSTILLADO'));
          const isMppre = Boolean(existing.mppreVerified || rec.mppreVerified || chosenStatus.includes('APOSTILLADO'));
          const chosenTx = (rec.txHash && !rec.txHash.includes('PENDIENTE'))
            ? rec.txHash
            : ((existing.txHash && !existing.txHash.includes('PENDIENTE')) ? existing.txHash : (rec.txHash || existing.txHash || '0xPENDIENTE_COTEJO'));

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

      // 5. Ordenar: si hay cédula de usuario, priorizar las que coincidan, y luego por fecha más reciente
      const userNorm = user?.cedula ? user.cedula.replace(/\D/g, '') : '';
      list.sort((a, b) => {
        const aNorm = (a.cedula || '').replace(/\D/g, '');
        const bNorm = (b.cedula || '').replace(/\D/g, '');
        if (userNorm && aNorm === userNorm && bNorm !== userNorm) return -1;
        if (userNorm && bNorm === userNorm && aNorm !== userNorm) return 1;
        return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
      });

      setRecords(list);
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

    return () => {
      clearInterval(interval);
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageChange);
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

  const isMppeuDone = Boolean(latestRecord?.mppeuVerified || (latestRecord?.status || '').includes('CERTIFICADO_MPPEU') || (latestRecord?.status || '').includes('APOSTILLADO_MPPRE') || (latestRecord?.status || '').includes('Verificado'));
  const isMppreDone = Boolean(latestRecord?.mppreVerified || (latestRecord?.status || '').includes('APOSTILLADO_MPPRE'));
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
      desc: isMppreDone ? `Apostilla de La Haya N° ${apostilleDisplay} emitida y validada on-chain` : isMppeuDone ? "Trámite 100% digital en Cancillería (habilitado para emisión)" : "Se habilitará automáticamente tras el cotejo en el MPPEU",
      status: isMppreDone ? "completed" : isMppeuDone ? "current" : "upcoming",
      icon: <MapPin size={17} />
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
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {records.map((r, idx) => (
              <button
                key={r.hash || idx}
                onClick={() => setSelectedRecordIndex(idx)}
                style={{
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.74rem',
                  borderRadius: 'var(--radius-pill)',
                  border: safeIndex === idx ? '1px solid var(--color-ink-black)' : '1px solid var(--border)',
                  background: safeIndex === idx ? 'var(--color-ink-black)' : '#ffffff',
                  color: safeIndex === idx ? '#ffffff' : 'var(--color-ink-black)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.15s ease'
                }}
              >
                {r.solicitudCode || `Trámite ${idx + 1}`}
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

            {isMppeuDone && !isMppreDone && (
              <button
                disabled={requestingApostille}
                onClick={() => handleRequestApostille(latestRecord)}
                style={{
                  background: 'var(--color-ink-black)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: requestingApostille ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                {requestingApostille ? 'Tramitando...' : '⚡ Solicitar Apostilla MPPRE (100% Digital)'}
              </button>
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
                  cursor: 'pointer'
                }}
              >
                Apostilla de La Haya
              </button>
            )}

            <span style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              padding: '0.25rem 0.75rem',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: isMppreDone || isMppeuDone ? 'var(--color-blush-peach)' : '#ffffff',
              color: isMppreDone || isMppeuDone ? 'var(--color-sienna-brown)' : 'var(--color-ink-black)',
              border: isMppreDone || isMppeuDone ? '1px solid rgba(93, 42, 26, 0.2)' : '1px solid var(--border)'
            }}>
              {isMppreDone ? 'Apostillado 100%' : isMppeuDone ? 'Certificado MPPEU' : 'En Cotejo MPPEU'}
            </span>
          </div>
        </div>
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
    </div>
  );
};

export default TrackingTimeline;
