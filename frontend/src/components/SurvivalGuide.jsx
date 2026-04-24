import React, { useState } from 'react';
import { MapPin, Clock, Sun, Navigation, Info, ShieldAlert, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SurvivalGuide = () => {
  const [tramite, setTramite] = useState('');
  const [turno, setTurno] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  // Base de datos de logística de supervivencia (Entes Gubernamentales)
  const logicDB = {
    saren: {
      location: "Sede del Registro Principal (Según tu Estado/Municipio)",
      warning: "Cita previa obligatoria a través de la web del SAREN.",
      steps: (turno) => [
        {
          title: "Planificación de Llegada",
          icon: <Clock color="var(--primary)" />,
          time: turno === 'mañana' ? "6:00 AM" : "12:00 PM",
          desc: "Los Registros Principales suelen atender por orden de llegada a las personas citadas para el día. Llega temprano porque el sistema suele 'caerse' a media mañana."
        },
        {
          title: "Documentos Esenciales",
          icon: <ShieldAlert color="var(--danger)" />,
          time: "Revisión Previa",
          desc: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <span>Debes tener: Título original legalizado por el GTU, la Planilla Única Bancaria (PUB) pagada, Timbres Fiscales del estado y copias de tu Cédula.</span>
              <button 
                onClick={() => alert("Simulando descarga de Planilla Única Bancaria (PUB) oficial...")}
                style={{ alignSelf: 'flex-start', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', border: '1px solid var(--success)', padding: '0.4rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
              >
                📥 Descargar Formato PUB en Blanco
              </button>
            </div>
          )
        },
        {
          title: "Taquilla de Recepción",
          icon: <Navigation color="var(--warning)" />,
          time: "Paso 1 en sede",
          desc: "Al entrar, un funcionario revisará que los aranceles coincidan con las Unidades Tributarias exigidas. Si te falta un timbre, te sacarán de la cola."
        },
        {
          title: "Proceso de Registro",
          icon: <MapPin color="var(--success)" />,
          time: "Paso 2 en sede",
          desc: "Entregarás el título físico. Deberás regresar luego (a veces días después) para retirarlo ya con el certificado del SAREN adherido en la parte posterior."
        }
      ]
    },
    mppre: {
      location: "Oficina del MPPRE o IPOSTEL autorizada (Cita Electrónica)",
      warning: "Citas asignadas según el terminal de tu cédula.",
      steps: (turno) => [
        {
          title: "Día de Cita",
          icon: <Clock color="var(--primary)" />,
          time: turno === 'mañana' ? "7:30 AM" : "1:00 PM",
          desc: "El sistema de Apostilla Electrónica te da un día específico. Imprime obligatoriamente dos (2) copias de la cita que llega a tu correo electrónico."
        },
        {
          title: "Validación de GTU",
          icon: <Info color="var(--warning)" />,
          time: "Requisito Estricto",
          desc: "Recuerda que para apostillar el título, éste ya debe estar legalizado por el GTU (Gestión de Trámites Universitarios) del Ministerio de Educación Universitaria."
        },
        {
          title: "Entrega Física",
          icon: <MapPin color="var(--success)" />,
          time: "Durante la atención",
          desc: "El funcionario verificará el código QR de legalización previa. Si está correcto, te retendrán el documento o te emitirán la Apostilla electrónica validada internacionalmente."
        }
      ]
    }
  };

  const handleGenerate = () => {
    if (tramite && turno) setShowGuide(true);
  };

  const currentLogic = tramite ? logicDB[tramite] : null;

  return (
    <div className="view-container">
      <div className="dashboard-header">
        <h2>Logística Dinámica Gubernamental</h2>
        <p>Tu hoja de ruta para sobrevivir a los entes del Estado (SAREN, GTU, MPPRE). Selecciona el trámite gubernamental para calcular tiempos y requisitos.</p>
      </div>

      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1.5rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>¿Qué ente visitarás?</label>
            <select 
              className="chat-input" 
              value={tramite} 
              onChange={(e) => { setTramite(e.target.value); setShowGuide(false); }}
              style={{ width: '100%', cursor: 'pointer' }}
            >
              <option value="" disabled>Selecciona el trámite...</option>
              <option value="saren">Registro de Título (SAREN)</option>
              <option value="mppre">Apostilla Internacional (MPPRE)</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Turno / Hora de Cita</label>
            <select 
              className="chat-input" 
              value={turno} 
              onChange={(e) => { setTurno(e.target.value); setShowGuide(false); }}
              style={{ width: '100%', cursor: 'pointer' }}
            >
              <option value="" disabled>Selecciona el turno...</option>
              <option value="mañana">Mañana (8:00 AM - 12:00 PM)</option>
              <option value="tarde">Tarde (1:00 PM - 4:00 PM)</option>
            </select>
          </div>
          <button 
            className="send-btn" 
            style={{ height: '43px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={handleGenerate}
            disabled={!tramite || !turno}
          >
            Generar Ruta <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showGuide && currentLogic && (
          <motion.div 
            className="glass-panel" 
            style={{ padding: '3rem' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div style={{ marginBottom: '2.5rem', padding: '1.5rem', background: 'rgba(14, 165, 233, 0.05)', borderRadius: '12px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                <MapPin /> Coordenadas Exactas
              </h3>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{currentLogic.location}</p>
              <p style={{ color: 'var(--warning)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={16} /> {currentLogic.warning}
              </p>
            </div>

            <div className="timeline">
              {currentLogic.steps(turno).map((step, index) => (
                <motion.div 
                  key={index} 
                  className="timeline-step"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.15 }}
                >
                  <div className="step-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      {step.icon}
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{step.title}</h3>
                      <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', padding: '0.3rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' }}>
                        {step.time}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SurvivalGuide;
