// DAYFLOW HRMS — EMPLOYEE ATTENDANCE VIEW

import { store } from '../../core/store.js';
import { router } from '../../core/router.js';
import { renderSidebar, initSidebarEvents } from '../../components/Sidebar.js';
import { renderNavbar, initNavbarEvents } from '../../components/Navbar.js';
import { showToast } from '../../components/Toast.js';

export function createAttendanceView() {
  let viewFilter = 'daily'; // Filter options: 'daily', 'weekly', 'monthly'

  return {
    render() {
      const state = store.getState();
      const attendance = state.attendance || {};
      const history = attendance.history || [];

      const currentPath = '/employee/attendance';
      const isCheckedIn = attendance.isCheckedIn;

      // History rows HTML
      const tableRowsHtml = history.map(row => {
        let badgeClass = 'badge-success';
        if (row.status === 'Half-day') badgeClass = 'badge-warning';
        if (row.status === 'Absent') badgeClass = 'badge-danger';
        if (row.status === 'Leave') badgeClass = 'badge-info';

        return `
          <tr>
            <td style="font-weight: 500;">${row.date}</td>
            <td>${row.checkIn}</td>
            <td>${row.checkOut}</td>
            <td><strong>${row.hours}</strong></td>
            <td style="color: ${row.extra !== '0h 0m' ? 'var(--success)' : 'var(--text-tertiary)'};">${row.extra}</td>
            <td><span class="badge ${badgeClass}">${row.status}</span></td>
          </tr>
        `;
      }).join('');

      return `
        <div class="main-layout">
          ${renderSidebar(currentPath)}

          <div class="content-wrapper">
            ${renderNavbar('Attendance')}

            <main class="main-content">
              <!-- Check-In / Check-Out Hero Widget -->
              <div class="checkin-hero-card">
                <div>
                  <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9; font-weight: 600;">Today's Shift Status</div>
                  <h2 style="font-size: 28px; font-weight: 700; margin: 6px 0;">
                    ${isCheckedIn ? 'Checked In' : 'Checked Out'}
                  </h2>
                  <div style="font-size: 14px; opacity: 0.9; display: flex; align-items: center; gap: 12px; margin-top: 4px;">
                    <span>Check In Time: ${attendance.checkInTime || '--:--'}</span>
                    <span>•</span>
                    <span>Logged Today: ${attendance.todayHours || '0h 0m'}</span>
                  </div>
                </div>

                <div>
                  <button class="checkin-btn-large ${isCheckedIn ? 'active' : ''}" id="attendance-toggle-btn">
                    <i data-lucide="${isCheckedIn ? 'log-out' : 'log-in'}" style="width: 20px; height: 20px; display: inline-block; vertical-align: middle; margin-right: 8px;"></i>
                    <span>${isCheckedIn ? 'Check Out Now' : 'Check In Now'}</span>
                  </button>
                </div>
              </div>

              <!-- Summary KPIs -->
              <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 24px;">
                <div class="card">
                  <div style="font-size: 12px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 600;">Days Present</div>
                  <div class="stat-value" style="color: var(--success);">18 Days</div>
                  <div style="font-size: 12px; color: var(--text-secondary);">This Month</div>
                </div>

                <div class="card">
                  <div style="font-size: 12px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 600;">Half-Days</div>
                  <div class="stat-value" style="color: #b06000;">1 Day</div>
                  <div style="font-size: 12px; color: var(--text-secondary);">This Month</div>
                </div>

                <div class="card">
                  <div style="font-size: 12px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 600;">Leaves Taken</div>
                  <div class="stat-value" style="color: var(--info);">1 Day</div>
                  <div style="font-size: 12px; color: var(--text-secondary);">This Month</div>
                </div>

                <div class="card">
                  <div style="font-size: 12px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 600;">Total Overtime</div>
                  <div class="stat-value" style="color: var(--primary);">1h 40m</div>
                  <div style="font-size: 12px; color: var(--text-secondary);">Extra Hours</div>
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
                    <button class="btn btn-sm ${viewFilter === 'daily' ? 'btn-primary' : ''}" id="filter-daily" style="padding: 4px 12px;">Daily</button>
                    <button class="btn btn-sm ${viewFilter === 'weekly' ? 'btn-primary' : ''}" id="filter-weekly" style="padding: 4px 12px;">Weekly</button>
                    <button class="btn btn-sm ${viewFilter === 'monthly' ? 'btn-primary' : ''}" id="filter-monthly" style="padding: 4px 12px;">Monthly</button>
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
                    <tbody>
                      ${tableRowsHtml}
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

      // Check-In / Check-Out Toggle
      const toggleBtn = document.getElementById('attendance-toggle-btn');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          store.toggleCheckIn();
          const isChecked = store.getState().attendance.isCheckedIn;
          showToast(isChecked ? 'Checked in successfully!' : 'Checked out successfully!', isChecked ? 'success' : 'info');
          router.handleRoute();
        });
      }

      // Filter view handlers
      document.getElementById('filter-daily')?.addEventListener('click', () => { viewFilter = 'daily'; router.handleRoute(); });
      document.getElementById('filter-weekly')?.addEventListener('click', () => { viewFilter = 'weekly'; router.handleRoute(); });
      document.getElementById('filter-monthly')?.addEventListener('click', () => { viewFilter = 'monthly'; router.handleRoute(); });
    }
  };
}
