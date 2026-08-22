// DAYFLOW HRMS — NAVBAR COMPONENT

import { store } from '../core/store.js';
import { router } from '../core/router.js';

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
        <h1 class="page-title">${pageTitle}</h1>
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
              ${user.avatar ? `<img src="${user.avatar}" class="user-avatar" alt="${user.name}">` : (user.name ? user.name.charAt(0) : 'U')}
            </div>
            <i data-lucide="chevron-down" style="width: 16px; height: 16px; color: var(--text-secondary);"></i>
          </button>

          <div class="dropdown-menu" id="user-dropdown-menu">
            <div class="dropdown-header">
              <div class="dropdown-user-name">${user.name || 'User'}</div>
              <div class="dropdown-user-role">${user.role || 'Employee'} • ${user.id || ''}</div>
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

  if (menuBtn && dropdown) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      dropdown.classList.remove('show');
    });
  }

  const profileBtn = document.getElementById('menu-profile-btn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => router.navigate('/employee/profile'));
  }

  const attendanceBtn = document.getElementById('menu-attendance-btn');
  if (attendanceBtn) {
    attendanceBtn.addEventListener('click', () => router.navigate('/employee/attendance'));
  }

  const logoutBtn = document.getElementById('menu-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      store.logout();
      router.navigate('/login');
    });
  }
}
