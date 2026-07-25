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

  const response = await fetch(`${API_URL}${path}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.detail || `Error ${response.status}`);
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

  registerAdmin: (data) =>
    apiFetch('/admin/users', { method: 'POST', body: data }),
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

  verifyRecord: (hash) =>
    apiFetch(`/blockchain/records/${hash}/verify`, { method: 'POST' }),

  register: (data) =>
    apiFetch('/blockchain/register', { method: 'POST', body: data }),

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
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(canonical));
    const hashArray = Array.from(new Uint8Array(buffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `0x${hashHex.toUpperCase()}`;
  }
};

// ─── Stats & Dashboard ──────────────────────────────────────────────────────
export const statsAPI = {
  getStats: (sessionId = null) =>
    apiFetch(sessionId ? `/api/stats?session_id=${sessionId}` : '/api/stats'),

  reportPrevalidation: (filename, sessionId = null) =>
    apiFetch('/prevalidation/report', { 
      method: 'POST', 
      body: { filename, session_id: sessionId } 
    }),

  heartbeat: () =>
    apiFetch('/stats/heartbeat', { method: 'POST' }),
};

// ─── Chat ───────────────────────────────────────────────────────────────────
export const chatAPI = {
  sendMessage: (sessionId, message, isFile = false) =>
    apiFetch('/chat/message', {
      method: 'POST',
      body: { session_id: sessionId, message, is_file: isFile }
    }),
};

// ─── OCR ─────────────────────────────────────────────────────────────────────
export const ocrAPI = {
  /**
   * Envía una imagen en base64 al motor OCR (EasyOCR: CRAFT + CRNN + NER)
   * y recibe los campos del documento académico extraídos automáticamente.
   * @param {string} imageBase64 - Imagen en base64 puro (sin el prefijo data:...)
   */
  extractDocument: (imageBase64) =>
    apiFetch('/ocr/extract', { method: 'POST', body: { image_base64: imageBase64 } }),
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
