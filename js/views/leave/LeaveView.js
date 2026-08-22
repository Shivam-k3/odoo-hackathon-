// DAYFLOW HRMS — EMPLOYEE LEAVE VIEW (REAL BACKEND DATA)
// Multipart upload field is `attachment` (multer .single('attachment')).

import { router } from '../../core/router.js';
import { api, esc } from '../../core/api.js';
import { renderSidebar, initSidebarEvents } from '../../components/Sidebar.js';
import { renderNavbar, initNavbarEvents } from '../../components/Navbar.js';
import { openModal, closeModal } from '../../components/Modal.js';
import { showToast } from '../../components/Toast.js';

function statusBadge(status) {
  const map = {
    PENDING: 'badge-warning',
    APPROVED: 'badge-success',
    REJECTED: 'badge-danger',
  };
  return `<span class="badge ${map[status] || 'badge-info'}">${esc(status || 'UNKNOWN')}</span>`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return String(iso).slice(0, 10);
}

export function createLeaveView() {
  let allocations = [];

  return {
    render() {
      const currentPath = '/employee/leave';

      return `
        <div class="main-layout">
          ${renderSidebar(currentPath)}

          <div class="content-wrapper">
            ${renderNavbar('Leave Management')}

            <main class="main-content">
              <div id="lv-error" style="display:none; margin-bottom:20px; padding:12px 16px; background-color:#fdecea; border:1px solid var(--danger); border-radius: var(--radius-md); color: var(--danger); font-size:13px;"></div>

              <!-- Leave Balances & Header Action -->
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
                <div>
                  <h2 style="font-size: 20px; font-weight: 700;">My Leave Quota</h2>
                  <p style="font-size: 13px; color: var(--text-secondary);">Track your available time off balances</p>
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
                  <div class="stat-value" style="color: var(--primary);"><span id="lv-pto">…</span> <span style="font-size: 14px; font-weight: 500; color: var(--text-secondary);">Days Left</span></div>
                  <div style="font-size: 12px; color: var(--text-tertiary);" id="lv-pto-sub">Loading allowance…</div>
                </div>

                <div class="card">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <span style="font-size: 13px; color: var(--text-secondary); font-weight: 600;">Sick Leave</span>
                    <i data-lucide="thermometer" style="width: 20px; height: 20px; color: var(--info);"></i>
                  </div>
                  <div class="stat-value" style="color: var(--info);"><span id="lv-sick">…</span> <span style="font-size: 14px; font-weight: 500; color: var(--text-secondary);">Days Left</span></div>
                  <div style="font-size: 12px; color: var(--text-tertiary);" id="lv-sick-sub">Certificate mandatory</div>
                </div>

                <div class="card">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <span style="font-size: 13px; color: var(--text-secondary); font-weight: 600;">Unpaid Leave</span>
                    <i data-lucide="circle-off" style="width: 20px; height: 20px; color: var(--text-tertiary);"></i>
                  </div>
                  <div class="stat-value"><span id="lv-unpaid">…</span> <span style="font-size: 14px; font-weight: 500; color: var(--text-secondary);">Days Used</span></div>
                  <div style="font-size: 12px; color: var(--text-tertiary);">Not compensated by payroll</div>
                </div>

                <div class="card">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <span style="font-size: 13px; color: var(--text-secondary); font-weight: 600;">Pending Approval</span>
                    <i data-lucide="hourglass" style="width: 20px; height: 20px; color: #b06000;"></i>
                  </div>
                  <div class="stat-value" style="color: #b06000;"><span id="lv-pending">…</span> <span style="font-size: 14px; font-weight: 500; color: var(--text-secondary);">Requests</span></div>
                  <div style="font-size: 12px; color: var(--text-tertiary);">Awaiting admin decision</div>
                </div>
              </div>

              <!-- Leave History Table -->
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">
                    <i data-lucide="history" style="width: 18px; height: 18px; color: var(--primary);"></i>
                    <span>Leave History</span>
                  </h3>
                </div>
                <div class="table-container">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Applied On</th>
                        <th>Duration</th>
                        <th>Days</th>
                        <th>Remarks</th>
                        <th>Attachment</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody id="lv-table-body">
                      <tr><td colspan="7" style="text-align:center; padding:32px; color: var(--text-tertiary);">Loading requests…</td></tr>
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

      const errBox = document.getElementById('lv-error');
      const showError = (msg) => {
        if (!errBox) return;
        errBox.textContent = msg;
        errBox.style.display = 'block';
      };
      const hideError = () => { if (errBox) errBox.style.display = 'none'; };

      // ---- Allocations -------------------------------------------------
      const renderAllocations = () => {
        const byType = Object.fromEntries((allocations || []).map(a => [a.leaveType, a]));
        const pto = byType.PTO;
        const sick = byType.SICK;
        const unpaid = byType.UNPAID;

        const ptoEl = document.getElementById('lv-pto');
        if (!ptoEl) return;

        ptoEl.textContent = String(pto ? pto.remaining ?? 0 : 0);
        document.getElementById('lv-pto-sub').textContent =
          pto ? `Entitled ${pto.entitled ?? 0} • Used ${pto.used ?? 0}${pto.pending ? ` • ${pto.pending} pending` : ''}` : 'No allocation configured';
        document.getElementById('lv-sick').textContent = String(sick ? sick.remaining ?? 0 : 0);
        document.getElementById('lv-sick-sub').textContent =
          sick ? `Entitled ${sick.entitled ?? 0} • Used ${sick.used ?? 0}` : 'No allocation configured';
        document.getElementById('lv-unpaid').textContent = String(unpaid ? unpaid.used ?? 0 : 0);
      };

      const loadAllocations = async () => {
        try {
          hideError();
          const data = await api.get(`/api/leaves/allocations/me?year=${new Date().getFullYear()}`);
          allocations = data.allocations || [];
          renderAllocations();

          const pendingTotal = (allocations || []).reduce((sum, a) => sum + (a.pending || 0), 0);
          const pendEl = document.getElementById('lv-pending');
          if (pendEl) pendEl.textContent = String(pendingTotal);
        } catch (err) {
          showError(err.message || 'Could not load leave balances.');
          ['lv-pto', 'lv-sick', 'lv-unpaid', 'lv-pending'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '—';
          });
        }
      };

      // ---- History -----------------------------------------------------
      const loadHistory = async () => {
        const body = document.getElementById('lv-table-body');
        if (!body) return;
        try {
          const data = await api.get('/api/leaves/me');
          const records = data.records || [];
          if (!records.length) {
            body.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:32px; color: var(--text-tertiary);">No leave requests yet. Click "Apply for Leave" to create one.</td></tr>';
            return;
          }
          body.innerHTML = [...records].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).map(r => `
            <tr>
              <td style="font-weight: 500;">${esc(r.leaveType === 'PTO' ? 'Paid Time Off' : r.leaveType === 'SICK' ? 'Sick Leave' : r.leaveType)}</td>
              <td>${esc(fmtDate(r.createdAt))}</td>
              <td>${esc(fmtDate(r.startDate))} to ${esc(fmtDate(r.endDate))}</td>
              <td><strong>${esc(String(r.requestedDays ?? '—'))}</strong></td>
              <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${esc(r.remarks || '')}">${r.remarks ? esc(r.remarks) : '<span style="color: var(--text-tertiary);">-</span>'}</td>
              <td>
                ${r.attachment
                  ? `<a href="${esc(r.attachment)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">
                       <i data-lucide="paperclip" style="width: 12px; height: 12px;"></i>
                       <span>View</span>
                     </a>`
                  : '<span style="color: var(--text-tertiary);">-</span>'}
              </td>
              <td>${statusBadge(r.status)}</td>
            </tr>
          `).join('');
          if (window.lucide) window.lucide.createIcons();
        } catch (err) {
          body.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color: var(--danger);">${esc(err.message || 'Could not load history.')}</td></tr>`;
        }
      };

      // ---- Apply modal ---------------------------------------------------
      const openApplyModal = () => {
        openModal({
          title: 'Apply for Leave',
          bodyHtml: `
            <div class="form-group">
              <label class="form-label">Leave Type *</label>
              <select class="form-input" id="al-type">
                <option value="PTO">Paid Time Off (PTO)</option>
                <option value="SICK">Sick Leave (certificate required)</option>
                <option value="UNPAID">Unpaid Leave</option>
              </select>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label">Start Date *</label>
                <input type="date" class="form-input" id="al-start" />
              </div>
              <div class="form-group">
                <label class="form-label">End Date *</label>
                <input type="date" class="form-input" id="al-end" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Duration</label>
              <div style="font-size: 14px; color: var(--text-secondary); padding: 8px 12px; background-color: var(--bg-subtle); border-radius: var(--radius-sm);" id="al-duration">Select dates to calculate…</div>
            </div>
            <div class="form-group">
              <label class="form-label">Remarks</label>
              <textarea class="form-input" rows="3" placeholder="Reason / context for your request…" id="al-remarks"></textarea>
            </div>
            <div class="form-group" id="al-cert-group" style="display:none;">
              <label class="form-label">Medical Certificate * <span style="color: var(--danger);">(PDF, JPEG, PNG or WEBP)</span></label>
              <input type="file" class="form-input" id="al-file" accept=".pdf,.jpg,.jpeg,.png,.webp" />
              <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">Backend rejects Sick Leave without a certificate.</div>
            </div>
            <div id="al-error" style="display:none; padding:10px 12px; background-color:#fdecea; border:1px solid var(--danger); border-radius: var(--radius-sm); color: var(--danger); font-size:13px;"></div>
          `,
          footerHtml: `
            <button class="btn btn-secondary" id="al-cancel">Cancel</button>
            <button class="btn btn-primary" id="al-submit">
              <i data-lucide="send" style="width: 14px; height: 14px;"></i>
              <span>Submit Request</span>
            </button>
          `,
          onClose: () => {},
        });

        const typeSel = document.getElementById('al-type');
        const startIn = document.getElementById('al-start');
        const endIn = document.getElementById('al-end');
        const durEl = document.getElementById('al-duration');
        const certGroup = document.getElementById('al-cert-group');
        const errEl = document.getElementById('al-error');

        const todayStr = new Date().toISOString().slice(0, 10);
        startIn.min = todayStr;
        endIn.min = todayStr;

        const syncCertVisibility = () => {
          certGroup.style.display = typeSel.value === 'SICK' ? 'block' : 'none';
        };
        typeSel.addEventListener('change', syncCertVisibility);
        syncCertVisibility();

        const updateDuration = () => {
          if (!startIn.value || !endIn.value) {
            durEl.textContent = 'Select dates to calculate…';
            return;
          }
          const s = new Date(startIn.value);
          const e = new Date(endIn.value);
          const days = Math.round((e - s) / 86400000) + 1;
          durEl.textContent = days > 0
            ? `${days} day${days > 1 ? 's' : ''}`
            : 'End date must be on or after start date.';
        };
        startIn.addEventListener('change', updateDuration);
        endIn.addEventListener('change', updateDuration);

        const showErr = (msg) => { errEl.textContent = msg; errEl.style.display = 'block'; };
        const clearErr = () => { errEl.style.display = 'none'; };

        document.getElementById('al-cancel').addEventListener('click', closeModal);

        document.getElementById('al-submit').addEventListener('click', async (e) => {
          const btn = e.currentTarget;
          clearErr();

          const leaveType = typeSel.value;
          const startDate = startIn.value;
          const endDate = endIn.value;
          const remarks = document.getElementById('al-remarks').value.trim();
          const fileInput = document.getElementById('al-file');
          const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;

          if (!startDate || !endDate) { showErr('Start and end dates are required.'); return; }
          if (new Date(endDate) < new Date(startDate)) { showErr('End date cannot be before start date.'); return; }
          if (leaveType === 'SICK' && !file) { showErr('Sick Leave requires a medical certificate.'); return; }

          const fd = new FormData();
          fd.append('leaveType', leaveType);
          fd.append('startDate', startDate);
          fd.append('endDate', endDate);
          fd.append('remarks', remarks);
          if (file) fd.append('attachment', file);

          btn.disabled = true;
          btn.innerHTML = '<span>Submitting…</span>';
          try {
            await api.upload('/api/leaves', fd);
            closeModal();
            showToast('Leave request submitted!', 'success');
            // Reconcile with server state — never trust local mutation alone.
            await Promise.all([loadAllocations(), loadHistory()]);
          } catch (err) {
            showErr(err.message || 'Submission failed.');
            btn.disabled = false;
            btn.innerHTML = '<span>Submit Request</span>';
            if (window.lucide) window.lucide.createIcons();
            if (err.status === 401) showToast('Session expired — please log in again.', 'danger');
          }
        });
      };

      document.getElementById('apply-leave-btn')?.addEventListener('click', openApplyModal);

      loadAllocations();
      loadHistory();
    },
  };
}
