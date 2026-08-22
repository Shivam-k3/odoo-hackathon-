// DAYFLOW HRMS — ADMIN LAYOUT COMPONENT
// Composes the shared admin shell (sidebar + navbar + content slot) used by
// every /admin page.

import { renderAdminSidebar, initAdminSidebarEvents, refreshPendingLeaveCount } from './AdminSidebar.js';
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

  // Live pending-leave badge (updates in place without a full re-render).
  refreshPendingLeaveCount().then(count => {
    const leaveLink = document.querySelector('a[href="#/admin/leave"]');
    if (!leaveLink) return;
    let badge = leaveLink.querySelector('.badge');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'badge badge-warning';
        badge.style.cssText = 'padding:2px 8px; font-size:11px;';
        leaveLink.appendChild(badge);
      }
      badge.textContent = String(count);
    } else if (badge) {
      badge.remove();
    }
  });
}

// Re-render just the page content area after async mock loads or state changes.
export function rerenderPageContent(view) {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = view.render();
  if (window.lucide) window.lucide.createIcons();
  view.bindEvents();
}
