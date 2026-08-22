// DAYFLOW HRMS — ADMIN SIDEBAR COMPONENT (REAL BACKEND DATA)
// Admin/HR navigation only. Employee pages are intentionally NOT listed here,
// and the employee sidebar never lists admin pages.

import { store } from '../../core/store.js';
import { esc } from '../../core/api.js';
import { adminStore } from '../../core/adminStore.js';

// Pending-leave badge count, refreshed from the API on each render cycle.
let pendingLeaveCount = 0;

export async function refreshPendingLeaveCount() {
  pendingLeaveCount = await adminStore.getPendingLeaveCount();
  return pendingLeaveCount;
}

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: 'layout-dashboard', match: p => p === '/admin/dashboard' },
  { label: 'Employees', path: '/admin/employees', icon: 'users', match: p => p.startsWith('/admin/employees') },
  { label: 'Attendance', path: '/admin/attendance', icon: 'clock', match: p => p === '/admin/attendance' },
  { label: 'Leave', path: '/admin/leave', icon: 'calendar-days', match: p => p === '/admin/leave', badge: () => pendingLeaveCount },
  { label: 'Payroll', path: '/admin/payroll', icon: 'receipt', match: p => p === '/admin/payroll' },
  { label: 'Reports', path: '/admin/reports', icon: 'bar-chart-3', match: p => p === '/admin/reports' }
];

export function renderAdminSidebar(currentPath = '') {
  const user = store.getState().user || {};

  const linksHtml = NAV_ITEMS.map(item => {
    const isActive = item.match(currentPath);
    const badgeCount = item.badge ? item.badge() : 0;
    return `
      <a href="#${item.path}" class="nav-link ${isActive ? 'active' : ''}">
        <i data-lucide="${item.icon}" style="width: 18px; height: 18px;"></i>
        <span style="flex:1;">${item.label}</span>
        ${badgeCount ? `<span class="badge badge-warning" style="padding:2px 8px; font-size:11px;">${badgeCount}</span>` : ''}
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
        <div class="nav-section-label">Admin Console</div>
        ${linksHtml}
      </nav>

      <div class="sidebar-footer">
        <div class="user-mini-card">
          <div class="av-circle av-sm" style="${adminStore.avatarStyle(0)}">${esc((user.name || 'A').charAt(0))}</div>
          <div style="overflow:hidden;">
            <div style="font-weight:600; font-size:13px; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(user.name || 'Admin')}</div>
            <div style="font-size:11px; color:var(--text-secondary);">${esc(user.role || 'ADMIN_HR')} · HR</div>
          </div>
        </div>
      </div>
    </aside>
  `;
}

export function initAdminSidebarEvents() {
  const overlay = document.getElementById('sidebar-overlay');
  const sidebar = document.getElementById('sidebar');
  if (overlay && sidebar) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    });
  }
}
