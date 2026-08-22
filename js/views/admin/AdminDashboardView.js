// DAYFLOW HRMS — ADMIN DASHBOARD VIEW (/admin/dashboard)
// All metrics come from GET /api/admin/dashboard — no frontend computation.

import { adminStore, formatINR, uiEmployee } from '../../core/adminStore.js';
import { esc } from '../../core/api.js';
import { router } from '../../core/router.js';
import { renderAdminLayout, initAdminLayoutEvents, rerenderPageContent } from '../../components/admin/AdminLayout.js';
import { StatisticsCard } from '../../components/admin/StatisticsCard.js';
import { DashboardCard, CardLinkBtn } from '../../components/admin/DashboardCard.js';
import { EmployeeCard } from '../../components/admin/EmployeeCard.js';
import { StatusBadge } from '../../components/admin/StatusBadge.js';
import { showToast } from '../../components/Toast.js';

export function createAdminDashboardView() {
  const ui = { loaded: false, stats: null, employees: [], pendingLeaves: [], error: null };

  function skeletonHtml() {
    return `
      <div class="stats-grid">
        ${Array(4).fill('<div class="skeleton" style="height:110px; border-radius:16px;"></div>').join('')}
      </div>
      <div style="display:grid; grid-template-columns:2fr 1fr; gap:24px; margin-bottom:24px;">
        <div class="skeleton" style="height:280px; border-radius:16px;"></div>
        <div class="skeleton" style="height:280px; border-radius:16px;"></div>
      </div>
      <div class="employee-cards-grid">
        ${Array(4).fill('<div class="skeleton" style="height:200px; border-radius:16px;"></div>')}
      </div>
    `;
  }

  function errorHtml() {
    return `
      <div style="padding:40px; text-align:center;">
        <i data-lucide="alert-triangle" style="width:36px; height:36px; color:var(--danger);"></i>
        <div style="font-weight:600; margin-top:12px;">Could not load the dashboard</div>
        <div style="font-size:13px; color:var(--text-tertiary); margin-top:4px;">${esc(ui.error || 'Unknown error')}</div>
        <button class="btn btn-primary btn-sm" id="dash-retry" style="margin-top:16px;">Retry</button>
      </div>
    `;
  }

  function leaveRowHtml(req) {
    const emp = req.employee || {};
    const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee';
    return `
      <div class="activity-item">
        <div class="av-circle av-sm" style="${adminStore.avatarStyle(name.length)}">${esc(name.split(' ').map(w => w[0]).slice(0, 2).join(''))}</div>
        <div style="flex:1; min-width:0;">
          <div class="activity-title">${esc(name)} · ${esc(req.leaveType)}</div>
          <div class="activity-desc">${esc(String(req.startDate).slice(0, 10))} → ${esc(String(req.endDate).slice(0, 10))} · ${esc(String(req.requestedDays))} day${req.requestedDays > 1 ? 's' : ''}</div>
          <div style="margin-top:6px; display:flex; gap:8px;">
            <button class="btn btn-success btn-xs" data-leave-approve="${esc(req.id)}"><i data-lucide="check" style="width:12px;height:12px;"></i> Approve</button>
            <button class="btn btn-danger btn-xs" data-leave-reject="${esc(req.id)}"><i data-lucide="x" style="width:12px;height:12px;"></i> Reject</button>
          </div>
        </div>
        ${StatusBadge(req.status)}
      </div>
    `;
  }

  function progressRow(label, count, total, color) {
    const pct = total ? Math.round((count / total) * 100) : 0;
    return `
      <div class="progress-row">
        <div class="progress-row-head"><span>${label}</span><span><strong>${count}</strong> · ${pct}%</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%; background-color:${color};"></div></div>
      </div>
    `;
  }

  function contentHtml() {
    const s = ui.stats;
    const emp = s.employees;
    const payroll = s.payrollSummary;
    const att = s.attendanceSummary;
    const pendingLeaves = ui.pendingLeaves;
    const employees = ui.employees;

    const dateLabel = new Date(`${s.asOfDate}T00:00:00`)
      .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    // Simple present-rate trend across the current week (backend summary only)
    const trendDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const presentRate = emp.totalActive ? Math.round((emp.presentToday / emp.totalActive) * 100) : 0;

    return `
      <!-- Page heading -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:24px;">
        <div>
          <h2 style="font-size:22px; font-weight:700; letter-spacing:-0.4px;">Admin Dashboard</h2>
          <p style="color:var(--text-secondary); font-size:13px; margin-top:2px;">Company-wide snapshot for ${esc(dateLabel)}</p>
        </div>
        <button class="btn btn-primary btn-sm" id="dash-go-reports">
          <i data-lucide="bar-chart-3" style="width:15px;height:15px;"></i>
          <span>Generate Reports</span>
        </button>
      </div>

      <!-- KPI row -->
      <div class="stats-grid">
        ${StatisticsCard({ icon: 'users', value: emp.totalActive ?? 0, label: 'Active Employees' })}
        ${StatisticsCard({ icon: 'check-circle', iconBg: 'var(--success-bg)', iconColor: 'var(--success)', value: emp.presentToday ?? 0, label: 'Present Today', trendText: `${presentRate}% of workforce`, trendDir: 'up' })}
        ${StatisticsCard({ icon: 'plane', iconBg: 'var(--info-bg)', iconColor: 'var(--info)', value: emp.onApprovedLeaveToday ?? 0, label: 'On Approved Leave' })}
        ${StatisticsCard({ icon: 'x-circle', iconBg: 'var(--warning-bg)', iconColor: '#b06000', value: emp.absentToday ?? 0, label: 'Absent Today', trendText: emp.halfDayToday ? `+${emp.halfDayToday} half-day` : '', trendDir: 'flat' })}
      </div>

      <!-- Attendance overview + Payroll overview -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:24px; margin-bottom:24px;">
        ${DashboardCard({
          title: "Today's Attendance Overview",
          icon: 'activity',
          headerExtra: `<span class="badge badge-info">Live data</span>`,
          bodyHtml: `
            ${progressRow('Present', emp.presentToday ?? 0, emp.totalActive ?? 0, 'var(--success)')}
            ${progressRow('On Approved Leave', emp.onApprovedLeaveToday ?? 0, emp.totalActive ?? 0, 'var(--info)')}
            ${progressRow('Half-day', emp.halfDayToday ?? 0, emp.totalActive ?? 0, '#f9ab00')}
            ${progressRow('Absent', emp.absentToday ?? 0, emp.totalActive ?? 0, 'var(--danger)')}

            <div style="margin-top:20px; display:flex; gap:18px; flex-wrap:wrap;">
              <div><div style="font-size:11px; color:var(--text-tertiary); text-transform:uppercase;">Month Hours</div><strong>${Number(att.totalWorkHours ?? 0).toFixed(1)}h</strong></div>
              <div><div style="font-size:11px; color:var(--text-tertiary); text-transform:uppercase;">Overtime (${esc(att.month || '')})</div><strong style="color:var(--success);">${Number(att.totalExtraHours ?? 0).toFixed(1)}h</strong></div>
            </div>
            <p style="font-size:12px; color:var(--text-tertiary); margin-top:14px;">
              <i data-lucide="info" style="width:13px;height:13px; vertical-align:-2px;"></i>
              Weekly view available in Attendance.
            </p>
          `,
          footerHtml: CardLinkBtn({ id: 'dash-go-attendance', label: 'Open Attendance', icon: 'calendar-days' })
        })}

        ${DashboardCard({
          title: 'Payroll Overview',
          icon: 'wallet',
          headerExtra: `<span class="badge badge-success">${esc(payroll.month || '')}</span>`,
          bodyHtml: `
            <div style="font-size:13px; color:var(--text-secondary);">Net payout across ${payroll.payslipsGenerated ?? 0} generated payslip${payroll.payslipsGenerated === 1 ? '' : 's'}</div>
            <div class="stat-value" style="color:var(--success); margin-top:6px;">${formatINR(payroll.totalNet)}</div>

            <div style="margin-top:18px;">
              <div class="salary-line earning">
                <span class="salary-label"><i data-lucide="plus-circle" style="width:15px;height:15px;"></i> Gross wages</span>
                <span class="salary-amount">${formatINR(payroll.totalGross)}</span>
              </div>
              <div class="salary-line deduction">
                <span class="salary-label"><i data-lucide="minus-circle" style="width:15px;height:15px;"></i> PF liability + PT</span>
                <span class="salary-amount">-${formatINR((Number(payroll.totalPfLiability) || 0) + (Number(payroll.totalProfessionalTax) || 0))}</span>
              </div>
              <div class="salary-total">
                <span>Net payout</span><span style="color:var(--success);">${formatINR(payroll.totalNet)}</span>
              </div>
            </div>
            <p style="font-size:12px; color:var(--text-tertiary); margin-top:14px;">
              <i data-lucide="info" style="width:13px;height:13px; vertical-align:-2px;"></i>
              ${payroll.employeesWithSalaryStructure ?? 0} employee(s) have an active salary structure.
            </p>
          `,
          footerHtml: CardLinkBtn({ id: 'dash-go-payroll', label: 'Manage Payroll', icon: 'receipt' })
        })}
      </div>

      <!-- Pending leaves -->
      ${DashboardCard({
        title: 'Pending Leave Requests',
        icon: 'calendar',
        headerExtra: `<span class="badge ${pendingLeaves.length ? 'badge-warning' : 'badge-success'}">${pendingLeaves.length} pending</span>`,
        bodyHtml: pendingLeaves.length
          ? `<div style="display:flex; flex-direction:column; gap:16px;">${pendingLeaves.slice(0, 5).map(leaveRowHtml).join('')}</div>`
          : `<p style="font-size:13px; color:var(--text-tertiary);">No pending requests. All caught up!</p>`,
        footerHtml: CardLinkBtn({ id: 'dash-go-leave', label: 'View All Requests', icon: 'arrow-right' })
      })}

      <!-- Team snapshot -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">
            <i data-lucide="users" style="width:18px; height:18px; color:var(--primary);"></i>
            <span>Team Snapshot</span>
          </h3>
          <button class="btn btn-secondary btn-sm" id="dash-go-employees">
            <span>All Employees (${employees.length})</span>
            <i data-lucide="arrow-right" style="width:14px; height:14px;"></i>
          </button>
        </div>
        <div class="employee-cards-grid">
          ${employees.length
            ? employees.slice(0, 4).map((e, i) => EmployeeCard(e, adminStore.avatarStyle(i))).join('')
            : '<p style="font-size:13px; color:var(--text-tertiary);">No employees found.</p>'}
        </div>
      </div>
    `;
  }

  async function loadData() {
    try {
      ui.error = null;
      const [stats, empPage, pending] = await Promise.all([
        adminStore.getDashboardStats(),
        adminStore.queryEmployees({ page: 1, limit: 8 }),
        adminStore.getLeaves({ status: 'PENDING', limit: 10 }),
      ]);
      ui.stats = stats;
      ui.employees = (empPage.employees || []).map(uiEmployee);
      ui.pendingLeaves = pending.records || [];
      ui.loaded = true;
    } catch (err) {
      ui.error = err.message || 'Failed to load dashboard.';
    }
    rerenderPageContent(view);
  }

  async function decideLeave(requestId, decision) {
    try {
      await adminStore.decideLeave(requestId, decision === 'APPROVED' ? 'APPROVED' : 'REJECTED');
      showToast(`Leave request ${decision.toLowerCase()}d successfully.`, decision === 'APPROVED' ? 'success' : 'danger');
      await loadData(); // server reconciliation
    } catch (err) {
      showToast(err.message || 'Action failed.', 'danger');
    }
  }

  const view = {
    render() {
      if (!ui.loaded && !ui.error) return renderAdminLayout('/admin/dashboard', 'Admin Dashboard', skeletonHtml());
      if (ui.error) return renderAdminLayout('/admin/dashboard', 'Admin Dashboard', errorHtml());
      return renderAdminLayout('/admin/dashboard', 'Admin Dashboard', contentHtml());
    },

    afterRender() {
      initAdminLayoutEvents();
      document.getElementById('dash-retry')?.addEventListener('click', () => { rerenderPageContent(view); loadData(); });
      if (!ui.loaded && !ui.error) {
        loadData();
        return;
      }
      view.bindEvents();
    },

    bindEvents() {
      document.getElementById('dash-go-reports')?.addEventListener('click', () => router.navigate('/admin/reports'));
      document.getElementById('dash-go-attendance')?.addEventListener('click', () => router.navigate('/admin/attendance'));
      document.getElementById('dash-go-payroll')?.addEventListener('click', () => router.navigate('/admin/payroll'));
      document.getElementById('dash-go-leave')?.addEventListener('click', () => router.navigate('/admin/leave'));
      document.getElementById('dash-go-employees')?.addEventListener('click', () => router.navigate('/admin/employees'));

      document.querySelectorAll('[data-leave-approve]').forEach(btn =>
        btn.addEventListener('click', () => decideLeave(btn.dataset.leaveApprove, 'APPROVED')));
      document.querySelectorAll('[data-leave-reject]').forEach(btn =>
        btn.addEventListener('click', () => decideLeave(btn.dataset.leaveReject, 'REJECTED')));
    },

    unmount() { /* stateless */ }
  };

  return view;
}
