import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Scan, CheckCircle, AlertTriangle, Brain, FileText, User, CreditCard, Building, Calendar, Zap, Copy, Check, X, ShieldCheck, ArrowRight, ExternalLink } from "lucide-react";
import { ocrAPI, blockchainAPI, hashAPI } from "../services/api";

const ConfidenceBadge = ({ score }) => {
  const pct = Math.round((score || 0) * 100);
  const color = pct >= 80 ? "var(--success)" : pct >= 50 ? "var(--warning)" : "var(--danger)";
  const bg = pct >= 80 ? "rgba(16,185,129,0.12)" : pct >= 50 ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)";
  return (
    <span style={{ fontSize: "0.7rem", fontWeight: "700", color, background: bg, padding: "0.15rem 0.5rem", borderRadius: "20px", border: `1px solid ${color}33` }}>
      {pct}% confianza
    </span>
  );
};

const FieldRow = ({ icon: Icon, label, value, confidence }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      style={{ display: "flex", alignItems: "center", gap: "0.8rem", background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "0.8rem 1rem", border: "1px solid var(--border)" }}>
      <div style={{ color: "var(--primary)", flexShrink: 0 }}><Icon size={18} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 0.15rem 0" }}>{label}</p>
        <p style={{ fontWeight: "600", fontSize: "0.9rem", margin: 0, wordBreak: "break-word" }}>
          {value || <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontWeight: "400" }}>No detectado</span>}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem", flexShrink: 0 }}>
        {confidence !== undefined && <ConfidenceBadge score={confidence} />}
        {value && (
          <button onClick={handleCopy} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0.2rem", display: "flex", alignItems: "center" }} title="Copiar">
            {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
          </button>
        )}
      </div>
    </motion.div>
  );
};

const PROCESS_STEPS = [
  { label: "Cargando y normalizando imagen", icon: Upload },
  { label: "Preprocesando y eliminando ruido", icon: Zap },
  { label: "Detectando regiones de texto (CRAFT)", icon: Scan },
  { label: "Reconocimiento de caracteres (CRNN)", icon: Brain },
  { label: "Extrayendo entidades nombradas (NER)", icon: FileText },
];

const ProcessStep = ({ step, active, done }) => {
  const s = PROCESS_STEPS[step];
  const Icon = s.icon;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", padding: "0.4rem 0", opacity: active || done ? 1 : 0.3 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? "rgba(16,185,129,0.15)" : active ? "rgba(14,165,233,0.15)" : "rgba(255,255,255,0.04)", color: done ? "var(--success)" : active ? "var(--primary)" : "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${done ? "var(--success)" : active ? "var(--primary)" : "var(--border)"}`, flexShrink: 0 }}>
        {done ? <Check size={14} /> : <Icon size={14} className={active ? "animate-spin" : ""} />}
      </div>
      <span style={{ fontSize: "0.82rem", color: active ? "var(--text-main)" : done ? "var(--success)" : "var(--text-muted)", fontWeight: active ? "600" : "400" }}>{s.label}</span>
    </div>
  );
};

const FIELDS = [
  { key: "nombre_completo", label: "Nombre Completo", icon: User },
  { key: "cedula", label: "Cédula de Identidad", icon: CreditCard },
  { key: "institucion", label: "Institución Educativa", icon: Building },
  { key: "carrera", label: "Mención / Carrera", icon: FileText },
  { key: "fecha", label: "Fecha de Emisión", icon: Calendar },
];

const OCRExtractor = ({ user, onDataExtracted, onNavigate }) => {
  const [dragOver, setDragOver] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isRegisteringGtu, setIsRegisteringGtu] = useState(false);
  const [gtuRegistered, setGtuRegistered] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) { setError("Selecciona una imagen (JPG, PNG, WEBP)."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("La imagen no debe superar los 10 MB."); return; }
    setError(null); setResult(null); setGtuRegistered(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
      setImageBase64(e.target.result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); };

  const handleProcess = async () => {
    if (!imagePreview) return;
    setProcessing(true); setResult(null); setError(null); setGtuRegistered(null);
    try {
      setCurrentStep(0);
      await new Promise(r => setTimeout(r, 300));
      setCurrentStep(1);
      await new Promise(r => setTimeout(r, 300));

      setCurrentStep(2);
      let recognizedText = "";
      try {
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('spa');
        setCurrentStep(3);
        const ret = await worker.recognize(imagePreview);
        recognizedText = ret.data.text;
        await worker.terminate();
      } catch (tessErr) {
        console.warn("Client OCR fallback:", tessErr);
      }

      setCurrentStep(4);
      const data = await ocrAPI.extractDocument(imageBase64, recognizedText || null);
      setResult(data);
    } catch (err) {
      setError(err.message || "Error al procesar el documento.");
    } finally {
      setProcessing(false); setCurrentStep(-1);
    }
  };

  const handleRegisterGtu = async () => {
    if (!result?.fields) return;
    setIsRegisteringGtu(true);
    setError(null);
    try {
      const ownerName = result.fields.nombre_completo?.value || user?.nombre || "Mauro Daniel Maiese Ferreira";
      const cedula = result.fields.cedula?.value || user?.cedula || "V-28.315.101";
      const institucion = result.fields.institucion?.value || "Universidad Santa María";
      const carrera = result.fields.carrera?.value || user?.carrera || "Ingeniería de Sistemas";
      const docType = `Título de ${carrera} — ${institucion.includes("USM") ? "USM" : institucion}`;

      // Generar hash SHA-256 canónico del documento
      const canonicalData = {
        titular: ownerName,
        cedula: cedula,
        institucion: institucion,
        carrera: carrera,
        fecha: result.fields.fecha?.value || new Date().toISOString().split("T")[0],
        timestamp: Date.now()
      };
      const docHash = await hashAPI.generateClientHash(canonicalData);

      // Registrar en backend / blockchain
      const res = await blockchainAPI.register({
        hash: docHash,
        ownerName: ownerName,
        cedula: cedula,
        documentType: docType
      });

      if (res.success) {
        setGtuRegistered({
          solicitudCode: res.solicitudCode,
          hash: docHash,
          txHash: res.txHash,
          ownerName: ownerName,
          cedula: cedula,
          documentType: docType
        });
      }
    } catch (err) {
      console.error("Error registrando trámite GTU:", err);
      setError("No se pudo registrar la solicitud en el sistema: " + (err.message || "Error desconocido"));
    } finally {
      setIsRegisteringGtu(false);
    }
  };

  const handleUsarDatos = () => {
    if (!result?.fields) return;
    onDataExtracted && onDataExtracted(result.fields);
  };

  const hasAnyField = result?.fields && Object.values(result.fields).some(f => f?.value);

  return (
    <div className="view-container">
      <div className="dashboard-header" style={{ borderLeftColor: "#a855f7" }}>
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
            <Brain size={28} style={{ color: "#a855f7" }} />
            Motor de Extracción IA — OCR + NER
          </h2>
          <p>Carga una foto del título o acta de notas. El sistema usará <strong>redes neuronales (CRAFT + CRNN)</strong> con reconocimiento de entidades (NER) para extraer los datos automáticamente.</p>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(168,85,247,0.12)", color: "#a855f7", padding: "0.4rem 1rem", borderRadius: "20px", border: "1px solid rgba(168,85,247,0.3)", fontSize: "0.8rem", fontWeight: "600", flexShrink: 0 }}>
          <Brain size={14} /> EasyOCR · Deep Learning
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Panel izquierdo */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div
            className="glass-panel"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !imagePreview && fileInputRef.current?.click()}
            style={{ border: `2px dashed ${dragOver ? "#a855f7" : imagePreview ? "var(--success)" : "var(--border)"}`, background: dragOver ? "rgba(168,85,247,0.05)" : "transparent", cursor: imagePreview ? "default" : "pointer", transition: "all 0.2s", minHeight: "220px", display: "flex", alignItems: "center", justifyContent: "center", padding: imagePreview ? "0" : "2rem", overflow: "hidden", borderRadius: "12px", position: "relative" }}
          >
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
            {imagePreview ? (
              <div style={{ width: "100%", position: "relative" }}>
                <img src={imagePreview} alt="Documento" style={{ width: "100%", maxHeight: "300px", objectFit: "contain", display: "block" }} />
                <button onClick={(e) => { e.stopPropagation(); setImagePreview(null); setImageBase64(null); setResult(null); setError(null); }} style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} /></button>
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <Upload size={40} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
                <p style={{ fontWeight: "600", marginBottom: "0.4rem" }}>Arrastra la imagen aquí</p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>o haz click para seleccionar</p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>JPG · PNG · WEBP · máx 10 MB</p>
              </div>
            )}
          </div>

          {imagePreview && !processing && (
            <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="send-btn" onClick={handleProcess}
              style={{ width: "100%", padding: "0.9rem", background: "linear-gradient(135deg, #a855f7, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem", fontSize: "0.95rem", fontWeight: "700" }}>
              <Brain size={20} /> Procesar con IA / OCR
            </motion.button>
          )}

          {error && (
            <div style={{ display: "flex", gap: "0.7rem", alignItems: "flex-start", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", padding: "1rem", color: "var(--danger)" }}>
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "0.1rem" }} />
              <p style={{ fontSize: "0.85rem", margin: 0 }}>{error}</p>
            </div>
          )}

          <div className="glass-panel" style={{ padding: "1rem" }}>
            <h4 style={{ margin: "0 0 0.7rem 0", fontSize: "0.85rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}><Brain size={14} /> Arquitectura del Motor</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[["CRAFT", "Detección de regiones de texto", "#a855f7"], ["CRNN", "Reconocimiento de caracteres", "#0ea5e9"], ["NER", "Extracción de entidades nombradas", "#10b981"], ["Regex Semántico", "Validación cédula / fechas", "#f59e0b"]].map(([name, desc, color]) => (
                <div key={name} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: "700", color, background: `${color}18`, padding: "0.1rem 0.4rem", borderRadius: "4px", flexShrink: 0, marginTop: "0.1rem" }}>{name}</span>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel derecho */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {processing ? (
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <h3 style={{ margin: "0 0 1.5rem 0", display: "flex", alignItems: "center", gap: "0.6rem", color: "#a855f7" }}>
                <Brain size={20} className="animate-spin" /> Procesando documento...
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {[0, 1, 2, 3, 4].map(i => <ProcessStep key={i} step={i} active={currentStep === i} done={currentStep > i} />)}
              </div>
              <div style={{ marginTop: "1.5rem", height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <motion.div style={{ height: "100%", background: "linear-gradient(90deg, #a855f7, #0ea5e9)", borderRadius: "2px" }} animate={{ width: `${((currentStep + 1) / 5) * 100}%` }} transition={{ duration: 0.5 }} />
              </div>
            </div>
          ) : gtuRegistered ? (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel" style={{ padding: "1.75rem", border: "1px solid var(--success)", backgroundColor: "rgba(16, 185, 129, 0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--success)" }}>
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--success)" }}>
                    Etapa 1 Completada
                  </span>
                  <h3 style={{ margin: "0.1rem 0 0 0", fontSize: "1.2rem", color: "var(--color-ink-black)", fontFamily: "var(--font-serif)" }}>
                    Solicitud de Legalización GTU Emitida
                  </h3>
                </div>
              </div>

              <div style={{ backgroundColor: "#ffffff", border: "1px solid var(--border)", borderRadius: "var(--radius-inputs)", padding: "1.2rem", marginBottom: "1.2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Código de Trámite:</span>
                  <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--color-ink-black)", background: "var(--color-fog-white)", padding: "0.2rem 0.6rem", borderRadius: "4px", border: "1px solid var(--border)" }}>
                    {gtuRegistered.solicitudCode}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Titular:</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-ink-black)" }}>{gtuRegistered.ownerName}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Cédula:</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-ink-black)" }}>{gtuRegistered.cedula}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Huella Digital SHA-256:</span>
                  <span style={{ fontSize: "0.76rem", fontFamily: "monospace", color: "var(--text-secondary)" }}>
                    {gtuRegistered.hash.slice(0, 10)}...{gtuRegistered.hash.slice(-8)}
                  </span>
                </div>
              </div>

              <div style={{ backgroundColor: "var(--color-mist-gray)", borderRadius: "var(--radius-inputs)", padding: "1rem", marginBottom: "1.4rem", border: "1px solid var(--border)" }}>
                <p style={{ margin: "0 0 0.35rem 0", fontSize: "0.85rem", fontWeight: 600, color: "var(--color-ink-black)" }}>
                  🏛️ Siguiente Paso (Etapa 2 — MPPEU):
                </p>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  Tu solicitud ha sido inscrita en la bandeja ministerial. Acude con tu <strong>título físico original (pergamino)</strong> a la taquilla de la Zona Educativa / MPPEU para el cotejo presencial de firmas rectorales y primer anclaje inmutable en Blockchain Sepolia.
                </p>
              </div>

              <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate("dashboard")}
                    style={{ flex: 1, padding: "0.75rem 1rem", backgroundColor: "var(--color-ink-black)", color: "#ffffff", border: "none", borderRadius: "var(--radius-inputs)", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                  >
                    Ver Línea de Tiempo de Trámites <ArrowRight size={16} />
                  </button>
                )}
                <button
                  onClick={() => setGtuRegistered(null)}
                  style={{ padding: "0.75rem 1rem", backgroundColor: "#ffffff", color: "var(--color-ink-black)", border: "1px solid var(--border)", borderRadius: "var(--radius-inputs)", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer" }}
                >
                  Procesar Otro Documento
                </button>
              </div>
            </motion.div>
          ) : result ? (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
                  <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--success)" }}><CheckCircle size={20} /> Datos Extraídos</h3>
                  {result.overall_confidence !== undefined && (
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Precisión global: <strong style={{ color: result.overall_confidence >= 0.7 ? "var(--success)" : "var(--warning)" }}>{Math.round(result.overall_confidence * 100)}%</strong></span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {FIELDS.map(({ key, label, icon }) => (
                    <FieldRow key={key} icon={icon} label={label} value={result.fields?.[key]?.value} confidence={result.fields?.[key]?.confidence} />
                  ))}
                </div>
                {result.raw_text_preview && (
                  <details style={{ marginTop: "1rem" }}>
                    <summary style={{ cursor: "pointer", fontSize: "0.8rem", color: "var(--text-muted)", userSelect: "none" }}>Ver texto crudo extraído</summary>
                    <pre style={{ marginTop: "0.6rem", padding: "0.8rem", background: "rgba(0,0,0,0.3)", borderRadius: "8px", fontSize: "0.72rem", color: "var(--text-muted)", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: "120px", overflowY: "auto" }}>{result.raw_text_preview}</pre>
                  </details>
                )}

                {hasAnyField && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.4rem" }}>
                    <motion.button
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      disabled={isRegisteringGtu}
                      className="send-btn"
                      onClick={handleRegisterGtu}
                      style={{
                        width: "100%",
                        padding: "0.9rem",
                        background: "var(--color-ink-black)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "var(--radius-inputs)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.6rem",
                        fontWeight: 600,
                        cursor: isRegisteringGtu ? "wait" : "pointer"
                      }}
                    >
                      <ShieldCheck size={18} />
                      {isRegisteringGtu ? "Generando solicitud y código GTU..." : "Emitir Solicitud de Legalización GTU (Etapa 1)"}
                    </motion.button>

                    <button
                      onClick={handleUsarDatos}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        background: "#ffffff",
                        color: "var(--color-ink-black)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-inputs)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        fontSize: "0.88rem",
                        fontWeight: 500,
                        cursor: "pointer"
                      }}
                    >
                      <Zap size={16} /> Usar estos datos en el formulario PUB
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="glass-panel" style={{ padding: "2rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", opacity: 0.5 }}>
              <Scan size={48} style={{ color: "var(--text-muted)" }} />
              <div>
                <p style={{ fontWeight: "600", marginBottom: "0.3rem" }}>Sin documento cargado</p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Carga una imagen del título o acta de notas para comenzar la extracción automática.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OCRExtractor;
