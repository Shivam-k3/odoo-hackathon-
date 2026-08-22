// DAYFLOW HRMS — EMPLOYEE ATTENDANCE VIEW (REAL BACKEND DATA)
// Backend is the single source of truth for all attendance figures.

import { router } from '../../core/router.js';
import { api, esc } from '../../core/api.js';
import { renderSidebar, initSidebarEvents } from '../../components/Sidebar.js';
import { renderNavbar, initNavbarEvents } from '../../components/Navbar.js';
import { showToast } from '../../components/Toast.js';

// Module-level so the selected tab survives route re-renders
// (fixes: filter resetting to Daily on every navigation).
let viewFilter = 'daily';

function fmtHours(decimalHours) {
  const total = Math.round(Number(decimalHours || 0) * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function fmtTime(iso) {
  if (!iso) return '--:--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(11, 16);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function statusBadge(status) {
  const map = {
    PRESENT: { cls: 'badge-success', label: 'Present' },
    HALF_DAY: { cls: 'badge-warning', label: 'Half Day' },
    LEAVE: { cls: 'badge-info', label: 'On Leave' },
    ON_LEAVE: { cls: 'badge-info', label: 'On Leave' },
    ABSENT: { cls: 'badge-danger', label: 'Absent' },
  };
  const s = map[status] || { cls: 'badge-secondary', label: status || 'Unknown' };
  return `<span class="badge ${s.cls}">${esc(s.label)}</span>`;
}

export function createAttendanceView() {
  let todayRecord = null;
  let monthlyStats = null;
  let busy = false;

  return {
    render() {
      const currentPath = '/employee/attendance';

      // Shell only — every dynamic region is filled by load()/loadTable().
      return `
        <div class="main-layout">
          ${renderSidebar(currentPath)}

          <div class="content-wrapper">
            ${renderNavbar('Attendance')}

            <main class="main-content">
              <div id="att-error" style="display:none; margin-bottom:20px; padding:12px 16px; background-color:#fdecea; border:1px solid var(--danger); border-radius: var(--radius-md); color: var(--danger); font-size:13px;"></div>

              <!-- Check-In / Check-Out Hero Widget -->
              <div class="checkin-hero-card">
                <div>
                  <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9; font-weight: 600;">Today's Shift Status</div>
                  <h2 style="font-size: 28px; font-weight: 700; margin: 6px 0;" id="att-hero-status">Loading…</h2>
                  <div style="font-size: 14px; opacity: 0.9; display: flex; align-items: center; gap: 12px; margin-top: 4px;">
                    <span>Check In Time: <span id="att-hero-in">--:--</span></span>
                    <span>•</span>
                    <span>Logged Today: <span id="att-hero-hours">…</span></span>
                  </div>
                </div>

                <div>
                  <button class="checkin-btn-large" id="attendance-toggle-btn" disabled>
                    <i data-lucide="log-in" style="width: 20px; height: 20px; display: inline-block; vertical-align: middle; margin-right: 8px;"></i>
                    <span>Loading…</span>
                  </button>
                </div>
              </div>

              <!-- Summary KPIs (monthly, backend-computed) -->
              <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 24px;">
                <div class="card">
                  <div style="font-size: 12px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 600;">Days Present</div>
                  <div class="stat-value" style="color: var(--success);" id="kpi-present">…</div>
                  <div style="font-size: 12px; color: var(--text-secondary);">This Month</div>
                </div>

                <div class="card">
                  <div style="font-size: 12px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 600;">Half-Days</div>
                  <div class="stat-value" style="color: #b06000;" id="kpi-half">…</div>
                  <div style="font-size: 12px; color: var(--text-secondary);">This Month</div>
                </div>

                <div class="card">
                  <div style="font-size: 12px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 600;">Leaves Taken</div>
                  <div class="stat-value" style="color: var(--info);" id="kpi-leave">…</div>
                  <div style="font-size: 12px; color: var(--text-secondary);">This Month</div>
                </div>

                <div class="card">
                  <div style="font-size: 12px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 600;">Total Overtime</div>
                  <div class="stat-value" style="color: var(--primary);" id="kpi-extra">…</div>
                  <div style="font-size: 12px; color: var(--text-secondary);">Extra Hours This Month</div>
                </div>
              </div>

              <!-- Attendance History Section -->
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">
                    <i data-lucide="history" style="width: 18px; height: 18px; color: var(--primary);"></i>
                    <span>Attendance Records</span>
                  </h3>

                  <!-- View Filter Tabs (Daily / Weekly / Monthly) -->
                  <div style="display: flex; gap: 4px; background-color: var(--bg-subtle); padding: 4px; border-radius: var(--radius-md);">
                    <button class="btn btn-sm ${viewFilter === 'daily' ? 'btn-primary' : ''}" id="filter-daily" data-filter="daily" style="padding: 4px 12px;">Daily</button>
                    <button class="btn btn-sm ${viewFilter === 'weekly' ? 'btn-primary' : ''}" id="filter-weekly" data-filter="weekly" style="padding: 4px 12px;">Weekly</button>
                    <button class="btn btn-sm ${viewFilter === 'monthly' ? 'btn-primary' : ''}" id="filter-monthly" data-filter="monthly" style="padding: 4px 12px;">Monthly</button>
                  </div>
                </div>

                <div class="table-container">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Check In</th>
                        <th>Check Out</th>
                        <th>Work Hours</th>
                        <th>Extra Hours</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody id="att-table-body">
                      <tr><td colspan="6" style="text-align:center; padding:32px; color: var(--text-tertiary);">Loading records…</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </main>
          </div>
        </div>
      `;
    },

    afterRender() {
      initSidebarEvents();
      initNavbarEvents();

      const errBox = document.getElementById('att-error');
      const showError = (msg) => {
        if (!errBox) return;
        errBox.textContent = msg;
        errBox.style.display = 'block';
      };
      const hideError = () => { if (errBox) errBox.style.display = 'none'; };

      const renderHero = () => {
        const statusEl = document.getElementById('att-hero-status');
        const inEl = document.getElementById('att-hero-in');
        const hoursEl = document.getElementById('att-hero-hours');
        const btn = document.getElementById('attendance-toggle-btn');
        if (!statusEl || !btn) return;

        const checkedIn = !!todayRecord?.checkInTime && !todayRecord?.checkOutTime;
        statusEl.textContent = checkedIn ? 'Checked In' : 'Checked Out';
        inEl.textContent = fmtTime(todayRecord?.checkInTime);
        hoursEl.textContent = fmtHours(todayRecord?.workHours);

        btn.disabled = false;
        btn.className = `checkin-btn-large ${checkedIn ? 'active' : ''}`;
        btn.innerHTML = `<i data-lucide="${checkedIn ? 'log-out' : 'log-in'}" style="width: 20px; height: 20px; display: inline-block; vertical-align: middle; margin-right: 8px;"></i><span>${checkedIn ? 'Check Out Now' : 'Check In Now'}</span>`;
        if (window.lucide) window.lucide.createIcons();

        btn.onclick = async () => {
          if (busy) return;
          busy = true;
          btn.disabled = true;
          try {
            hideError();
            await api.post(checkedIn ? '/api/attendance/check-out' : '/api/attendance/check-in', {});
            showToast(checkedIn ? 'Checked out successfully!' : 'Checked in successfully!', checkedIn ? 'info' : 'success');
            await loadAll();
          } catch (err) {
            showError(err.message || 'Attendance action failed.');
            showToast(err.message || 'Attendance action failed.', 'danger');
            btn.disabled = false;
          } finally {
            busy = false;
          }
        };
      };

      const emptyRow = () =>
        '<tr><td colspan="6" style="text-align:center; padding:32px; color: var(--text-tertiary);">No attendance records found for this period.</td></tr>';

      const renderRows = (records) => {
        const body = document.getElementById('att-table-body');
        if (!body) return;
        if (!records || !records.length) { body.innerHTML = emptyRow(); return; }
        body.innerHTML = [...records].sort((a, b) => (a.date < b.date ? 1 : -1)).map(r => `
          <tr>
            <td style="font-weight: 500;">${esc(String(r.date).slice(0, 10))}</td>
            <td>${esc(fmtTime(r.checkInTime))}</td>
            <td>${r.checkOutTime ? esc(fmtTime(r.checkOutTime)) : '<span style="color: var(--text-tertiary);">—</span>'}</td>
            <td><strong>${esc(fmtHours(r.workHours))}</strong></td>
            <td style="color: ${Number(r.extraHours) > 0 ? 'var(--success)' : 'var(--text-tertiary)'};">${esc(fmtHours(r.extraHours))}</td>
            <td>${statusBadge(r.status)}</td>
          </tr>
        `).join('');
      };

      const loadTable = async () => {
        const body = document.getElementById('att-table-body');
        if (!body) return;
        try {
          if (viewFilter === 'daily') {
            // Daily = today's record only
            renderRows(todayRecord && todayRecord.checkInTime ? [todayRecord] : []);
          } else if (viewFilter === 'weekly') {
            const weekly = await api.get('/api/attendance/me/weekly');
            renderRows(weekly.records || []);
          } else {
            const monthParam = new Date().toISOString().slice(0, 7);
            const monthly = await api.get(`/api/attendance/me/monthly?month=${monthParam}`);
            renderRows(monthly.records || []);
          }
        } catch (err) {
          body.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color: var(--danger);">${esc(err.message || 'Could not load records.')}</td></tr>`;
        }
      };

      const loadKpis = async () => {
        try {
          const monthParam = new Date().toISOString().slice(0, 7);
          const monthly = await api.get(`/api/attendance/me/monthly?month=${monthParam}`);
          monthlyStats = monthly.stats || {};
          document.getElementById('kpi-present').textContent = `${monthlyStats.presentDays ?? 0} Days`;
          document.getElementById('kpi-half').textContent = `${monthlyStats.halfDays ?? 0} Day${(monthlyStats.halfDays ?? 0) === 1 ? '' : 's'}`;
          document.getElementById('kpi-leave').textContent = `${monthlyStats.leaveDays ?? 0} Day${(monthlyStats.leaveDays ?? 0) === 1 ? '' : 's'}`;
          document.getElementById('kpi-extra').textContent = fmtHours(monthlyStats.totalExtraHours ?? 0);
        } catch (err) {
          ['kpi-present', 'kpi-half', 'kpi-leave', 'kpi-extra'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '—';
          });
        }
      };

      async function loadAll() {
        try {
          hideError();
          todayRecord = await api.get('/api/attendance/me/today');
          renderHero();
          await Promise.all([loadTable(), loadKpis()]);
        } catch (err) {
          showError(err.message || 'Could not load attendance data.');
          const s = document.getElementById('att-hero-status');
          if (s) s.textContent = 'Unavailable';
        }
      }

      // Filter handlers — persist selection at module level.
      ['filter-daily', 'filter-weekly', 'filter-monthly'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', (e) => {
          const next = e.currentTarget.dataset.filter;
          if (next === viewFilter) return;
          viewFilter = next;
          ['filter-daily', 'filter-weekly', 'filter-monthly'].forEach(bid => {
            const b = document.getElementById(bid);
            if (b) b.classList.toggle('btn-primary', b.dataset.filter === viewFilter);
          });
          loadTable();
        });
      });

      loadAll();
    },
  };
}
