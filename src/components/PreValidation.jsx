import React, { useState } from 'react';
import { UploadCloud, CheckCircle, XCircle, Search, Clock, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { statsAPI } from '../services/api';

const PreValidation = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);

  // Lista flotante de requisitos siempre visible
  const [checklist, setChecklist] = useState([
    { id: 1, label: "Firma del Rector y Secretario General", status: "pending", missingText: "Firmas no detectadas en el documento" },
    { id: 2, label: "Validación del GTU (Sello/QR)", status: "pending", missingText: "Ausencia de certificación del Ministerio" },
    { id: 3, label: "Planilla Única Bancaria (PUB) SAREN", status: "pending", missingText: "No adjuntada" },
    { id: 4, label: "Nitidez de escaneo superior a 300 DPI", status: "pending", missingText: "Ilegible o borroso" },
    { id: 5, label: "Timbres Fiscales Regionales", status: "pending", missingText: "Denominación incorrecta o ausente" }
  ]);

  const handleSimulateUpload = () => {
    setIsUploading(true);
    setHasValidated(false);
    
    // Resetear a pending
    setChecklist(prev => prev.map(item => ({ ...item, status: "pending" })));

    setTimeout(async () => {
      setIsUploading(false);
      setHasValidated(true);
      // Simular que algunos pasan y otros no
      setChecklist([
        { id: 1, label: "Firma del Rector y Secretario General", status: "error", missingText: "Faltan firmas oficiales de USM" },
        { id: 2, label: "Validación del GTU (Sello/QR)", status: "error", missingText: "Falta validación del MPPEU" },
        { id: 3, label: "Planilla Única Bancaria (PUB) SAREN", status: "success", missingText: "" },
        { id: 4, label: "Nitidez de escaneo superior a 300 DPI", status: "success", missingText: "" },
        { id: 5, label: "Timbres Fiscales Regionales", status: "error", missingText: "Timbre de 0.5 UT no detectado" }
      ]);

      try {
        await statsAPI.reportPrevalidation('expediente_usm_2026.pdf');
      } catch (err) {
        console.warn('Error al reportar pre-validación:', err);
      }
    }, 2500);
  };

  return (
    <div className="view-container">
      <div className="dashboard-header">
        <h2>Pre-validación del Expediente</h2>
        <p>Tu asistente automatizado. Adjunta tus documentos y verifica contra la lista de requisitos obligatorios antes de ir a los entes gubernamentales.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        
        {/* Zona de Subida */}
        <motion.div 
          className="glass-panel"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          <motion.div 
            className={`upload-zone ${isUploading ? 'animate-pulse-glow' : ''}`}
            onClick={handleSimulateUpload}
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
                  Cotejando firmas y sellos con algoritmos de visión artificial.
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
                  Haz clic para auditar documento
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, maxWidth: '280px' }}>
                  Sube el PDF unificado de tus requisitos para comprobar sellos y firmas oficiales.
                </p>
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
              {hasValidated ? "Auditoría Finalizada" : "Esperando Documentos"}
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
            {checklist.map((item) => {
              const isSuccess = item.status === 'success';
              const isError = item.status === 'error';

              return (
                <motion.div 
                  key={item.id} 
                  whileHover={{ x: 5, y: -2 }}
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
                    transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <div style={{ marginTop: '2px', flexShrink: 0 }}>
                    {item.status === 'pending' && <Clock size={19} color="var(--color-slate-gray)" />}
                    {isSuccess && <CheckCircle size={19} color="var(--color-ink-black)" />}
                    {isError && <XCircle size={19} color="var(--color-sienna-brown)" />}
                  </div>
                  <div>
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
                        Falta: {item.missingText}
                      </p>
                    )}
                    {item.status === 'pending' && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0.2rem 0 0 0' }}>
                        Pendiente por revisión
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {hasValidated && (
            <button 
              className="send-btn" 
              style={{
                marginTop: '1.5rem',
                padding: '0.75rem 1.25rem',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
              onClick={() => { setHasValidated(false); setChecklist(prev => prev.map(item => ({ ...item, status: "pending" }))); }}
            >
              <RotateCcw size={16} /> Reiniciar Auditoría
            </button>
          )}
        </motion.div>

      </div>
    </div>
  );
};

export default PreValidation;
