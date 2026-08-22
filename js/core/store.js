// DAYFLOW HRMS — CENTRAL SESSION STORE (REAL BACKEND)
//
// This store now holds ONLY the authenticated session. All business data
// (profile, attendance, leave, payroll) is fetched live from the backend API
// by the views — there is deliberately NO local mock database anymore.
// A fresh browser has user = null, so the router always shows the login page.

import { cachedUser } from './authService.js';

class Store {
  constructor() {
    // Restored synchronously from the localStorage session cache; views call
    // authService.restoreSession() on boot to re-validate against the backend.
    this.state = { user: cachedUser() };
    this.listeners = [];
  }

  getState() {
    return this.state;
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(l => l(this.state));
  }

  login(userData) {
    this.setState({ user: userData });
  }

  setUser(userData) {
    this.setState({ user: userData });
  }

  logout() {
    this.setState({ user: null });
  }
}

export const store = new Store();
