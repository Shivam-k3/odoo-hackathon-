// DAYFLOW HRMS — REAL BACKEND API CLIENT
// Single fetch wrapper used by every view. Talks to the Express backend,
// unwraps the { success, message, data, errors } envelope and surfaces
// typed errors so pages can render accurate loading/error states.

const BASE_URL = ''; // same origin — backend serves both API and this SPA
const TOKEN_KEY = 'DAYFLOW_TOKEN';

export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message || `Request failed (${status})`);
    this.status = status;
    this.errors = errors || null;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(method, url, body, opts = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let payload;
  if (body instanceof FormData) {
    payload = body; // browser sets multipart boundary
  } else if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${url}`, {
      method,
      headers,
      body: payload,
    });
  } catch (networkErr) {
    throw new ApiError(0, 'Network error — could not reach the Dayflow server.');
  }

  // CSV export endpoints stream raw text instead of the JSON envelope
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/csv')) {
    if (!res.ok) throw new ApiError(res.status, 'Export failed');
    return res.text();
  }

  let json = null;
  try {
    json = await res.json();
  } catch (_) {
    /* non-JSON body */
  }

  if (!res.ok || (json && json.success === false)) {
    throw new ApiError(res.status, json && json.message, json && json.errors);
  }
  return json ? json.data : null;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  patch: (url, body) => request('PATCH', url, body),
  del: (url, body) => request('DELETE', url, body),
  upload: (url, formData) => request('POST', url, formData),
};

// ---------------------------------------------------------------------------
// Shared helpers used across views

/** Escape untrusted values before embedding into HTML templates (XSS guard). */
export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Indian Rupee formatting: ₹50,000 / ₹2,082.50 */
export function fmtINR(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '₹0';
  const hasPaise = Math.round(n * 100) % 100 !== 0;
  return '₹' + n.toLocaleString('en-IN', hasPaise
    ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    : { maximumFractionDigits: 0 });
}

export function todayISO() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function currentMonthKey() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}`;
}

/** Friendly time (e.g. 09:41 AM) from an ISO timestamp. */
export function fmtTime(iso) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function hoursLabel(hours) {
  const h = Number(hours) || 0;
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  return `${whole}h ${String(mins).padStart(2, '0')}m`;
}

export function attendanceBadgeClass(status) {
  switch (status) {
    case 'PRESENT': return 'badge-success';
    case 'HALF_DAY': return 'badge-warning';
    case 'ABSENT': return 'badge-danger';
    case 'LEAVE': return 'badge-info';
    default: return 'badge-info';
  }
}

export function leaveBadgeClass(status) {
  switch (status) {
    case 'APPROVED': return 'badge-success';
    case 'REJECTED': return 'badge-danger';
    case 'PENDING': return 'badge-warning';
    default: return 'badge-info';
  }
}
