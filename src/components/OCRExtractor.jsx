import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Scan, CheckCircle, AlertTriangle, Brain, FileText, User, CreditCard, Building, Calendar, Zap, Copy, Check } from "lucide-react";
import { ocrAPI } from "../services/api";

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

const OCRExtractor = ({ user, onDataExtracted }) => {
  const [dragOver, setDragOver] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) { setError("Selecciona una imagen (JPG, PNG, WEBP)."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("La imagen no debe superar los 10 MB."); return; }
    setError(null); setResult(null);
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
    setProcessing(true); setResult(null); setError(null);
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
                <button onClick={(e) => { e.stopPropagation(); setImagePreview(null); setImageBase64(null); setResult(null); setError(null); }} style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
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
                  <motion.button initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="send-btn" onClick={handleUsarDatos}
                    style={{ marginTop: "1.2rem", width: "100%", padding: "0.85rem", background: "linear-gradient(135deg, #10b981, #0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem" }}>
                    <Zap size={18} /> Usar estos datos en el formulario PUB
                  </motion.button>
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
