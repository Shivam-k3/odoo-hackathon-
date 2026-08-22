// DAYFLOW HRMS — AUTHENTICATION SERVICE ADAPTER
//
// ARCHITECTURE NOTE (Backend Integration Point):
// The UI (Login/Signup views) depends ONLY on this adapter's stable contract:
//   authService.login({ loginId?, email?, password, role? }) -> { success, user }
//   authService.signup({ email, password, role? })           -> { success, user }
//   authService.logout()                                     -> void
// To integrate the real backend later, replace ONLY the MOCK provider below
// with REST/JWT calls (e.g. POST /api/v1/auth/login, /api/v1/auth/signup).
// No view or router code needs to change.

import { store } from './store.js';

// ---------------------------------------------------------------------------
// MOCK AUTH PROVIDER — frontend development/testing ONLY. Not real auth.
// Delete this entire section when wiring the backend API.
// ---------------------------------------------------------------------------

const MOCK_NETWORK_DELAY_MS = 600;

async function mockLogin(credentials) {
  // Simulated network delay for frontend prototype
  await new Promise(resolve => setTimeout(resolve, MOCK_NETWORK_DELAY_MS));

  // Admin/HR mock session (frontend prototype only)
  if (credentials.role === 'Admin') {
    return {
      success: true,
      user: {
        id: 'ADM-0001', // placeholder until backend assigns real Login ID
        name: 'Priya Sharma',
        email: credentials.email || 'priya.sharma@dayflow.com',
        role: 'Admin',
        avatar: null,
        department: 'Human Resources',
        designation: 'HR Manager',
        joiningDate: '2020-04-06'
      }
    };
  }

  // Backend-provided user object schema.
  // NOTE: Login ID is ALWAYS assigned by the backend system upon account
  // activation. The id below is a frontend prototype placeholder only and is
  // NOT a production ID format.
  const userPayload = {
    id: credentials.loginId || credentials.email || 'EMP-1001', // placeholder until backend assigns real Login ID
    name: credentials.email ? credentials.email.split('@')[0].replace('.', ' ') : 'Sarah Jenkins',
    email: credentials.email || 'sarah.jenkins@dayflow.com',
    role: credentials.role || 'Employee',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    department: 'Engineering',
    designation: 'Senior Frontend Developer',
    joiningDate: '2022-03-15'
  };

  return { success: true, user: userPayload };
}

async function mockSignup(registrationData) {
  await new Promise(resolve => setTimeout(resolve, MOCK_NETWORK_DELAY_MS));

  const userPayload = {
    id: registrationData.empId || 'EMP-1002', // placeholder — real Login/Employee ID comes from the backend
    name: registrationData.email.split('@')[0].replace('.', ' '),
    email: registrationData.email,
    role: registrationData.role || 'Employee',
    avatar: null,
    department: 'Engineering',
    designation: 'Software Developer',
    joiningDate: new Date().toISOString().split('T')[0]
  };

  return { success: true, user: userPayload };
}

// ---------------------------------------------------------------------------
// END MOCK PROVIDER
// ---------------------------------------------------------------------------

export const authService = {
  /** Authenticate user credentials -> backend API POST /api/v1/auth/login */
  async login(credentials) {
    const res = await mockLogin(credentials);
    if (res.success) store.login(res.user);
    return res;
  },

  /** Register new account -> backend API POST /api/v1/auth/signup */
  async signup(registrationData) {
    const res = await mockSignup(registrationData);
    if (res.success) store.login(res.user);
    return res;
  },

  logout() {
    store.logout();
  }
};
