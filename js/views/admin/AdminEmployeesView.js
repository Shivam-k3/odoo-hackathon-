// DAYFLOW HRMS — ADMIN EMPLOYEES LIST VIEW (/admin/employees)

import { adminStore, simulateFetch } from '../../core/adminStore.js';
import { renderAdminLayout, initAdminLayoutEvents, rerenderPageContent } from '../../components/admin/AdminLayout.js';
import { EmployeeCard } from '../../components/admin/EmployeeCard.js';
import { EmptyState } from '../../components/admin/EmptyState.js';
import { StatusBadge } from '../../components/admin/StatusBadge.js';
import { DepartmentOptions } from '../../components/admin/AttendanceFilters.js';

const EMPLOYMENT_STATUSES = ['Active', 'On Leave', 'Probation', 'Inactive'];

export function createAdminEmployeesView() {
  const ui = {
    loaded: false,
    search: '',
    department: '',
    status: '',
    viewMode: 'table'
  };

  function skeletonHtml() {
    return `
      <div class="filter-bar">
        ${Array(4).fill('<div class="skeleton" style="height:38px; flex:1;"></div>').join('')}
      </div>
      <div class="skeleton" style="height:380px; border-radius:16px;"></div>
    `;
  }

  function resultsCountHtml(filtered) {
    return `<p style="font-size:12px; color:var(--text-tertiary); margin:-8px 0 14px;">
      Showing <strong>${filtered.length}</strong> of ${adminStore.getEmployees().length} employees
      ${ui.search || ui.department || ui.status ? '(filtered)' : ''}
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
                <tr class="row-clickable" data-emp-id="${emp.id}">
                  <td>
                    <div class="employee-cell">
                      <span class="av-circle av-sm" style="${adminStore.avatarStyle(i)}">${emp.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
                      <span style="min-width:0;">
                        <span class="cell-strong" style="display:block;">${emp.name}</span>
                        <span style="display:block; font-size:12px; color:var(--text-tertiary);">${emp.email}</span>
                      </span>
                    </div>
                  </td>
                  <td><span class="badge badge-info">${emp.id}</span></td>
                  <td>${emp.department}</td>
                  <td>${emp.position}</td>
                  <td>${StatusBadge(emp.employmentStatus)}</td>
                  <td style="text-align:right;">
                    <a href="#/admin/employees/${emp.id}" class="btn btn-secondary btn-xs">
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

  function filterBarHtml() {
    return `
      <div class="filter-bar">
        <div class="filter-group grow-lg">
          <label class="filter-label" for="emp-filter-search">Search</label>
          <input type="text" id="emp-filter-search" class="form-input" placeholder="Name, ID, email or role..."
                 value="${ui.search}" />
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
            ${EMPLOYMENT_STATUSES.map(s => `<option value="${s}" ${ui.status === s ? 'selected' : ''}>${s}</option>`).join('')}
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

  function contentHtml() {
    const filtered = adminStore.queryEmployees({ search: ui.search, department: ui.department, status: ui.status });

    let resultsHtml;
    if (!filtered.length) {
      resultsHtml = EmptyState({
        icon: 'user-search',
        title: 'No employees match your filters',
        desc: 'Try a different name, department or status combination.',
        actionsHtml: '<button class="btn btn-primary btn-sm" id="emp-empty-clear">Clear Filters</button>'
      });
    } else {
      resultsHtml = ui.viewMode === 'cards' ? cardsViewHtml(filtered) : tableViewHtml(filtered);
    }

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
        <div>
          <h2 style="font-size:22px; font-weight:700; letter-spacing:-0.4px;">Employee Management</h2>
          <p style="color:var(--text-secondary); font-size:13px; margin-top:2px;">Search, filter and review every employee record.</p>
        </div>
      </div>

      ${filterBarHtml()}
      <div id="emp-results-area">
        ${resultsCountHtml(filtered)}
        ${resultsHtml}
      </div>
    `;
  }

  // Re-render only the results area so the search box keeps focus while typing.
  function updateResultsArea() {
    const filtered = adminStore.queryEmployees({ search: ui.search, department: ui.department, status: ui.status });
    const area = document.getElementById('emp-results-area');
    if (!area) return;

    const resultsHtml = !filtered.length
      ? EmptyState({
          icon: 'user-search',
          title: 'No employees match your filters',
          desc: 'Try a different name, department or status combination.',
          actionsHtml: '<button class="btn btn-primary btn-sm" id="emp-empty-clear">Clear Filters</button>'
        })
      : `${resultsCountHtml(filtered)}${ui.viewMode === 'cards' ? cardsViewHtml(filtered) : tableViewHtml(filtered)}`;

    area.innerHTML = resultsHtml;
    if (window.lucide) window.lucide.createIcons();
    bindResultEvents();
  }

  function bindResultEvents() {
    document.querySelectorAll('#emp-results-area tr[data-emp-id]').forEach(row => {
      row.addEventListener('click', () => window.location.hash = `/admin/employees/${row.dataset.empId}`);
    });
    document.getElementById('emp-empty-clear')?.addEventListener('click', clearFilters);
  }

  function clearFilters() {
    ui.search = '';
    ui.department = '';
    ui.status = '';
    const s = document.getElementById('emp-filter-search');
    const d = document.getElementById('emp-filter-dept');
    const st = document.getElementById('emp-filter-status');
    if (s) s.value = '';
    if (d) d.value = '';
    if (st) st.value = '';
    updateResultsArea();
  }

  const view = {
    render() {
      return renderAdminLayout('/admin/employees', 'Employees', ui.loaded ? contentHtml() : skeletonHtml());
    },

    afterRender() {
      initAdminLayoutEvents();
      if (!ui.loaded) {
        simulateFetch(500).then(() => {
          ui.loaded = true;
          rerenderPageContent(view);
        });
      } else {
        view.bindEvents();
      }
    },

    bindEvents() {
      const searchInput = document.getElementById('emp-filter-search');
      searchInput?.addEventListener('input', () => {
        ui.search = searchInput.value;
        updateResultsArea();
      });

      document.getElementById('emp-filter-dept')?.addEventListener('change', e => {
        ui.department = e.target.value;
        updateResultsArea();
      });

      document.getElementById('emp-filter-status')?.addEventListener('change', e => {
        ui.status = e.target.value;
        updateResultsArea();
      });

      document.getElementById('emp-filter-clear')?.addEventListener('click', clearFilters);

      document.querySelectorAll('#emp-view-toggle .view-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          ui.viewMode = btn.dataset.mode;
          document.querySelectorAll('#emp-view-toggle .view-toggle-btn')
            .forEach(b => b.classList.toggle('active', b === btn));
          updateResultsArea();
        });
      });

      bindResultEvents();
    },

    unmount() { /* no subscriptions */ }
  };

  return view;
}
