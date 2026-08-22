// DAYFLOW HRMS — SIDEBAR COMPONENT (EMPLOYEE ONLY)

import { store } from '../core/store.js';

export function renderSidebar(currentPath) {
  const state = store.getState();
  const user = state.user || {};

  const navItems = [
    { label: 'Dashboard', path: '/employee/dashboard', icon: 'layout-dashboard' },
    { label: 'My Profile', path: '/employee/profile', icon: 'user' },
    { label: 'Attendance', path: '/employee/attendance', icon: 'clock' },
    { label: 'Leave', path: '/employee/leave', icon: 'calendar' },
    { label: 'Payroll', path: '/employee/payroll', icon: 'receipt' }
  ];

  const linksHtml = navItems.map(item => {
    const isActive = currentPath === item.path;
    return `
      <a href="#${item.path}" class="nav-link ${isActive ? 'active' : ''}">
        <i data-lucide="${item.icon}" style="width: 18px; height: 18px;"></i>
        <span>${item.label}</span>
      </a>
    `;
  }).join('');

  return `
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="brand-logo">D</div>
        <span class="brand-title">Dayflow HRMS</span>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-label">Employee Portal</div>
        ${linksHtml}
      </nav>

      <div class="sidebar-footer">
        <div class="user-mini-card">
          <div class="user-avatar" style="width: 32px; height: 32px; font-size: 12px;">
            ${user.avatar ? `<img src="${user.avatar}" class="user-avatar" style="width: 32px; height: 32px;" alt="${user.name}">` : user.name ? user.name.charAt(0) : 'E'}
          </div>
          <div style="overflow: hidden;">
            <div style="font-weight: 600; font-size: 13px; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user.name || 'Employee'}</div>
            <div style="font-size: 11px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user.designation || 'Staff'}</div>
          </div>
        </div>
      </div>
    </aside>
  `;
}

export function initSidebarEvents() {
  const overlay = document.getElementById('sidebar-overlay');
  const sidebar = document.getElementById('sidebar');

  if (overlay && sidebar) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    });
  }
}
