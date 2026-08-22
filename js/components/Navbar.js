// DAYFLOW HRMS — NAVBAR COMPONENT

import { store } from '../core/store.js';
import { router } from '../core/router.js';
import { authService } from '../core/authService.js';
import { esc } from '../core/api.js';

export function renderNavbar(pageTitle = 'Dashboard') {
  const state = store.getState();
  const user = state.user || {};

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return `
    <header class="navbar">
      <div class="navbar-left">
        <button class="menu-toggle-btn" id="mobile-menu-btn" title="Toggle Sidebar">
          <i data-lucide="menu" style="width: 20px; height: 20px;"></i>
        </button>
        <h1 class="page-title">${esc(pageTitle)}</h1>
      </div>

      <div class="navbar-right">
        <div class="current-time-badge">
          <i data-lucide="calendar" style="width: 14px; height: 14px; color: var(--primary);"></i>
          <span>${todayStr}</span>
        </div>

        <button class="icon-btn" id="notif-btn" title="Notifications">
          <i data-lucide="bell" style="width: 20px; height: 20px;"></i>
          <span class="notification-dot"></span>
        </button>

        <div class="user-menu-wrapper">
          <button class="user-avatar-btn" id="user-menu-btn">
            <div class="user-avatar">
              ${user.avatar ? `<img src="${esc(user.avatar)}" class="user-avatar" alt="${esc(user.name)}">` : (user.name ? esc(user.name.charAt(0)) : 'U')}
            </div>
            <i data-lucide="chevron-down" style="width: 16px; height: 16px; color: var(--text-secondary);"></i>
          </button>

          <div class="dropdown-menu" id="user-dropdown-menu">
            <div class="dropdown-header">
              <div class="dropdown-user-name">${esc(user.name || 'User')}</div>
              <div class="dropdown-user-role">${esc(user.role || 'Employee')} • ${esc(user.id || '')}</div>
            </div>
            <button class="dropdown-item" id="menu-profile-btn">
              <i data-lucide="user" style="width: 16px; height: 16px;"></i>
              <span>My Profile</span>
            </button>
            <button class="dropdown-item" id="menu-attendance-btn">
              <i data-lucide="clock" style="width: 16px; height: 16px;"></i>
              <span>Attendance</span>
            </button>
            <div style="border-top: 1px solid var(--border-light); margin: 4px 0;"></div>
            <button class="dropdown-item danger" id="menu-logout-btn">
              <i data-lucide="log-out" style="width: 16px; height: 16px;"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  `;
}

// Module-level handler references so re-init on every route change REPLACES
// the previous listeners instead of stacking duplicates (bug fix).
let docClickHandler = null;

export function initNavbarEvents() {
  const menuBtn = document.getElementById('user-menu-btn');
  const dropdown = document.getElementById('user-dropdown-menu');
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (mobileBtn && sidebar && overlay) {
    mobileBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('show');
    });
  }

  if (docClickHandler) {
    document.removeEventListener('click', docClickHandler);
    docClickHandler = null;
  }

  if (menuBtn && dropdown) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    });

    // Close the dropdown when clicking anywhere else. The handler is stored
    // and removed before the next navbar init — previously every navigation
    // attached another listener that accumulated forever.
    docClickHandler = () => dropdown.classList.remove('show');
    document.addEventListener('click', docClickHandler);
  }

  const profileBtn = document.getElementById('menu-profile-btn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      if (store.getState().user?.role === 'Admin') router.navigate('/admin/employees');
      else router.navigate('/employee/profile');
    });
  }

  const attendanceBtn = document.getElementById('menu-attendance-btn');
  if (attendanceBtn) {
    attendanceBtn.addEventListener('click', () => {
      if (store.getState().user?.role === 'Admin') router.navigate('/admin/attendance');
      else router.navigate('/employee/attendance');
    });
  }

  const logoutBtn = document.getElementById('menu-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await authService.logout();
      store.logout();
      router.navigate('/login');
    });
  }
}
