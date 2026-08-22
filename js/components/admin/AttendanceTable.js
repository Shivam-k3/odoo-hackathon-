// DAYFLOW HRMS — ATTENDANCE TABLE COMPONENT (ADMIN)

import { StatusBadge } from './StatusBadge.js';

/**
 * Renders a responsive scrollable table.
 * columns: [{ label, render(row) }]
 */
export function AttendanceTable(columns, rows, { minWidthClass = 'table-min-720', emptyMessage = 'No attendance records found.' } = {}) {
  if (!rows.length) {
    return `
      <div class="table-container" style="padding:8px;">
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="calendar-x" style="width:26px;height:26px;"></i></div>
          <div class="empty-title">No records</div>
          <p class="empty-desc">${emptyMessage}</p>
        </div>
      </div>
    `;
  }

  const head = columns.map(c => `<th>${c.label}</th>`).join('');
  const body = rows.map(row => `
    <tr>
      ${columns.map(c => `<td>${c.render ? c.render(row) : row[c.key] ?? '-'}</td>`).join('')}
    </tr>
  `).join('');

  return `
    <div class="table-container">
      <div class="table-scroll ${minWidthClass}">
        <table class="data-table">
          <thead><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </div>
  `;
}

// Shared column factories so every admin table renders people consistently.
export function EmployeeCell(emp) {
  if (!emp) return '<span class="cell-muted">Unknown</span>';
  return `
    <div class="employee-cell">
      <span class="av-circle av-sm">${emp.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
      <span style="min-width:0;">
        <span style="display:block; font-weight:600; font-size:14px;" class="cell-strong">${emp.name}</span>
        <span style="display:block; font-size:12px; color:var(--text-tertiary);">${emp.id}</span>
      </span>
    </div>
  `;
}

export function StatusCell(status) {
  return StatusBadge(status);
}
