// DAYFLOW HRMS — ADMIN NAVBAR COMPONENT
// Global search · notifications · admin profile · logout

import { store } from '../../core/store.js';
import { router } from '../../core/router.js';
import { adminStore } from '../../core/adminStore.js';
import { getInitials } from './EmployeeCard.js';

const NOTIF_TONES = {
  info: { bg: 'var(--info-bg)', fg: 'var(--info)' },
  success: { bg: 'var(--success-bg)', fg: 'var(--success)' },
  warning: { bg: 'var(--warning-bg)', fg: '#b06000' },
  danger: { bg: 'var(--danger-bg)', fg: 'var(--danger)' },
  neutral: { bg: 'var(--bg-subtle)', fg: 'var(--text-secondary)' }
};

let outsideClickInstalled = false;

function installOutsideClickCloser() {
  if (outsideClickInstalled) return;
  outsideClickInstalled = true;
  document.addEventListener('click', (e) => {
    document.querySelectorAll('.search-results-panel.show, .notif-panel.show, .dropdown-menu.show')
      .forEach(panel => {
        if (!panel.parentElement.contains(e.target)) {
          panel.classList.remove('show');
        }
      });
  });
}

function renderNotifItems() {
  const notifications = adminStore.getNotifications();
  if (!notifications.length) {
    return '<p style="padding:20px;text-align:center;color:var(--text-tertiary);font-size:13px;">You are all caught up!</p>';
  }
  return notifications.map(n => {
    const tone = NOTIF_TONES[n.tone] || NOTIF_TONES.neutral;
    return `
      <div class="notif-item ${n.read ? '' : 'unread'}">
        <div class="notif-icon" style="background-color:${tone.bg}; color:${tone.fg};">
          <i data-lucide="${n.icon}" style="width:15px;height:15px;"></i>
        </div>
        <div style="min-width:0;">
          <div class="notif-title">${n.title}</div>
          <div class="notif-desc">${n.desc}</div>
          <div class="notif-time">${n.time}</div>
        </div>
      </div>
    `;
  }).join('');
}

export function renderAdminNavbar(pageTitle = 'Admin') {
  const user = store.getState().user || {};
  const unread = adminStore.unreadNotificationCount();
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
        <div class="admin-search-wrapper">
          <i data-lucide="search" class="admin-search-icon" style="width:16px;height:16px;"></i>
          <input type="text" id="admin-global-search" class="admin-search-input"
                 placeholder="Search employees by name or ID..." autocomplete="off" />
          <div class="search-results-panel" id="admin-search-results"></div>
        </div>

        <div class="current-time-badge">
          <i data-lucide="calendar" style="width: 14px; height: 14px; color: var(--primary);"></i>
          <span>${todayStr}</span>
        </div>

        <div class="notif-wrapper">
          <button class="icon-btn" id="admin-notif-btn" title="Notifications">
            <i data-lucide="bell" style="width: 20px; height: 20px;"></i>
            ${unread ? '<span class="notification-dot"></span>' : ''}
          </button>
          <div class="notif-panel" id="admin-notif-panel">
            <div class="notif-panel-header">
              <span>Notifications</span>
              <button class="btn btn-secondary btn-xs" id="admin-notif-clear">Mark all read</button>
            </div>
            <div class="notif-list">${renderNotifItems()}</div>
          </div>
        </div>

        <div class="user-menu-wrapper">
          <button class="user-avatar-btn" id="admin-user-menu-btn">
            <div class="av-circle av-md" style="${adminStore.avatarStyle(0)}">${getInitials(user.name || 'A')}</div>
            <i data-lucide="chevron-down" style="width: 16px; height: 16px; color: var(--text-secondary);"></i>
          </button>

          <div class="dropdown-menu" id="admin-user-dropdown">
            <div class="dropdown-header">
              <div class="dropdown-user-name">${user.name || 'Admin'}</div>
              <div class="dropdown-user-role">${user.role || 'Admin'} · ${user.id || ''}</div>
            </div>
            <button class="dropdown-item danger" id="admin-logout-btn">
              <i data-lucide="log-out" style="width: 16px; height: 16px;"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  `;
}

export function refreshNotifPanel() {
  const panel = document.getElementById('admin-notif-panel');
  if (!panel) return;
  panel.querySelector('.notif-list').innerHTML = renderNotifItems();
  if (window.lucide) window.lucide.createIcons();
}

export function initAdminNavbarEvents() {
  installOutsideClickCloser();

  const mobileBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (mobileBtn && sidebar && overlay) {
    mobileBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('show');
    });
  }

  // Notifications toggle
  const notifBtn = document.getElementById('admin-notif-btn');
  const notifPanel = document.getElementById('admin-notif-panel');
  if (notifBtn && notifPanel) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifPanel.classList.toggle('show');
    });

    const clearBtn = document.getElementById('admin-notif-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        adminStore.markAllNotificationsRead();
        refreshNotifPanel();
        const dot = notifBtn.querySelector('.notification-dot');
        if (dot) dot.remove();
      });
    }
  }

  // Profile dropdown
  const menuBtn = document.getElementById('admin-user-menu-btn');
  const dropdown = document.getElementById('admin-user-dropdown');
  if (menuBtn && dropdown) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    });
  }

  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      store.logout(); // clears shared mock session
      router.navigate('/login');
    });
  }

  // Global employee search
  const searchInput = document.getElementById('admin-global-search');
  const resultsPanel = document.getElementById('admin-search-results');
  if (searchInput && resultsPanel) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim();
      if (!q) {
        resultsPanel.classList.remove('show');
        resultsPanel.innerHTML = '';
        return;
      }
      const matches = adminStore.queryEmployees({ search: q }).slice(0, 6);
      resultsPanel.innerHTML = matches.length
        ? matches.map(emp => `
            <button class="search-result-item" data-emp-id="${emp.id}">
              <span class="av-circle av-sm" style="${adminStore.avatarStyle(Number(emp.id.slice(-2)) || 0)}">${getInitials(emp.name)}</span>
              <span style="flex:1; min-width:0;">
                <span style="display:block; font-weight:600; font-size:13px;">${emp.name}</span>
                <span style="display:block; font-size:12px; color:var(--text-secondary);">${emp.id} · ${emp.department}</span>
              </span>
              <i data-lucide="arrow-right" style="width:14px;height:14px;color:var(--text-tertiary);"></i>
            </button>
          `).join('')
        : '<p style="padding:14px;font-size:13px;color:var(--text-tertiary);">No employees found.</p>';

      resultsPanel.classList.add('show');
      if (window.lucide) window.lucide.createIcons();

      resultsPanel.querySelectorAll('[data-emp-id]').forEach(btn => {
        btn.addEventListener('mousedown', (e) => { // mousedown beats blur
          e.preventDefault();
          router.navigate(`/admin/employees/${btn.dataset.empId}`);
        });
      });
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const first = resultsPanel.querySelector('[data-emp-id]');
        if (first) router.navigate(`/admin/employees/${first.dataset.empId}`);
      }
      if (e.key === 'Escape') {
        resultsPanel.classList.remove('show');
        searchInput.blur();
      }
    });
  }
}
