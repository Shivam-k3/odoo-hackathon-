// DAYFLOW HRMS — EMPLOYEE DASHBOARD VIEW

import { store } from '../../core/store.js';
import { router } from '../../core/router.js';
import { renderSidebar, initSidebarEvents } from '../../components/Sidebar.js';
import { renderNavbar, initNavbarEvents } from '../../components/Navbar.js';
import { showToast } from '../../components/Toast.js';

export function createDashboardView() {
  let unsubscribe;

  return {
    render() {
      const state = store.getState();
      const user = state.user || {};
      const attendance = state.attendance || {};
      const leave = state.leave || {};
      const payroll = state.payroll || {};

      const currentPath = '/employee/dashboard';

      return `
        <div class="main-layout">
          ${renderSidebar(currentPath)}

          <div class="content-wrapper">
            ${renderNavbar('Employee Dashboard')}

            <main class="main-content">
              <!-- Welcome Banner -->
              <div style="margin-bottom: 28px;">
                <h2 style="font-size: 24px; font-weight: 700; color: var(--text-main); letter-spacing: -0.5px;">
                  Welcome back, ${user.name ? user.name.split(' ')[0] : 'Employee'} 👋
                </h2>
                <p style="color: var(--text-secondary); font-size: 14px; margin-top: 4px;">
                  Here is your daily work summary for ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.
                </p>
              </div>

              <!-- Dashboard 4 Core Cards Grid -->
              <div class="dashboard-grid">
                <!-- 1. My Profile Card -->
                <div class="card card-hover" style="display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                      <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background-color: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                        <i data-lucide="user" style="width: 22px; height: 22px;"></i>
                      </div>
                      <span class="badge badge-info">${user.id || 'EMP-1042'}</span>
                    </div>
                    <div style="font-weight: 700; font-size: 16px; color: var(--text-main); margin-bottom: 2px;">${user.name || 'Employee'}</div>
                    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">${user.designation || 'Staff'} • ${user.department || 'General'}</div>
                    <div style="font-size: 12px; color: var(--text-tertiary); display: flex; align-items: center; gap: 4px;">
                      <i data-lucide="calendar" style="width: 14px; height: 14px;"></i>
                      <span>Joined ${user.joiningDate || '2022-03-15'}</span>
                    </div>
                  </div>
                  <button class="btn btn-secondary btn-block btn-sm" id="dash-nav-profile" style="margin-top: 20px;">
                    <span>View Profile</span>
                    <i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>
                  </button>
                </div>

                <!-- 2. Attendance Card -->
                <div class="card card-hover" style="display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                      <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background-color: ${attendance.isCheckedIn ? 'var(--success-bg)' : 'var(--warning-bg)'}; color: ${attendance.isCheckedIn ? 'var(--success)' : '#b06000'}; display: flex; align-items: center; justify-content: center;">
                        <i data-lucide="clock" style="width: 22px; height: 22px;"></i>
                      </div>
                      <span class="badge ${attendance.isCheckedIn ? 'badge-success' : 'badge-warning'}">
                        ${attendance.isCheckedIn ? 'Checked In' : 'Checked Out'}
                      </span>
                    </div>
                    <div style="font-size: 13px; color: var(--text-secondary);">Today's Status</div>
                    <div class="stat-value">${attendance.isCheckedIn ? (attendance.checkInTime || '09:00 AM') : 'Not Checked In'}</div>
                    <div style="font-size: 12px; color: var(--text-tertiary);">Logged Hours: ${attendance.todayHours || '0h 0m'}</div>
                  </div>
                  <div style="display: flex; gap: 8px; margin-top: 20px;">
                    <button class="btn ${attendance.isCheckedIn ? 'btn-danger' : 'btn-success'}" style="flex: 1;" id="dash-quick-checkin">
                      <span>${attendance.isCheckedIn ? 'Check Out' : 'Check In'}</span>
                    </button>
                    <button class="btn btn-secondary" id="dash-nav-attendance" title="Attendance History">
                      <i data-lucide="calendar-days" style="width: 16px; height: 16px;"></i>
                    </button>
                  </div>
                </div>

                <!-- 3. Leave Requests Card -->
                <div class="card card-hover" style="display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                      <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background-color: #fef7e0; color: #b06000; display: flex; align-items: center; justify-content: center;">
                        <i data-lucide="calendar" style="width: 22px; height: 22px;"></i>
                      </div>
                      <span class="badge badge-warning">${leave.requests ? leave.requests.filter(r => r.status === 'Pending').length : 0} Pending</span>
                    </div>
                    <div style="font-size: 13px; color: var(--text-secondary);">Available Paid Time Off</div>
                    <div class="stat-value">${leave.balances ? leave.balances.pto : 14} <span style="font-size: 14px; font-weight: 500; color: var(--text-secondary);">Days</span></div>
                    <div style="font-size: 12px; color: var(--text-tertiary);">Sick Leave Balance: ${leave.balances ? leave.balances.sick : 7} Days</div>
                  </div>
                  <button class="btn btn-secondary btn-block btn-sm" id="dash-nav-leave" style="margin-top: 20px;">
                    <span>Apply Leave</span>
                    <i data-lucide="plus-circle" style="width: 14px; height: 14px;"></i>
                  </button>
                </div>

                <!-- 4. Payroll Card (India-First Currency ₹) -->
                <div class="card card-hover" style="display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                      <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background-color: var(--success-bg); color: var(--success); display: flex; align-items: center; justify-content: center;">
                        <i data-lucide="receipt" style="width: 22px; height: 22px;"></i>
                      </div>
                      <span class="badge badge-success">${payroll.month || 'August 2026'}</span>
                    </div>
                    <div style="font-size: 13px; color: var(--text-secondary);">Estimated Net Take-Home</div>
                    <div class="stat-value" style="color: var(--success);">₹${payroll.netPay ? payroll.netPay.toLocaleString('en-IN') : '46,800'}</div>
                    <div style="font-size: 12px; color: var(--text-tertiary);">Next payout: Aug 31, 2026</div>
                  </div>
                  <button class="btn btn-secondary btn-block btn-sm" id="dash-nav-payroll" style="margin-top: 20px;">
                    <span>Salary Breakdown</span>
                    <i data-lucide="file-text" style="width: 14px; height: 14px;"></i>
                  </button>
                </div>
              </div>

              <!-- Recent Activity & Announcements Section -->
              <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
                <div class="card">
                  <div class="card-header">
                    <h3 class="card-title">
                      <i data-lucide="activity" style="width: 18px; height: 18px; color: var(--primary);"></i>
                      <span>Recent Activity Log</span>
                    </h3>
                    <span style="font-size: 12px; color: var(--text-tertiary);">Local session data</span>
                  </div>

                  <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div style="display: flex; gap: 14px; align-items: flex-start; padding-bottom: 12px; border-bottom: 1px solid var(--border-light);">
                      <div style="width: 32px; height: 32px; border-radius: 50%; background-color: var(--success-bg); color: var(--success); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i data-lucide="check" style="width: 16px; height: 16px;"></i>
                      </div>
                      <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 14px; color: var(--text-main);">Daily Attendance Recorded</div>
                        <div style="font-size: 13px; color: var(--text-secondary);">Checked in at 09:00 AM for workday.</div>
                        <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 2px;">Today at 09:00 AM</div>
                      </div>
                    </div>

                    <div style="display: flex; gap: 14px; align-items: flex-start; padding-bottom: 12px; border-bottom: 1px solid var(--border-light);">
                      <div style="width: 32px; height: 32px; border-radius: 50%; background-color: var(--info-bg); color: var(--info); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i data-lucide="calendar" style="width: 16px; height: 16px;"></i>
                      </div>
                      <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 14px; color: var(--text-main);">Leave Approved</div>
                        <div style="font-size: 13px; color: var(--text-secondary);">Sick Leave request for Aug 18 was approved by HR.</div>
                        <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 2px;">Aug 17, 2026</div>
                      </div>
                    </div>

                    <div style="display: flex; gap: 14px; align-items: flex-start;">
                      <div style="width: 32px; height: 32px; border-radius: 50%; background-color: var(--bg-subtle); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i data-lucide="receipt" style="width: 16px; height: 16px;"></i>
                      </div>
                      <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 14px; color: var(--text-main);">July Salary Slip Released</div>
                        <div style="font-size: 13px; color: var(--text-secondary);">Monthly pay slip for July 2026 is available for view.</div>
                        <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 2px;">Aug 01, 2026</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Company Announcement Card -->
                <div class="card" style="background-color: var(--primary-surface); border-color: #d0e1fd;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: var(--primary);">
                    <i data-lucide="sparkles" style="width: 20px; height: 20px;"></i>
                    <h4 style="font-weight: 700; font-size: 15px;">HR Announcement</h4>
                  </div>
                  <p style="font-size: 13px; color: var(--text-main); line-height: 1.6; margin-bottom: 16px;">
                    Welcome to Dayflow HRMS! All employees are requested to update their certifications and private contact information in their Profile tab.
                  </p>
                  <button class="btn btn-primary btn-sm" id="dash-announcement-btn">
                    <span>Acknowledge</span>
                  </button>
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

      // Navigation button events
      document.getElementById('dash-nav-profile')?.addEventListener('click', () => router.navigate('/employee/profile'));
      document.getElementById('dash-nav-attendance')?.addEventListener('click', () => router.navigate('/employee/attendance'));
      document.getElementById('dash-nav-leave')?.addEventListener('click', () => router.navigate('/employee/leave'));
      document.getElementById('dash-nav-payroll')?.addEventListener('click', () => router.navigate('/employee/payroll'));

      // Quick check-in toggle button
      const quickCheckInBtn = document.getElementById('dash-quick-checkin');
      if (quickCheckInBtn) {
        quickCheckInBtn.addEventListener('click', () => {
          store.toggleCheckIn();
          const isChecked = store.getState().attendance.isCheckedIn;
          showToast(isChecked ? 'Checked in successfully!' : 'Checked out successfully!', isChecked ? 'success' : 'info');
          router.handleRoute();
        });
      }

      document.getElementById('dash-announcement-btn')?.addEventListener('click', () => {
        showToast('Announcement acknowledged!', 'success');
      });
    },

    unmount() {
      if (unsubscribe) unsubscribe();
    }
  };
}
