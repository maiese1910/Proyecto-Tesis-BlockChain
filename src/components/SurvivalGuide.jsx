import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Sun, Navigation, Info, ShieldAlert, ChevronRight, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import html2pdf from 'html2pdf.js';
import { dynamicDataAPI } from '../services/api';

const SurvivalGuide = () => {
  const [tramite, setTramite] = useState('');
  const [turno, setTurno] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [guiasDB, setGuiasDB] = useState(null);

  // Cargar guías dinámicas desde el servidor
  useEffect(() => {
    dynamicDataAPI.getGuias()
      .then(data => {
        if (data.success && data.guias) {
          const db = {};
          data.guias.forEach(g => {
            db[g.ente] = {
              location: g.location,
              warning: g.warning,
              image: g.image_url || '',
              steps: (turno) => {
                // Map steps with icons based on index
                const icons = [
                  <Clock color="var(--color-sienna-brown)" />,
                  <ShieldAlert color="var(--danger)" />,
                  <Navigation color="var(--warning)" />,
                  <MapPin color="var(--color-ink-black)" />,
                ];
                return (g.steps || []).map((s, i) => ({
                  ...s,
                  icon: icons[i % icons.length]
                }));
              }
            };
          });
          setGuiasDB(db);
        }
      })
      .catch(() => { });
  }, []);

  const handleDownloadBlankPUB = () => {
    const el = document.createElement('div');
    el.style.padding = '25px';
    el.style.fontFamily = 'Arial, sans-serif';
    el.innerHTML = `
      <div style="border: 2px solid #17191c; padding: 20px; border-radius: 6px;">
        <div style="text-align: center; border-bottom: 2px solid #17191c; padding-bottom: 12px; margin-bottom: 18px;">
          <h2 style="margin: 0; font-size: 16px; color: #17191c;">REPÚBLICA BOLIVARIANA DE VENEZUELA</h2>
          <h3 style="margin: 4px 0; font-size: 14px; color: #5d2a1a;">SERVICIO AUTÓNOMO DE REGISTROS Y NOTARÍAS (SAREN)</h3>
          <h4 style="margin: 4px 0; font-size: 13px; color: #64748b;">PLANILLA ÚNICA BANCARIA (PUB) — FORMATO OFICIAL</h4>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;" border="1" cellpadding="6">
          <tr><td style="font-weight: bold; width: 35%; background: #f8fafc;">N° Planilla:</td><td>PUB-${new Date().getFullYear()}-000000</td></tr>
          <tr><td style="font-weight: bold; background: #f8fafc;">Nombre del Solicitante:</td><td>__________________________________________________</td></tr>
          <tr><td style="font-weight: bold; background: #f8fafc;">Cédula de Identidad:</td><td>V- ___________________</td></tr>
          <tr><td style="font-weight: bold; background: #f8fafc;">Trámite a Realizar:</td><td>Registro de Título Universitario</td></tr>
          <tr><td style="font-weight: bold; background: #f8fafc;">Institución Educativa:</td><td>Universidad Santa María (USM)</td></tr>
          <tr><td style="font-weight: bold; background: #f8fafc;">Monto del Arancel:</td><td>8.729,40 Bs. (0.50 UT)</td></tr>
          <tr><td style="font-weight: bold; background: #f8fafc;">Banco Receptor:</td><td>Banco de Venezuela / Cuenta Oficial SAREN</td></tr>
        </table>
        <div style="margin-top: 45px; display: flex; justify-content: space-around; text-align: center; font-size: 11px;">
          <div style="border-top: 1px solid #17191c; width: 220px; padding-top: 6px;">Firma del Solicitante</div>
          <div style="border-top: 1px solid #17191c; width: 220px; padding-top: 6px;">Sello y Firma del Banco Receptor</div>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    const opt = {
      margin: 10,
      filename: `Planilla_PUB_Oficial_Blanco_SAREN.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(el).save().then(() => {
      document.body.removeChild(el);
    });
  };

  // Base de datos de logística de supervivencia (Entes Gubernamentales)
  const logicDB = {
    saren: {
      location: "Sede del Registro Principal (Según tu Estado/Municipio)",
      warning: "Cita previa obligatoria a través de la web del SAREN.",
      image: "/images/saren_facade.png",
      steps: (turno) => [
        {
          title: "Planificación de Llegada",
          icon: <Clock color="var(--color-sienna-brown)" />,
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
                onClick={handleDownloadBlankPUB}
                style={{ alignSelf: 'flex-start', background: 'var(--color-blush-peach)', color: 'var(--color-sienna-brown)', border: '1px solid rgba(93, 42, 26, 0.25)', padding: '0.45rem 1rem', borderRadius: 'var(--radius-inputs)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.84rem', fontWeight: 600 }}
              >
                <Download size={14} /> Descargar Formato PUB en Blanco
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
          icon: <MapPin color="var(--color-ink-black)" />,
          time: "Paso 2 en sede",
          desc: "Entregarás el título físico. Deberás regresar luego (a veces días después) para retirarlo ya con el certificado del SAREN adherido en la parte posterior."
        }
      ]
    },
    mppre: {
      location: "Oficina del MPPRE o IPOSTEL autorizada (Cita Electrónica)",
      warning: "Citas asignadas según el terminal de tu cédula.",
      image: "/images/mppre_facade.png",
      steps: (turno) => [
        {
          title: "Día de Cita",
          icon: <Clock color="var(--color-sienna-brown)" />,
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
          icon: <MapPin color="var(--color-ink-black)" />,
          time: "Durante la atención",
          desc: "El funcionario verificará el código QR de legalización previa. Si está correcto, te retendrán el documento o te emitirán la Apostilla electrónica validada internacionalmente."
        }
      ]
    }
  };

  const handleGenerate = () => {
    if (tramite && turno) setShowGuide(true);
  };

  // Preferir datos dinámicos (Supabase) sobre estáticos
  const activeDB = guiasDB || logicDB;
  const currentLogic = tramite ? activeDB[tramite] : null;

  return (
    <div className="view-container">
      <div className="dashboard-header">
        <h2>Logística Dinámica Gubernamental</h2>
        <p>Tu hoja de ruta para sobrevivir a los entes del Estado (SAREN, GTU, MPPRE). Selecciona el trámite gubernamental para calcular tiempos y requisitos.</p>
      </div>

      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 500 }}>¿Qué ente visitarás?</label>
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
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 500 }}>Turno / Hora de Cita</label>
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
            <div style={{ marginBottom: '2.5rem', padding: '1.75rem', background: 'var(--color-fog-white)', borderRadius: 'var(--radius-cards)', border: '1px solid var(--border)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem', color: 'var(--color-ink-black)', fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 400 }}>
                <MapPin size={20} color="var(--color-ink-black)" /> Coordenadas Exactas
              </h3>
              <p style={{ fontSize: '1.05rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>{currentLogic.location}</p>

              <div style={{ position: 'relative', width: '100%', height: '250px', borderRadius: 'var(--radius-inputs)', overflow: 'hidden', marginBottom: '1rem', border: '1px solid var(--border)' }}>
                <img
                  src={currentLogic.image}
                  alt="Fachada de la Sede"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(23, 25, 28, 0.85)', color: '#ffffff', padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-pill)', fontSize: '0.75rem', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={12} color="#ffffff" /> Foto Referencial de la Sede
                </div>
              </div>

              <p style={{ color: 'var(--color-sienna-brown)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontWeight: 500 }}>
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
                  transition={{ delay: index * 0.12 }}
                >
                  <motion.div
                    className="step-card"
                    whileHover={{ y: -4, scale: 1.01 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.85rem' }}>
                      {step.icon}
                      <h3 style={{ margin: 0, fontSize: '1.08rem', color: 'var(--color-ink-black)', fontWeight: 500 }}>{step.title}</h3>
                      <span style={{ marginLeft: 'auto', background: '#ffffff', border: '1px solid var(--border)', padding: '0.25rem 0.9rem', borderRadius: 'var(--radius-pill)', fontSize: '0.8rem', fontWeight: '500', color: 'var(--color-ink-black)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                        {step.time}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.92rem' }}>{step.desc}</div>
                  </motion.div>
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
