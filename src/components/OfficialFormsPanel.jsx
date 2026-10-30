import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, FileText, Printer, CheckCircle, Shield, ExternalLink, X, Eye } from "lucide-react";
import html2pdf from "html2pdf.js";
import { dynamicDataAPI } from "../services/api";

const OFFICIAL_DOCS = [
  {
    id: "pub_saren",
    title: "Planilla Única Bancaria (PUB - SAREN)",
    ente: "SAREN / Registro Principal",
    category: "Legalización Estatal",
    desc: "Formato oficial de liquidación de aranceles para el registro de títulos universitarios ante el Registro Principal.",
    filename: "Planilla_Unica_Bancaria_PUB_SAREN.pdf",
    color: "#5d2a1a",
    content: (user) => `
      <div style="font-family: 'Times New Roman', serif; padding: 25px; color: #000; background: #fff; line-height: 1.4;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
          <p style="margin: 0; font-size: 10pt; font-weight: bold; text-transform: uppercase;">REPÚBLICA BOLIVARIANA DE VENEZUELA</p>
          <p style="margin: 0; font-size: 9pt;">MINISTERIO DEL PODER POPULAR PARA RELACIONES INTERIORES, JUSTICIA Y PAZ</p>
          <p style="margin: 0; font-size: 9pt; font-weight: bold;">SERVICIO AUTÓNOMO DE REGISTROS Y NOTARÍAS (SAREN)</p>
          <p style="margin: 0; font-size: 9pt;">REGISTRO PRINCIPAL DEL ESTADO</p>
          <h2 style="margin: 10px 0 5px 0; font-size: 13pt; text-decoration: underline;">PLANILLA ÚNICA BANCARIA (PUB)</h2>
          <p style="margin: 0; font-size: 8pt; font-weight: bold;">NRO. DE TRÁMITE: PUB-${new Date().getFullYear()}-008912</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9pt;">
          <tr style="background: #f0f0f0;">
            <th colspan="2" style="border: 1px solid #000; padding: 5px; text-align: left;">1. DATOS DEL SOLICITANTE</th>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 5px; width: 50%;"><strong>Nombre / Razón Social:</strong> ${user?.nombre || "JUAN CARLOS PÉREZ"}</td>
            <td style="border: 1px solid #000; padding: 5px; width: 50%;"><strong>Cédula de Identidad:</strong> ${user?.cedula || "V-28.315.101"}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 5px;"><strong>Teléfono:</strong> 0414-1234567</td>
            <td style="border: 1px solid #000; padding: 5px;"><strong>Correo:</strong> estudiante@usm.edu.ve</td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9pt;">
          <tr style="background: #f0f0f0;">
            <th colspan="3" style="border: 1px solid #000; padding: 5px; text-align: left;">2. DETALLE DEL TRÁMITE Y ARANCELES</th>
          </tr>
          <tr style="background: #fafafa;">
            <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">Concepto de Ley</td>
            <td style="border: 1px solid #000; padding: 5px; font-weight: bold; text-align: center;">Cantidad UT</td>
            <td style="border: 1px solid #000; padding: 5px; font-weight: bold; text-align: right;">Monto (Bs.)</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 5px;">Registro de Título Profesional Universitario (Art. 45 Ley Registro)</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: center;">0.50 UT</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: right;">150,00</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 5px;">Procesamiento Digital de Legajo Electrónico</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: center;">0.20 UT</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: right;">60,00</td>
          </tr>
          <tr style="font-weight: bold;">
            <td colspan="2" style="border: 1px solid #000; padding: 5px; text-align: right;">TOTAL A PAGAR:</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: right;">Bs. 210,00</td>
          </tr>
        </table>

        <div style="border: 1px solid #000; padding: 10px; margin-bottom: 15px; font-size: 8pt; background: #f9f9f9;">
          <p style="margin: 0 0 5px 0; font-weight: bold;">INSTRUCCIONES DE PAGO:</p>
          <p style="margin: 0;">1. Presente esta planilla en las taquillas autorizadas del Banco de Venezuela, Banco Bicentenario o Tesorería del SAREN.</p>
          <p style="margin: 0;">2. Conserve el comprobante de depósito con el número de depósito bancario adjunto a este documento.</p>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; font-size: 8pt;">
          <div style="text-align: center; width: 40%;">
            <div style="border-bottom: 1px solid #000; margin-bottom: 5px; height: 40px;"></div>
            <p style="margin: 0;">Firma del Solicitante</p>
          </div>
          <div style="text-align: center; width: 40%;">
            <div style="border-bottom: 1px solid #000; margin-bottom: 5px; height: 40px;"></div>
            <p style="margin: 0;">Sello y Firma Taquilla SAREN</p>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "solicitud_grado_usm",
    title: "Planilla de Solicitud de Grado (USM)",
    ente: "Universidad Santa María",
    category: "Trámite Académico",
    desc: "Formato oficial de la Facultad de Ingeniería para la solicitud del título profesional ante Control de Estudios (Módulo 4).",
    filename: "Solicitud_de_Grado_USM_Ingenieria.pdf",
    color: "#17191c",
    content: (user) => `
      <div style="font-family: 'Times New Roman', serif; padding: 25px; color: #000; background: #fff; line-height: 1.4;">
        <div style="text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 15px;">
          <p style="margin: 0; font-size: 11pt; font-weight: bold; color: #1e3a8a;">UNIVERSIDAD SANTA MARÍA</p>
          <p style="margin: 0; font-size: 9pt; font-weight: bold;">SECRETARÍA GENERAL — DIRECCIÓN DE CONTROL DE ESTUDIOS</p>
          <p style="margin: 0; font-size: 9pt;">FACULTAD DE INGENIERÍA Y ARQUITECTURA</p>
          <h3 style="margin: 10px 0 5px 0; font-size: 12pt; text-decoration: underline;">SOLICITUD DE ADMISIÓN A ACTO DE GRADO</h3>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9pt;">
          <tr style="background: #eff6ff;">
            <th colspan="2" style="border: 1px solid #1e3a8a; padding: 5px; text-align: left; color: #1e3a8a;">DATOS DEL GRADUANDO</th>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 5px;"><strong>Nombres y Apellidos:</strong> ${user?.nombre || "INGENIERO USM"}</td>
            <td style="border: 1px solid #ccc; padding: 5px;"><strong>Cédula:</strong> ${user?.cedula || "V-00.000.000"}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 5px;"><strong>Carrera:</strong> ${user?.carrera || "Ingeniería en Sistemas"}</td>
            <td style="border: 1px solid #ccc; padding: 5px;"><strong>Núcleo:</strong> La Florencia (Caracas)</td>
          </tr>
        </table>

        <div style="border: 1px solid #1e3a8a; padding: 10px; margin-bottom: 15px; font-size: 8.5pt;">
          <p style="margin: 0 0 5px 0; font-weight: bold; color: #1e3a8a;">CHECKLIST DE RECAUDOS OBLIGATORIOS (CONTROL DE ESTUDIOS):</p>
          <p style="margin: 2px 0;">[ X ] Copia Fondo Negro del Título Certificado</p>
          <p style="margin: 2px 0;">[ X ] Partida de Nacimiento Original y Copia Legible</p>
          <p style="margin: 2px 0;">[ X ] Solvencia de Biblioteca General y Laboratorios</p>
          <p style="margin: 2px 0;">[ X ] Comprobante de Pago Arancel de Grado USM</p>
          <p style="margin: 2px 0;">[ X ] 4 Fotografías tamaño carnet en traje formal</p>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; font-size: 8.5pt;">
          <div style="text-align: center; width: 45%;">
            <div style="border-bottom: 1px solid #000; margin-bottom: 5px; height: 35px;"></div>
            <p style="margin: 0;">Firma del Graduando</p>
          </div>
          <div style="text-align: center; width: 45%;">
            <div style="border-bottom: 1px solid #000; margin-bottom: 5px; height: 35px;"></div>
            <p style="margin: 0;">Firma y Sello Control de Estudios USM</p>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "fondo_negro_usm",
    title: "Formato Certificación Fondo Negro (USM)",
    ente: "Universidad Santa María",
    category: "Certificación Legal",
    desc: "Formato oficial para la autenticación de la copia fotostática en fondo negro del título universitario a vista del original.",
    filename: "Certificacion_Fondo_Negro_USM.pdf",
    color: "#5d2a1a",
    content: (user) => `
      <div style="font-family: 'Times New Roman', serif; padding: 25px; color: #000; background: #fff; line-height: 1.5;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
          <p style="margin: 0; font-size: 11pt; font-weight: bold;">UNIVERSIDAD SANTA MARÍA</p>
          <p style="margin: 0; font-size: 9pt;">SECRETARÍA GENERAL</p>
          <h3 style="margin: 10px 0 5px 0; font-size: 12pt; text-decoration: underline;">CERTIFICACIÓN A VISTA DEL ORIGINAL</h3>
        </div>

        <p style="font-size: 10pt; text-align: justify;">
          El Secretario General de la Universidad Santa María, en uso de las atribuciones que le confiere la Ley de Universidades vigente,
          <strong>CERTIFICA:</strong> Que la presente copia fotostática concuerda fiel y exactamente con su original, el cual reposa en el Libro de Actas de Grado de la Facultad de Ingeniería de esta Casa de Estudios.
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 9pt;">
          <tr>
            <td style="border: 1px solid #000; padding: 5px;"><strong>Titular:</strong> ${user?.nombre || "EGRESADO USM"}</td>
            <td style="border: 1px solid #000; padding: 5px;"><strong>Cédula:</strong> ${user?.cedula || "V-00.000.000"}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 5px;"><strong>Título:</strong> ${user?.carrera || "Ingeniero de Sistemas"}</td>
            <td style="border: 1px solid #000; padding: 5px;"><strong>Tomo / Folio:</strong> T-XIV / F-182</td>
          </tr>
        </table>

        <p style="font-size: 9pt; text-align: justify; margin-top: 20px;">
          Certificación expedida a solicitud de la parte interesada en Caracas, a los ${new Date().getDate()} días del mes de ${new Date().toLocaleString('es-ES', { month: 'long' })} de ${new Date().getFullYear()}.
        </p>

        <div style="text-align: center; margin-top: 50px; font-size: 9pt;">
          <div style="border-bottom: 1px solid #000; width: 60%; margin: 0 auto 5px auto; height: 40px;"></div>
          <p style="margin: 0; font-weight: bold;">DR. SECRETARIO GENERAL</p>
          <p style="margin: 0; font-size: 8pt;">UNIVERSIDAD SANTA MARÍA</p>
        </div>
      </div>
    `
  },
  {
    id: "solvencia_biblioteca_usm",
    title: "Planilla Solvencia de Biblioteca y Laboratorios",
    ente: "Universidad Santa María",
    category: "Solvencia Académica",
    desc: "Constancia oficial de no adeudo de material bibliográfico ni equipos en la USM expedida por la Dirección de Biblioteca.",
    filename: "Solvencia_Biblioteca_Laboratorios_USM.pdf",
    color: "#5d2a1a",
    content: (user) => `
      <div style="font-family: 'Times New Roman', serif; padding: 25px; color: #000; background: #fff; line-height: 1.5;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
          <p style="margin: 0; font-size: 11pt; font-weight: bold;">UNIVERSIDAD SANTA MARÍA</p>
          <p style="margin: 0; font-size: 9pt;">DIRECCIÓN GENERAL DE BIBLIOTECAS Y SERVICIOS FORMATIVOS</p>
          <h3 style="margin: 10px 0 5px 0; font-size: 12pt; text-decoration: underline;">CONSTANCIA DE SOLVENCIA GENERAL</h3>
        </div>

        <p style="font-size: 10pt; text-align: justify;">
          Por medio de la presente se hace constar que el (la) ciudadano (a) <strong>${user?.nombre || "ESTUDIANTE USM"}</strong>, titular de la Cédula de Identidad N° <strong>${user?.cedula || "V-00.000.000"}</strong>, estudiante/egresado de la carrera de <strong>${user?.carrera || "Ingeniería"}</strong>, <strong>NO POSEE DEUDAS PENDIENTES</strong> de libros, material documental ni equipos en los laboratorios de esta institución.
        </p>

        <div style="border: 1px dashed #000; padding: 10px; margin: 20px 0; font-size: 8.5pt; text-align: center;">
          <p style="margin: 0; font-weight: bold;">CÓDIGO DE VALIDACIÓN BIBLIOTECARIA: USM-SOLV-${Math.floor(Math.random() * 1000000)}</p>
          <p style="margin: 0;">Válido exclusivamente para trámites de Grado y Legalización GTU.</p>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 40px; font-size: 8.5pt; text-align: center;">
          <div style="width: 45%;">
            <div style="border-bottom: 1px solid #000; margin-bottom: 5px; height: 35px;"></div>
            <p style="margin: 0;">Biblioteca Central USM</p>
          </div>
          <div style="width: 45%;">
            <div style="border-bottom: 1px solid #000; margin-bottom: 5px; height: 35px;"></div>
            <p style="margin: 0;">Coordinación de Laboratorios</p>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "cita_gtu_mppeu",
    title: "Planilla de Cita GTU (MPPEU)",
    ente: "Ministerio de Educación Universitaria",
    category: "Legalización Nacional",
    desc: "Formato oficial para la solicitud de cita electrónica de legalización de títulos ante el MPPEU.",
    filename: "Planilla_Cita_GTU_MPPEU.pdf",
    color: "#17191c",
    content: (user) => `
      <div style="font-family: 'Times New Roman', serif; padding: 25px; color: #000; background: #fff; line-height: 1.4;">
        <div style="text-align: center; border-bottom: 2px solid #b91c1c; padding-bottom: 10px; margin-bottom: 15px;">
          <p style="margin: 0; font-size: 10pt; font-weight: bold; color: #b91c1c;">REPÚBLICA BOLIVARIANA DE VENEZUELA</p>
          <p style="margin: 0; font-size: 9pt; font-weight: bold;">MINISTERIO DEL PODER POPULAR PARA LA EDUCACIÓN UNIVERSITARIA (MPPEU)</p>
          <p style="margin: 0; font-size: 9pt;">SISTEMA DE GESTIÓN DE TRÁMITES UNIVERSITARIOS (GTU)</p>
          <h3 style="margin: 10px 0 5px 0; font-size: 12pt; text-decoration: underline;">COMPROBANTE DE CITA ELECTRÓNICA DE LEGALIZACIÓN</h3>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9pt;">
          <tr style="background: #fef2f2;">
            <th colspan="2" style="border: 1px solid #b91c1c; padding: 5px; text-align: left; color: #b91c1c;">DATOS DE LA CITA</th>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 5px;"><strong>Fecha de Cita:</strong> ${new Date(Date.now() + 86400000 * 5).toLocaleDateString('es-VE')}</td>
            <td style="border: 1px solid #ccc; padding: 5px;"><strong>Horario de Atención:</strong> 8:00 AM - 11:30 AM</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 5px;"><strong>Solicitante:</strong> ${user?.nombre || "GRADUANDO USM"}</td>
            <td style="border: 1px solid #ccc; padding: 5px;"><strong>Cédula:</strong> ${user?.cedula || "V-00.000.000"}</td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9pt;">
          <tr style="background: #fef2f2;">
            <th colspan="2" style="border: 1px solid #b91c1c; padding: 5px; text-align: left; color: #b91c1c;">DOCUMENTOS A CERTIFICAR</th>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 5px;">1. Título Universitario de Egresado (Original)</td>
            <td style="border: 1px solid #ccc; padding: 5px;">Universidad Santa María</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 5px;">2. Notas Certificadas de Grado</td>
            <td style="border: 1px solid #ccc; padding: 5px;">Universidad Santa María</td>
          </tr>
        </table>

        <div style="border: 1px solid #b91c1c; padding: 10px; font-size: 8.5pt; background: #fff5f5;">
          <p style="margin: 0; font-weight: bold; color: #b91c1c;">NOTAS IMPORTANTES PARA LA PRESENTACIÓN:</p>
          <p style="margin: 2px 0;">• Presentar 2 copias impresas de esta planilla el día de la cita.</p>
          <p style="margin: 2px 0;">• Consignar cédula de identidad laminada vigente y los documentos originales previamente firmados por las autoridades de la USM.</p>
        </div>
      </div>
    `
  }
];

const OfficialFormsPanel = ({ user }) => {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [dynamicDocs, setDynamicDocs] = useState([]);

  useEffect(() => {
    dynamicDataAPI.getPlanillas()
      .then(res => {
        if (res && res.planillas && Array.isArray(res.planillas) && res.planillas.length > 0) {
          const mapped = res.planillas.map((p, idx) => ({
            id: `dynamic_${p.id || idx}`,
            title: p.nombre,
            ente: p.categoria || "Gubernamental / USM",
            category: p.categoria || "Oficial",
            desc: `Documento oficial registrado en la base institucional: ${p.nombre}`,
            filename: `${p.nombre.replace(/\s+/g, '_')}.pdf`,
            url: p.url,
            isDynamicUrl: Boolean(p.url),
            color: "#5d2a1a",
            content: (u) => `
              <div style="font-family: Arial, sans-serif; padding: 30px;">
                <h2 style="color: #17191c; border-bottom: 2px solid #5d2a1a; padding-bottom: 8px;">${p.nombre}</h2>
                <p><strong>Titular:</strong> ${u?.nombre || 'Graduando USM'}</p>
                <p><strong>Cédula:</strong> ${u?.cedula || 'V-00.000.000'}</p>
                <p><strong>Ente Emisor:</strong> ${p.categoria || 'Universidad Santa María / Entes Oficiales'}</p>
                <p><strong>Enlace Institucional:</strong> <a href="${p.url || '#'}" target="_blank">${p.url || 'Repositorio central'}</a></p>
                <div style="margin-top: 40px; border-top: 1px dashed #ccc; padding-top: 15px; font-size: 11px; color: #666;">
                  Documento sincronizado dinámicamente con el Panel de Administración de Tesis USM-ApostillaBot.
                </div>
              </div>
            `
          }));
          setDynamicDocs(mapped);
        }
      })
      .catch(() => { });
  }, []);

  const allDocs = [...OFFICIAL_DOCS, ...dynamicDocs];

  const handleDownloadPDF = (doc) => {
    setDownloading(doc.id);
    const container = document.createElement("div");
    container.innerHTML = doc.content(user);
    document.body.appendChild(container);

    const opt = {
      margin: 10,
      filename: doc.filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };

    html2pdf()
      .set(opt)
      .from(container)
      .save()
      .then(() => {
        document.body.removeChild(container);
        setDownloading(null);
      })
      .catch((err) => {
        console.error("PDF generation error:", err);
        document.body.removeChild(container);
        setDownloading(null);
      });
  };

  return (
    <div className="view-container">
      <div className="dashboard-header">
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
            <FileText size={26} style={{ color: "var(--color-sienna-brown)" }} />
            Planillas y Formularios Oficiales
          </h2>
          <p>
            Formatos reales e impresos oficiales exigidos por la <strong>Universidad Santa María (USM)</strong>, el <strong>SAREN</strong> y el <strong>MPPRE/GTU</strong> para el trámite de graduación y legalización internacional.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
        {
          allDocs.map((doc) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5, scale: 1.012 }}
              className="glass-panel"
              style={{
                display: "flex", flexDirection: "column", justifyContent: "space-between",
                padding: "1.6rem",
                backgroundColor: '#ffffff',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-cards)',
                boxShadow: 'var(--shadow-subtle)'
              }}
            >
              <div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.9rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.74rem", fontWeight: "600", textTransform: "uppercase", color: "var(--color-sienna-brown)", background: "var(--color-blush-peach)", padding: "0.25rem 0.65rem", borderRadius: "var(--radius-pill)", border: "1px solid rgba(93, 42, 26, 0.2)", whiteSpace: "nowrap" }}>
                      {doc.category}
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: "500" }}>
                      {doc.ente}
                    </span>
                  </div>
                </div>
                <h3 style={{ fontSize: "1.1rem", margin: "0 0 0.5rem 0", color: "var(--color-ink-black)", fontWeight: 500 }}>{doc.title}</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0 0 1.2rem 0", lineHeight: "1.45" }}>{doc.desc}</p>
              </div>

              <div style={{ display: "flex", gap: "0.65rem", marginTop: "1rem", flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSelectedDoc(doc)}
                  className="btn-ghost"
                  style={{ flex: 1, padding: "0.6rem 0.9rem", fontSize: "0.82rem" }}
                >
                  <Eye size={15} /> Ver Modelo
                </button>

                <button
                  onClick={() => handleDownloadPDF(doc)}
                  disabled={downloading === doc.id}
                  className="send-btn"
                  style={{ flex: 1.2, padding: "0.6rem 1rem", fontSize: "0.82rem" }}
                >
                  <Download size={15} /> {downloading === doc.id ? "Generando..." : "Descargar PDF"}
                </button>
              </div>
            </motion.div>
          ))
        }
      </div>

      {/* Modal de Previsualización de Planilla Oficial */}
      <AnimatePresence>
        {selectedDoc && (
          <motion.div
            className="cert-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(23, 25, 28, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
              justifyContent: "center", zIndex: 1200, padding: "1.25rem"
            }}
          >
            <motion.div
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 20 }}
              style={{
                background: "#ffffff", borderRadius: "var(--radius-cards)", border: "1px solid var(--border)",
                maxWidth: "750px", width: "100%", maxHeight: "92vh", overflow: "hidden",
                display: "flex", flexDirection: "column", boxShadow: "var(--shadow-hover)"
              }}
            >
              <div style={{ padding: "1.1rem 1.6rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10, background: "var(--color-fog-white)" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--color-ink-black)", fontFamily: "var(--font-serif)", fontWeight: 400 }}>
                  <FileText size={20} color="var(--color-ink-black)" /> {selectedDoc.title}
                </h3>
                <button
                  onClick={() => setSelectedDoc(null)}
                  style={{ background: "#ffffff", border: "1px solid var(--border)", color: "var(--color-ink-black)", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <X size={17} />
                </button>
              </div>

              <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, background: "var(--surface-canvas)" }}>
                <div
                  dangerouslySetInnerHTML={{ __html: selectedDoc.content(user) }}
                  style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid var(--border)", boxShadow: "var(--shadow-subtle)", overflowX: "auto" }}
                />
              </div>

              <div style={{ padding: "1rem 1.6rem", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", gap: "1rem", background: "var(--color-fog-white)", flexWrap: "wrap" }}>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="btn-ghost"
                  style={{ padding: "0.65rem 1.25rem", flex: 1 }}
                >
                  Cerrar Ventana
                </button>
                <button
                  onClick={() => { handleDownloadPDF(selectedDoc); setSelectedDoc(null); }}
                  className="send-btn"
                  style={{ padding: "0.65rem 1.4rem", flex: 1.2 }}
                >
                  <Printer size={16} /> Descargar PDF Oficial
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OfficialFormsPanel;
