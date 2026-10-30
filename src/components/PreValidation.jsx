import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, CheckCircle, XCircle, Search, Clock, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { statsAPI, dynamicDataAPI } from '../services/api';

const DEFAULT_CHECKLIST = [
  { id: 1, label: "Firma del Rector y Secretario General", status: "pending", missingText: "Firmas oficiales de las autoridades USM" },
  { id: 2, label: "Validación del GTU (Sello / QR Ministerial)", status: "pending", missingText: "Certificación digital del MPPEU" },
  { id: 3, label: "Planilla Única Bancaria (PUB) SAREN", status: "pending", missingText: "Arancel bancario pagado y sellado" },
  { id: 4, label: "Nitidez de escaneo superior a 300 DPI", status: "pending", missingText: "Documento borroso o con reflejo" },
  { id: 5, label: "Timbres Fiscales Regionales (0.5 UT)", status: "pending", missingText: "Denominación tributaria requerida" }
];

const PreValidation = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);
  const fileInputRef = useRef(null);

  useEffect(() => {
    dynamicDataAPI.getChecklist()
      .then(res => {
        if (res && res.items && Array.isArray(res.items) && res.items.length > 0) {
          const mapped = res.items.map(it => ({
            id: it.id,
            label: it.title || it.label || "Requisito de Expediente",
            status: "pending",
            missingText: it.description || it.pista || "Requiere cotejo oficial"
          }));
          setChecklist(mapped);
        }
      })
      .catch(() => { });
  }, []);

    const handleFileChange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileName(file.name);
      startAudit(file.name);
    };

    const startAudit = (name) => {
      setIsUploading(true);
      setHasValidated(false);

      // Resetear a pending
      setChecklist(prev => prev.map(item => ({ ...item, status: "pending" })));

      setTimeout(async () => {
        setIsUploading(false);
        setHasValidated(true);
        // Simulación de auditoría visual con IA
        setChecklist(prev => prev.map((item, idx) => {
          if (idx === 0 || idx === 1 || idx === 4) {
            return { ...item, status: "error" };
          }
          return { ...item, status: "success" };
        }));

        try {
          await statsAPI.reportPrevalidation(name || 'expediente_usm_2026.pdf');
        } catch (err) {
          console.warn('Error al reportar pre-validación:', err);
        }
    }, 2200);
  };

  const toggleItemManual = (id) => {
    setChecklist(prev => prev.map(it => {
      if (it.id === id) {
        const nextStatus = it.status === "success" ? "pending" : "success";
        return { ...it, status: nextStatus };
      }
      return it;
    }));
  };

  const handleZoneClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="view-container">
      <div className="dashboard-header">
        <h2>Pre-validación del Expediente</h2>
        <p>Tu asistente automatizado. Adjunta tus documentos y verifica contra la lista de requisitos obligatorios antes de acudir a los entes ministeriales.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>

        {/* Zona de Subida */}
        <motion.div
          className="glass-panel"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/png,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <motion.div
            className={`upload-zone ${isUploading ? 'animate-pulse-glow' : ''}`}
            onClick={handleZoneClick}
            whileHover={{ scale: 1.015 }}
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '3rem 2rem',
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-cards)',
              border: '2px dashed var(--border)',
              cursor: 'pointer',
              transition: 'all 0.25s ease'
            }}
          >
            {isUploading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', textAlign: 'center' }}>
                <Search size={44} color="var(--color-ink-black)" className="animate-spin" />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 400, color: 'var(--color-ink-black)', margin: 0 }}>
                  Analizando Expediente...
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                  {fileName ? `Procesando: ${fileName}` : "Cotejando firmas y sellos con algoritmos de visión artificial."}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', textAlign: 'center' }}>
                <div style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-mist-gray)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-ink-black)'
                }}>
                  <UploadCloud size={28} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 400, color: 'var(--color-ink-black)', margin: 0 }}>
                  {fileName ? `Archivo: ${fileName}` : "Haz clic para auditar documento"}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, maxWidth: '280px' }}>
                  {fileName ? "Haz clic para seleccionar otro documento o re-auditar." : "Sube el PDF o imagen de tu expediente para comprobar sellos y firmas oficiales."}
                </p>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-slate-gray)', background: 'var(--color-fog-white)', border: '1px solid var(--border)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                  PDF · PNG · JPG · WEBP
                </span>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Lista Flotante de Checks */}
        <motion.div
          className="glass-panel"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.25rem',
              fontWeight: 400,
              color: 'var(--color-ink-black)',
              margin: 0
            }}>
              Checklist Oficial
            </h3>
            <span style={{
              fontSize: '0.78rem',
              fontWeight: 500,
              background: '#ffffff',
              border: '1px solid var(--border)',
              padding: '0.25rem 0.8rem',
              borderRadius: 'var(--radius-pill)',
              color: 'var(--color-ink-black)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              {hasValidated ? "Auditoría Finalizada" : "Modo Interactivo"}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
            {checklist.map((item) => {
              const isSuccess = item.status === 'success';
              const isError = item.status === 'error';

              return (
                <motion.div
                  key={item.id}
                  whileHover={{ x: 4 }}
                  onClick={() => toggleItemManual(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    padding: '1rem 1.15rem',
                    background: isSuccess ? 'rgba(23, 25, 28, 0.03)' : isError ? 'var(--color-blush-peach)' : '#ffffff',
                    border: '1px solid',
                    borderColor: isSuccess ? 'rgba(23, 25, 28, 0.15)' : isError ? 'rgba(93, 42, 26, 0.2)' : 'var(--border)',
                    borderRadius: 'var(--radius-inputs)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  title="Haz clic para marcar o desmarcar manualmente"
                >
                  <div style={{ marginTop: '2px', flexShrink: 0 }}>
                    {item.status === 'pending' && <Clock size={19} color="var(--color-slate-gray)" />}
                    {isSuccess && <CheckCircle size={19} color="var(--color-ink-black)" />}
                    {isError && <XCircle size={19} color="var(--color-sienna-brown)" />}
                  </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{
                        color: isError ? 'var(--color-sienna-brown)' : 'var(--color-ink-black)',
                        textDecoration: isSuccess ? 'line-through' : 'none',
                        opacity: isSuccess ? 0.75 : 1,
                        margin: 0,
                        fontSize: '0.92rem',
                        fontWeight: 500
                      }}>
                        {item.label}
                      </h4>
                      {isError && (
                        <p style={{ color: 'var(--color-sienna-brown)', fontSize: '0.82rem', fontWeight: '500', margin: '0.2rem 0 0 0' }}>
                          Atención: {item.missingText}
                        </p>
                      )}
                      {item.status === 'pending' && (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0.2rem 0 0 0' }}>
                          Pendiente por revisión (clic para validar)
                        </p>
                      )}
                    </div>
                </motion.div>
              );
            })}
          </div>

                  < div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {hasValidated && (
            <button
              className="send-btn"
              style={{
                flex: 1,
                padding: '0.75rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
              onClick={() => { setHasValidated(false); setFileName(null); setChecklist(prev => prev.map(item => ({ ...item, status: "pending" }))); }}
            >
              <RotateCcw size={16} /> Reiniciar Auditoría
            </button>
          )}
          <button
            type="button"
            className="btn-ghost"
            style={{ flex: 1, padding: '0.75rem 1rem', fontSize: '0.85rem' }}
            onClick={() => {
              setChecklist(prev => prev.map(it => ({ ...it, status: "success" })));
              setHasValidated(true);
            }}
          >
            Marcar Todos Cumplidos
          </button>
      </div>
    </motion.div>

      </div >
    </div >
  );
};

export default PreValidation;