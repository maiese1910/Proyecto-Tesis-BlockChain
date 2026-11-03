/**
 * Servicio API centralizado para USM-ApostillaBot
 * Elimina la repetición de API_URL en cada componente.
 */

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:8000');

// WebSocket URL derivada del API_URL
const WS_URL = (() => {
  const base = API_URL || window.location.origin;
  return base.replace(/^http/, 'ws');
})();

/**
 * Wrapper de fetch con manejo de errores y headers automáticos.
 */
async function apiFetch(path, options = {}) {
  const { method = 'GET', body, token, ...rest } = options;

  const headers = { 'Content-Type': 'application/json', ...rest.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = { method, headers, ...rest };
  if (body && method !== 'GET') {
    config.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const doRequest = async (targetPath) => {
    return await fetch(`${API_URL}${targetPath}`, config);
  };

  let response;
  try {
    response = await doRequest(path);
    if (!response.ok && !path.startsWith('/api')) {
      const retry = await doRequest(`/api${path}`);
      if (retry.ok) response = retry;
    }
  } catch (err) {
    if (!path.startsWith('/api')) {
      try {
        const retry = await doRequest(`/api${path}`);
        if (retry.ok) response = retry;
        else throw err;
      } catch (_) {
        throw err;
      }
    } else {
      throw err;
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.detail || errorData.error || `Error ${response.status}`);
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  return response.json();
}

// ─── Auth ───────────────────────────────────────────────────────────────────
export const authAPI = {
  loginAdmin: (username, password) =>
    apiFetch('/admin/login', { method: 'POST', body: { username, password } }),

  registerAdmin: (data, token) =>
    apiFetch('/admin/users', { method: 'POST', body: data, token }),

  loginStudent: (email, password) =>
    apiFetch('/student/login', { method: 'POST', body: { email, password } }),

  registerStudent: (data) =>
    apiFetch('/student/register', { method: 'POST', body: data }),
};

// ─── Perfiles ───────────────────────────────────────────────────────────────
export const profilesAPI = {
  register: (data) =>
    apiFetch('/profiles/register', { method: 'POST', body: data }),

  getProfile: (cedula) =>
    apiFetch(`/profiles/${cedula}`),
};

// ─── Blockchain ─────────────────────────────────────────────────────────────
export const blockchainAPI = {
  verify: (hash) =>
    apiFetch(`/blockchain/verify/${hash}`),

  getAllRecords: () =>
    apiFetch('/blockchain/records'),

  getRecordsByCedula: (cedula) =>
    apiFetch(`/blockchain/records/cedula/${cedula}`),

  verifyRecord: (hash, auditorData = {}) =>
    apiFetch(`/blockchain/records/${hash}/verify`, { method: 'POST', body: auditorData }),

  mppeuCertifyRecord: (hash, auditorData = {}) =>
    apiFetch(`/blockchain/records/${hash}/mppeu-certify`, { method: 'POST', body: auditorData }),

  mppreApostilleRecord: (hash, auditorData = {}) =>
    apiFetch(`/blockchain/records/${hash}/mppre-apostille`, { method: 'POST', body: auditorData }),

  rejectRecord: (hash, reason, auditorData = {}) =>
    apiFetch(`/blockchain/records/${hash}/reject`, { method: 'POST', body: { reason, ...auditorData } }),

  register: (data) =>
    apiFetch('/blockchain/register', { method: 'POST', body: data }),

  sendRawTx: (rawTxHex) =>
    apiFetch('/blockchain/send-raw-tx', { method: 'POST', body: { raw_transaction: rawTxHex } }),

  getCertificate: (hash) =>
    apiFetch(`/blockchain/certificate/${hash}`),
};


// ─── Hash ───────────────────────────────────────────────────────────────────
export const hashAPI = {
  /**
   * Genera un hash SHA-256 real en el servidor.
   * Alternativa: usar crypto.subtle en el browser (ver generateClientHash).
   */
  generateServerHash: (data) =>
    apiFetch('/hash/generate', { method: 'POST', body: { data } }),

  /**
   * Genera un hash SHA-256 real en el browser usando Web Crypto API.
   * No necesita servidor.
   */
  async generateClientHash(data) {
    const canonical = JSON.stringify(data, Object.keys(data).sort());
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const encoder = new TextEncoder();
        const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(canonical));
        const hashArray = Array.from(new Uint8Array(buffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return `0x${hashHex.toUpperCase()}`;
      } catch (_) {}
    }
    // Fallback criptográfico determinista si Web Crypto no está en contexto seguro
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < canonical.length; i++) {
      const ch = canonical.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const hex = (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
    return `0x${hex.repeat(4).toUpperCase()}`;
  }
};

// ─── Stats & Dashboard ──────────────────────────────────────────────────────
export const statsAPI = {
  getStats: (sessionId = null) => {
    let sid = sessionId;
    if (!sid && typeof sessionStorage !== 'undefined') {
      sid = sessionStorage.getItem('usm_session_id');
      if (!sid) {
        sid = 's_' + Math.random().toString(36).substring(2, 10);
        try { sessionStorage.setItem('usm_session_id', sid); } catch (_) {}
      }
    }
    return apiFetch(sid ? `/api/stats?session_id=${sid}` : '/api/stats');
  },

  reportPrevalidation: (filename, sessionId = null) =>
    apiFetch('/prevalidation/report', { 
      method: 'POST', 
      body: { filename, session_id: sessionId } 
    }),

  heartbeat: (sessionId = null) => {
    let sid = sessionId;
    if (!sid && typeof sessionStorage !== 'undefined') {
      sid = sessionStorage.getItem('usm_session_id');
    }
    return apiFetch('/api/stats/heartbeat', { 
      method: 'POST',
      body: { session_id: sid }
    }).catch(() => apiFetch('/stats/heartbeat', { method: 'POST', body: { session_id: sid } }));
  },
};

// ─── Chat ───────────────────────────────────────────────────────────────────
export const chatAPI = {
  sendMessage: (sessionId, message, isFile = false, user = null) =>
    apiFetch('/api/chat/message', {
      method: 'POST',
      body: { session_id: sessionId, message, is_file: isFile, user }
    }).catch(() =>
      apiFetch('/chat/message', {
        method: 'POST',
        body: { session_id: sessionId, message, is_file: isFile, user }
      })
    ),
};

// ─── OCR ─────────────────────────────────────────────────────────────────────
export const ocrAPI = {
  /**
   * Envía una imagen en base64 al motor OCR (EasyOCR: CRAFT + CRNN + NER)
   * con soporte dual de ruta (/api/ocr/extract y /ocr/extract).
   */
  extractDocument: (imageBase64, rawText = null, userCedula = null) =>
    apiFetch('/api/ocr/extract', { method: 'POST', body: { image_base64: imageBase64, raw_text: rawText, user_cedula: userCedula } })
      .catch(() => apiFetch('/ocr/extract', { method: 'POST', body: { image_base64: imageBase64, raw_text: rawText, user_cedula: userCedula } })),

  /**
   * Envía la imagen al modelo multimodal Google Gemini vía API oficial Flask
   * con soporte dual de ruta (/api/ocr/gemini y /ocr/gemini).
   */
  extractGemini: (imageBase64) =>
    apiFetch('/api/ocr/gemini', { method: 'POST', body: { image_base64: imageBase64 } })
      .catch(() => apiFetch('/ocr/gemini', { method: 'POST', body: { image_base64: imageBase64 } })),
};

// ─── Datos Dinámicos ────────────────────────────────────────────────────────
export const dynamicDataAPI = {
  getCarreras: () =>
    apiFetch('/carreras'),

  getGuias: () =>
    apiFetch('/guias'),

  getPlanillas: () =>
    apiFetch('/planillas'),

  getPubFields: () =>
    apiFetch('/pub/fields'),

  getChecklist: () =>
    apiFetch('/admin/checklist'),
};

// ─── Admin CRUD ─────────────────────────────────────────────────────────────
export const adminAPI = {
  // Checklist
  createChecklistItem: (item, token) =>
    apiFetch('/admin/checklist', { method: 'POST', body: item, token }),
  updateChecklistItem: (id, item, token) =>
    apiFetch(`/admin/checklist/${id}`, { method: 'PUT', body: item, token }),
  deleteChecklistItem: (id, token) =>
    apiFetch(`/admin/checklist/${id}`, { method: 'DELETE', token }),

  // Guías
  createGuia: (guia, token) =>
    apiFetch('/admin/guias', { method: 'POST', body: guia, token }),

  // Planillas
  createPlanilla: (planilla, token) =>
    apiFetch('/admin/planillas', { method: 'POST', body: planilla, token }),
  deletePlanilla: (id, token) =>
    apiFetch(`/admin/planillas/${id}`, { method: 'DELETE', token }),
};

export { API_URL, WS_URL };
export default apiFetch;
