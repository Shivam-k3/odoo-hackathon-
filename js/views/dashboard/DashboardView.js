// DAYFLOW HRMS — EMPLOYEE DASHBOARD VIEW (REAL BACKEND DATA)

import { store } from '../../core/store.js';
import { router } from '../../core/router.js';
import { api, esc, fmtINR } from '../../core/api.js';
import { renderSidebar, initSidebarEvents } from '../../components/Sidebar.js';
import { renderNavbar, initNavbarEvents } from '../../components/Navbar.js';
import { showToast } from '../../components/Toast.js';

export function createDashboardView() {
  return {
    render() {
      const currentPath = '/employee/dashboard';

      // Static shell; all data panels are filled by load() afterRender so the
      // page can show real loading / empty / error states.
      return `
        <div class="main-layout">
          ${renderSidebar(currentPath)}

          <div class="content-wrapper">
            ${renderNavbar('Employee Dashboard')}

            <main class="main-content">
              <div style="margin-bottom: 28px;">
                <h2 style="font-size: 24px; font-weight: 700; color: var(--text-main); letter-spacing: -0.5px;" id="dash-welcome">
                  Welcome back…
                </h2>
                <p style="color: var(--text-secondary); font-size: 14px; margin-top: 4px;">
                  Here is your daily work summary for ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.
                </p>
              </div>

              <div id="dash-error" style="display:none; margin-bottom:20px; padding:12px 16px; background-color: var(--danger-bg); border:1px solid var(--danger); border-radius: var(--radius-md); color: var(--danger); font-size:13px;"></div>

              <!-- Dashboard 4 Core Cards Grid -->
              <div class="dashboard-grid">
                <!-- 1. My Profile Card -->
                <div class="card card-hover" style="display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                      <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background-color: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                        <i data-lucide="user" style="width: 22px; height: 22px;"></i>
                      </div>
                      <span class="badge badge-info" id="dash-login-id">…</span>
                    </div>
                    <div style="font-weight: 700; font-size: 16px; color: var(--text-main); margin-bottom: 2px;" id="dash-name">Loading…</div>
                    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;" id="dash-role">—</div>
                    <div style="font-size: 12px; color: var(--text-tertiary); display: flex; align-items: center; gap: 4px;">
                      <i data-lucide="calendar" style="width: 14px; height: 14px;"></i>
                      <span id="dash-joined">Joined —</span>
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
                      <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background-color: var(--warning-bg); color: #b06000; display: flex; align-items: center; justify-content: center;" id="dash-att-icon-wrap">
                        <i data-lucide="clock" style="width: 22px; height: 22px;"></i>
                      </div>
                      <span class="badge badge-warning" id="dash-att-badge">Loading</span>
                    </div>
                    <div style="font-size: 13px; color: var(--text-secondary);">Today's Status</div>
                    <div class="stat-value" id="dash-att-time">…</div>
                    <div style="font-size: 12px; color: var(--text-tertiary);" id="dash-att-hours">Logged Hours: …</div>
                  </div>
                  <div style="display: flex; gap: 8px; margin-top: 20px;">
                    <button class="btn btn-success" style="flex: 1;" id="dash-quick-checkin"><span>Check In</span></button>
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
                      <span class="badge badge-warning" id="dash-pending-badge">… Pending</span>
                    </div>
                    <div style="font-size: 13px; color: var(--text-secondary);">Available Paid Time Off</div>
                    <div class="stat-value"><span id="dash-pto">…</span> <span style="font-size: 14px; font-weight: 500; color: var(--text-secondary);">Days</span></div>
                    <div style="font-size: 12px; color: var(--text-tertiary);">Sick Leave Balance: <span id="dash-sick">…</span> Days</div>
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
                      <span class="badge badge-success" id="dash-pay-month">This Month</span>
                    </div>
                    <div style="font-size: 13px; color: var(--text-secondary);">Estimated Net Take-Home</div>
                    <div class="stat-value" style="color: var(--success);" id="dash-netpay">…</div>
                    <div style="font-size: 12px; color: var(--text-tertiary);" id="dash-netpay-note">From your salary structure</div>
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
                      <span>Recent Notifications</span>
                    </h3>
                    <span style="font-size: 12px; color: var(--text-tertiary);">Live from server</span>
                  </div>
                  <div id="dash-notifications" style="display: flex; flex-direction: column; gap: 16px; min-height: 60px;">
                    <div style="color: var(--text-tertiary); font-size: 13px;">Loading notifications…</div>
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

      document.getElementById('dash-nav-profile')?.addEventListener('click', () => router.navigate('/employee/profile'));
      document.getElementById('dash-nav-attendance')?.addEventListener('click', () => router.navigate('/employee/attendance'));
      document.getElementById('dash-nav-leave')?.addEventListener('click', () => router.navigate('/employee/leave'));
      document.getElementById('dash-nav-payroll')?.addEventListener('click', () => router.navigate('/employee/payroll'));
      document.getElementById('dash-announcement-btn')?.addEventListener('click', () => {
        showToast('Announcement acknowledged!', 'success');
      });

      const errBox = document.getElementById('dash-error');
      const showError = (msg) => { if (errBox) { errBox.textContent = msg; errBox.style.display = 'block'; } };

      let today = null;
      const renderAttendance = () => {
        if (!today) return;
        const checkedIn = !!today.checkInTime && !today.checkOutTime;
        const badge = document.getElementById('dash-att-badge');
        const timeEl = document.getElementById('dash-att-time');
        const hoursEl = document.getElementById('dash-att-hours');
        const btn = document.getElementById('dash-quick-checkin');
        if (!badge || !timeEl || !hoursEl || !btn) return;

        badge.className = `badge ${checkedIn ? 'badge-success' : 'badge-warning'}`;
        badge.textContent = checkedIn ? 'Checked In' : (today.checkOutTime ? 'Checked Out' : 'Not Checked In');
        timeEl.textContent = checkedIn ? new Date(today.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not Checked In';
        hoursEl.textContent = `Logged Hours: ${Number(today.workHours || 0).toFixed(1)}h`;
        btn.className = `btn ${checkedIn ? 'btn-danger' : 'btn-success'}`;
        btn.style.flex = '1';
        btn.innerHTML = `<span>${checkedIn ? 'Check Out' : 'Check In'}</span>`;
        btn.onclick = async () => {
          btn.disabled = true;
          try {
            const res = await api.post(checkedIn ? '/api/attendance/check-out' : '/api/attendance/check-in', {});
            today = res;
            showToast(checkedIn ? 'Checked out successfully!' : 'Checked in successfully!', checkedIn ? 'info' : 'success');
            renderAttendance();
          } catch (err) {
            showToast(err.message || 'Attendance action failed.', 'danger');
          } finally {
            btn.disabled = false;
          }
        };
      };

      const loadAll = async () => {
        // Profile card
        try {
          const profile = await api.get('/api/employees/me');
          const fullName = `${profile.firstName} ${profile.lastName}`.trim();
          const welcome = document.getElementById('dash-welcome');
          if (welcome) welcome.textContent = `Welcome back, ${(fullName || profile.email).split(' ')[0]}!`;
          document.getElementById('dash-name').textContent = fullName;
          document.getElementById('dash-login-id').textContent = profile.loginId || '';
          document.getElementById('dash-role').textContent = `${profile.designation || 'Staff'} • ${profile.department || 'General'}`;
          document.getElementById('dash-joined').textContent = `Joined ${profile.joiningDate ? String(profile.joiningDate).slice(0, 10) : '—'}`;

          const sessionUser = store.getState().user;
          if (sessionUser && !sessionUser.avatar && profile.profilePicture) {
            store.setUser({ ...sessionUser, avatar: profile.profilePicture });
          }
        } catch (err) {
          showError(err.message || 'Could not load profile.');
        }

        // Attendance today
        try {
          today = await api.get('/api/attendance/me/today');
          renderAttendance();
        } catch (err) {
          const t = document.getElementById('dash-att-time');
          if (t) t.textContent = 'Unavailable';
        }

        // Leave balances + pending count
        try {
          const alloc = await api.get('/api/leaves/allocations/me?year=' + new Date().getFullYear());
          const byType = Object.fromEntries((alloc.allocations || []).map(a => [a.leaveType, a]));
          const pto = byType.PTO ? byType.PTO.remaining : 0;
          const sick = byType.SICK ? byType.SICK.remaining : 0;
          const pending = (byType.PTO ? byType.PTO.pending : 0) + (byType.SICK ? byType.SICK.pending : 0);
          document.getElementById('dash-pto').textContent = String(pto);
          document.getElementById('dash-sick').textContent = String(sick);
          const pendBadge = document.getElementById('dash-pending-badge');
          if (pendBadge) {
            pendBadge.textContent = `${pending} Pending`;
            pendBadge.style.display = pending > 0 ? '' : 'none';
          }
        } catch (err) {
          const p = document.getElementById('dash-pto');
          if (p) p.textContent = '—';
        }

        // Payroll summary (backend-authoritative)
        try {
          const payroll = await api.get('/api/payroll/me');
          const comps = payroll.components || {};
          const np = document.getElementById('dash-netpay');
          np.textContent = fmtINR(comps.netPay);
          document.getElementById('dash-pay-month').textContent =
            new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } catch (err) {
          const np = document.getElementById('dash-netpay');
          if (np) {
            np.textContent = 'Not configured';
            np.style.fontSize = '18px';
            np.style.color = 'var(--text-tertiary)';
          }
          const note = document.getElementById('dash-netpay-note');
          if (note) note.textContent = 'HR has not set up a salary structure yet.';
        }

        // Notifications (live)
        try {
          const notifData = await api.get('/api/notifications/me?page=1&limit=5');
          const wrap = document.getElementById('dash-notifications');
          const list = notifData.notifications || [];
          if (!wrap) return;
          if (!list.length) {
            wrap.innerHTML = '<div style="color: var(--text-tertiary); font-size: 13px;">No notifications yet — activity will appear here.</div>';
            return;
          }
          wrap.innerHTML = list.map(n => `
            <div style="display:flex; gap:14px; align-items:flex-start; padding-bottom:12px; border-bottom:1px solid var(--border-light);">
              <div style="width:32px; height:32px; border-radius:50%; background-color:${n.read ? 'var(--bg-subtle)' : 'var(--primary-light)'}; color:${n.read ? 'var(--text-secondary)' : 'var(--primary)'}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="${esc(n.type === 'PAYSLIP_AVAILABLE' ? 'receipt' : n.type === 'LEAVE_APPROVED' ? 'check' : n.type === 'LEAVE_REJECTED' ? 'x' : 'bell')}" style="width:16px; height:16px;"></i>
              </div>
              <div style="flex:1;">
                <div style="font-weight:600; font-size:14px; color:var(--text-main);">${esc(n.title)}</div>
                <div style="font-size:13px; color:var(--text-secondary);">${esc(n.body)}</div>
                <div style="font-size:11px; color:var(--text-tertiary); margin-top:2px;">${esc(String(n.createdAt || '').slice(0, 10))}</div>
              </div>
            </div>
          `).join('');
          if (window.lucide) window.lucide.createIcons();
        } catch (err) {
          const wrap = document.getElementById('dash-notifications');
          if (wrap) wrap.innerHTML = '<div style="color: var(--text-tertiary); font-size: 13px;">Could not load notifications.</div>';
        }
      };

      function fmtRupees(amount) {
        const n = Number(amount);
        if (!Number.isFinite(n)) return '—';
        const hasPaise = Math.round(n * 100) % 100 !== 0;
        return '₹' + n.toLocaleString('en-IN', hasPaise
          ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
          : { maximumFractionDigits: 0 });
      }

      loadAll();
    }
  };
}
