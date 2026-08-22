// DAYFLOW HRMS — ADMIN NAVBAR COMPONENT (REAL BACKEND DATA)
// Global search · notifications · admin profile · logout

import { store } from '../../core/store.js';
import { router } from '../../core/router.js';
import { api, esc } from '../../core/api.js';
import { authService } from '../../core/authService.js';
import { adminStore } from '../../core/adminStore.js';
import { getInitials } from './EmployeeCard.js';

const NOTIF_ICONS = {
  LEAVE_APPROVED: 'check-circle',
  LEAVE_REJECTED: 'x-circle',
  PAYSLIP_AVAILABLE: 'receipt',
  default: 'bell',
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

// Server-backed notification cache (read-state lives in PostgreSQL).
let notifCache = [];

async function loadNotifications() {
  try {
    const data = await api.get('/api/notifications/me?limit=10');
    notifCache = data.notifications || [];
  } catch (_) {
    notifCache = [];
  }
}

function renderNotifItems() {
  if (!notifCache.length) {
    return '<p style="padding:20px;text-align:center;color:var(--text-tertiary);font-size:13px;">You are all caught up!</p>';
  }
  return notifCache.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}">
      <div class="notif-icon" style="background-color:var(--primary-light); color:var(--primary);">
        <i data-lucide="${esc(NOTIF_ICONS[n.type] || NOTIF_ICONS.default)}" style="width:15px;height:15px;"></i>
      </div>
      <div style="min-width:0;">
        <div class="notif-title">${esc(n.title)}</div>
        <div class="notif-desc">${esc(n.body)}</div>
        <div class="notif-time">${esc(String(n.createdAt || '').slice(0, 10))}</div>
      </div>
    </div>
  `).join('');
}

export function renderAdminNavbar(pageTitle = 'Admin') {
  const user = store.getState().user || {};
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const hasUnread = notifCache.some(n => !n.read);

  return `
    <header class="navbar">
      <div class="navbar-left">
        <button class="menu-toggle-btn" id="mobile-menu-btn" title="Toggle Sidebar">
          <i data-lucide="menu" style="width: 20px; height: 20px;"></i>
        </button>
        <h1 class="page-title">${esc(pageTitle)}</h1>
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
            ${hasUnread ? '<span class="notification-dot"></span>' : ''}
          </button>
          <div class="notif-panel" id="admin-notif-panel">
            <div class="notif-panel-header">
              <span>Notifications</span>
              <button class="btn btn-secondary btn-xs" id="admin-notif-clear">Mark all read</button>
            </div>
            <div class="notif-list"><p style="padding:20px;text-align:center;color:var(--text-tertiary);font-size:13px;">Loading…</p></div>
          </div>
        </div>

        <div class="user-menu-wrapper">
          <button class="user-avatar-btn" id="admin-user-menu-btn">
            <div class="av-circle av-md" style="${adminStore.avatarStyle(0)}">${getInitials(user.name || 'A')}</div>
            <i data-lucide="chevron-down" style="width: 16px; height: 16px; color: var(--text-secondary);"></i>
          </button>

          <div class="dropdown-menu" id="admin-user-dropdown">
            <div class="dropdown-header">
              <div class="dropdown-user-name">${esc(user.name || 'Admin')}</div>
              <div class="dropdown-user-role">${esc(user.role || 'ADMIN_HR')}</div>
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

export async function refreshNotifPanel() {
  await loadNotifications();
  const panel = document.getElementById('admin-notif-panel');
  if (!panel) return;
  const list = panel.querySelector('.notif-list');
  if (list) list.innerHTML = renderNotifItems();
  if (window.lucide) window.lucide.createIcons();

  const dot = document.querySelector('#admin-notif-btn .notification-dot');
  if (dot && !notifCache.some(n => !n.read)) dot.remove();
}

let searchDebounceTimer = null;

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

  // Notifications toggle + server load on open
  const notifBtn = document.getElementById('admin-notif-btn');
  const notifPanel = document.getElementById('admin-notif-panel');
  if (notifBtn && notifPanel) {
    notifBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      notifPanel.classList.toggle('show');
      if (notifPanel.classList.contains('show')) await refreshNotifPanel();
    });

    const clearBtn = document.getElementById('admin-notif-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        clearBtn.disabled = true;
        try {
          const unread = notifCache.filter(n => !n.read);
          await Promise.all(unread.map(n => api.post(`/api/notifications/${n.id}/read`, {})));
          await refreshNotifPanel();
          showToastSafe('All notifications marked as read.');
        } catch (err) {
          showToastSafe(err.message || 'Could not update notifications.', 'danger');
        } finally {
          clearBtn.disabled = false;
        }
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
    logoutBtn.addEventListener('click', async () => {
      await authService.logout(); // real backend logout + token cleanup
      store.logout();
      router.navigate('/login');
    });
  }

  // Global employee search — debounced live API query
  const searchInput = document.getElementById('admin-global-search');
  const resultsPanel = document.getElementById('admin-search-results');
  if (searchInput && resultsPanel) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      const q = searchInput.value.trim();
      if (!q) {
        resultsPanel.classList.remove('show');
        resultsPanel.innerHTML = '';
        return;
      }
      searchDebounceTimer = setTimeout(async () => {
        resultsPanel.classList.add('show');
        resultsPanel.innerHTML = '<p style="padding:14px;font-size:13px;color:var(--text-tertiary);">Searching…</p>';
        try {
          const data = await adminStore.queryEmployees({ search: q, limit: 6 });
          const matches = data.employees || [];
          resultsPanel.innerHTML = matches.length
            ? matches.map(emp => {
                const name = `${emp.firstName} ${emp.lastName}`.trim();
                return `
                  <button class="search-result-item" data-emp-id="${esc(emp.id)}">
                    <span class="av-circle av-sm" style="${adminStore.avatarStyle(name.length)}">${getInitials(name)}</span>
                    <span style="flex:1; min-width:0;">
                      <span style="display:block; font-weight:600; font-size:13px;">${esc(name)}</span>
                      <span style="display:block; font-size:12px; color:var(--text-secondary);">${esc(emp.loginId)} · ${esc(emp.department || 'General')}</span>
                    </span>
                    <i data-lucide="arrow-right" style="width:14px;height:14px;color:var(--text-tertiary);"></i>
                  </button>
                `;
              }).join('')
            : '<p style="padding:14px;font-size:13px;color:var(--text-tertiary);">No employees found.</p>';

          if (window.lucide) window.lucide.createIcons();

          resultsPanel.querySelectorAll('[data-emp-id]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => { // mousedown beats blur
              e.preventDefault();
              router.navigate(`/admin/employees/${btn.dataset.empId}`);
            });
          });
        } catch (err) {
          resultsPanel.innerHTML = `<p style="padding:14px;font-size:13px;color:var(--danger);">${esc(err.message || 'Search failed.')}</p>`;
        }
      }, 300);
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

function showToastSafe(msg, tone = 'info') {
  import('../../components/Toast.js').then(({ showToast }) => showToast(msg, tone));
}
