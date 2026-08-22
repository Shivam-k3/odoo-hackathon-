// DAYFLOW HRMS — ADMIN REPORTS VIEW (/admin/reports)
// Frontend-only mock report generation. No backend calls.

import { adminStore, simulateFetch, formatINR } from '../../core/adminStore.js';
import { renderAdminLayout, initAdminLayoutEvents, rerenderPageContent } from '../../components/admin/AdminLayout.js';
import { EmptyState } from '../../components/admin/EmptyState.js';
import { EmployeeSelectOptions } from '../../components/admin/AttendanceFilters.js';
import { showToast } from '../../components/Toast.js';
import { StatusBadge } from '../../components/admin/StatusBadge.js';

const REPORT_TYPES = [
  { value: '', label: 'Select report type...' },
  { value: 'attendance-summary', label: 'Attendance Report' },
  { value: 'payroll-register', label: 'Payroll / Salary Report' },
  { value: 'employee-directory', label: 'Employee Report' }
];

export function createAdminReportsView() {
  const ui = {
    reportType: '',
    employeeId: '',
    startDate: '2026-08-01',
    endDate: '2026-08-21',
    generating: false,
    error: '',
    result: null // { type, title, generatedAt, headers, rows, summaryHtml }
  };

  function controlsHtml() {
    return `
      <div class="card" style="margin-bottom:24px;">
        <div class="report-controls">
          <div class="filter-group" style="max-width:none;">
            <label class="filter-label required" for="rep-type">Report Type</label>
            <select id="rep-type" class="form-select">
              ${REPORT_TYPES.map(t => `<option value="${t.value}" ${ui.reportType === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
            </select>
          </div>

          <div class="filter-group" style="max-width:none;">
            <label class="filter-label" for="rep-employee">Employee</label>
            <select id="rep-employee" class="form-select">
              <option value="">All Employees</option>
              ${EmployeeSelectOptions(adminStore.getEmployees(), ui.employeeId)}
            </select>
          </div>

          <div class="filter-group" style="max-width:none;">
            <label class="filter-label required" for="rep-start">Date Range</label>
            <div class="date-range-group">
              <input type="date" id="rep-start" class="form-input" value="${ui.startDate}" />
              <span style="color:var(--text-tertiary);">to</span>
              <input type="date" id="rep-end" class="form-input" value="${ui.endDate}" />
            </div>
          </div>
        </div>

        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-primary" id="rep-generate-btn" ${ui.generating ? 'disabled' : ''}>
            ${ui.generating
              ? '<i data-lucide="loader-2" style="width:15px;height:15px; animation: spin 1s linear infinite;"></i> Generating...'
              : '<i data-lucide="play" style="width:15px;height:15px;"></i> Generate Report'}
          </button>
          <button class="btn btn-secondary" id="rep-export-csv-btn" ${ui.result ? '' : 'disabled'}>
            <i data-lucide="download" style="width:15px;height:15px;"></i> Export CSV
          </button>
          <button class="btn btn-secondary" id="rep-export-pdf-btn">
            <i data-lucide="printer" style="width:15px;height:15px;"></i> Export PDF
          </button>
        </div>
      </div>
    `;
  }

  function previewAreaHtml() {
    if (ui.error) {
      return `
        <div class="error-state card" style="align-items:flex-start;">
          <div style="display:flex; gap:12px; align-items:center; width:100%;">
            <i data-lucide="alert-triangle" style="width:22px;height:22px;color:var(--danger);"></i>
            <p style="color:var(--danger); font-size:14px; font-weight:500;">${ui.error}</p>
          </div>
        </div>
      `;
    }

    if (ui.generating) {
      return `<div class="skeleton" style="height:360px; border-radius:16px;"></div>`;
    }

    if (!ui.result) {
      return EmptyState({
        icon: 'clipboard-list',
        title: 'No report generated yet',
        desc: 'Choose a report type, adjust filters and press Generate Report to see a mock preview here.'
      });
    }

    const r = ui.result;
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">
            <i data-lucide="clipboard-list" style="width:18px;height:18px;color:var(--primary);"></i>
            <span>${r.title}</span>
          </h3>
          <span style="font-size:12px; color:var(--text-tertiary);">
            ${ui.startDate} → ${ui.endDate} · Generated ${r.generatedAt}
          </span>
        </div>

        ${r.summaryHtml}

        <div class="table-container">
          <div class="table-scroll table-min-880">
            <table class="data-table">
              <thead><tr>${r.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
              <tbody>
                ${r.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
                ${r.totalsRow ? r.totalsRow : ''}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function contentHtml() {
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
        <div>
          <h2 style="font-size:22px; font-weight:700; letter-spacing:-0.4px;">Reports</h2>
          <p style="color:var(--text-secondary); font-size:13px; margin-top:2px;">
            Mock reporting console — real generation will be handled by the backend.
          </p>
        </div>
      </div>

      ${controlsHtml()}
      ${previewAreaHtml()}
    `;
  }

  // --------------------------------------------------------- REPORT BUILDERS

  function fmtMinutes(mins) {
    return mins ? `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m` : '0h 00m';
  }

  function buildAttendanceSummary() {
    let records = adminStore.getAllAttendance()
      .filter(r => r.date >= ui.startDate && r.date <= ui.endDate);
    if (ui.employeeId) records = records.filter(r => r.employeeId === ui.employeeId);

    const byEmp = {};
    records.forEach(r => {
      byEmp[r.employeeId] = byEmp[r.employeeId] || [];
      byEmp[r.employeeId].push(r);
    });

    const totals = { present: 0, absent: 0, halfDay: 0, leave: 0 };
    const rows = Object.entries(byEmp).map(([empId, recs]) => {
      const emp = adminStore.getEmployeeById(empId);
      const s = adminStore.summarize(recs);
      totals.present += s.present; totals.absent += s.absent;
      totals.halfDay += s.halfDay; totals.leave += s.leave;
      return [
        `<span class="cell-strong">${emp ? emp.name : empId}</span>`,
        empId,
        emp ? emp.department : '-',
        String(s.present),
        String(s.absent),
        String(s.halfDay),
        String(s.leave),
        fmtMinutes(s.totalMinutes),
        fmtMinutes(s.extraMinutes)
      ];
    }).sort((a, b) => a[0].localeCompare(b[0]));

    return {
      title: 'Attendance Summary Report',
      headers: ['Employee', 'ID', 'Department', 'Present', 'Absent', 'Half-day', 'Leave', 'Total Hours', 'Extra Hours'],
      rows,
      summaryHtml: `
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:18px;">
          <span class="badge badge-success" style="padding:6px 14px;">${totals.present} present days</span>
          <span class="badge badge-warning" style="padding:6px 14px;">${totals.absent} absent</span>
          <span class="badge badge-warning" style="padding:6px 14px;">${totals.halfDay} half-days</span>
          <span class="badge badge-info" style="padding:6px 14px;">${totals.leave} on leave</span>
        </div>
      `,
      totalsRow: null,
      csvName: 'attendance_summary'
    };
  }

  function buildPayrollRegister() {
    const employees = ui.employeeId
      ? adminStore.getEmployees().filter(e => e.id === ui.employeeId)
      : adminStore.getEmployees().filter(e => e.employmentStatus !== 'Inactive');

    const totals = { gross: 0, epf: 0, eerpf: 0, pt: 0, ded: 0, net: 0 };
    const rows = employees.map(emp => {
      const s = adminStore.getPayslip(emp.id).slip;
      totals.gross += s.grossWage; totals.epf += s.employeePF; totals.eerpf += s.employerPF;
      totals.pt += s.professionalTax; totals.ded += s.totalDeductions; totals.net += s.netPay;
      return [
        `<span class="cell-strong">${emp.name}</span>`,
        emp.id,
        formatINR(s.grossWage),
        formatINR(s.basicSalary),
        formatINR(s.employeePF),
        formatINR(s.employerPF),
        formatINR(s.professionalTax),
        `<span style="color:var(--danger);">-${formatINR(s.totalDeductions)}</span>`,
        `<span class="cell-strong" style="color:var(--success);">${formatINR(s.netPay)}</span>`
      ];
    });

    return {
      title: 'Payroll / Salary Register (mock)',
      headers: ['Employee', 'ID', 'Gross Wage', 'Basic', 'Employee PF', 'Employer PF', 'Prof. Tax', 'Deductions', 'Net Pay'],
      rows,
      summaryHtml: `
        <p style="font-size:12px; color:var(--text-tertiary); margin-bottom:16px;">
          <i data-lucide="info" style="width:13px;height:13px; vertical-align:-2px;"></i>
          Figures are mock previews. The backend payroll engine will provide final statutory values.
        </p>
      `,
      totalsRow: `
        <tr style="background-color:var(--bg-subtle); font-weight:600;">
          <td colspan="2">Totals (${employees.length} employees)</td>
          <td>${formatINR(totals.gross)}</td><td></td>
          <td>${formatINR(totals.epf)}</td><td>${formatINR(totals.eerpf)}</td>
          <td>${formatINR(totals.pt)}</td><td>-${formatINR(totals.ded)}</td>
          <td style="color:var(--success);">${formatINR(totals.net)}</td>
        </tr>`,
      csvName: 'payroll_register'
    };
  }

  function buildEmployeeDirectory() {
    const employees = ui.employeeId
      ? adminStore.getEmployees().filter(e => e.id === ui.employeeId)
      : adminStore.getEmployees();

    const deptCounts = {};
    employees.forEach(e => { deptCounts[e.department] = (deptCounts[e.department] || 0) + 1; });

    const rows = employees.map((e, i) => [
      `<span class="badge badge-info">${e.id}</span>`,
      `<span class="cell-strong">${e.name}</span>`,
      e.department,
      e.position,
      `<span class="av-circle av-sm" style="${adminStore.avatarStyle(i)}">${e.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>`,
      e.joiningDate,
      StatusBadge(e.employmentStatus)
    ]);

    return {
      title: 'Employee Directory Report',
      headers: ['ID', 'Name', 'Department', 'Position', '', 'Joined', 'Status'],
      rows,
      summaryHtml: `
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:18px;">
          <span class="badge badge-info" style="padding:6px 14px;">${employees.length} employees</span>
          ${Object.entries(deptCounts).map(([d, c]) => `<span class="badge badge-info" style="padding:6px 14px;">${d}: ${c}</span>`).join('')}
        </div>
      `,
      totalsRow: null,
      csvName: 'employee_directory'
    };
  }

  function generateReport() {
    ui.error = '';
    if (!ui.reportType) {
      ui.error = 'Please select a report type before generating.';
      rerenderPageContent(view);
      return;
    }
    if (!ui.startDate || !ui.endDate) {
      ui.error = 'Please provide both start and end dates.';
      rerenderPageContent(view);
      return;
    }
    if (ui.startDate > ui.endDate) {
      ui.error = 'Start date must be before or equal to the end date.';
      rerenderPageContent(view);
      return;
    }

    ui.generating = true;
    rerenderPageContent(view);

    simulateFetch(900).then(() => {
      const builder = {
        'attendance-summary': buildAttendanceSummary,
        'payroll-register': buildPayrollRegister,
        'employee-directory': buildEmployeeDirectory
      }[ui.reportType];

      ui.generating = false;
      ui.result = builder();
      showToast(`${ui.result.title} generated (mock).`, 'success');
      rerenderPageContent(view);
    });
  }

  // -------------------------------------------------------------- CSV EXPORT

  function exportCsv() {
    if (!ui.result) return;
    const stripTags = html => html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/,/g, '');
    const lines = [ui.result.headers.join(',')];
    ui.result.rows.forEach(row => lines.push(row.map(stripTags).join(',')));
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dayflow_${ui.result.csvName}_${ui.startDate}_to_${ui.endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully.', 'success');
  }

  // ---------------------------------------------------------------- BINDINGS

  function updateControlsOnly() {
    // full page re-render is fine for reports (no text inputs to preserve focus)
    rerenderPageContent(view);
  }

  const view = {
    render() {
      return renderAdminLayout('/admin/reports', 'Reports', contentHtml());
    },

    afterRender() {
      initAdminLayoutEvents();
      view.bindEvents();
    },

    bindEvents() {
      document.getElementById('rep-type')?.addEventListener('change', e => { ui.reportType = e.target.value; });
      document.getElementById('rep-employee')?.addEventListener('change', e => { ui.employeeId = e.target.value; });
      document.getElementById('rep-start')?.addEventListener('change', e => { ui.startDate = e.target.value; });
      document.getElementById('rep-end')?.addEventListener('change', e => { ui.endDate = e.target.value; });

      document.getElementById('rep-generate-btn')?.addEventListener('click', generateReport);
      document.getElementById('rep-export-csv-btn')?.addEventListener('click', exportCsv);
      document.getElementById('rep-export-pdf-btn')?.addEventListener('click', () =>
        showToast('PDF export will be available once backend reporting is integrated.', 'info'));
    },

    unmount() { /* no subscriptions */ }
  };

  return view;
}
