// DAYFLOW HRMS — ADMIN ATTENDANCE VIEW (/admin/attendance)

import { adminStore, simulateFetch } from '../../core/adminStore.js';
import { renderAdminLayout, initAdminLayoutEvents, rerenderPageContent } from '../../components/admin/AdminLayout.js';
import { AttendanceSummary } from '../../components/admin/AttendanceSummary.js';
import { AttendanceFilters } from '../../components/admin/AttendanceFilters.js';
import { AttendanceTable, EmployeeCell, StatusCell } from '../../components/admin/AttendanceTable.js';
import { showToast } from '../../components/Toast.js';
import { TODAY_ISO } from '../../data/adminMockData.js';

export function createAdminAttendanceView() {
  const ui = {
    loaded: false,
    tab: 'today', // 'today' | 'all' | 'monthly'
    filters: { search: '', employeeId: '', status: '', date: '' },
    monthEmployeeId: '',
    month: '2026-08'
  };

  function skeletonHtml() {
    return `
      <div class="stats-grid">
        ${Array(6).fill('<div class="skeleton" style="height:90px; border-radius:16px;"></div>').join('')}
      </div>
      <div class="skeleton" style="height:400px; border-radius:16px;"></div>
    `;
  }

  function applySearch(records) {
    const q = ui.filters.search.trim().toLowerCase();
    if (!q) return records;
    const empIndex = Object.fromEntries(adminStore.getEmployees().map(e => [e.id, e]));
    return records.filter(r => {
      const emp = empIndex[r.employeeId];
      return emp && (emp.name.toLowerCase().includes(q) || emp.id.toLowerCase().includes(q));
    });
  }

  // -------------------------------------------------------------- TAB BODIES

  function todayTabHtml() {
    let records = adminStore.getTodayRecords();
    if (ui.filters.employeeId || ui.filters.status) {
      records = adminStore.filterAttendance({ employeeId: ui.filters.employeeId, status: ui.filters.status, date: TODAY_ISO });
    }
    records = applySearch(records);

    return `
      <p style="font-size:13px; color:var(--text-secondary); margin-bottom:14px;">
        <i data-lucide="info" style="width:13px;height:13px; vertical-align:-2px;"></i>
        Live roster for today (${TODAY_ISO}). ${records.length} record(s).
      </p>
      ${AttendanceTable([
        { label: 'Employee', render: r => EmployeeCell(adminStore.getEmployeeById(r.employeeId)) },
        { label: 'Department', key: '', render: r => adminStore.getEmployeeById(r.employeeId)?.department || '-' },
        { label: 'Check In', key: 'checkIn' },
        { label: 'Check Out', key: 'checkOut' },
        { label: 'Work Hours', key: 'hoursLabel', render: r => `<span class="cell-strong">${r.hoursLabel}</span>` },
        { label: 'Extra Hours', key: 'extraLabel', render: r => Number(r.extraMinutes) > 0 ? `<span style="color:var(--success); font-weight:600;">${r.extraLabel}</span>` : r.extraLabel },
        { label: 'Status', render: r => StatusCell(r.status) }
      ], records)}
    `;
  }

  function allTabHtml() {
    let records = adminStore.filterAttendance({
      employeeId: ui.filters.employeeId,
      status: ui.filters.status,
      date: ui.filters.date
    });
    records = applySearch(records).slice(0, 120);

    return `
      <p style="font-size:13px; color:var(--text-secondary); margin-bottom:14px;">
        Showing latest ${records.length} matching record(s)${records.length >= 120 ? ' (capped for preview)' : ''}.
      </p>
      ${AttendanceTable([
        { label: 'Date', render: r => `<span class="cell-strong">${r.date}</span> <span style="font-size:12px; color:var(--text-tertiary);">(${r.dayName})</span>` },
        { label: 'Employee', render: r => EmployeeCell(adminStore.getEmployeeById(r.employeeId)) },
        { label: 'Check In', key: 'checkIn' },
        { label: 'Check Out', key: 'checkOut' },
        { label: 'Work Hours', key: 'hoursLabel' },
        { label: 'Extra Hours', key: 'extraLabel', render: r => Number(r.extraMinutes) > 0 ? `<span style="color:var(--success); font-weight:600;">${r.extraLabel}</span>` : r.extraLabel },
        { label: 'Status', render: r => StatusCell(r.status) }
      ], records, { minWidthClass: 'table-min-880' })}
    `;
  }

  function formatMinutes(mins) {
    return mins ? `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m` : '0h 00m';
  }

  function monthlyTabHtml() {
    if (!ui.monthEmployeeId) {
      const first = adminStore.getEmployees()[0];
      ui.monthEmployeeId = first ? first.id : '';
    }
    const emp = adminStore.getEmployeeById(ui.monthEmployeeId);
    if (!emp) {
      return '<div class="card">No employees available.</div>';
    }

    const monthRecords = adminStore.getMonthlyAttendance(ui.monthEmployeeId);
    const summary = adminStore.summarize(monthRecords);

    const rowsHtml = monthRecords.map(r => `
      <tr>
        <td class="cell-strong">${r.date}</td>
        <td>${r.dayName}</td>
        <td>${r.checkIn}</td>
        <td>${r.checkOut}</td>
        <td>${r.hoursLabel}</td>
        <td>${Number(r.extraMinutes) > 0 ? `<span style="color:var(--success); font-weight:600;">${r.extraLabel}</span>` : r.extraLabel}</td>
        <td>${StatusCell(r.status)}</td>
      </tr>
    `).join('');

    const totalsRow = `
      <tr style="background-color:var(--bg-subtle); font-weight:600;">
        <td colspan="4">Monthly Totals</td>
        <td class="cell-strong">${formatMinutes(summary.totalMinutes)}</td>
        <td><span style="color:var(--success); font-weight:600;">${formatMinutes(summary.extraMinutes)}</span></td>
        <td></td>
      </tr>
    `;

    return `
      <div class="card" style="padding-bottom:12px; margin-bottom:20px;">
        <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
          <div class="av-circle av-md" style="${adminStore.avatarStyle(Number(emp.id.slice(-2)) || 0)}">${emp.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</div>
          <div style="flex:1; min-width:180px;">
            <div class="cell-strong" style="font-size:15px;">${emp.name} <span class="badge badge-info" style="margin-left:6px;">${emp.id}</span></div>
            <div style="font-size:12px; color:var(--text-secondary);">${emp.department} · ${emp.position}</div>
          </div>
          <div style="display:flex; gap:10px; align-items:flex-end;">
            <div class="filter-group" style="margin:0;">
              <label class="filter-label" for="att-filter-month">Month</label>
              <input type="month" id="att-filter-month" class="form-input" value="${ui.month}" />
            </div>
          </div>
        </div>
      </div>

      ${AttendanceSummary(summary)}

      ${monthRecords.length ? `
      <div class="table-container">
        <div class="table-scroll table-min-880">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th><th>Day</th><th>Check In</th><th>Check Out</th>
                <th>Work Hours</th><th>Extra Hours</th><th>Status</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}${totalsRow}</tbody>
          </table>
        </div>
      </div>` : `
      <div class="table-container" style="padding:8px;">
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="calendar-x" style="width:26px;height:26px;"></i></div>
          <div class="empty-title">No records this month</div>
          <p class="empty-desc">No attendance was recorded for ${emp.name} in ${ui.month}.</p>
        </div>
      </div>`}
    `;
  }

  // ------------------------------------------------------------------ RENDER

  function contentHtml() {
    const employees = adminStore.getEmployees();

    const tabBody = {
      today: () => `
        ${AttendanceSummary(adminStore.summarize(adminStore.getTodayRecords()))}
        ${AttendanceFilters(employees, ui.filters, { showDate: false })}
        <div id="att-results-area">${todayTabHtml()}</div>
      `,
      all: () => `
        ${AttendanceFilters(employees, ui.filters, { showDate: true })}
        <div id="att-results-area">${allTabHtml()}</div>
      `,
      monthly: () => monthlyTabHtml()
    }[ui.tab]();

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
        <div>
          <h2 style="font-size:22px; font-weight:700; letter-spacing:-0.4px;">Attendance</h2>
          <p style="color:var(--text-secondary); font-size:13px; margin-top:2px;">Company-wide attendance records and monthly summaries.</p>
        </div>
        <button class="btn btn-primary btn-sm" id="att-export-btn">
          <i data-lucide="download" style="width:15px;height:15px;"></i>
          <span>Export CSV</span>
        </button>
      </div>

      <div class="tab-container">
        <button class="tab-btn ${ui.tab === 'today' ? 'active' : ''}" data-tab="today">Today's Attendance</button>
        <button class="tab-btn ${ui.tab === 'all' ? 'active' : ''}" data-tab="all">All Records</button>
        <button class="tab-btn ${ui.tab === 'monthly' ? 'active' : ''}" data-tab="monthly">Monthly View</button>
      </div>

      ${tabBody}
    `;
  }

  function updateResultsArea() {
    const area = document.getElementById('att-results-area');
    if (!area) return;
    area.innerHTML = ui.tab === 'today' ? todayTabHtml() : allTabHtml();
    if (window.lucide) window.lucide.createIcons();
  }

  const view = {
    render() {
      return renderAdminLayout('/admin/attendance', 'Attendance', ui.loaded ? contentHtml() : skeletonHtml());
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
      document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          ui.tab = btn.dataset.tab;
          rerenderPageContent(view);
        });
      });

      const searchInput = document.getElementById('att-filter-search');
      searchInput?.addEventListener('input', () => {
        ui.filters.search = searchInput.value;
        updateResultsArea();
      });

      document.getElementById('att-filter-employee')?.addEventListener('change', e => {
        ui.filters.employeeId = e.target.value;
        updateResultsArea();
      });

      document.getElementById('att-filter-status')?.addEventListener('change', e => {
        ui.filters.status = e.target.value;
        updateResultsArea();
      });

      document.getElementById('att-filter-date')?.addEventListener('change', e => {
        ui.filters.date = e.target.value;
        updateResultsArea();
      });

      document.getElementById('att-filter-clear')?.addEventListener('click', () => {
        ui.filters = { search: '', employeeId: '', status: '', date: '' };
        rerenderPageContent(view);
        showToast('Filters cleared.', 'info');
      });

      document.getElementById('att-filter-month')?.addEventListener('change', e => {
        ui.month = e.target.value;
        if (ui.month !== '2026-08') {
          showToast('Mock data only exists for August 2026.', 'info');
        }
        rerenderPageContent(view);
      });

      document.getElementById('att-export-btn')?.addEventListener('click', () => {
        showToast('CSV export will be enabled once the backend reporting API is connected.', 'info');
      });
    },

    unmount() { /* no subscriptions */ }
  };

  return view;
}
