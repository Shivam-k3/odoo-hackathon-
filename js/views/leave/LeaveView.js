// DAYFLOW HRMS — EMPLOYEE LEAVE VIEW

import { store } from '../../core/store.js';
import { router } from '../../core/router.js';
import { renderSidebar, initSidebarEvents } from '../../components/Sidebar.js';
import { renderNavbar, initNavbarEvents } from '../../components/Navbar.js';
import { openModal, closeModal } from '../../components/Modal.js';
import { showToast } from '../../components/Toast.js';

export function createLeaveView() {
  return {
    render() {
      const state = store.getState();
      const leave = state.leave || {};
      const balances = leave.balances || { pto: 14, sick: 7, unpaid: 10 };
      const requests = leave.requests || [];

      const currentPath = '/employee/leave';

      const tableRowsHtml = requests.map(req => {
        let badgeClass = 'badge-warning';
        if (req.status === 'Approved') badgeClass = 'badge-success';
        if (req.status === 'Rejected') badgeClass = 'badge-danger';

        return `
          <tr>
            <td style="font-weight: 600;">${req.id}</td>
            <td>
              <div style="font-weight: 500;">${req.type}</div>
              <div style="font-size: 11px; color: var(--text-tertiary);">Applied on ${req.appliedOn}</div>
            </td>
            <td>${req.startDate} to ${req.endDate}</td>
            <td><strong>${req.days} Day${req.days > 1 ? 's' : ''}</strong></td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${req.reason}</td>
            <td>
              ${req.attachment ? `
                <a href="#" class="btn btn-secondary btn-sm" onclick="event.preventDefault(); alert('Viewing attachment: ${req.attachment}');">
                  <i data-lucide="paperclip" style="width: 12px; height: 12px;"></i>
                  <span>${req.attachment}</span>
                </a>
              ` : '<span style="color: var(--text-tertiary);">-</span>'}
            </td>
            <td><span class="badge ${badgeClass}">${req.status}</span></td>
          </tr>
        `;
      }).join('');

      return `
        <div class="main-layout">
          ${renderSidebar(currentPath)}

          <div class="content-wrapper">
            ${renderNavbar('Leave Management')}

            <main class="main-content">
              <!-- Leave Balances & Header Action -->
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
                <div>
                  <h2 style="font-size: 20px; font-weight: 700;">My Leave Quota</h2>
                  <p style="font-size: 13px; color: var(--text-secondary);">Track your available time off balances for 2026</p>
                </div>
                <button class="btn btn-primary btn-lg" id="apply-leave-btn">
                  <i data-lucide="plus-circle" style="width: 18px; height: 18px;"></i>
                  <span>Apply for Leave</span>
                </button>
              </div>

              <!-- Leave Balance Cards -->
              <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin-bottom: 32px;">
                <div class="card">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <span style="font-size: 13px; color: var(--text-secondary); font-weight: 600;">Paid Time Off (PTO)</span>
                    <i data-lucide="palmtree" style="width: 20px; height: 20px; color: var(--primary);"></i>
                  </div>
                  <div class="stat-value" style="color: var(--primary);">${balances.pto} <span style="font-size: 14px; font-weight: 500; color: var(--text-secondary);">Days</span></div>
                  <div style="font-size: 12px; color: var(--text-tertiary);">Total annual allowance: 18 Days</div>
                </div>

                <div class="card">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <span style="font-size: 13px; color: var(--text-secondary); font-weight: 600;">Sick Leave</span>
                    <i data-lucide="heart-pulse" style="width: 20px; height: 20px; color: var(--danger);"></i>
                  </div>
                  <div class="stat-value" style="color: var(--danger);">${balances.sick} <span style="font-size: 14px; font-weight: 500; color: var(--text-secondary);">Days</span></div>
                  <div style="font-size: 12px; color: var(--text-tertiary);">Medical cert required > 1 day</div>
                </div>

                <div class="card">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <span style="font-size: 13px; color: var(--text-secondary); font-weight: 600;">Unpaid Leave</span>
                    <i data-lucide="slash" style="width: 20px; height: 20px; color: var(--warning);"></i>
                  </div>
                  <div class="stat-value" style="color: #b06000;">${balances.unpaid} <span style="font-size: 14px; font-weight: 500; color: var(--text-secondary);">Days</span></div>
                  <div style="font-size: 12px; color: var(--text-tertiary);">Subject to manager approval</div>
                </div>
              </div>

              <!-- Leave Requests History Table -->
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">
                    <i data-lucide="calendar" style="width: 18px; height: 18px; color: var(--primary);"></i>
                    <span>Leave Request History</span>
                  </h3>
                </div>

                <div class="table-container">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Request ID</th>
                        <th>Leave Type</th>
                        <th>Dates</th>
                        <th>Duration</th>
                        <th>Remarks</th>
                        <th>Attachment</th>
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

      // Open Apply Leave Modal
      document.getElementById('apply-leave-btn')?.addEventListener('click', () => {
        openModal({
          title: 'Apply for Leave',
          bodyHtml: `
            <form id="leave-request-form">
              <div class="form-group">
                <label class="form-label required" for="leave-type">Leave Type</label>
                <select id="leave-type" class="form-select" required>
                  <option value="Paid Time Off">Paid Time Off (PTO)</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Unpaid Leave">Unpaid Leave</option>
                </select>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="form-group">
                  <label class="form-label required" for="start-date">Start Date</label>
                  <input type="date" id="start-date" class="form-input" required />
                </div>
                <div class="form-group">
                  <label class="form-label required" for="end-date">End Date</label>
                  <input type="date" id="end-date" class="form-input" required />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="days-count">Number of Days</label>
                <input type="text" id="days-count" class="form-input" value="1 Day" readonly style="background-color: var(--bg-subtle);" />
              </div>

              <div class="form-group">
                <label class="form-label required" for="leave-remarks">Remarks / Reason</label>
                <textarea id="leave-remarks" class="form-textarea" rows="3" placeholder="Please state the reason for your leave request..." required></textarea>
              </div>

              <!-- Attachment Section (Dynamic Requirement for Sick Leave) -->
              <div class="form-group" id="attachment-group">
                <label class="form-label" id="attachment-label" for="leave-attachment">
                  Attachment / Medical Certificate
                  <span class="badge badge-warning" id="sick-leave-req-badge" style="display: none; margin-left: 6px;">Required for Sick Leave</span>
                </label>
                <input type="file" id="leave-attachment" class="form-input" />
                <div id="attachment-error-msg" class="form-error" style="display: none;">Medical Certificate attachment is mandatory for Sick Leave requests.</div>
              </div>
            </form>
          `,
          footerHtml: `
            <button class="btn btn-secondary" id="modal-cancel-leave">Cancel</button>
            <button class="btn btn-primary" id="modal-submit-leave">Submit Application</button>
          `
        });

        const leaveTypeSelect = document.getElementById('leave-type');
        const sickBadge = document.getElementById('sick-leave-req-badge');
        const attachError = document.getElementById('attachment-error-msg');
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        const daysCountInput = document.getElementById('days-count');

        // Set default dates
        const todayStr = new Date().toISOString().split('T')[0];
        if (startDateInput) startDateInput.value = todayStr;
        if (endDateInput) endDateInput.value = todayStr;

        const updateDaysCount = () => {
          if (startDateInput.value && endDateInput.value) {
            const start = new Date(startDateInput.value);
            const end = new Date(endDateInput.value);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            daysCountInput.value = `${diffDays} Day${diffDays > 1 ? 's' : ''}`;
          }
        };

        startDateInput?.addEventListener('change', updateDaysCount);
        endDateInput?.addEventListener('change', updateDaysCount);

        // Toggle attachment requirement for Sick Leave
        leaveTypeSelect?.addEventListener('change', (e) => {
          if (e.target.value === 'Sick Leave') {
            if (sickBadge) sickBadge.style.display = 'inline-flex';
          } else {
            if (sickBadge) sickBadge.style.display = 'none';
            if (attachError) attachError.style.display = 'none';
          }
        });

        document.getElementById('modal-cancel-leave')?.addEventListener('click', closeModal);

        document.getElementById('modal-submit-leave')?.addEventListener('click', () => {
          const type = leaveTypeSelect.value;
          const startDate = startDateInput.value;
          const endDate = endDateInput.value;
          const reason = document.getElementById('leave-remarks')?.value.trim();
          const fileInput = document.getElementById('leave-attachment');

          if (!reason) {
            showToast('Please enter remarks/reason for leave.', 'danger');
            return;
          }

          // Sick Leave Validation Check
          if (type === 'Sick Leave' && (!fileInput.files || fileInput.files.length === 0)) {
            if (attachError) attachError.style.display = 'block';
            showToast('Medical Certificate is required for Sick Leave!', 'danger');
            return;
          }

          const fileName = fileInput.files && fileInput.files.length > 0 ? fileInput.files[0].name : null;
          const start = new Date(startDate);
          const end = new Date(endDate);
          const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;

          store.addLeaveRequest({
            type,
            startDate,
            endDate,
            days: diffDays,
            reason,
            attachment: fileName
          });

          closeModal();
          showToast('Leave request submitted successfully!', 'success');
          router.handleRoute();
        });
      });
    }
  };
}
