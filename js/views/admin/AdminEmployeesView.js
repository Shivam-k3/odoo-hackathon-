// DAYFLOW HRMS — ADMIN EMPLOYEES LIST VIEW (/admin/employees)
// Live PostgreSQL-backed directory: server-side search/department filters,
// client-side status refinement, pagination.

import { adminStore, uiEmployee } from '../../core/adminStore.js';
import { esc } from '../../core/api.js';
import { renderAdminLayout, initAdminLayoutEvents, rerenderPageContent } from '../../components/admin/AdminLayout.js';
import { EmployeeCard } from '../../components/admin/EmployeeCard.js';
import { EmptyState } from '../../components/admin/EmptyState.js';
import { StatusBadge } from '../../components/admin/StatusBadge.js';
import { DepartmentOptions } from '../../components/admin/AttendanceFilters.js';

const PAGE_SIZE = 12;

export function createAdminEmployeesView() {
  const ui = {
    loaded: false,
    error: null,
    search: '',
    department: '',
    status: '',
    viewMode: 'table',
    page: 1,
    total: 0,
    totalPages: 1,
    employees: [], // UI-shaped
  };

  function skeletonHtml() {
    return `
      <div class="filter-bar">
        ${Array(4).fill('<div class="skeleton" style="height:38px; flex:1;"></div>').join('')}
      </div>
      <div class="skeleton" style="height:380px; border-radius:16px;"></div>
    `;
  }

  function errorHtml() {
    return `
      <div style="padding:40px; text-align:center;">
        <i data-lucide="alert-triangle" style="width:36px; height:36px; color:var(--danger);"></i>
        <div style="font-weight:600; margin-top:12px;">Could not load employees</div>
        <div style="font-size:13px; color:var(--text-tertiary); margin-top:4px;">${esc(ui.error)}</div>
        <button class="btn btn-primary btn-sm" id="emp-retry" style="margin-top:16px;">Retry</button>
      </div>
    `;
  }

  function statusFiltered(list) {
    if (!ui.status) return list;
    return list.filter(e => (e.employmentStatus || '').toUpperCase() === ui.status);
  }

  function resultsCountHtml(shown) {
    const filtered = !!(ui.search || ui.department || ui.status);
    return `<p style="font-size:12px; color:var(--text-tertiary); margin:-8px 0 14px;">
      Showing <strong>${shown}</strong> of ${ui.total} employee record${ui.total === 1 ? '' : 's'}
      ${filtered ? '(filtered)' : ''} · page ${ui.page}/${ui.totalPages}
    </p>`;
  }

  function tableViewHtml(filtered) {
    return `
      <div class="table-container">
        <div class="table-scroll table-min-880">
          <table class="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Job Position</th>
                <th>Status</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map((emp, i) => `
                <tr class="row-clickable" data-emp-id="${esc(emp.id)}">
                  <td>
                    <div class="employee-cell">
                      <span class="av-circle av-sm" style="${adminStore.avatarStyle(i)}">${esc(emp.name.split(' ').map(w => w[0]).slice(0, 2).join(''))}</span>
                      <span style="min-width:0;">
                        <span class="cell-strong" style="display:block;">${esc(emp.name)}</span>
                        <span style="display:block; font-size:12px; color:var(--text-tertiary);">${esc(emp.email)}</span>
                      </span>
                    </div>
                  </td>
                  <td><span class="badge badge-info">${esc(emp.loginId)}</span></td>
                  <td>${esc(emp.department)}</td>
                  <td>${esc(emp.position)}</td>
                  <td>${StatusBadge(emp.employmentStatus)}</td>
                  <td style="text-align:right;">
                    <a href="#/admin/employees/${esc(emp.id)}" class="btn btn-secondary btn-xs">
                      <i data-lucide="eye" style="width:13px;height:13px;"></i> View
                    </a>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function cardsViewHtml(filtered) {
    return `
      <div class="employee-cards-grid">
        ${filtered.map((e, i) => EmployeeCard(e, adminStore.avatarStyle(i), { showContact: true })).join('')}
      </div>
    `;
  }

  function paginationHtml() {
    if (ui.totalPages <= 1 && !ui.total) return '';
    return `
      <div style="display:flex; justify-content:center; align-items:center; gap:10px; margin-top:18px;">
        <button class="btn btn-secondary btn-sm" id="emp-page-prev" ${ui.page <= 1 ? 'disabled' : ''}>
          <i data-lucide="chevron-left" style="width:14px;height:14px;"></i> Prev
        </button>
        <span style="font-size:13px; color:var(--text-secondary);">Page ${ui.page} of ${ui.totalPages}</span>
        <button class="btn btn-secondary btn-sm" id="emp-page-next" ${ui.page >= ui.totalPages ? 'disabled' : ''}>
          Next <i data-lucide="chevron-right" style="width:14px;height:14px;"></i>
        </button>
      </div>
    `;
  }

  function filterBarHtml() {
    return `
      <div class="filter-bar">
        <div class="filter-group grow-lg">
          <label class="filter-label" for="emp-filter-search">Search</label>
          <input type="text" id="emp-filter-search" class="form-input" placeholder="Name, ID, email or role..."
                 value="${esc(ui.search)}" />
        </div>
        <div class="filter-group">
          <label class="filter-label" for="emp-filter-dept">Department</label>
          <select id="emp-filter-dept" class="form-select">
            <option value="">All Departments</option>
            ${DepartmentOptions(ui.department)}
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label" for="emp-filter-status">Employment Status</label>
          <select id="emp-filter-status" class="form-select">
            <option value="">All Statuses</option>
            ${['ACTIVE', 'PENDING', 'INACTIVE'].map(s => `<option value="${s}" ${ui.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="filter-actions">
          <div class="view-toggle" id="emp-view-toggle">
            <button class="view-toggle-btn ${ui.viewMode === 'table' ? 'active' : ''}" data-mode="table" title="Table view">
              <i data-lucide="table" style="width:14px;height:14px;"></i> Table
            </button>
            <button class="view-toggle-btn ${ui.viewMode === 'cards' ? 'active' : ''}" data-mode="cards" title="Card view">
              <i data-lucide="layout-grid" style="width:14px;height:14px;"></i> Cards
            </button>
          </div>
          <button class="btn btn-secondary btn-sm" id="emp-filter-clear">
            <i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i>
            <span>Clear</span>
          </button>
        </div>
      </div>
    `;
  }

  function resultsAreaHtml() {
    const filtered = statusFiltered(ui.employees);
    const resultsHtml = !filtered.length
      ? EmptyState({
          icon: 'user-search',
          title: 'No employees match your filters',
          desc: 'Try a different name, department or status combination.',
          actionsHtml: '<button class="btn btn-primary btn-sm" id="emp-empty-clear">Clear Filters</button>'
        })
      : `${resultsCountHtml(filtered.length)}${ui.viewMode === 'cards' ? cardsViewHtml(filtered) : tableViewHtml(filtered)}${paginationHtml()}`;
    return `<div id="emp-results-area">${resultsHtml}</div>`;
  }

  async function fetchEmployees(keepFocusEl = null) {
    try {
      ui.error = null;
      const data = await adminStore.queryEmployees({
        search: ui.search,
        department: ui.department,
        page: ui.page,
        limit: PAGE_SIZE,
      });
      ui.employees = (data.employees || []).map(uiEmployee);
      ui.total = data.total || 0;
      ui.page = data.page || 1;
      ui.totalPages = Math.max(1, data.totalPages || 1);
      ui.loaded = true;
      rerenderPageContent(view);
      if (keepFocusEl) {
        const el = document.getElementById(keepFocusEl);
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      }
    } catch (err) {
      ui.error = err.message || 'Failed to load employees.';
      rerenderPageContent(view);
    }
  }

  function clearFilters() {
    ui.search = '';
    ui.department = '';
    ui.status = '';
    ui.page = 1;
    fetchEmployees();
  }

  function bindResultEvents() {
    document.querySelectorAll('#emp-results-area tr[data-emp-id]').forEach(row => {
      row.addEventListener('click', () => window.location.hash = `/admin/employees/${row.dataset.empId}`);
    });
    document.getElementById('emp-empty-clear')?.addEventListener('click', clearFilters);
    document.getElementById('emp-page-prev')?.addEventListener('click', () => { if (ui.page > 1) { ui.page--; fetchEmployees(); } });
    document.getElementById('emp-page-next')?.addEventListener('click', () => { if (ui.page < ui.totalPages) { ui.page++; fetchEmployees(); } });
  }

  let searchDebounce = null;

  const view = {
    render() {
      if (!ui.loaded && !ui.error) return renderAdminLayout('/admin/employees', 'Employees', skeletonHtml());
      if (ui.error) return renderAdminLayout('/admin/employees', 'Employees', errorHtml());
      return renderAdminLayout('/admin/employees', 'Employees',
        `<div style="margin-bottom:20px;">
           <h2 style="font-size:22px; font-weight:700; letter-spacing:-0.4px;">Employee Management</h2>
           <p style="color:var(--text-secondary); font-size:13px; margin-top:2px;">Search, filter and review every employee record.</p>
         </div>
         ${filterBarHtml()}
         ${resultsAreaHtml()}`);
    },

    afterRender() {
      initAdminLayoutEvents();
      document.getElementById('emp-retry')?.addEventListener('click', () => fetchEmployees());
      if (!ui.loaded && !ui.error) { fetchEmployees(); return; }
      view.bindEvents();
    },

    bindEvents() {
      const searchInput = document.getElementById('emp-filter-search');
      searchInput?.addEventListener('input', () => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
          ui.search = searchInput.value;
          ui.page = 1;
          fetchEmployees('emp-filter-search'); // restore focus after re-render
        }, 350);
      });

      document.getElementById('emp-filter-dept')?.addEventListener('change', e => {
        ui.department = e.target.value;
        ui.page = 1;
        fetchEmployees();
      });

      // Status refines the current page without a refetch.
      document.getElementById('emp-filter-status')?.addEventListener('change', e => {
        ui.status = e.target.value;
        updateResultsOnly();
      });

      document.getElementById('emp-filter-clear')?.addEventListener('click', clearFilters);

      document.querySelectorAll('#emp-view-toggle .view-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          ui.viewMode = btn.dataset.mode;
          document.querySelectorAll('#emp-view-toggle .view-toggle-btn')
            .forEach(b => b.classList.toggle('active', b === btn));
          updateResultsOnly();
        });
      });

      bindResultEvents();
    },

    unmount() { clearTimeout(searchDebounce); }
  };

  function updateResultsOnly() {
    const wrapper = document.getElementById('emp-results-area');
    if (!wrapper) return;
    const filtered = statusFiltered(ui.employees);
    wrapper.outerHTML = resultsAreaHtml();
    if (window.lucide) window.lucide.createIcons();
    bindResultEvents();
  }

  return view;
}
