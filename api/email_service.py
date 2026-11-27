"""
Servicio de Correo Electrónico y Notificaciones Institucionales — USM-ApostillaBot
Arquitectura 100% Python estándar (0 MB de dependencias adicionales en Vercel Serverless).

Soporte Dual Automático:
1. Resend HTTP API (si RESEND_API_KEY está configurado — 3.000 correos/mes gratis)
2. SMTP TLS nativo vía smtplib (si SMTP_USER y SMTP_PASSWORD están configurados —
   compatible 100% gratis con Gmail + Contraseña de Aplicación, Outlook, Zoho o SMTP institucional)
"""

import os
import json
import html
import smtplib
import logging
import urllib.request
import urllib.error
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger("USM_Email_Service")


class EmailNotificationService:
    @staticmethod
    def _get_config():
        resend_key = (os.getenv("RESEND_API_KEY") or "").strip()
        resend_from = (os.getenv("RESEND_FROM_EMAIL") or "USM ApostillaBot <onboarding@resend.dev>").strip()
        smtp_user = (os.getenv("SMTP_USER") or os.getenv("GMAIL_USER") or "").strip()
        smtp_password = (os.getenv("SMTP_PASSWORD") or os.getenv("GMAIL_APP_PASSWORD") or "").strip()
        smtp_host = (os.getenv("SMTP_HOST") or "smtp.gmail.com").strip()
        smtp_port = int(os.getenv("SMTP_PORT") or 587)
        smtp_from = (os.getenv("SMTP_FROM_EMAIL") or smtp_user or "no-reply@usm-apostillabot.local").strip()
        return {
            "resend_key": resend_key,
            "resend_from": resend_from,
            "smtp_user": smtp_user,
            "smtp_password": smtp_password,
            "smtp_host": smtp_host,
            "smtp_port": smtp_port,
            "smtp_from": smtp_from,
        }

    @classmethod
    def get_provider_status(cls) -> dict:
        cfg = cls._get_config()
        if cfg["resend_key"]:
            return {"configured": True, "provider": "resend_api"}
        if cfg["smtp_user"] and cfg["smtp_password"]:
            return {"configured": True, "provider": f"smtp ({cfg['smtp_host']})"}
        return {"configured": False, "provider": "none"}

    @classmethod
    def send_email(cls, to_email: str, subject: str, html_body: str, text_body: str = "") -> dict:
        target = (to_email or "").strip()
        if not target or "@" not in target:
            return {"sent": False, "provider": "none", "error": "Correo destinatario inválido."}

        cfg = cls._get_config()
        plain = text_body or "Notificación oficial del Sistema de Validación y Apostilla USM / GTU / MPPRE."

        # 1. Prioridad: Resend HTTP API (sin puertos SMTP, ideal en Serverless)
        if cfg["resend_key"]:
            try:
                payload = json.dumps({
                    "from": cfg["resend_from"],
                    "to": [target],
                    "subject": subject,
                    "html": html_body,
                    "text": plain,
                }).encode("utf-8")
                req = urllib.request.Request(
                    "https://api.resend.com/emails",
                    data=payload,
                    headers={
                        "Authorization": f"Bearer {cfg['resend_key']}",
                        "Content-Type": "application/json",
                        "User-Agent": "USM-ApostillaBot/2.0",
                    },
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=6) as resp:
                    if 200 <= resp.status < 300:
                        return {"sent": True, "provider": "resend_api", "error": None}
            except urllib.error.HTTPError as he:
                err_txt = he.read().decode("utf-8", errors="replace")[:200]
                logger.warning(f"Resend API error ({he.code}): {err_txt}")
                # Si también hay SMTP configurado, cae a SMTP abajo
                if not (cfg["smtp_user"] and cfg["smtp_password"]):
                    return {"sent": False, "provider": "resend_api", "error": f"Resend HTTP {he.code}: {err_txt}"}
            except Exception as e:
                logger.warning(f"Error enviando correo vía Resend: {e}")
                if not (cfg["smtp_user"] and cfg["smtp_password"]):
                    return {"sent": False, "provider": "resend_api", "error": str(e)}

        # 2. Gmail / SMTP TLS nativo (gratis para cualquier destinatario con Contraseña de Aplicación)
        if cfg["smtp_user"] and cfg["smtp_password"]:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = f"Plataforma Validación y Apostilla <{cfg['smtp_from']}>"
                msg["To"] = target
                msg.attach(MIMEText(plain, "plain", "utf-8"))
                msg.attach(MIMEText(html_body, "html", "utf-8"))

                with smtplib.SMTP(cfg["smtp_host"], cfg["smtp_port"], timeout=8) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(cfg["smtp_user"], cfg["smtp_password"])
                    server.sendmail(cfg["smtp_from"], [target], msg.as_string())
                return {"sent": True, "provider": f"smtp ({cfg['smtp_host']})", "error": None}
            except Exception as e:
                logger.warning(f"Error enviando correo vía SMTP ({cfg['smtp_host']}): {e}")
                return {"sent": False, "provider": "smtp", "error": str(e)}

        return {
            "sent": False,
            "provider": "none",
            "error": "Servicio de correo no configurado (agrega SMTP_USER + SMTP_PASSWORD o RESEND_API_KEY en Vercel).",
        }

    @staticmethod
    def _wrap_html(title: str, subtitle: str, body_html: str, cta_label: str = "", cta_url: str = "") -> str:
        cta_block = ""
        if cta_label and cta_url:
            cta_block = f"""
            <div style="margin-top:22px;text-align:center;">
              <a href="{html.escape(cta_url)}" style="display:inline-block;background:#17191c;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;font-size:14px;">
                {html.escape(cta_label)}
              </a>
            </div>
            """
        return f"""<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:24px;background:#f7f5f2;font-family:Arial,Helvetica,sans-serif;color:#17191c;">
  <div style="max-width:580px;margin:0 auto;background:#ffffff;border:1px solid #e5e2dc;border-radius:16px;overflow:hidden;">
    <div style="background:#17191c;color:#ffffff;padding:20px 26px;">
      <div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#fbe1d1;font-weight:bold;">
        Plataforma Descentralizada de Validación y Apostilla · GTU (MPPEU) &amp; Cancillería (MPPRE)
      </div>
      <h2 style="margin:6px 0 0 0;font-size:20px;font-weight:600;">{html.escape(title)}</h2>
      <p style="margin:4px 0 0 0;font-size:13px;color:#cbd5e1;">{html.escape(subtitle)}</p>
    </div>
    <div style="padding:24px 26px;font-size:14px;line-height:1.6;color:#334155;">
      {body_html}
      {cta_block}
    </div>
    <div style="padding:14px 26px;background:#faf9f7;border-top:1px solid #e5e2dc;font-size:11px;color:#64748b;text-align:center;">
      Mensaje automático generado conforme a la Ley de Simplificación de Trámites Administrativos · Red Ethereum Sepolia.
    </div>
  </div>
</body>
</html>"""

    @classmethod
    def send_verification_code(cls, to_email: str, nombre: str, code: str, purpose: str = "recovery") -> dict:
        is_recovery = purpose == "recovery"
        title = "Código de Recuperación de Contraseña" if is_recovery else "Código de Acceso Rápido (OTP)"
        subtitle = "Verificación criptográfica de identidad estudiantil"
        body = f"""
        <p>Hola <strong>{html.escape(nombre or 'Graduando')}</strong>,</p>
        <p>{'Recibimos una solicitud para restablecer tu contraseña.' if is_recovery else 'Usa el siguiente código de un solo uso para iniciar sesión sin contraseña.'}</p>
        <div style="margin:20px 0;padding:18px;background:#fbe1d1;border:1px solid #d9b6a3;border-radius:12px;text-align:center;">
          <span style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#5d2a1a;font-weight:700;">Tu código de 6 dígitos</span>
          <span style="display:block;margin-top:6px;font-size:32px;letter-spacing:8px;font-weight:800;color:#17191c;font-family:monospace;">{html.escape(code)}</span>
        </div>
        <p style="font-size:12.5px;color:#64748b;">Este código vence automáticamente en <strong>10 minutos</strong>. Si no realizaste esta solicitud, puedes ignorar este correo de forma segura.</p>
        """
        html_msg = cls._wrap_html(title, subtitle, body)
        text_msg = f"{title}: tu código de verificación de 6 dígitos es {code} (válido por 10 minutos)."
        return cls.send_email(to_email, f"[{code}] {title} — Plataforma de Apostilla", html_msg, text_msg)

    @classmethod
    def send_document_event_email(cls, to_email: str, recipient_role: str, event_type: str, info: dict, frontend_url: str = "") -> dict:
        base_url = (frontend_url or os.getenv("FRONTEND_URL") or "").rstrip("/")
        owner = html.escape(str(info.get("ownerName") or info.get("owner_name") or "Graduando"))
        cedula = html.escape(str(info.get("cedula") or "N/A"))
        code = html.escape(str(info.get("solicitudCode") or info.get("solicitud_code") or "GTU-2026"))
        doc_type = html.escape(str(info.get("documentType") or info.get("document_type") or "Título Universitario"))
        doc_hash = str(info.get("hash") or "")
        short_hash = html.escape(doc_hash[:22] + ("..." if len(doc_hash) > 22 else ""))
        apostille_no = html.escape(str(info.get("apostilleNumber") or info.get("apostille_number") or ""))
        reason = html.escape(str(info.get("reason") or info.get("rejectionReason") or ""))
        country = html.escape(str(info.get("countryDestiny") or info.get("country_destiny") or "Convenio de La Haya"))

        meta_table = f"""
        <table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:13px;background:#faf9f7;border:1px solid #e5e2dc;border-radius:8px;">
          <tr><td style="padding:8px 12px;color:#64748b;"><strong>Titular:</strong></td><td style="padding:8px 12px;">{owner} ({cedula})</td></tr>
          <tr><td style="padding:8px 12px;color:#64748b;"><strong>Documento:</strong></td><td style="padding:8px 12px;">{doc_type}</td></tr>
          <tr><td style="padding:8px 12px;color:#64748b;"><strong>Código Trámite:</strong></td><td style="padding:8px 12px;font-family:monospace;">{code}</td></tr>
          <tr><td style="padding:8px 12px;color:#64748b;"><strong>Hash SHA-256:</strong></td><td style="padding:8px 12px;font-family:monospace;font-size:11.5px;">{short_hash}</td></tr>
        </table>
        """

        cta_label, cta_url = "", ""
        if recipient_role == "gtu_admin":
            subject = f"[GTU-MPPEU] Nuevo expediente por auditar: {code}"
            title = "Nuevo Expediente en Taquilla GTU"
            subtitle = "Notificación automática para Auditores MPPEU"
            body = f"<p>Un graduando ha registrado un título para cotejo y certificación en la Taquilla GTU (MPPEU).</p>{meta_table}"
            if base_url:
                cta_label, cta_url = "Abrir Panel de Auditoría GTU (/admin)", f"{base_url}/admin"
        elif recipient_role == "mppre_admin":
            subject = f"[MPPRE] Solicitud de Apostilla lista para emitir: {code}"
            title = "Nueva Solicitud de Apostilla de La Haya"
            subtitle = f"Destino: {country} · Certificado previamente por GTU (MPPEU)"
            body = f"<p>Un expediente certificado por el GTU ha radicado solicitud de Apostilla Electrónica de La Haya.</p>{meta_table}"
            if base_url:
                cta_label, cta_url = "Abrir Bandeja Cancillería (/admin)", f"{base_url}/admin"
        elif event_type == "CERTIFICADO_MPPEU":
            subject = f"✅ Tu título fue Certificado por GTU (MPPEU) — {code}"
            title = "Certificación GTU (MPPEU) Aprobada"
            subtitle = "Sello electrónico anclado en Ethereum Sepolia"
            body = f"<p>¡Buenas noticias, <strong>{owner}</strong>! Tu expediente fue cotejado y certificado por un auditor del <strong>GTU (MPPEU)</strong>. Ya puedes ingresar al portal y solicitar tu <strong>Apostilla Electrónica MPPRE</strong>.</p>{meta_table}"
            if base_url:
                cta_label, cta_url = "Solicitar Apostilla en el Portal", base_url
        elif event_type == "APOSTILLADO_MPPRE":
            subject = f"🌍 Apostilla Electrónica de La Haya Emitida ({apostille_no or code})"
            title = "Apostilla Electrónica MPPRE Emitida"
            subtitle = f"Número oficial: {apostille_no or 'APO-VE-2026'} · {country}"
            body = f"<p>¡Felicidades, <strong>{owner}</strong>! La Cancillería (MPPRE) emitió tu <strong>Apostilla Electrónica de La Haya</strong> con validez internacional verificable por QR y Blockchain.</p>{meta_table}"
            if base_url and doc_hash:
                cta_label, cta_url = "Verificar Certificado / Apostilla", f"{base_url}/?hash={doc_hash}"
        elif event_type == "RECHAZADO":
            subject = f"⚠️ Observación en tu expediente {code}"
            title = "Expediente Observado por Auditoría Ministerial"
            subtitle = "Acción requerida para subsanar el trámite"
            body = f"<p>Hola <strong>{owner}</strong>, el auditor ministerial registró una observación sobre tu trámite:</p><div style='padding:12px 14px;background:#fef2f2;border-left:4px solid #dc2626;color:#991b1b;border-radius:6px;margin:12px 0;'><strong>Motivo:</strong> {reason or 'Discrepancia documental detectada'}</div>{meta_table}"
            if base_url:
                cta_label, cta_url = "Revisar en el Portal", base_url
        else:
            subject = f"📄 Solicitud Registrada: {code} — Plataforma de Apostilla"
            title = "Expediente Digitalizado y Registrado"
            subtitle = "Tu documento entró en cola de auditoría GTU (MPPEU)"
            body = f"<p>Hola <strong>{owner}</strong>, tu documento fue digitalizado y registrado con éxito en la plataforma.</p>{meta_table}"
            if base_url:
                cta_label, cta_url = "Ver Avance de Mi Trámite", base_url

        html_msg = cls._wrap_html(title, subtitle, body, cta_label, cta_url)
        return cls.send_email(to_email, subject, html_msg, f"{title} - {code} ({owner})")
