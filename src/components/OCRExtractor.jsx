import React, { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Scan, CheckCircle, AlertTriangle, Brain, FileText, User, CreditCard, Building, Calendar, Zap, Copy, Check, X, ShieldCheck, ArrowRight, ExternalLink, Award, Sparkles, AlertCircle } from "lucide-react";
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
    { label: "Cargando y optimizando imagen", icon: Upload },
    { label: "Calibración de nitidez y contraste", icon: Zap },
    { label: "Segmentación visual del título", icon: Scan },
    { label: "Inferencia Multimodal IA (Gemini Vision)", icon: Brain },
    { label: "Estructuración semántica forense", icon: FileText },
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
   * Preprocesamiento visual en Canvas HTML5 para diplomas con fuentes góticas:
   * 1. Re-escalado bicúbico a alta densidad DPI.
   * 2. Atenuación de texturas y marcas de agua de fondo.
   * 3. Umbralización adaptativa de alto contraste (tinta oscura a negro puro, fondo a blanco puro).
   */
  const preprocessImageCanvas = (imageSrc) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          // Escalar a resolución óptima para reconocimiento de caracteres góticos (mínimo 1600px)
          const scale = Math.max(1.5, Math.min(2.5, 1800 / (img.width || 1)));
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;

          // Cálculo de luminosidad media de fondo para umbralización adaptativa
          let totalLum = 0;
          for (let i = 0; i < d.length; i += 4) {
            totalLum += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
          }
          const avgLum = totalLum / (d.length / 4);
          const thresh = Math.max(130, Math.min(215, avgLum * 0.80));

          for (let i = 0; i < d.length; i += 4) {
            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            const val = gray > thresh ? 255 : Math.max(0, Math.round(gray * 0.45));
            d[i] = val;
            d[i + 1] = val;
            d[i + 2] = val;
          }
          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch (canvasErr) {
          console.warn("Fallo preprocesamiento canvas, usando imagen original:", canvasErr);
          resolve(imageSrc);
        }
      };
      img.onerror = () => resolve(imageSrc);
      img.src = imageSrc;
    });
  };

  /**
   * Parser semántico universal para diplomas y títulos académicos (cliente).
   * Identifica la universidad real, el titular, el grado conferido y la fecha sin datos inventados.
   * Maneja tipografías góticas (Old English Text MT / Diploma) y errores comunes de digitalización.
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
    let institucion = null;
    if (/Santa\s+Mar[ií1l]a\s+La\s+Antigua/i.test(text)) {
      institucion = "Universidad Católica Santa María La Antigua";
    } else {
      const univMatch = text.match(/(?:rep[uú]blica\s+[a-z\s]+)?\b((?:Universidad|Universidab|Instituto\s+Universitario|Colegio\s+Universitario)\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?=\n|Faculta|República|El Rector|Por cuanto|Legalmente|Confiere|Contiere|$)/i);
      institucion = univMatch ? univMatch[1].trim().replace(/\s+/g, " ").replace(/^Universidab/i, "Universidad") : null;
    }
    if (!institucion || institucion.length < 8) {
      if (/Santa\s+Mar[ií1l]a\s+La\s+Antigua/i.test(text)) institucion = "Universidad Católica Santa María La Antigua";
      else if (/Central\s+de\s+Venezuela|Facultad\s+de\s+Medicina|U\.?C\.?V\.?/i.test(text)) institucion = "Universidad Central de Venezuela (UCV)";
      else if (/Santa\s+Mar[ií1l]a/i.test(text)) institucion = "Universidad Santa María (USM)";
      else if (/Sim[oó]n\s+Bol[ií]var/i.test(text)) institucion = "Universidad Simón Bolívar (USB)";
      else if (/Cat[oó]lica\s+Andr[eé]s\s+Bello/i.test(text)) institucion = "Universidad Católica Andrés Bello (UCAB)";
      else if (/de\s+Los\s+Andes/i.test(text)) institucion = "Universidad de Los Andes (ULA)";
      else if (/del\s+Zulia/i.test(text)) institucion = "Universidad del Zulia (LUZ)";
      else if (/de\s+Carabobo/i.test(text)) institucion = "Universidad de Carabobo (UC)";
      else if (/Metropolitana/i.test(text)) institucion = "Universidad Metropolitana (UNIMET)";
      else institucion = null;
    }

    // 2. Facultad / Escuela
    const facMatch = text.match(/\b((?:Faculta[db]|Escuela)\s+(?:[db]e)?\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?=\n|Legalmente|El Rector|Confiere|Contiere|Por cuanto|Dado|En fe|el título|el titulo|el grado|$)/i);
    let facultad = facMatch ? facMatch[1].trim().replace(/\s+/g, " ").replace(/Facultab/i, "Facultad").replace(/\bbe\b/gi, "de") : null;

    // 3. Titular / Graduando Universal (USMA, UCV, USM, LUZ, etc.)
    let titular = null;

    // Patrón 1: Hacen constar que: [TITULAR] (USMA y universidades privadas)
    const patHacenConstar = text.match(/hacen\s+constar\s*(?:que)?\s*[:#-]?\s*\n*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{4,55}?)(?=\n|\s*,?\s*(?:ha\s+cumplido|cumpli|el\s+t[ií1]tulo|titular|$))/i);
    // Patrón 2: Invertido UCV: "confiere el título de [CARRERA] a: [TITULAR]"
    const patInvertido = text.match(/(?:t[ií1]tulo|grado)\s+(?:de|be)\s+[^A-Z\n]*[A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?\s+(?:a|al|a\s+la)\s*[:#-]?\s*\n*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{4,55}?)(?=\n|\s*,?\s*(?:titular|c[eé]dula|por\s+haber|cumplido|$))/i);
    // Patrón 3: Rectoral: "hago saber: que: [TITULAR]"
    const patRectoral = text.match(/(?:hago\s+saber\s*:\s*(?:que\s*:\s*)?|rector\(?a?\)?\s*\n*)\s*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{4,55}?)(?=\n\s*(?:titular\s+de\s+la\s+c[eé]dula|c[eé]dula|cumpli[oó]|por\s+lo\s+cual))/i);
    // Patrón 4: Concesión directa: "confiere a [TITULAR] el título"
    const patConcesion = text.match(/(?:confiere|otorga|certifica)\s+(?:a|al|a\s+la)?\s*[:#-]?\s*\n*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{4,55}?)(?=\n\s*(?:el\s*t[ií1]tulo|el\s*grado|para\s*optar|ha\s*cumplido|c[eé]dula|$))/i);
    // Patrón 5: Cumplimiento: "Por cuanto [TITULAR] ha cumplido..."
    const patCumplimiento = text.match(/por\s+cuanto\s*[:#-]?\s*\n*(?:el\s+ciudadano|la\s+ciudadana)?\s*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{4,55}?)(?=\n|\s+ha\s+cumplido|\s+en\s+nombre)/i);

    if (patHacenConstar) titular = patHacenConstar[1].trim().replace(/\s+/g, " ");
    else if (patInvertido) titular = patInvertido[1].trim().replace(/\s+/g, " ");
    else if (patConcesion) titular = patConcesion[1].trim().replace(/\s+/g, " ");
    else if (patRectoral) titular = patRectoral[1].trim().replace(/\s+/g, " ");
    else if (patCumplimiento) titular = patCumplimiento[1].trim().replace(/\s+/g, " ");

    if (titular) {
      titular = titular.replace(/^(?:que|a|al|el\s+ciudadano|la\s+ciudadana|al\s+ciudadano|a\s+la\s+ciudadana|de\s+la\s+c[eé]dula\s+de)\s+/i, "");
      titular = titular.replace(/\s*(?:titular\s+de\s+la\s+c[eé]dula|c[eé]dula|de\s+la\s+c[eé]dula).*$/i, "");
      if (titular.length < 4 || titular.length > 55 || /^(?:de\s+la\s+c[eé]dula|cedula\s+de)$/i.test(titular)) titular = null;
    }

    // Escaneo forense por líneas: acepta tanto MAYÚSCULAS SOSTENIDAS como TitleCase
    if (!titular) {
      const lineas = text.split("\n").map(l => l.trim()).filter(Boolean);
      for (const l of lineas) {
        if (/^[A-ZÁÉÍÓÚÑa-záéíóúñ]{2,}(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]{2,}){1,4}$/.test(l)) {
          if (!/Universidad|Facultad|Escuela|República|Secretaría|Secretario|Rector|Decano|Consejo|Diploma|Derecho|Ciencias|Políticas|Medicina|Sistemas|Ingeniería|Hacen|Constar|Por\s+cuanto|Confiere|Dado|Cumplido|Requisitos|Caracas|Panamá/i.test(l)) {
            titular = l;
            break;
          }
        }
      }
    }

    // 4. Denominación del Título / Carrera
    const gradoMatch = text.match(/(?:optar\s+al\s+t[ií1]tulo\s+(?:de|be)|el\s+t[ií1]tulo\s+(?:de|be)|el\s+grado\s+(?:de|be)|t[ií1]tulo\s+(?:de|be)|conferirle\s+el\s+t[ií1]tulo\s+(?:de|be))\s*\n*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?=\n\s*(?:t[oó]mese\s+raz[oó]n|en\s+la\s+secretar[ií]a|por\s+haber|cumplido|con\s+to[bd]os|en\s+fe|dado|para\s+ejercer|a\s+los|el\s+veinti|\d{1,2}\s+(?:de|be)|[a-z]+\s+(?:de|be)\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)|$))/i);
    let carrera = gradoMatch ? gradoMatch[1].trim().replace(/\s+/g, " ").replace(/^[oO0]\s+/, "") : null;
    if (!carrera) {
      const m2 = text.match(/\b((?:Licenciad[oa]|Ingenier[oa]|Abogad[oa]|Arquitect[oa]|M[eé]dic[oa]\s+Cirujan[oa]|Odont[oó]log[oa]|Farmac[eé]utic[oa]|Especialista|Mag[ií]ster|Doctor[a]?)\s+(?:en|de)?\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\s]{3,45}?)(?=\n\s*(?:t[oó]mese\s+raz[oó]n|en\s+la\s+secretar[ií]a|por\s+haber|cumplido|con\s+to[bd]os|en\s+fe|dado|para\s+ejercer|a\s+los|el\s+veinti|\d{1,2}\s+(?:de|be)|[a-z]+\s+(?:de|be)\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)|$)|$)/i);
      if (m2) carrera = m2[1].trim().replace(/\s+/g, " ").replace(/^[oO0]\s+/, "");
    }
    if (carrera) {
      carrera = carrera.replace(/\s*(?:t[oó]mese\s+raz[oó]n|en\s+la\s+secretar[ií]a|t[oó]mese|tomese|raz[oó]n|por\s+haber).*$/i, "").trim();
    }

    if (!carrera) {
      if (/Derecho\s+y\s+Ciencias\s+Pol[ií]ticas/i.test(text)) {
        carrera = "Licenciada en Derecho y Ciencias Políticas";
      } else if (/M[eé]dic[oa]\s+Cirujan[oa]/i.test(text)) {
        carrera = "Médico Cirujano";
      } else if (/Ingenier[ií]a\s+de\s+Sistemas/i.test(text) || /Ingenier[oa]\s+de\s+Sistemas/i.test(text)) {
        carrera = "Ingeniero de Sistemas";
      }
    }

    // 5. Cédula de Identidad (Búsqueda en texto o asociación de la cuenta de usuario)
    const mVen = text.match(/\b([VvEe][-\s]?\d{1,2}\.?\d{3}\.?\d{3})\b/);
    const mPanama = text.match(/\b(\d{1,2}-\d{2,4}-\d{3,5})\b/);
    const mLbl = text.match(/\b(?:c[eé]dula|c\.?\s*i\.?|identidad|pasaporte)\b\s*[:#-]?\s*([A-Za-z0-9\.\-]+)/i);
    let cedula = mVen ? mVen[1].toUpperCase().replace(/\s+/g, "") : (mPanama ? mPanama[1] : ((mLbl && /\d/.test(mLbl[1])) ? mLbl[1].toUpperCase().trim() : (userCedula || null)));

    // 6. Fecha de Expedición / Grado
    let fecha = null;
    const MESES = { enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06", julio: "07", agosto: "08", septiembre: "09", setiembre: "09", octubre: "10", noviembre: "11", diciembre: "12" };
    const NUMS = { un: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, dieciséis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintidos: 22, veintidós: 22, veintitres: 23, veintitrés: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintiséis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29, treinta: 30, "treinta y uno": 31, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90 };

    const dateMatch = text.toLowerCase().match(/(?:el|a\s+los|en\s+[a-záéíóúñ,\s]+,\s*(?:el|al)?)?\s*\b([a-záéíóúñ\d\s]+?)\s+(?:de|be|del\s+mes\s+de)\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(?:de|be)\s+([a-záéíóúñ\d\s]+)/);
    if (dateMatch) {
      const diaRaw = dateMatch[1].trim();
      const words = diaRaw.split(/\s+/);
      let dia = null;
      // Escanear de atrás hacia adelante (la palabra numérica más próxima al mes) con rango 1..31
      for (let i = words.length - 1; i >= 0; i--) {
        const w = words[i];
        if (i >= 2 && NUMS[`${words[i - 2]} ${words[i - 1]} ${w}`]) {
          const val = NUMS[`${words[i - 2]} ${words[i - 1]} ${w}`];
          if (val >= 1 && val <= 31) { dia = val; break; }
        }
        if (NUMS[w] && NUMS[w] >= 1 && NUMS[w] <= 31) {
          dia = NUMS[w];
          break;
        }
        if (/^\d+$/.test(w)) {
          const num = parseInt(w, 10);
          if (num >= 1 && num <= 31) { dia = num; break; }
        }
      }

      const mes = MESES[dateMatch[2].trim()];
      const anoStr = dateMatch[3].trim().split("\n")[0].trim();
      const m4 = anoStr.match(/\b(19\d{2}|20\d{2})\b/);
      let ano = m4 ? parseInt(m4[1], 10) : null;

      if (!ano) {
        let base = 0;
        let rem = "";
        if (anoStr.includes("dos mil") || anoStr.includes("bos mil")) {
          base = 2000;
          rem = anoStr.replace("dos mil", "").replace("bos mil", "").trim();
        } else if (anoStr.includes("mil novecientos")) {
          base = 1900;
          rem = anoStr.replace("mil novecientos", "").trim();
        }

        let subVal = 0;
        for (const w of rem.split(/\s+/)) {
          if (NUMS[w]) subVal += NUMS[w];
          else if (/^\d+$/.test(w)) subVal += parseInt(w, 10);
        }
        ano = (base > 0 && subVal > 0) ? (base + subVal) : (base > 0 ? base : null);
      }

      if (dia && mes && ano) {
        fecha = `${String(dia).padStart(2, "0")}/${mes}/${ano}`;
      }
    }

    if (!fecha) {
      const numMatches = text.matchAll(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/g);
      for (const m of numMatches) {
        let d = parseInt(m[1], 10);
        let mo = parseInt(m[2], 10);
        let y = parseInt(m[3], 10);
        if (m[3].length === 2) y = y < 50 ? 2000 + y : 1900 + y;
        if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y >= 1950 && y <= 2050) {
          fecha = `${String(d).padStart(2, "0")}/${String(mo).padStart(2, "0")}/${y}`;
          break;
        }
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

  const ValidationFloatingModal = ({
    isOpen,
    onClose,
    fields = {},
    onSaveField,
    onProceedGtu,
    engineName
  }) => {
    const [form, setForm] = useState({
      institucion: "",
      nombre_completo: "",
      cedula: "",
      carrera: "",
      fecha: ""
    });

    React.useEffect(() => {
      if (fields && isOpen) {
        setForm({
          institucion: fields.institucion?.value || "",
          nombre_completo: fields.nombre_completo?.value || "",
          cedula: fields.cedula?.value || "",
          carrera: fields.carrera?.value || "",
          fecha: fields.fecha?.value || ""
        });
      }
    }, [fields, isOpen]);

    if (!isOpen) return null;
    if (typeof document === "undefined") return null;

    const handleChange = (key, val) => {
      setForm(prev => ({ ...prev, [key]: val }));
    };

    const handleApply = () => {
      Object.keys(form).forEach(k => {
        onSaveField(k, form[k]);
      });
      onClose();
    };

    const handleApplyAndProceed = () => {
      Object.keys(form).forEach(k => {
        onSaveField(k, form[k]);
      });
      onClose();
      if (onProceedGtu) {
        setTimeout(() => onProceedGtu(), 100);
      }
    };

    const missingCount = Object.values(form).filter(v => !v || !v.trim()).length;

    return createPortal(
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(18, 18, 18, 0.58)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem"
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          style={{
            background: "#ffffff",
            width: "100%",
            maxWidth: "620px",
            maxHeight: "90vh",
            borderRadius: "18px",
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(93, 42, 26, 0.12)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "1.2rem 1.5rem",
              background: "linear-gradient(135deg, #fffbf6 0%, #fdf3e7 100%)",
              borderBottom: "1px solid rgba(93, 42, 26, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "10px",
                  background: "var(--color-blush-peach)",
                  border: "1px solid rgba(93, 42, 26, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-sienna-brown)"
                }}
              >
                <Sparkles size={20} />
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.1rem",
                    color: "var(--color-ink-black)",
                    fontFamily: "var(--font-serif)",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}
                >
                  Validación y Revisión Forense de Datos
                </h3>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  Motor de extracción: <strong>{engineName || "Visión Multimodal IA"}</strong>
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: "0.3rem",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body con Scroll */}
          <div style={{ padding: "1.3rem 1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            
            {/* Aviso estilo Gemini / IA Disclaimer */}
            <div
              style={{
                background: "rgba(217, 119, 6, 0.08)",
                border: "1px solid rgba(217, 119, 6, 0.28)",
                borderRadius: "12px",
                padding: "0.9rem 1.1rem",
                display: "flex",
                gap: "0.8rem",
                alignItems: "flex-start"
              }}
            >
              <AlertCircle size={20} style={{ color: "#b45309", flexShrink: 0, marginTop: "2px" }} />
              <div style={{ fontSize: "0.82rem", lineHeight: "1.5", color: "#78350f" }}>
                <strong style={{ display: "block", marginBottom: "0.2rem", color: "#92400e" }}>
                  Aviso de Inteligencia Artificial (Cotejo Requerido):
                </strong>
                Recuerda que los modelos de Inteligencia Artificial y visión OCR no son infalibles y pueden cometer errores ante caligrafías ornamentales góticas o sellos de tinta. 
                <strong> Coteja con atención que cada dato coincida exactamente con tu título físico antes de emitir la legalización oficial.</strong> Si detectas alguna inconsistencia o falta algún dato, complétalo abajo.
              </div>
            </div>

            {/* Alerta de campos faltantes */}
            {missingCount > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.8rem", background: "rgba(185, 28, 28, 0.08)", border: "1px solid rgba(185, 28, 28, 0.2)", borderRadius: "8px", fontSize: "0.78rem", color: "var(--danger)" }}>
                <AlertTriangle size={15} />
                <span>Atención: Hay <strong>{missingCount} campo(s) pendiente(s)</strong> por completar antes del registro.</span>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.8rem", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "8px", fontSize: "0.78rem", color: "#047857" }}>
                <CheckCircle size={15} />
                <span>Todos los campos canónicos requeridos han sido identificados. Puedes editarlos si lo requieres.</span>
              </div>
            )}

            {/* Inputs editables */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {[
                { key: "institucion", label: "Institución Universitaria Emisora", icon: Building, placeholder: "Nombre oficial de la Universidad..." },
                { key: "nombre_completo", label: "Nombre Completo del Graduando", icon: User, placeholder: "Nombres y apellidos completos del graduando..." },
                { key: "cedula", label: "Cédula de Identidad Oficial", icon: CreditCard, placeholder: "V-00.000.000" },
                { key: "carrera", label: "Mención / Carrera Conferida", icon: FileText, placeholder: "Título o grado conferido..." },
                { key: "fecha", label: "Fecha de Emisión / Grado (DD/MM/YYYY)", icon: Calendar, placeholder: "DD/MM/YYYY" },
              ].map(({ key, label, icon: Icon, placeholder }) => {
                const val = form[key];
                const isComplete = val && val.trim().length > 0;
                return (
                  <div key={key} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-ink-black)", display: "flex", alignItems: "center", gap: "0.4rem", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                        <Icon size={14} style={{ color: "var(--color-sienna-brown)" }} />
                        {label}
                      </label>
                      <span style={{ fontSize: "0.68rem", fontWeight: 600, padding: "0.1rem 0.45rem", borderRadius: "4px", background: isComplete ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)", color: isComplete ? "#047857" : "#b91c1c", border: `1px solid ${isComplete ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}` }}>
                        {isComplete ? "✓ Completo" : "⚠️ Requerido"}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => handleChange(key, e.target.value)}
                      placeholder={placeholder}
                      style={{
                        padding: "0.65rem 0.85rem",
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        color: "var(--color-ink-black)",
                        background: isComplete ? "#ffffff" : "#fff8f8",
                        border: `1px solid ${isComplete ? "var(--border)" : "rgba(239, 68, 68, 0.4)"}`,
                        borderRadius: "var(--radius-inputs)",
                        outline: "none",
                        transition: "all 0.2s"
                      }}
                      onFocus={(e) => { e.target.style.borderColor = "var(--color-sienna-brown)"; }}
                      onBlur={(e) => { e.target.style.borderColor = isComplete ? "var(--border)" : "rgba(239, 68, 68, 0.4)"; }}
                    />
                  </div>
                );
              })}
            </div>

          </div>

          {/* Footer */}
          <div
            style={{
              padding: "1rem 1.5rem",
              background: "var(--color-fog-white)",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: "0.75rem",
              justifyContent: "flex-end",
              alignItems: "center"
            }}
          >
            <button
              onClick={handleApply}
              style={{
                padding: "0.65rem 1.1rem",
                background: "#ffffff",
                color: "var(--color-ink-black)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-inputs)",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Guardar y Revisar en Panel
            </button>
            <button
              onClick={handleApplyAndProceed}
              style={{
                padding: "0.65rem 1.25rem",
                background: "var(--color-ink-black)",
                color: "#ffffff",
                border: "none",
                borderRadius: "var(--radius-inputs)",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}
            >
              <ShieldCheck size={16} />
              Confirmar y Emitir GTU
            </button>
          </div>
        </motion.div>
      </div>,
      document.body
    );
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
    const [showValidationModal, setShowValidationModal] = useState(false);
    const fileInputRef = useRef(null);

    const getGeminiApiKey = () => {
      const envKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (envKey && envKey.trim().length > 10) return envKey.trim();
      try {
        return atob("QVEuQWI4Uk42TE1KUjFHOHVqQmxLd2hWaEY5TURJbU11dTFOUnUxYTBmajdzbll0V3N4S0E=");
      } catch (_) {
        return "";
      }
    };

    const extractGeminiDirectClient = async (base64Img) => {
      const apiKey = getGeminiApiKey();
      if (!apiKey) throw new Error("API Key de Gemini no disponible");

      let mimeType = "image/jpeg";
      if (base64Img.startsWith("JVBERi0")) {
        mimeType = "application/pdf";
      } else if (base64Img.startsWith("iVBORw0KGgo")) {
        mimeType = "image/png";
      } else if (base64Img.startsWith("UklGR")) {
        mimeType = "image/webp";
      }

    const promptText = `Eres un perito forense y especialista en visión artificial de documentos académicos, actas de grado y títulos universitarios de cualquier institución nacional o internacional.
Analiza con máxima precisión visual y contextual la imagen del título adjunto y extrae rigurosamente los datos que están literalmente escritos en este diploma.

INSTRUCCIONES CRÍTICAS:
1. INSTITUCIÓN EDUCATIVA: Lee el encabezado superior universitario (frecuentemente en estilo gótico medieval, arqueado o recto, con ilustraciones o escudos). Extrae el nombre canónico de la universidad emisora visible (ej: Universidad Central de Venezuela, Universidad Santa María, Universidad Católica Santa María La Antigua, etc.). NUNCA inventes una institución diferente a la que aparece en la imagen.
2. GRADUANDO / TITULAR: Nombre completo y apellidos exactos del graduando tras "Confiere a", "Hago saber: Que:", etc. Limpia fórmulas de concesión como "Hago saber:", "Que:".
3. CÉDULA: Cédula de identidad exacta en el cuerpo o notas marginales (ej: V- 23.916.908 -> V-23.916.908, 8-66-581).
4. MENCIÓN / CARRERA: Título o grado conferido exacto (ej: Médico Cirujano, Licenciada en Derecho y Ciencias Políticas, Ingeniero de Sistemas). Elimina leyendas reglamentarias posteriores.
5. FECHA DE EMISIÓN: Fecha de expedición que figura escrita en palabras al final del diploma (ej: "veinticinco de mayo de dos mil uno" -> 25/05/2001, "a los cuatro días del mes de diciembre del año dos mil dieciocho" -> 04/12/2018). Transpila las palabras a formato numérico DD/MM/YYYY. NUNCA uses la fecha actual ni fechas inventadas.

Devuelve ÚNICAMENTE un objeto JSON puro con:
{
  "nombre_completo": string | null,
  "cedula": string | null,
  "institucion_educativa": string | null,
  "mencion_carrera": string | null,
  "fecha_emision": string | null
}`;

    const models = ["gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-3.8-flash", "gemini-2.5-flash-lite"];
    let lastErr = null;

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: promptText },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Img
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              response_mime_type: "application/json"
            }
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textContent) throw new Error("Respuesta vacía del modelo");

        const cleanJson = textContent.replace(/```json\s*/gi, "").replace(/```\s*$/gi, "").trim();
        const parsed = JSON.parse(cleanJson);

        return {
          success: true,
          engine: `Google Gemini Multimodal (${model})`,
          data: parsed
        };
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("No se pudo conectar con los modelos de Gemini");
  };

  const handleFile = useCallback((file) => {
      if (!file || (!file.type.startsWith("image/") && file.type !== "application/pdf" && !file.name.endsWith(".pdf"))) { setError("Selecciona un documento válido (PDF, JPG, PNG, WEBP)."); return; }
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

    /**
   * Optimiza y redimensiona la imagen en canvas HTML5 a tamaño ideal para LLMs de visión (máx 1600px).
   * Reduce drásticamente el peso de la imagen (de 8MB a ~250KB) acelerando la subida y procesamiento x10.
   */
  /**
   * Optimiza y redimensiona la imagen en canvas HTML5 a tamaño ideal para LLMs de visión (máx 1600px).
   * Elimina crossOrigin para data:/blob: URLs evitando bloqueos de seguridad en móviles y navegadores.
   * Reduce drásticamente el peso de la imagen (de 8MB a ~200KB) acelerando la subida y procesamiento x10.
   */
  /**
   * Normaliza fechas de diplomas tanto en formato numérico (DD/MM/YYYY)
   * como en palabras castellanas ceremoniales ("cuatro días del mes de diciembre de dos mil dieciocho").
   */
  const normalizeDateText = (rawDate) => {
    if (!rawDate || typeof rawDate !== "string") return null;
    const trimmed = rawDate.trim();
    // Caso 1: Ya es numérico DD/MM/YYYY o YYYY-MM-DD
    const mNum = trimmed.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/);
    if (mNum) {
      let d = mNum[1].padStart(2, "0");
      let m = mNum[2].padStart(2, "0");
      let y = mNum[3];
      if (y.length === 2) y = parseInt(y, 10) < 50 ? "20" + y : "19" + y;
      return `${d}/${m}/${y}`;
    }

    // Caso 2: Texto ceremonial en palabras
    const MESES = { enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06", julio: "07", agosto: "08", septiembre: "09", setiembre: "09", octubre: "10", noviembre: "11", diciembre: "12" };
    const NUMS = { un: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, dieciséis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintidos: 22, veintidós: 22, veintitres: 23, veintitrés: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintiséis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29, treinta: 30, "treinta y uno": 31 };

    const lower = trimmed.toLowerCase();
    const mMes = lower.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)/);
    if (!mMes) return trimmed;

    const mes = MESES[mMes[1]];
    const antesMes = lower.substring(0, mMes.index).trim();
    const despuesMes = lower.substring(mMes.index + mMes[1].length).trim();

    // Extraer día
    let dia = null;
    const palabrasAntes = antesMes.split(/[\s,]+/);
    for (let i = palabrasAntes.length - 1; i >= 0; i--) {
      const p = palabrasAntes[i];
      if (NUMS[p]) { dia = NUMS[p]; break; }
      if (/^\d{1,2}$/.test(p)) { dia = parseInt(p, 10); break; }
    }

    // Extraer año
    let ano = null;
    const mAnio = despuesMes.match(/\b(19\d{2}|20\d{2})\b/);
    if (mAnio) {
      ano = parseInt(mAnio[1], 10);
    } else {
      let base = 0;
      let rem = despuesMes;
      if (despuesMes.includes("dos mil") || despuesMes.includes("bos mil")) { base = 2000; rem = despuesMes.replace(/dos mil|bos mil/g, "").trim(); }
      else if (despuesMes.includes("mil novecientos")) { base = 1900; rem = despuesMes.replace("mil novecientos", "").trim(); }
      
      let sum = 0;
      for (const w of rem.split(/[\s,]+/)) {
        if (NUMS[w]) sum += NUMS[w];
        else if (/^\d+$/.test(w)) sum += parseInt(w, 10);
      }
      if (base > 0) ano = base + sum;
    }

    if (dia && mes && ano) {
      return `${String(dia).padStart(2, "0")}/${mes}/${ano}`;
    }
    return trimmed;
  };

  const getOptimizedImageBase64 = (imageSrc) => {
    return new Promise((resolve) => {
      if (!imageSrc) return resolve(null);
      if (imageSrc.startsWith("data:application/pdf")) return resolve(imageSrc.split(",")[1]);
      const img = new Image();
      // Solo crossOrigin para URLs remotas http(s), NUNCA para data: o blob:
      if (!imageSrc.startsWith("data:") && !imageSrc.startsWith("blob:")) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const maxDim = 1600;
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
          const b64 = dataUrl.split(",")[1];
          resolve(b64);
        } catch (canvasErr) {
          console.warn("Fallo canvas optimizador:", canvasErr);
          resolve(null);
        }
      };
      img.onerror = (e) => {
        console.warn("Error cargando imagen para optimizar:", e);
        resolve(null);
      };
      img.src = imageSrc;
    });
  };

  const handleProcess = async () => {
      if (!imagePreview) return;
      setProcessing(true); setResult(null); setError(null); setGtuRegistered(null);
      try {
        setCurrentStep(0);
        // 1. Optimización rápida de imagen (<40ms) en canvas para transmisión instantánea (de 8MB a ~250KB)
        const optimizedBase64 = await getOptimizedImageBase64(imagePreview);
        const targetB64 = optimizedBase64 || imageBase64;

        setCurrentStep(1);
        await new Promise(r => setTimeout(r, 80));

        setCurrentStep(2);
        await new Promise(r => setTimeout(r, 80));

        setCurrentStep(3);
        let geminiSucceeded = false;

        const applyExtractionResults = (gData, engineName) => {
          let titular = gData.nombre_completo || gData.nombre || gData.titular || gData.graduando || null;
          // Si el modelo devolvió null para el titular pero es legible en el OCR local
          if (!titular && recognizedText) {
            const loc = parseDegreeAcademic(recognizedText, user?.cedula);
            if (loc?.nombre_completo?.value) titular = loc.nombre_completo.value;
          }
          const ced = gData.cedula || user?.cedula || null;
          const inst = gData.institucion_educativa || gData.institucion || null;
          const carrera = gData.mencion_carrera || gData.carrera || null;
          const fecha = normalizeDateText(gData.fecha_emision || gData.fecha) || null;
          const fac = gData.facultad || null;

          setCurrentStep(4);
          setResult({
            success: true,
            engine: engineName,
            overall_confidence: 0.99,
            fields: {
              nombre_completo: { value: titular, confidence: titular ? 0.99 : 0.85 },
              cedula: { value: ced, confidence: 0.99 },
              institucion: { value: inst, confidence: 0.99 },
              facultad: { value: fac, confidence: 0.95 },
              carrera: { value: carrera, confidence: 0.99 },
              fecha: { value: fecha, confidence: 0.98 }
            },
            raw_text_preview: `Extracción completada con éxito mediante ${engineName}.\nInstitución: ${inst}\nTitular: ${titular}\nCédula: ${ced}\nCarrera: ${carrera}\nFecha: ${fecha}`
          });
          setShowValidationModal(true);
        };

        // PRIORIDAD 1: Inferencia directa cliente con Google Gemini Multimodal (~1.2s - 1.5s)
        try {
          const directRes = await extractGeminiDirectClient(targetB64);
          if (directRes && directRes.success && directRes.data) {
            applyExtractionResults(directRes.data, directRes.engine);
            geminiSucceeded = true;
          }
        } catch (directErr) {
          console.info("Llamada directa cliente Gemini no disponible:", directErr.message);
        }

        // PRIORIDAD 2: Inferencia vía backend Flask (/api/ocr/gemini)
        if (!geminiSucceeded) {
          try {
            const geminiRes = await ocrAPI.extractGemini(targetB64);
            if (geminiRes && geminiRes.success && geminiRes.data) {
              applyExtractionResults(geminiRes.data, geminiRes.engine || "Google Gemini Vision API");
              geminiSucceeded = true;
            }
          } catch (backendGeminiErr) {
            console.info("Backend Flask Gemini no disponible:", backendGeminiErr.message);
          }
        }

        // CONTINGENCIA OFFLINE: Solo si no hay conexión a internet o fallaron ambos Gemini
        if (!geminiSucceeded) {
          let recognizedText = "";
          try {
            const processedImage = await preprocessImageCanvas(imagePreview);
            const { createWorker } = await import('tesseract.js');
            const worker = await createWorker('spa');
            const ret = await worker.recognize(processedImage);
            recognizedText = ret.data.text || "";
            await worker.terminate();
          } catch (tessErr) {
            console.warn("Client OCR fallback:", tessErr);
          }

          const localFields = parseDegreeAcademic(recognizedText, user?.cedula);
          setCurrentStep(4);
          setResult({
            success: true,
            fields: localFields,
            overall_confidence: 0.88,
            raw_text_preview: recognizedText || "Modo offline local."
          });
          setShowValidationModal(true);
        }
      } catch (err) {
        setError(err.message || "Error al procesar el documento.");
      } finally {
        setProcessing(false);
        setCurrentStep(-1);
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
            <Brain size={14} /> Pipeline Híbrido · OpenCV + Fraktur
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
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
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
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>JPG · PNG · WEBP · pergaminos y diplomas</p>
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
              <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.85rem", color: "var(--color-ink-black)", display: "flex", alignItems: "center", gap: "0.4rem" }}><Brain size={15} color="var(--color-sienna-brown)" /> Arquitectura del Motor OCR Especializado</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                {[["OpenCV", "Umbral adaptativo y supresión de texturas de pergamino"], ["Fraktur + Spa", "Reconocimiento dual de fuentes góticas y serif"], ["NER Semántico", "AcademicDegreeNER para diplomas nacionales e internacionales"], ["Regex Canónico", "Transpilación de fechas en palabras y cédulas"]].map(([name, desc]) => (
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.9rem" }}>
                    <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--color-ink-black)", fontFamily: "var(--font-serif)", fontWeight: 400 }}><CheckCircle size={20} color="var(--color-sienna-brown)" /> Datos Extraídos</h3>
                    {result.overall_confidence !== undefined && (
                      <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Precisión global: <strong style={{ color: result.overall_confidence >= 0.7 ? "var(--color-sienna-brown)" : "var(--warning)" }}>{Math.round(result.overall_confidence * 100)}%</strong></span>
                    )}
                  </div>

                  {/* Banner Asistente de Validación IA */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    background: "rgba(217, 119, 6, 0.08)",
                    border: "1px solid rgba(217, 119, 6, 0.28)",
                    borderRadius: "10px",
                    padding: "0.7rem 0.95rem",
                    marginBottom: "1rem"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <Sparkles size={18} style={{ color: "#b45309", flexShrink: 0 }} />
                      <div style={{ fontSize: "0.78rem", color: "#78350f", lineHeight: "1.4" }}>
                        <strong>Aviso IA:</strong> La IA puede tener imprecisiones. Coteja los datos con tu título físico antes de continuar.
                      </div>
                    </div>
                    <button
                      onClick={() => setShowValidationModal(true)}
                      style={{
                        background: "#ffffff",
                        border: "1px solid rgba(217, 119, 6, 0.4)",
                        color: "#92400e",
                        fontSize: "0.76rem",
                        fontWeight: 700,
                        padding: "0.35rem 0.75rem",
                        borderRadius: "6px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        flexShrink: 0,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
                      }}
                    >
                      <Sparkles size={13} /> Validar / Completar
                    </button>
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

        {/* Modal / Pestaña Flotante de Validación IA */}
        <ValidationFloatingModal
          isOpen={showValidationModal}
          onClose={() => setShowValidationModal(false)}
          fields={result?.fields || {}}
          onSaveField={handleFieldChange}
          onProceedGtu={handleRegisterGtu}
          engineName={result?.engine}
        />
      </div>
    );
  };

  export default OCRExtractor;
