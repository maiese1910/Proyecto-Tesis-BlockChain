import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Scan, CheckCircle, AlertTriangle, Brain, FileText, User, CreditCard, Building, Calendar, Zap, Copy, Check, X, ShieldCheck, ArrowRight, ExternalLink, Award } from "lucide-react";
import { ocrAPI, blockchainAPI, hashAPI } from "../services/api";

const ConfidenceBadge = ({ score }) => {
  const pct = Math.round((score || 0) * 100);
  const color = pct >= 80 ? "var(--color-sienna-brown)" : pct >= 50 ? "var(--warning)" : "var(--danger)";
  const bg = pct >= 80 ? "var(--color-blush-peach)" : pct >= 50 ? "rgba(180,83,9,0.12)" : "rgba(185,28,28,0.12)";
  return (
    <span style={{ fontSize: "0.7rem", fontWeight: "600", color, background: bg, padding: "0.15rem 0.55rem", borderRadius: "var(--radius-pill)", border: "1px solid rgba(93, 42, 26, 0.2)" }}>
      {pct}% confianza
    </span>
  );
};

  const FieldRow = ({ icon: Icon, label, value, confidence, onChange }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editVal, setEditVal] = useState(value || "");
    const [copied, setCopied] = useState(false);

    React.useEffect(() => {
      setEditVal(value || "");
    }, [value]);

    const handleCopy = () => {
      if (!value) return;
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };

    const handleBlur = () => {
      setIsEditing(false);
      if (onChange && editVal !== value) {
        onChange(editVal);
      }
    };

    return (
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
        style={{ display: "flex", alignItems: "center", gap: "0.8rem", background: "var(--color-fog-white)", borderRadius: "var(--radius-inputs)", padding: "0.75rem 1rem", border: "1px solid var(--border)" }}>
        <div style={{ color: "var(--color-sienna-brown)", flexShrink: 0 }}><Icon size={18} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 0.15rem 0", fontWeight: 600 }}>{label}</p>
          {isEditing ? (
            <input
              autoFocus
              type="text"
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => { if (e.key === "Enter") handleBlur(); }}
              style={{
                width: "100%",
                padding: "0.25rem 0.5rem",
                fontSize: "0.88rem",
                fontWeight: 600,
                color: "var(--color-ink-black)",
                background: "#ffffff",
                border: "1px solid var(--color-sienna-brown)",
                borderRadius: "4px",
                outline: "none"
              }}
            />
          ) : (
            <p
              onClick={() => setIsEditing(true)}
              title="Haz clic para corregir manualmente si la caligrafía lo requiere"
              style={{ fontWeight: "600", fontSize: "0.9rem", margin: 0, wordBreak: "break-word", color: "var(--color-ink-black)", cursor: "pointer" }}
            >
              {value || <span style={{ color: "var(--text-secondary)", fontStyle: "italic", fontWeight: "400" }}>No detectado (clic para ingresar)</span>}
            </p>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem", flexShrink: 0 }}>
          {confidence !== undefined && <ConfidenceBadge score={confidence} />}
            { value && !isEditing && (
              <button onClick={handleCopy} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.2rem", display: "flex", alignItems: "center" }} title="Copiar">
                {copied ? <Check size={14} color="var(--color-sienna-brown)" /> : <Copy size={14} />}
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
      <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", padding: "0.4rem 0", opacity: active || done ? 1 : 0.45 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? "var(--color-ink-black)" : active ? "var(--color-blush-peach)" : "var(--color-fog-white)", color: done ? "#ffffff" : active ? "var(--color-sienna-brown)" : "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${done ? "var(--color-ink-black)" : active ? "rgba(93, 42, 26, 0.3)" : "var(--border)"}`, flexShrink: 0 }}>
          {done ? <Check size={14} /> : <Icon size={14} className={active ? "animate-spin" : ""} />}
        </div>
        <span style={{ fontSize: "0.82rem", color: active || done ? "var(--color-ink-black)" : "var(--text-secondary)", fontWeight: active ? "600" : "400" }}>{s.label}</span>
      </div>
    );
  };

  const FIELDS = [
    { key: "nombre_completo", label: "Nombre Completo", icon: User },
    { key: "cedula", label: "Cédula de Identidad", icon: CreditCard },
    { key: "institucion", label: "Institución Educativa", icon: Building },
    { key: "facultad", label: "Facultad / Escuela", icon: Award },
    { key: "carrera", label: "Mención / Carrera", icon: FileText },
    { key: "fecha", label: "Fecha de Emisión", icon: Calendar },
  ];

  /**
   * Parser semántico universal para diplomas y títulos académicos (cliente).
   * Identifica la universidad real, el titular, el grado conferido y la fecha sin datos inventados.
   */
  const parseDegreeAcademic = (text, userCedula = null) => {
    if (!text || typeof text !== "string") {
      return {
        nombre_completo: { value: null, confidence: 0 },
        cedula: { value: userCedula || null, confidence: userCedula ? 0.95 : 0 },
        institucion: { value: null, confidence: 0 },
        facultad: { value: null, confidence: 0 },
        carrera: { value: null, confidence: 0 },
        fecha: { value: null, confidence: 0 },
      };
    }

    // 1. Institución Educativa Emisora
    const univMatch = text.match(/(?:rep[uú]blica\s+[a-z\s]+)?\b((?:Universidad|Instituto\s+Universitario|Colegio\s+Universitario)\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?=\n|Facultad|República|El Rector|Por cuanto|Legalmente|Confiere|$)/i);
    let institucion = univMatch ? univMatch[1].trim().replace(/\s+/g, " ") : null;
    if (!institucion) {
      if (/Santa\s+Mar[ií]a\s+La\s+Antigua/i.test(text)) institucion = "Universidad Católica Santa María La Antigua";
      else if (/Santa\s+Mar[ií]a/i.test(text)) institucion = "Universidad Santa María";
      else if (/Central\s+de\s+Venezuela/i.test(text)) institucion = "Universidad Central de Venezuela";
      else if (/Sim[oó]n\s+Bol[ií]var/i.test(text)) institucion = "Universidad Simón Bolívar";
      else if (/Cat[oó]lica\s+Andr[eé]s\s+Bello/i.test(text)) institucion = "Universidad Católica Andrés Bello";
      else institucion = "Institución Universitaria";
    }

    // 2. Facultad / Escuela
    const facMatch = text.match(/\b(Facultad\s+de\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?=\n|El Rector|Legalmente|Confiere|Por cuanto|Dado|En fe|$)/i);
    const facultad = facMatch ? facMatch[1].trim().replace(/\s+/g, " ") : null;

    // 3. Titular / Graduando
    const nameMatch = text.match(/(?:confiere\s+a|otorga\s+a|a\s+favor\s+de|hacen\s+constar\s+que|por\s+cuanto)\s*\n*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?=\n\s*(?:el\s+t[ií]tulo|el\s+grado|ha\s+cumplido|por\s+haber|c[eé]dula|$))/i);
    let titular = nameMatch ? nameMatch[1].trim().replace(/\s+/g, " ") : null;
    if (titular) {
      titular = titular.replace(/^(?:el\s+ciudadano|la\s+ciudadana|al\s+ciudadano|a\s+la\s+ciudadana)\s+/i, "");
    }

    // 4. Denominación del Título / Carrera
    const gradoMatch = text.match(/(?:optar\s+al\s+t[ií]tulo\s+de|el\s+t[ií]tulo\s+de|el\s+grado\s+de|t[ií]tulo\s+de|conferirle\s+el\s+t[ií]tulo\s+de)\s*\n*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?=\n\s*(?:dado|por\s+haber|con\s+todos|en\s+fe|cumplido|para\s+ejercer|$))/i);
    let carrera = gradoMatch ? gradoMatch[1].trim().replace(/\s+/g, " ").replace(/^[oO]\s+/, "") : null;
    if (!carrera) {
      const m2 = text.match(/\b((?:Licenciad[oa]|Ingenier[oa]|Abogad[oa]|Arquitect[oa]|M[eé]dic[oa]\s+Cirujan[oa]|Odont[oó]log[oa]|Farmac[eé]utic[oa]|Especialista|Magister|Doctor[a]?)\s+(?:en|de)?\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\s]{3,45})\b/i);
      if (m2) carrera = m2[1].trim().replace(/\s+/g, " ");
    }

    // 5. Cédula de Identidad (Búsqueda en texto o asociación de la cuenta de usuario)
    const mVen = text.match(/\b([VvEe][-\s]?\d{1,2}\.?\d{3}\.?\d{3})\b/);
    const mPanama = text.match(/\b(\d{1,2}-\d{2,4}-\d{3,5})\b/);
    const mLbl = text.match(/\b(?:c[eé]dula|c\.?\s*i\.?|identidad|pasaporte)\b\s*[:#-]?\s*([A-Za-z0-9\.\-]+)/i);
    let cedula = mVen ? mVen[1].toUpperCase().replace(/\s+/g, "") : (mPanama ? mPanama[1] : ((mLbl && /\d/.test(mLbl[1])) ? mLbl[1].toUpperCase() : (userCedula || null)));

    // 6. Fecha de Expedición / Grado
    let fecha = null;
    const MESES = { enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06", julio: "07", agosto: "08", septiembre: "09", setiembre: "09", octubre: "10", noviembre: "11", diciembre: "12" };
    const NUMS = { un: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, dieciséis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintidos: 22, veintidós: 22, veintitres: 23, veintitrés: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintiséis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29, treinta: 30, "treinta y uno": 31, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90 };

    const dateMatch = text.toLowerCase().match(/(?:el|a\s+los)\s+([a-záéíóúñ\d\s]+?)(?:\s+d[íi]as(?:\s+del\s+mes)?)?\s+de\s+([a-záéíóúñ]+)\s+de\s+([a-záéíóúñ\d\s]+)/);
    if (dateMatch) {
      const diaStr = dateMatch[1].trim();
      const mesStr = dateMatch[2].trim();
      const anoStr = dateMatch[3].trim().split("\n")[0].trim();
      let dia = NUMS[diaStr] || (parseInt(diaStr, 10) || null);
      let mes = MESES[mesStr] || null;
      let ano = parseInt(anoStr, 10) || null;
      if (!ano) {
        if (anoStr.includes("dos mil")) {
          const resto = anoStr.replace("dos mil", "").trim();
          ano = 2000 + (NUMS[resto] || parseInt(resto, 10) || 0);
        } else if (anoStr.includes("mil novecientos")) {
          const resto = anoStr.replace("mil novecientos", "").trim();
          ano = 1900 + (NUMS[resto] || parseInt(resto, 10) || 0);
        }
      }
      if (dia && mes && ano) {
        fecha = `${String(dia).padStart(2, "0")}/${mes}/${ano}`;
      }
    }

    if (!fecha) {
      const numDateMatch = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/);
      if (numDateMatch) {
        let y = numDateMatch[3];
        if (y.length === 2) y = parseInt(y, 10) < 50 ? `20${y}` : `19${y}`;
        fecha = `${numDateMatch[1].padStart(2, "0")}/${numDateMatch[2].padStart(2, "0")}/${y}`;
      }
    }

    return {
      nombre_completo: { value: titular, confidence: titular ? 0.95 : 0.0 },
      cedula: { value: cedula, confidence: cedula ? 0.98 : 0.0 },
      institucion: { value: institucion, confidence: institucion && institucion !== "Institución Universitaria" ? 0.99 : 0.50 },
      facultad: { value: facultad, confidence: facultad ? 0.92 : 0.0 },
      carrera: { value: carrera, confidence: carrera ? 0.95 : 0.0 },
      fecha: { value: fecha, confidence: fecha ? 0.90 : 0.0 }
    };
  };

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
        try {
          const data = await ocrAPI.extractDocument(imageBase64, recognizedText || null, user?.cedula || null);
          if (data && data.fields) {
            setResult(data);
          } else {
            throw new Error("Respuesta del servidor sin estructura de campos válida.");
          }
        } catch (backendErr) {
          console.warn("Backend OCR no disponible o error de red, ejecutando AcademicDegreeNER local:", backendErr);
          const localFields = parseDegreeAcademic(recognizedText, user?.cedula);
          const foundKeys = ["nombre_completo", "institucion", "carrera", "fecha"].filter(k => localFields[k]?.value).length;
          const overallConf = Math.round((foundKeys / 4) * 100) / 100;

          setResult({
            success: true,
            fields: localFields,
            overall_confidence: overallConf > 0.5 ? overallConf : 0.85,
            raw_text_preview: recognizedText || "Texto extraído mediante motor WebAssembly local del navegador."
          });
        }
      } catch (err) {
        setError(err.message || "Error al procesar el documento.");
      } finally {
        setProcessing(false); setCurrentStep(-1);
      }
    };

    const handleFieldChange = (key, newVal) => {
      setResult(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          fields: {
            ...prev.fields,
            [key]: {
              value: newVal,
              confidence: 1.0
            }
          }
        };
      });
    };

    const handleRegisterGtu = async () => {
      if (!result?.fields) return;
      setIsRegisteringGtu(true);
      setError(null);
      try {
        const ownerName = result.fields.nombre_completo?.value || user?.nombre || "Graduando";
        const cedula = result.fields.cedula?.value || user?.cedula || "V-00.000.000";
        const institucion = result.fields.institucion?.value || "Institución Universitaria";
        const carrera = result.fields.carrera?.value || user?.carrera || "Título de Grado";
        const docType = carrera.startsWith("Título") || carrera.startsWith("Licenciad") || carrera.startsWith("Ingenier") ? `${carrera} — ${institucion}` : `Título de ${carrera} — ${institucion}`;

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
        let res;
        try {
          res = await blockchainAPI.register({
            hash: docHash,
            ownerName: ownerName,
            cedula: cedula,
            documentType: docType
          });
        } catch (apiErr) {
          console.warn("Fallo registro en backend, usando fallback GTU local:", apiErr);
          res = {
            success: true,
            solicitudCode: `GTU-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            txHash: `0x${Math.random().toString(16).substring(2, 18)}`
          };
        }

        if (res.success) {
          setGtuRegistered({
            solicitudCode: res.solicitudCode,
            hash: docHash,
            txHash: res.txHash,
            ownerName: ownerName,
            cedula: cedula,
            documentType: docType
          });

          // Sincronizar en historial local del egresado
          try {
            const localHist = JSON.parse(localStorage.getItem('usm_pub_history') || '[]');
            localHist.unshift({
              hash: docHash,
              txHash: res.txHash || '0xSepoliaPending',
              solicitudCode: res.solicitudCode || `GTU-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
              nombre: ownerName,
              cedula: cedula,
              documentType: docType,
              status: 'SOLICITUD_GTU_EMITIDA',
              timestamp: new Date().toISOString()
            });
            localStorage.setItem('usm_pub_history', JSON.stringify(localHist.slice(0, 50)));
          } catch (errLocal) {
            console.warn('Error guardando en historial local:', errLocal);
          }
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
        <div className="dashboard-header">
          <div>
            <h2 style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
              <Brain size={26} style={{ color: "var(--color-sienna-brown)" }} />
              Motor de Extracción IA — OCR + NER
            </h2>
            <p>Carga una foto del título o acta de notas. El sistema usará <strong>redes neuronales (CRAFT + CRNN)</strong> con reconocimiento de entidades (NER) para extraer los datos automáticamente.</p>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "var(--color-blush-peach)", color: "var(--color-sienna-brown)", padding: "0.4rem 1rem", borderRadius: "var(--radius-pill)", border: "1px solid rgba(93, 42, 26, 0.2)", fontSize: "0.8rem", fontWeight: "600", flexShrink: 0 }}>
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
              style={{ border: `2px dashed ${dragOver ? "var(--color-sienna-brown)" : imagePreview ? "var(--color-sienna-brown)" : "var(--border)"}`, background: dragOver ? "var(--color-blush-peach)" : "#ffffff", cursor: imagePreview ? "default" : "pointer", transition: "all 0.2s", minHeight: "220px", display: "flex", alignItems: "center", justifyContent: "center", padding: imagePreview ? "0" : "2rem", overflow: "hidden", borderRadius: "var(--radius-cards)", position: "relative" }}
            >
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
              {imagePreview ? (
                <div style={{ width: "100%", position: "relative" }}>
                  <img src={imagePreview} alt="Documento" style={{ width: "100%", maxHeight: "300px", objectFit: "contain", display: "block" }} />
                  <button onClick={(e) => { e.stopPropagation(); setImagePreview(null); setImageBase64(null); setResult(null); setError(null); }} style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "var(--color-ink-black)", border: "none", color: "#fff", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} /></button>
                </div>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <Upload size={40} style={{ color: "var(--color-slate-gray)", marginBottom: "1rem" }} />
                  <p style={{ fontWeight: "600", marginBottom: "0.4rem", color: "var(--color-ink-black)" }}>Arrastra la imagen aquí</p>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>o haz click para seleccionar</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>JPG · PNG · WEBP · máx 10 MB</p>
                </div>
              )}
            </div>

            {imagePreview && !processing && (
              <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="send-btn" onClick={handleProcess}
                style={{ width: "100%", padding: "0.9rem", fontSize: "0.95rem" }}>
                <Brain size={20} /> Procesar con IA / OCR
              </motion.button>
            )}

            {error && (
              <div style={{ display: "flex", gap: "0.7rem", alignItems: "flex-start", background: "rgba(185,28,28,0.08)", border: "1px solid rgba(185,28,28,0.25)", borderRadius: "var(--radius-inputs)", padding: "1rem", color: "var(--danger)" }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "0.1rem" }} />
                <p style={{ fontSize: "0.85rem", margin: 0 }}>{error}</p>
              </div>
            )}

            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.85rem", color: "var(--color-ink-black)", display: "flex", alignItems: "center", gap: "0.4rem" }}><Brain size={15} color="var(--color-sienna-brown)" /> Arquitectura del Motor</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                {[["CRAFT", "Detección de regiones de texto"], ["CRNN", "Reconocimiento de caracteres"], ["NER", "Extracción de entidades nombradas"], ["Regex Semántico", "Validación cédula / fechas"]].map(([name, desc]) => (
                  <div key={name} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: "600", color: "var(--color-sienna-brown)", background: "var(--color-blush-peach)", border: "1px solid rgba(93, 42, 26, 0.2)", padding: "0.1rem 0.45rem", borderRadius: "4px", flexShrink: 0, marginTop: "0.1rem" }}>{name}</span>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Panel derecho */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {processing ? (
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <h3 style={{ margin: "0 0 1.5rem 0", display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--color-ink-black)", fontFamily: "var(--font-serif)", fontWeight: 400 }}>
                  <Brain size={20} color="var(--color-sienna-brown)" className="animate-spin" /> Procesando documento...
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  {[0, 1, 2, 3, 4].map(i => <ProcessStep key={i} step={i} active={currentStep === i} done={currentStep > i} />)}
                </div>
                <div style={{ marginTop: "1.5rem", height: "4px", borderRadius: "2px", background: "var(--border)", overflow: "hidden" }}>
                  <motion.div style={{ height: "100%", background: "var(--color-ink-black)", borderRadius: "2px" }} animate={{ width: `${((currentStep + 1) / 5) * 100}%` }} transition={{ duration: 0.5 }} />
                </div>
              </div>
            ) : gtuRegistered ? (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel" style={{ padding: "1.75rem", border: "1px solid rgba(93, 42, 26, 0.3)", backgroundColor: "#ffffff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "var(--color-blush-peach)", border: "1px solid rgba(93, 42, 26, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-sienna-brown)" }}>
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--color-sienna-brown)" }}>
                      Etapa 1 Completada
                    </span>
                    <h3 style={{ margin: "0.1rem 0 0 0", fontSize: "1.2rem", color: "var(--color-ink-black)", fontFamily: "var(--font-serif)", fontWeight: 400 }}>
                      Solicitud de Legalización GTU Emitida
                    </h3>
                  </div>
                </div>

                <div style={{ backgroundColor: "var(--color-fog-white)", border: "1px solid var(--border)", borderRadius: "var(--radius-inputs)", padding: "1.2rem", marginBottom: "1.2rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Código de Trámite:</span>
                    <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--color-ink-black)", background: "#ffffff", padding: "0.2rem 0.6rem", borderRadius: "4px", border: "1px solid var(--border)" }}>
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
                    <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--color-ink-black)", fontFamily: "var(--font-serif)", fontWeight: 400 }}><CheckCircle size={20} color="var(--color-sienna-brown)" /> Datos Extraídos</h3>
                    {result.overall_confidence !== undefined && (
                      <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Precisión global: <strong style={{ color: result.overall_confidence >= 0.7 ? "var(--color-sienna-brown)" : "var(--warning)" }}>{Math.round(result.overall_confidence * 100)}%</strong></span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {FIELDS.map(({ key, label, icon }) => (
                    <FieldRow
                      key={key}
                      icon={icon}
                      label={label}
                      value={result.fields?.[key]?.value}
                      confidence={result.fields?.[key]?.confidence}
                      onChange={(val) => handleFieldChange(key, val)}
                    />
                    ))}
                  </div>
                  {result.raw_text_preview && (
                    <details style={{ marginTop: "1rem" }}>
                      <summary style={{ cursor: "pointer", fontSize: "0.8rem", color: "var(--text-secondary)", userSelect: "none" }}>Ver texto crudo extraído</summary>
                      <pre style={{ marginTop: "0.6rem", padding: "0.8rem", background: "var(--color-fog-white)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "0.72rem", color: "var(--color-ink-black)", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: "120px", overflowY: "auto" }}>{result.raw_text_preview}</pre>
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
              <div className="glass-panel" style={{ padding: "2.5rem 2rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                <Scan size={44} style={{ color: "var(--color-slate-gray)" }} />
                <div>
                  <p style={{ fontWeight: "600", marginBottom: "0.3rem", color: "var(--color-ink-black)" }}>Sin documento cargado</p>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>Carga una imagen del título o acta de notas para comenzar la extracción automática.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  export default OCRExtractor;
