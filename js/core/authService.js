// DAYFLOW HRMS — AUTHENTICATION SERVICE (REAL BACKEND)
//
// Talks to the Express/PostgreSQL backend:
//   POST /api/auth/signup  { email, password, firstName, lastName, role?, department? }
//   POST /api/auth/login   { loginIdentifier, password }
//   GET  /api/auth/me
//   POST /api/auth/logout
//
// The backend JWT + user snapshot are cached in localStorage so a refresh
// keeps you signed in — but a FRESH browser has no session and always lands
// on the login page. The backend remains the sole source of truth for roles.

import { api, setToken, getToken } from './api.js';

const USER_KEY = 'DAYFLOW_USER_SESSION_V1';

/** Backend role enum -> frontend portal role. */
function mapRole(role) {
  return role === 'ADMIN_HR' ? 'Admin' : 'Employee';
}

/** Flatten the backend { user, employee } payload into the UI user shape. */
export function toUiUser(data) {
  const u = data.user || {};
  const e = data.employee || {};
  const name = `${e.firstName || ''} ${e.lastName || ''}`.trim() || (u.email ? u.email.split('@')[0] : 'User');
  return {
    id: e.loginId || u.id,
    userId: u.id,
    employeeId: e.id,
    name,
    firstName: e.firstName || '',
    lastName: e.lastName || '',
    email: u.email || e.email || '',
    role: mapRole(u.role),
    avatar: e.profilePicture || null,
    department: e.department || '',
    designation: e.designation || '',
    joiningDate: e.joiningDate ? String(e.joiningDate).slice(0, 10) : ''
  };
}

function cacheSession(token, uiUser) {
  if (token) setToken(token);
  localStorage.setItem(USER_KEY, JSON.stringify(uiUser));
}

export function clearSession() {
  setToken('');
  localStorage.removeItem(USER_KEY);
}

export function cachedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

/**
 * Restore a session after page refresh: token must exist locally AND still
 * validate against the backend (/auth/me). Returns the UI user or null.
 */
async function restoreSession() {
  if (!getToken()) return null;
  try {
    const data = await api.get('/api/auth/me');
    const uiUser = toUiUser({ user: { ...data, employee: data.employee }, employee: data.employee });
    // /auth/me returns the user object with an embedded employee
    localStorage.setItem(USER_KEY, JSON.stringify(uiUser));
    return uiUser;
  } catch (err) {
    clearSession();
    return null;
  }
}

export const authService = {
  async restoreSession,

  /** credentials: { identifier, password } — identifier is Login ID OR email. */
  async login({ identifier, password }) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginIdentifier: identifier, password }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || json.success === false) {
      const err = new Error((json && json.message) || 'Login failed');
      err.status = res.status;
      throw err;
    }
    const uiUser = toUiUser(json.data);
    cacheSession(json.data.token, uiUser);
    return { success: true, user: uiUser };
  },

  /** payload: { email, password, firstName, lastName, role?, department? } */
  async signup(payload) {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
        firstName: payload.firstName,
        lastName: payload.lastName,
        department: payload.department || undefined,
        role: payload.role && payload.role !== 'Employee' ? 'ADMIN_HR' : undefined,
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || json.success === false) {
      const err = new Error((json && json.message) || 'Registration failed');
      err.status = res.status;
      err.errors = json && json.errors;
      throw err;
    }
    const uiUser = toUiUser(json.data);
    cacheSession(json.data.token, uiUser);
    return { success: true, user: uiUser };
  },

  async logout() {
    try {
      if (getToken()) await api.post('/api/auth/logout', {});
    } catch (_) {
      /* token already invalid — clearing local session is enough */
    }
    clearSession();
  },
};
