import React, { useState } from 'react';
import { UploadCloud, CheckCircle, XCircle, Search, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

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

    setTimeout(() => {
      setIsUploading(false);
      setHasValidated(true);
      // Simular que algunos pasan y otros no (ej. faltan las firmas y el GTU, pero sí tiene PUB y DPI)
      setChecklist([
        { id: 1, label: "Firma del Rector y Secretario General", status: "error", missingText: "Faltan firmas oficiales de USM" },
        { id: 2, label: "Validación del GTU (Sello/QR)", status: "error", missingText: "Falta validación del MPPEU" },
        { id: 3, label: "Planilla Única Bancaria (PUB) SAREN", status: "success", missingText: "" },
        { id: 4, label: "Nitidez de escaneo superior a 300 DPI", status: "success", missingText: "" },
        { id: 5, label: "Timbres Fiscales Regionales", status: "error", missingText: "Timbre de 0.5 UT no detectado" }
      ]);
    }, 2500);
  };

  return (
    <div className="view-container">
      <div className="dashboard-header">
        <h2>Pre-validación del Expediente</h2>
        <p>Tu asistente automatizado. Adjunta tus documentos y verifica contra la lista de requisitos obligatorios antes de ir a los entes gubernamentales.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Zona de Subida */}
        <motion.div 
          className="glass-panel"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div 
            className={`upload-zone ${isUploading ? 'animate-pulse-glow' : ''}`}
            onClick={handleSimulateUpload}
            style={{ height: '100%', display: 'flex', justifyContent: 'center' }}
          >
            {isUploading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <Search size={48} color="var(--primary)" className="animate-spin" />
                <h3>Analizando Expediente...</h3>
                <p style={{ color: 'var(--text-muted)' }}>Cotejando firmas y sellos con IA.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <UploadCloud size={48} color="var(--text-muted)" />
                <h3>Haz clic para auditar documento</h3>
                <p style={{ color: 'var(--text-muted)' }}>Sube el PDF unificado de tus requisitos</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Lista Flotante de Checks */}
        <motion.div 
          className="glass-panel"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Checklist Oficial
            <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '0.3rem 0.8rem', borderRadius: '20px' }}>
              {hasValidated ? "Auditoría Finalizada" : "Esperando Documentos"}
            </span>
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {checklist.map((item) => (
              <div 
                key={item.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '1rem',
                  padding: '1rem',
                  background: item.status === 'success' ? 'rgba(16, 185, 129, 0.1)' : item.status === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)',
                  border: '1px solid',
                  borderColor: item.status === 'success' ? 'rgba(16, 185, 129, 0.3)' : item.status === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'var(--border)',
                  borderRadius: '12px',
                  transition: 'all 0.3s'
                }}
              >
                <div style={{ marginTop: '2px' }}>
                  {item.status === 'pending' && <Clock size={20} color="var(--text-muted)" />}
                  {item.status === 'success' && <CheckCircle size={20} color="var(--success)" />}
                  {item.status === 'error' && <XCircle size={20} color="var(--danger)" />}
                </div>
                <div>
                  <h4 style={{ 
                    color: item.status === 'success' ? 'var(--text-main)' : item.status === 'error' ? 'var(--danger)' : 'var(--text-main)',
                    textDecoration: item.status === 'success' ? 'line-through' : 'none',
                    opacity: item.status === 'success' ? 0.7 : 1,
                    marginBottom: '0.2rem'
                  }}>
                    {item.label}
                  </h4>
                  {item.status === 'error' && (
                    <p style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: '500' }}>
                      ❌ Falta: {item.missingText}
                    </p>
                  )}
                  {item.status === 'pending' && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Pendiente por revisión</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {hasValidated && (
             <button 
             className="send-btn" 
             style={{ marginTop: '2rem', padding: '0.8rem', width: '100%', background: 'rgba(255,255,255,0.1)', color: 'var(--text-main)' }}
             onClick={() => { setHasValidated(false); setChecklist(prev => prev.map(item => ({ ...item, status: "pending" }))); }}
           >
             Reiniciar Auditoría
           </button>
          )}
        </motion.div>

      </div>
    </div>
  );
};

export default PreValidation;
