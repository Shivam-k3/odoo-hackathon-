// DAYFLOW HRMS — ADMIN ATTENDANCE VIEW (/admin/attendance)
// All data comes from live backend endpoints — no frontend attendance logic:
//   GET /api/attendance/admin/today
//   GET /api/admin/reports/attendance?from=&to=&status=&department=&employeeId=
//   GET /api/attendance/admin/monthly-summary?month=YYYY-MM
//   GET /api/attendance/admin/employee/:id?startDate=&endDate=

import { adminStore, uiEmployee } from '../../core/adminStore.js';
import {
  esc, todayISO, currentMonthKey, fmtTime, hoursLabel,
} from '../../core/api.js';
import { renderAdminLayout, initAdminLayoutEvents, rerenderPageContent } from '../../components/admin/AdminLayout.js';
import { AttendanceSummary } from '../../components/admin/AttendanceSummary.js';
import { AttendanceFilters } from '../../components/admin/AttendanceFilters.js';
import { AttendanceTable, EmployeeCell, StatusCell } from '../../components/admin/AttendanceTable.js';
import { showToast } from '../../components/Toast.js';

export function createAdminAttendanceView() {
  const ui = {
    loaded: false,
    error: null,
    tab: 'today', // 'today' | 'all' | 'monthly'
    employees: [],
    today: null,
    all: null,
    allLoading: false,
    allError: null,
    monthly: { employeeId: '', month: currentMonthKey(), loading: false, error: null, org: null, detail: null },
  };
  const filters = { search: '', employeeId: '', status: '', department: '', date: '' };

  // ------------------------------------------------------------- DATA HELPERS

  const empName = (r) => {
    const e = r.employee || {};
    return `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown';
  };
  const empCell = (r) => EmployeeCell({
    id: r.employee?.loginId || r.employee?.id || '',
    name: empName(r),
  });
  const empDept = (r) => esc(r.employee?.department || '-');

  function matchSearch(r) {
    const q = filters.search.trim().toLowerCase();
    if (!q) return true;
    const e = r.employee || {};
    return `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase().includes(q)
      || (e.loginId || '').toLowerCase().includes(q);
  }

  function filterRecords(records) {
    return records.filter((r) => {
      if (!matchSearch(r)) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (filters.employeeId && r.employeeId !== filters.employeeId) return false;
      return true;
    });
  }

  function sumField(records, field) {
    return Math.round(records.reduce((s, r) => s + (Number(r[field]) || 0), 0) * 100) / 100;
  }

  function hoursCol(render) {
    return { label: 'Work Hours', key: 'workHours', render };
  }
  function extraCol(render) {
    return { label: 'Extra Hours', key: 'extraHours', render };
  }
  function extraHtml(r) {
    const v = Number(r.extraHours) || 0;
    const label = hoursLabel(v);
    return v > 0 ? `<span style="color:var(--success); font-weight:600;">${label}</span>` : label;
  }
  const timeOrDash = (iso) => (iso ? esc(fmtTime(iso)) : '<span class="cell-muted">--:--</span>');

  // ------------------------------------------------------------------ SKELETONS

  function skeletonHtml() {
    return `
      <div class="stats-grid">
        ${Array(6).fill('<div class="skeleton" style="height:90px; border-radius:16px;"></div>').join('')}
      </div>
      <div class="skeleton" style="height:56px; border-radius:16px; margin-bottom:20px;"></div>
      <div class="skeleton" style="height:400px; border-radius:16px;"></div>
    `;
  }

  function errorHtml() {
    return `
      <div style="padding:40px; text-align:center;">
        <i data-lucide="alert-triangle" style="width:36px; height:36px; color:var(--danger);"></i>
        <div style="font-weight:600; margin-top:12px;">Could not load attendance</div>
        <div style="font-size:13px; color:var(--text-tertiary); margin-top:4px;">${esc(ui.error || 'Unknown error')}</div>
        <button class="btn btn-primary btn-sm" id="att-retry" style="margin-top:16px;">Retry</button>
      </div>
    `;
  }

  function inlineLoadingHtml(message = 'Loading records…') {
    return `
      <div class="table-container" style="padding:8px;">
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="loader-2" style="width:26px;height:26px;"></i></div>
          <div class="empty-title">${esc(message)}</div>
          <p class="empty-desc">Fetching live data from the Dayflow server.</p>
        </div>
      </div>
    `;
  }

  function inlineErrorHtml(message, retryAttr) {
    return `
      <div class="table-container" style="padding:8px;">
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="alert-triangle" style="width:26px;height:26px;color:var(--danger);"></i></div>
          <div class="empty-title">Request failed</div>
          <p class="empty-desc">${esc(message || 'Unknown error')}</p>
          <button class="btn btn-secondary btn-sm" id="${retryAttr}" style="margin-top:10px;">Retry</button>
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------- TAB BODIES

  function todayTabHtml() {
    const t = ui.today;
    const records = filterRecords(t.records || []);
    const s = t.summary || {};

    const summary = AttendanceSummary({
      present: s.presentCount ?? 0,
      absent: s.absentCount ?? 0,
      halfDay: s.halfDayCount ?? 0,
      leave: s.leaveCount ?? 0,
      totalWorkHours: sumField(t.records || [], 'workHours'),
      totalExtraHours: sumField(t.records || [], 'extraHours'),
    });

    const punchLine = `
      <p style="font-size:13px; color:var(--text-secondary); margin:-6px 0 14px;">
        <i data-lucide="info" style="width:13px;height:13px; vertical-align:-2px;"></i>
        Live roster for <strong>${esc(t.date)}</strong> ·
        ${Number(s.checkedInCount ?? 0)} checked in ·
        ${Number(s.checkedOutCount ?? 0)} checked out ·
        ${Number(s.absentCount ?? 0)} not marked, out of ${Number(t.totalEmployees ?? 0)} employee(s).
        Showing ${records.length} filtered record(s).
      </p>`;

    return `
      ${summary}
      ${punchLine}
      ${AttendanceTable([
        { label: 'Employee', render: empCell },
        { label: 'Department', render: empDept },
        { label: 'Check In', render: r => timeOrDash(r.checkInTime) },
        { label: 'Check Out', render: r => timeOrDash(r.checkOutTime) },
        hoursCol(r => `<span class="cell-strong">${hoursLabel(r.workHours)}</span>`),
        extraCol(extraHtml),
        { label: 'Status', render: r => StatusCell(r.status) },
      ], records)}
    `;
  }

  function allTabHtml() {
    if (ui.allLoading) return inlineLoadingHtml();
    if (ui.allError) return inlineErrorHtml(ui.allError, 'att-all-retry');
    const data = ui.all;
    const visible = (data.records || []).filter(matchSearch);

    const summary = AttendanceSummary(data.summary || {});

    const note = `
      <p style="font-size:13px; color:var(--text-secondary); margin:-6px 0 14px;">
        <i data-lucide="database" style="width:13px;height:13px; vertical-align:-2px;"></i>
        ${Number(data.summary?.totalRecords ?? 0)} record(s) matched server filters ·
        ${visible.length} shown after search.
      </p>`;

    return `
      ${summary}
      ${note}
      ${AttendanceTable([
        { label: 'Date', render: r => `<span class="cell-strong">${esc(String(r.date).slice(0, 10))}</span> <span style="font-size:12px; color:var(--text-tertiary);">(${esc(new Date(`${r.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' }))})</span>` },
        { label: 'Employee', render: empCell },
        { label: 'Check In', render: r => timeOrDash(r.checkInTime) },
        { label: 'Check Out', render: r => timeOrDash(r.checkOutTime) },
        hoursCol(r => hoursLabel(r.workHours)),
        extraCol(extraHtml),
        { label: 'Status', render: r => StatusCell(r.status) },
      ], visible, { minWidthClass: 'table-min-880', emptyMessage: 'No attendance records match these filters.' })}
    `;
  }

  function monthlyTabHtml() {
    const m = ui.monthly;

    let orgBlock = '';
    if (m.loading && !m.org) orgBlock = inlineLoadingHtml('Loading monthly summary…');
    else if (m.error && !m.org) orgBlock = inlineErrorHtml(m.error, 'att-month-retry');
    else if (m.org) {
      const a = m.org.aggregateStats || {};
      orgBlock = AttendanceSummary({
        present: a.presentTotal ?? 0,
        absent: Math.max(0, Number(m.org.totalRecords ?? 0) - Number(a.presentTotal ?? 0) - Number(a.halfDayTotal ?? 0) - Number(a.leaveTotal ?? 0)),
        halfDay: a.halfDayTotal ?? 0,
        leave: a.leaveTotal ?? 0,
        totalWorkHours: a.totalWorkHours ?? 0,
        totalExtraHours: a.totalExtraHours ?? 0,
      });
    }

    const emp = m.detail?.employee;
    const headerCard = `
      <div class="card" style="padding-bottom:12px; margin-bottom:20px;">
        <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
          <div class="av-circle av-md">${emp ? esc(emp.firstName?.[0] || '') + esc(emp.lastName?.[0] || '') : '?'}</div>
          <div style="flex:1; min-width:180px;">
            <div class="cell-strong" style="font-size:15px;">
              ${emp ? esc(`${emp.firstName} ${emp.lastName}`) : 'Select an employee'}
              ${emp ? `<span class="badge badge-info" style="margin-left:6px;">${esc(emp.loginId || '')}</span>` : ''}
            </div>
            <div style="font-size:12px; color:var(--text-secondary);">
              ${emp ? `${esc(emp.department || '-')} · ${esc(emp.designation || '-')}` : 'Monthly personal attendance ledger.'}
            </div>
          </div>
          <div class="filter-group" style="margin:0;">
            <label class="filter-label" for="att-filter-employee-m">Employee</label>
            <select id="att-filter-employee-m" class="form-select" style="max-width:230px;">
              ${ui.employees.map(e => `<option value="${esc(e.id)}" ${m.employeeId === e.id ? 'selected' : ''}>${esc(e.name)} (${esc(e.loginId || '')})</option>`).join('')}
            </select>
          </div>
          <div class="filter-group" style="margin:0;">
            <label class="filter-label" for="att-filter-month">Month</label>
            <input type="month" id="att-filter-month" class="form-input" value="${esc(m.month)}" />
          </div>
        </div>
      </div>`;

    if (!m.employeeId || !ui.employees.length) {
      return `${headerCard}<div class="card">No employees available.</div>`;
    }

    const rows = m.detail?.records || [];
    const totalsRow = rows.length ? `
      <tr style="background-color:var(--bg-subtle); font-weight:600;">
        <td colspan="3">Totals — ${rows.length} marked day(s)</td>
        <td class="cell-strong">${hoursLabel(sumField(rows, 'workHours'))}</td>
        <td><span style="color:var(--success); font-weight:600;">${hoursLabel(sumField(rows, 'extraHours'))}</span></td>
        <td></td>
      </tr>` : '';

    const table = m.loading
      ? inlineLoadingHtml('Loading employee ledger…')
      : m.error
        ? inlineErrorHtml(m.error, 'att-month-detail-retry')
        : AttendanceTable([
          { label: 'Date', render: r => `<span class="cell-strong">${esc(String(r.date).slice(0, 10))}</span> <span style="font-size:12px; color:var(--text-tertiary);">(${esc(new Date(`${r.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' }))})</span>` },
          { label: 'Check In', render: r => timeOrDash(r.checkInTime) },
          { label: 'Check Out', render: r => timeOrDash(r.checkOutTime) },
          hoursCol(r => hoursLabel(r.workHours)),
          extraCol(extraHtml),
          { label: 'Status', render: r => StatusCell(r.status) },
        ], rows, { minWidthClass: 'table-min-720', emptyMessage: `No attendance recorded for this employee in ${esc(m.month)}.` });

    // Totals row must sit inside the table — rebuild manually when rows exist
    const body = rows.length && !m.loading && !m.error
      ? `
      <div class="table-container">
        <div class="table-scroll table-min-720">
          <table class="data-table">
            <thead><tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Work Hours</th><th>Extra Hours</th><th>Status</th></tr></thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td><span class="cell-strong">${esc(String(r.date).slice(0, 10))}</span> <span style="font-size:12px; color:var(--text-tertiary);">(${esc(new Date(`${r.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' }))})</span></td>
                  <td>${timeOrDash(r.checkInTime)}</td>
                  <td>${timeOrDash(r.checkOutTime)}</td>
                  <td>${hoursLabel(r.workHours)}</td>
                  <td>${extraHtml(r)}</td>
                  <td>${StatusCell(r.status)}</td>
                </tr>`).join('')}
              ${totalsRow}
            </tbody>
          </table>
        </div>
      </div>`
      : table;

    return `${orgBlock}${headerCard}${body}`;
  }

  // ------------------------------------------------------------------- RENDER

  function contentHtml() {
    const tabBody = {
      today: () => `
        ${ui.today ? todayTabHtml() : inlineLoadingHtml()}
      `,
      all: () => `
        ${AttendanceFilters(ui.employees, filters, { showDate: true, showDepartment: true })}
        <div id="att-results-area">${allTabHtml()}</div>
      `,
      monthly: () => monthlyTabHtml(),
    }[ui.tab]();

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
        <div>
          <h2 style="font-size:22px; font-weight:700; letter-spacing:-0.4px;">Attendance</h2>
          <p style="color:var(--text-secondary); font-size:13px; margin-top:2px;">Company-wide attendance records, straight from the Dayflow database.</p>
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

      ${ui.tab === 'today' ? `
        ${AttendanceFilters(ui.employees, filters, { showDate: false })}
        <div id="att-results-area">${tabBody}</div>
      ` : tabBody}
    `;
  }

  function updateResultsArea() {
    const area = document.getElementById('att-results-area');
    if (!area) return;
    area.innerHTML = ui.tab === 'today' ? (ui.today ? todayTabHtml() : inlineLoadingHtml()) : allTabHtml();
    if (window.lucide) window.lucide.createIcons();
  }

  function updateMonthlyArea() {
    // Monthly tab owns its whole body (summary chips live above the card)
    rerenderPageContent(view);
  }

  // ------------------------------------------------------------- DATA LOADERS

  async function loadInitial() {
    try {
      ui.error = null;
      const [today, empPage] = await Promise.all([
        adminStore.getTodayAttendance(),
        adminStore.queryEmployees({ page: 1, limit: 300 }),
      ]);
      ui.today = today;
      ui.employees = (empPage.employees || []).map(uiEmployee);
      ui.loaded = true;
    } catch (err) {
      ui.error = err.message || 'Failed to load attendance.';
    }
    rerenderPageContent(view);
  }

  async function fetchAll() {
    ui.allLoading = true;
    ui.allError = null;
    updateResultsArea();
    try {
      const q = {};
      if (filters.date) { q.from = filters.date; q.to = filters.date; }
      if (filters.status) q.status = filters.status;
      if (filters.department) q.department = filters.department;
      if (filters.employeeId) q.employeeId = filters.employeeId;
      const res = await adminStore.getReport('attendance', q);
      ui.all = res;
    } catch (err) {
      ui.allError = err.message || 'Could not fetch records.';
    }
    ui.allLoading = false;
    updateResultsArea();
  }

  async function fetchMonthly() {
    if (!ui.monthly.employeeId) return;
    ui.monthly.loading = true;
    ui.monthly.error = null;
    updateMonthlyArea();
    try {
      const [detail, org] = await Promise.all([
        adminStore.getEmployeeMonthlyAttendance(ui.monthly.employeeId, ui.monthly.month),
        adminStore.getMonthlySummary(ui.monthly.month),
      ]);
      ui.monthly.detail = detail;
      ui.monthly.org = org;
    } catch (err) {
      ui.monthly.error = err.message || 'Could not fetch monthly data.';
    }
    ui.monthly.loading = false;
    updateMonthlyArea();
  }

  async function exportCsv() {
    try {
      if (ui.tab === 'monthly') {
        const m = `${ui.monthly.month}`;
        await adminStore.downloadReportCsv('attendance', { from: `${m}-01`, to: monthEnd(m) });
        showToast('Attendance CSV downloaded.', 'success');
        return;
      }
      if (ui.tab === 'all') {
        const q = {};
        if (filters.date) { q.from = filters.date; q.to = filters.date; }
        if (filters.status) q.status = filters.status;
        if (filters.department) q.department = filters.department;
        if (filters.employeeId) q.employeeId = filters.employeeId;
        await adminStore.downloadReportCsv('attendance', q);
        showToast('Attendance CSV downloaded.', 'success');
        return;
      }
      await adminStore.downloadReportCsv('attendance', { from: todayISO(), to: todayISO() });
      showToast("Today's roster exported.", 'success');
    } catch (err) {
      showToast(err.message || 'Export failed.', 'danger');
    }
  }

  function monthEnd(monthKey) {
    const [y, mo] = monthKey.split('-').map(Number);
    return new Date(y, mo, 0).toISOString().slice(0, 10);
  }

  // -------------------------------------------------------------------- VIEW

  const view = {
    render() {
      if (!ui.loaded && !ui.error) return renderAdminLayout('/admin/attendance', 'Attendance', skeletonHtml());
      if (ui.error) return renderAdminLayout('/admin/attendance', 'Attendance', errorHtml());
      return renderAdminLayout('/admin/attendance', 'Attendance', contentHtml());
    },

    afterRender() {
      initAdminLayoutEvents();
      document.getElementById('att-retry')?.addEventListener('click', () => { rerenderPageContent(view); loadInitial(); });
      if (!ui.loaded && !ui.error) {
        loadInitial();
        return;
      }
      view.bindEvents();
    },

    bindEvents() {
      document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          const next = btn.dataset.tab;
          if (next === ui.tab) return;
          ui.tab = next;
          rerenderPageContent(view);
          if (next === 'all' && !ui.all && !ui.allLoading && !ui.allError) fetchAll();
          if (next === 'monthly' && !ui.monthly.org && !ui.monthly.loading) {
            if (!ui.monthly.employeeId && ui.employees.length) ui.monthly.employeeId = ui.employees[0].id;
            fetchMonthly();
          }
        });
      });

      // ---- shared filter bar (today + all tabs)
      const searchInput = document.getElementById('att-filter-search');
      searchInput?.addEventListener('input', () => {
        filters.search = searchInput.value;
        updateResultsArea();
      });

      document.getElementById('att-filter-status')?.addEventListener('change', e => {
        filters.status = e.target.value;
        if (ui.tab === 'all') fetchAll();
        else updateResultsArea();
      });

      document.getElementById('att-filter-dept')?.addEventListener('change', e => {
        filters.department = e.target.value;
        if (ui.tab === 'all') fetchAll();
        else updateResultsArea();
      });

      document.getElementById('att-filter-date')?.addEventListener('change', e => {
        filters.date = e.target.value;
        if (ui.tab === 'all') fetchAll();
      });

      document.getElementById('att-filter-clear')?.addEventListener('click', () => {
        Object.assign(filters, { search: '', employeeId: '', status: '', department: '', date: '' });
        rerenderPageContent(view);
        showToast('Filters cleared.', 'info');
      });

      // ---- monthly controls
      document.getElementById('att-filter-employee-m')?.addEventListener('change', e => {
        ui.monthly.employeeId = e.target.value;
        fetchMonthly();
      });

      document.getElementById('att-filter-month')?.addEventListener('change', e => {
        if (!e.target.value) return;
        ui.monthly.month = e.target.value;
        fetchMonthly();
      });

      ['att-all-retry'].forEach(id => document.getElementById(id)?.addEventListener('click', fetchAll));
      ['att-month-retry', 'att-month-detail-retry'].forEach(id => document.getElementById(id)?.addEventListener('click', fetchMonthly));

      document.getElementById('att-export-btn')?.addEventListener('click', exportCsv);
    },

    unmount() { /* no subscriptions */ }
  };

  return view;
}
