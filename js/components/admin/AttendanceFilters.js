// DAYFLOW HRMS — ATTENDANCE FILTERS COMPONENT (ADMIN)
// Declarative filter bar. Caller binds events using the ids below:
//   att-filter-search · att-filter-employee · att-filter-status
//   att-filter-date · att-filter-month · att-filter-clear

import { esc } from '../../core/api.js';
import { DEPARTMENT_OPTIONS } from '../../core/adminStore.js';

export function AttendanceFilters(employees, values = {}, opts = {}) {
  const { showDate = true, showMonth = false, showStatus = true } = opts;
  const employeeOptions = employees.map(e =>
    `<option value="${esc(e.id)}" ${values.employeeId === e.id ? 'selected' : ''}>${esc(e.name)} (${esc(e.loginId || e.id)})</option>`
  ).join('');

  const statusOptions = ['PRESENT', 'HALF_DAY', 'ABSENT', 'LEAVE'].map(s =>
    `<option value="${s}" ${values.status === s ? 'selected' : ''}>${s.replace('_', '-')}</option>`
  ).join('');

  return `
    <div class="filter-bar">
      <div class="filter-group grow-lg">
        <label class="filter-label" for="att-filter-search">Search</label>
        <input type="text" id="att-filter-search" class="form-input" placeholder="Name or ID..."
               value="${esc(values.search || '')}" />
      </div>

      <div class="filter-group">
        <label class="filter-label" for="att-filter-employee">Employee</label>
        <select id="att-filter-employee" class="form-select">
          <option value="">All Employees</option>
          ${employeeOptions}
        </select>
      </div>

      ${showStatus ? `
      <div class="filter-group">
        <label class="filter-label" for="att-filter-status">Status</label>
        <select id="att-filter-status" class="form-select">
          <option value="">All Statuses</option>
          ${statusOptions}
        </select>
      </div>` : ''}

      ${showDate ? `
      <div class="filter-group">
        <label class="filter-label" for="att-filter-date">Date</label>
        <input type="date" id="att-filter-date" class="form-input" value="${values.date || ''}" />
      </div>` : ''}

      ${showMonth ? `
      <div class="filter-group">
        <label class="filter-label" for="att-filter-month">Month</label>
        <input type="month" id="att-filter-month" class="form-input" value="${values.month || '2026-08'}" />
      </div>` : ''}

      <div class="filter-actions">
        <button class="btn btn-secondary btn-sm" id="att-filter-clear">
          <i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i>
          <span>Clear</span>
        </button>
      </div>
    </div>
  `;
}

export function EmployeeSelectOptions(employees, selectedId = '') {
  return employees.map(e =>
    `<option value="${esc(e.id)}" ${e.id === selectedId ? 'selected' : ''}>${esc(e.name)} (${esc(e.loginId || e.id)})</option>`
  ).join('');
}

export function DepartmentOptions(selected = '') {
  return DEPARTMENT_OPTIONS.map(d => `<option value="${d}" ${d === selected ? 'selected' : ''}>${d}</option>`).join('');
}
