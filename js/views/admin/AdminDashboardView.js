// DAYFLOW HRMS — ADMIN DASHBOARD VIEW (/admin/dashboard)

import { adminStore, simulateFetch, formatINR } from '../../core/adminStore.js';
import { router } from '../../core/router.js';
import { renderAdminLayout, initAdminLayoutEvents, rerenderPageContent } from '../../components/admin/AdminLayout.js';
import { StatisticsCard } from '../../components/admin/StatisticsCard.js';
import { DashboardCard, CardLinkBtn } from '../../components/admin/DashboardCard.js';
import { EmployeeCard } from '../../components/admin/EmployeeCard.js';
import { ActivityList } from '../../components/admin/ActivityList.js';
import { StatusBadge } from '../../components/admin/StatusBadge.js';
import { showToast } from '../../components/Toast.js';
import { TODAY_ISO } from '../../data/adminMockData.js';

export function createAdminDashboardView() {
  const ui = { loaded: false };

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
        ${Array(4).fill('<div class="skeleton" style="height:200px; border-radius:16px;"></div>').join('')}
      </div>
    `;
  }

  function leaveRowHtml(req) {
    const emp = adminStore.getEmployeeById(req.employeeId);
    if (!emp) return '';
    return `
      <div class="activity-item">
        <div class="av-circle av-sm" style="${adminStore.avatarStyle(Number(emp.id.slice(-2)) || 0)}">${emp.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</div>
        <div style="flex:1; min-width:0;">
          <div class="activity-title">${emp.name} · ${req.type}</div>
          <div class="activity-desc">${req.startDate} → ${req.endDate} · ${req.days} day${req.days > 1 ? 's' : ''}</div>
          <div style="margin-top:6px; display:flex; gap:8px;">
            <button class="btn btn-success btn-xs" data-leave-approve="${req.id}"><i data-lucide="check" style="width:12px;height:12px;"></i> Approve</button>
            <button class="btn btn-danger btn-xs" data-leave-reject="${req.id}"><i data-lucide="x" style="width:12px;height:12px;"></i> Reject</button>
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
    const stats = adminStore.getDashboardStats();
    const employees = adminStore.getEmployees();
    const today = adminStore.summarize(adminStore.getTodayRecords());
    const pendingLeaves = adminStore.getLeaves('Pending');
    const activity = adminStore.getActivity(6);
    const payroll = stats.payrollOverview;
    const trend = adminStore.getLastSevenWorkingDays();

    const dateLabel = new Date(TODAY_ISO.slice(0, 4), TODAY_ISO.slice(5, 7) - 1, TODAY_ISO.slice(8, 10))
      .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    return `
      <!-- Page heading -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:24px;">
        <div>
          <h2 style="font-size:22px; font-weight:700; letter-spacing:-0.4px;">Admin Dashboard</h2>
          <p style="color:var(--text-secondary); font-size:13px; margin-top:2px;">Company-wide snapshot for ${dateLabel}</p>
        </div>
        <button class="btn btn-primary btn-sm" id="dash-go-reports">
          <i data-lucide="bar-chart-3" style="width:15px;height:15px;"></i>
          <span>Generate Reports</span>
        </button>
      </div>

      <!-- KPI row -->
      <div class="stats-grid">
        ${StatisticsCard({ icon: 'users', value: stats.totalEmployees, label: 'Total Employees', trendText: '+2 this month', trendDir: 'up' })}
        ${StatisticsCard({ icon: 'check-circle', iconBg: 'var(--success-bg)', iconColor: 'var(--success)', value: stats.present, label: 'Present Today', trendText: `${Math.round((today.present / (employees.length || 1)) * 100)}% of workforce`, trendDir: 'up' })}
        ${StatisticsCard({ icon: 'plane', iconBg: 'var(--info-bg)', iconColor: 'var(--info)', value: stats.onLeave, label: 'On Approved Leave' })}
        ${StatisticsCard({ icon: 'x-circle', iconBg: 'var(--warning-bg)', iconColor: '#b06000', value: stats.absent, label: 'Absent Today', trendText: stats.halfDay ? `+${stats.halfDay} half-day` : '', trendDir: 'flat' })}
      </div>

      <!-- Attendance overview + Payroll overview -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:24px; margin-bottom:24px;">
        ${DashboardCard({
          title: "Today's Attendance Overview",
          icon: 'activity',
          headerExtra: `<span class="badge badge-info">Live mock data</span>`,
          bodyHtml: `
            ${progressRow('Present', stats.present, employees.length, 'var(--success)')}
            ${progressRow('On Leave', stats.onLeave, employees.length, 'var(--info)')}
            ${progressRow('Half-day', stats.halfDay, employees.length, '#f9ab00')}
            ${progressRow('Absent', stats.absent, employees.length, 'var(--danger)')}

            <div style="margin-top:20px;">
              <div style="font-size:13px; color:var(--text-secondary); margin-bottom:8px;">Last 7 working days — present rate</div>
              <div class="mini-bars">
                ${trend.map(d => `
                  <div class="mini-bar-col" title="${d.date}: ${d.presentRate}% present">
                    <span style="font-size:11px; color:var(--text-secondary); font-weight:600;">${d.presentRate}%</span>
                    <div class="mini-bar" style="height:${Math.max(8, d.presentRate)}%; background-color: var(--success);"></div>
                    <span class="mini-bar-label">${d.label}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `,
          footerHtml: CardLinkBtn({ id: 'dash-go-attendance', label: 'Open Attendance', icon: 'calendar-days' })
        })}

        ${DashboardCard({
          title: 'Payroll Overview',
          icon: 'wallet',
          headerExtra: `<span class="badge badge-success">${payroll.month}</span>`,
          bodyHtml: `
            <div style="font-size:13px; color:var(--text-secondary);">Estimated net payout for ${payroll.headcount} active employees</div>
            <div class="stat-value" style="color:var(--success); margin-top:6px;">${formatINR(payroll.netTotal)}</div>

            <div style="margin-top:18px;">
              <div class="salary-line earning">
                <span class="salary-label"><i data-lucide="plus-circle" style="width:15px;height:15px;"></i> Gross wages</span>
                <span class="salary-amount">${formatINR(payroll.grossTotal)}</span>
              </div>
              <div class="salary-line deduction">
                <span class="salary-label"><i data-lucide="minus-circle" style="width:15px;height:15px;"></i> Deductions (PF + PT)</span>
                <span class="salary-amount">-${formatINR(payroll.deductionsTotal)}</span>
              </div>
              <div class="salary-total">
                <span>Net payout</span><span style="color:var(--success);">${formatINR(payroll.netTotal)}</span>
              </div>
            </div>
            <p style="font-size:12px; color:var(--text-tertiary); margin-top:14px;">
              <i data-lucide="info" style="width:13px;height:13px; vertical-align:-2px;"></i>
              Next payout: ${payroll.nextPayoutDate}. Mock preview — backend computes final figures.
            </p>
          `,
          footerHtml: CardLinkBtn({ id: 'dash-go-payroll', label: 'Manage Payroll', icon: 'receipt' })
        })}
      </div>

      <!-- Pending leaves + recent activity -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:24px; margin-bottom:24px;">
        ${DashboardCard({
          title: 'Pending Leave Requests',
          icon: 'calendar',
          headerExtra: `<span class="badge ${pendingLeaves.length ? 'badge-warning' : 'badge-success'}">${pendingLeaves.length} pending</span>`,
          bodyHtml: pendingLeaves.length
            ? `<div style="display:flex; flex-direction:column; gap:16px;">${pendingLeaves.slice(0, 4).map(leaveRowHtml).join('')}</div>`
            : `<p style="font-size:13px; color:var(--text-tertiary);">No pending requests. All caught up! 🎉</p>`,
          footerHtml: CardLinkBtn({ id: 'dash-go-leave', label: 'View All Requests', icon: 'arrow-right' })
        })}

        ${DashboardCard({
          title: 'Recent Activity',
          icon: 'history',
          bodyHtml: ActivityList(activity)
        })}
      </div>

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
          ${employees.slice(0, 4).map((e, i) => EmployeeCard(e, adminStore.avatarStyle(i))).join('')}
        </div>
      </div>
    `;
  }

  function decideLeave(requestId, decision) {
    const req = adminStore.setLeaveDecision(requestId, decision);
    if (req) {
      showToast(`Leave request ${decision.toLowerCase()} successfully.`, decision === 'Approved' ? 'success' : 'danger');
      rerenderPageContent(view);
    }
  }

  const view = {
    render() {
      return renderAdminLayout('/admin/dashboard', 'Admin Dashboard', ui.loaded ? contentHtml() : skeletonHtml());
    },

    afterRender() {
      initAdminLayoutEvents();
      if (!ui.loaded) {
        simulateFetch(550).then(() => {
          ui.loaded = true;
          rerenderPageContent(view);
        });
      } else {
        view.bindEvents();
      }
    },

    bindEvents() {
      document.getElementById('dash-go-reports')?.addEventListener('click', () => router.navigate('/admin/reports'));
      document.getElementById('dash-go-attendance')?.addEventListener('click', () => router.navigate('/admin/attendance'));
      document.getElementById('dash-go-payroll')?.addEventListener('click', () => router.navigate('/admin/payroll'));
      document.getElementById('dash-go-leave')?.addEventListener('click', () => router.navigate('/admin/leave'));
      document.getElementById('dash-go-employees')?.addEventListener('click', () => router.navigate('/admin/employees'));

      document.querySelectorAll('[data-leave-approve]').forEach(btn =>
        btn.addEventListener('click', () => decideLeave(btn.dataset.leaveApprove, 'Approved')));
      document.querySelectorAll('[data-leave-reject]').forEach(btn =>
        btn.addEventListener('click', () => decideLeave(btn.dataset.leaveReject, 'Rejected')));
    },

    unmount() { /* no subscriptions to clean */ }
  };

  return view;
}
