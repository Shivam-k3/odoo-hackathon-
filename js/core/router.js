// DAYFLOW HRMS — CLIENT-SIDE SPA ROUTER

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

  handleRoute() {
    let hash = window.location.hash.slice(1) || '/login';
    if (!hash.startsWith('/')) {
      hash = '/' + hash;
    }

    const state = store.getState();
    const isAuthenticated = !!state.user;

    // Protected route check
    if (!isAuthenticated && hash !== '/login' && hash !== '/signup') {
      this.navigate('/login');
      return;
    }

    // Redirect authenticated users trying to access login/signup to dashboard
    if (isAuthenticated && (hash === '/login' || hash === '/signup' || hash === '/')) {
      this.navigate('/employee/dashboard');
      return;
    }

    const viewHandler = this.routes[hash] || this.routes['/employee/dashboard'] || this.routes['/login'];
    const appContainer = document.getElementById('app');

    if (viewHandler && appContainer) {
      if (this.currentView && typeof this.currentView.unmount === 'function') {
        this.currentView.unmount();
      }

      // Render view
      const viewInstance = viewHandler();
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
