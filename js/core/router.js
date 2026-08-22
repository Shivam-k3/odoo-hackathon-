// DAYFLOW HRMS — CLIENT-SIDE SPA ROUTER
// Supports static and parameterized routes (e.g. /admin/employees/:id) and
// role-aware guards for the Admin/HR console.

import { store } from './store.js';

class Router {
  constructor() {
    this.routes = {};
    this.currentView = null;

    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('DOMContentLoaded', () => this.handleRoute());
  }

  addRoute(path, viewHandler) {
    this.routes[path] = viewHandler;
  }

  navigate(path) {
    window.location.hash = path;
  }

  homePath() {
    const state = store.getState();
    return state.user && state.user.role === 'Admin' ? '/admin/dashboard' : '/employee/dashboard';
  }

  // Exact match first, then ':param' segment matching.
  matchRoute(path) {
    if (this.routes[path]) return { handler: this.routes[path], params: {} };

    const segments = path.split('/').filter(Boolean);
    for (const routePath of Object.keys(this.routes)) {
      if (!routePath.includes(':')) continue;
      const routeSegments = routePath.split('/').filter(Boolean);
      if (routeSegments.length !== segments.length) continue;

      const params = {};
      let matched = true;
      for (let i = 0; i < routeSegments.length; i++) {
        if (routeSegments[i].startsWith(':')) {
          params[routeSegments[i].slice(1)] = decodeURIComponent(segments[i]);
        } else if (routeSegments[i] !== segments[i]) {
          matched = false;
          break;
        }
      }
      if (matched) return { handler: this.routes[routePath], params };
    }
    return null;
  }

  handleRoute() {
    let hash = window.location.hash.slice(1) || '/login';
    if (!hash.startsWith('/')) {
      hash = '/' + hash;
    }
    hash = hash.replace(/\/+$/, '') || '/';

    const state = store.getState();
    const isAuthenticated = !!state.user;
    const isAdminRoute = hash.startsWith('/admin');

    // Protected route check
    if (!isAuthenticated && hash !== '/login' && hash !== '/signup') {
      this.navigate('/login');
      return;
    }

    // Redirect authenticated users away from auth screens by role
    if (isAuthenticated && (hash === '/login' || hash === '/signup' || hash === '/')) {
      this.navigate(this.homePath());
      return;
    }

    // Admin console is restricted to Admin/HR users; employees never see it
    if (isAdminRoute && (!state.user || state.user.role !== 'Admin')) {
      this.navigate('/employee/dashboard');
      return;
    }

    const match = this.matchRoute(hash);
    const viewHandler = match
      ? match.handler
      : this.routes[this.homePath()] || this.routes['/login'];
    const appContainer = document.getElementById('app');

    if (viewHandler && appContainer) {
      if (this.currentView && typeof this.currentView.unmount === 'function') {
        this.currentView.unmount();
      }

      // Render view (dynamic views receive matched params)
      const viewInstance = viewHandler(match ? match.params : {});
      this.currentView = viewInstance;

      appContainer.innerHTML = viewInstance.render();

      if (typeof viewInstance.afterRender === 'function') {
        viewInstance.afterRender();
      }

      // Refresh Lucide icons if available
      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Scroll to top
      window.scrollTo(0, 0);
    }
  }
}

export const router = new Router();
