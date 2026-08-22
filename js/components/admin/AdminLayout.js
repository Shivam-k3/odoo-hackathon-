// DAYFLOW HRMS — ADMIN LAYOUT COMPONENT
// Composes the shared admin shell (sidebar + navbar + content slot) used by
// every /admin page.

import { renderAdminSidebar, initAdminSidebarEvents } from './AdminSidebar.js';
import { renderAdminNavbar, initAdminNavbarEvents } from './AdminNavbar.js';

export function renderAdminLayout(currentPath, pageTitle, contentHtml) {
  return `
    <div class="main-layout">
      ${renderAdminSidebar(currentPath)}
      <div class="content-wrapper">
        ${renderAdminNavbar(pageTitle)}
        <main class="main-content" id="admin-page-content">
          ${contentHtml}
        </main>
      </div>
    </div>
  `;
}

export function initAdminLayoutEvents() {
  initAdminSidebarEvents();
  initAdminNavbarEvents();
}

// Re-render just the page content area after async mock loads or state changes.
export function rerenderPageContent(view) {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = view.render();
  if (window.lucide) window.lucide.createIcons();
  view.bindEvents();
}
