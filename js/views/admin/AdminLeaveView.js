// DAYFLOW HRMS — ADMIN LEAVE MANAGEMENT VIEW (/admin/leave)
// Live backend endpoints only:
//   GET  /api/admin/leaves?status=&leaveType=&department=&page=&limit=
//   GET  /api/admin/leaves/:id
//   POST /api/admin/leaves/:id/approve | /reject   (PostgreSQL mutation + employee notification)

import { adminStore } from '../../core/adminStore.js';
import { esc } from '../../core/api.js';
import { renderAdminLayout, initAdminLayoutEvents, rerenderPageContent } from '../../components/admin/AdminLayout.js';
import { StatusBadge } from '../../components/admin/StatusBadge.js';
import { EmptyState } from '../../components/admin/EmptyState.js';
import { openModal, closeModal } from '../../components/Modal.js';
import { showToast } from '../../components/Toast.js';

const TYPE_LABELS = {
  PTO: 'Paid Time Off',
  SICK: 'Sick Leave',
  UNPAID: 'Unpaid Leave',
};

const STATUS_TABS = [
  { id: '', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REJECTED', label: 'Rejected' },
];

export function createAdminLeaveView() {
  const ui = {
    loaded: false,
    error: null,
    records: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
    statusFilter: '',
    leaveType: '',
    department: '',
    search: '',
    counts: { PENDING: 0, APPROVED: 0, REJECTED: 0 },
  };

  // ------------------------------------------------------------- DATA HELPERS

  const empName = (r) => {
    const e = r.employee || {};
    return `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown';
  };
  const dayOf = (iso) => String(iso || '').slice(0, 10);
  const truncate = (text, max = 42) =>
    String(text || '').length > max ? `${String(text).slice(0, max)}…` : String(text || '');

  function matchSearch(r) {
    const q = ui.search.trim().toLowerCase();
    if (!q) return true;
    const e = r.employee || {};
    return `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase().includes(q)
      || (e.loginId || '').toLowerCase().includes(q)
      || (e.department || '').toLowerCase().includes(q);
  }

  function visibleRecords() {
    return (ui.records || []).filter(matchSearch);
  }

  // ------------------------------------------------------------- SKELETONS

  function skeletonHtml() {
    return `
      <div class="skeleton" style="height:44px; margin-bottom:20px;"></div>
      <div class="skeleton" style="height:420px; border-radius:16px;"></div>
    `;
  }

  function errorHtml() {
    return `
      <div style="padding:40px; text-align:center;">
        <i data-lucide="alert-triangle" style="width:36px; height:36px; color:var(--danger);"></i>
        <div style="font-weight:600; margin-top:12px;">Could not load leave requests</div>
        <div style="font-size:13px; color:var(--text-tertiary); margin-top:4px;">${esc(ui.error || 'Unknown error')}</div>
        <button class="btn btn-primary btn-sm" id="lv-retry" style="margin-top:16px;">Retry</button>
      </div>
    `;
  }

  // ------------------------------------------------------------------ RENDER

  function statsChipsHtml() {
    const c = ui.counts;
    return `
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:18px;">
        <span class="badge badge-warning" style="font-size:13px; padding:6px 14px;">${c.PENDING} Pending</span>
        <span class="badge badge-success" style="font-size:13px; padding:6px 14px;">${c.APPROVED} Approved</span>
        <span class="badge badge-danger" style="font-size:13px; padding:6px 14px;">${c.REJECTED} Rejected</span>
      </div>
    `;
  }

  function filterBarHtml() {
    const deptOptions = ['Engineering', 'Human Resources', 'Finance', 'Marketing', 'Sales', 'Operations', 'Design', 'Product', 'General'];
    return `
      <div class="filter-bar" style="margin-bottom:16px;">
        <div class="filter-group grow-lg">
          <label class="filter-label" for="lv-filter-search">Search</label>
          <input type="text" id="lv-filter-search" class="form-input" placeholder="Name or ID..." value="${esc(ui.search)}" />
        </div>
        <div class="filter-group">
          <label class="filter-label" for="lv-filter-type">Type</label>
          <select id="lv-filter-type" class="form-select">
            <option value="">All Types</option>
            ${Object.entries(TYPE_LABELS).map(([v, l]) => `<option value="${v}" ${ui.leaveType === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label" for="lv-filter-dept">Department</label>
          <select id="lv-filter-dept" class="form-select">
            <option value="">All Departments</option>
            ${deptOptions.map(d => `<option value="${esc(d)}" ${ui.department === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-actions">
          <button class="btn btn-secondary btn-sm" id="lv-filter-clear">
            <i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i>
            <span>Clear</span>
          </button>
        </div>
      </div>
    `;
  }

  function attachmentCell(url) {
    if (!url) return '<span class="cell-muted">—</span>';
    const tail = String(url).split('/').pop() || 'File';
    return `
      <a class="attachment-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="${esc(tail)}" onclick="event.stopPropagation();">
        <i data-lucide="paperclip" style="width:13px;height:13px;"></i> File
      </a>
    `;
  }

  function tableHtml(rows) {
    if (!rows.length) {
      return EmptyState({
        icon: 'calendar-check',
        title: ui.statusFilter ? `No ${ui.statusFilter.toLowerCase()} requests` : 'No leave requests found',
        desc: ui.search || ui.leaveType || ui.department
          ? 'Try adjusting or clearing the filters.'
          : 'Leave applications submitted by employees will appear here.',
      });
    }

    return `
      <div class="table-container">
        <div class="table-scroll table-min-960">
          <table class="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Days</th>
                <th>Remarks</th>
                <th>Attachment</th>
                <th>Status</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(req => `
                <tr class="row-clickable" data-leave-id="${esc(req.id)}">
                  <td>
                    <div class="employee-cell">
                      <span class="av-circle av-sm">${esc(empName(req).split(' ').map(w => w[0]).slice(0, 2).join(''))}</span>
                      <span style="min-width:0;">
                        <span class="cell-strong" style="display:block; font-size:14px;">${esc(empName(req))}</span>
                        <span style="display:block; font-size:12px; color:var(--text-tertiary);">${esc(req.employee?.loginId || req.employee?.department || '')}</span>
                      </span>
                    </div>
                  </td>
                  <td>${esc(TYPE_LABELS[req.leaveType] || req.leaveType)}</td>
                  <td>${esc(dayOf(req.startDate))}</td>
                  <td>${esc(dayOf(req.endDate))}</td>
                  <td><span class="cell-strong">${esc(String(req.requestedDays ?? '-'))}</span></td>
                  <td style="max-width:200px;">
                    <span class="cell-muted" title="${esc(req.remarks || '')}">${esc(truncate(req.remarks)) || '—'}</span>
                  </td>
                  <td>${attachmentCell(req.attachment)}</td>
                  <td>${StatusBadge(req.status)}</td>
                  <td style="text-align:right;">
                    <div class="action-cell" style="justify-content:flex-end;">
                      ${req.status === 'PENDING' ? `
                        <button class="btn btn-success btn-xs" data-leave-approve="${esc(req.id)}" title="Approve">
                          <i data-lucide="check" style="width:12px;height:12px;"></i>
                        </button>
                        <button class="btn btn-danger btn-xs" data-leave-reject="${esc(req.id)}" title="Reject (add reason)">
                          <i data-lucide="x" style="width:12px;height:12px;"></i>
                        </button>
                      ` : ''}
                      <button class="btn btn-secondary btn-xs" data-leave-view="${esc(req.id)}">
                        <i data-lucide="eye" style="width:13px;height:13px;"></i> View
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      ${paginationHtml()}
    `;
  }

  function paginationHtml() {
    if (ui.totalPages <= 1) {
      return `<p style="font-size:12px; color:var(--text-tertiary); margin-top:12px;">${ui.total} request(s) total.</p>`;
    }
    return `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-top:16px;">
        <span style="font-size:12px; color:var(--text-tertiary);">
          Page ${ui.page} of ${ui.totalPages} · ${ui.total} request(s) total
        </span>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-secondary btn-sm" id="lv-prev-page" ${ui.page <= 1 ? 'disabled' : ''}>
            <i data-lucide="chevron-left" style="width:14px;height:14px;"></i> Prev
          </button>
          <button class="btn btn-secondary btn-sm" id="lv-next-page" ${ui.page >= ui.totalPages ? 'disabled' : ''}>
            Next <i data-lucide="chevron-right" style="width:14px;height:14px;"></i>
          </button>
        </div>
      </div>
    `;
  }

  function contentHtml() {
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
        <div>
          <h2 style="font-size:22px; font-weight:700; letter-spacing:-0.4px;">Leave Management</h2>
          <p style="color:var(--text-secondary); font-size:13px; margin-top:2px;">Review and action employee leave requests. Decisions are stored in the database.</p>
        </div>
      </div>

      ${statsChipsHtml()}

      <div class="tab-container">
        ${STATUS_TABS.map(t => `
          <button class="tab-btn ${ui.statusFilter === t.id ? 'active' : ''}" data-status-tab="${t.id}">
            ${t.label}${t.id && ui.counts[t.id] ? ` (${ui.counts[t.id]})` : ''}
          </button>
        `).join('')}
      </div>

      ${filterBarHtml()}

      ${tableHtml(visibleRecords())}
    `;
  }

  // ------------------------------------------------------------ DETAILS MODAL

  async function openDetailsModal(requestId) {
    openModal({
      title: 'Leave Request',
      bodyHtml: `
        <div class="empty-state" style="padding:24px;">
          <div class="empty-icon"><i data-lucide="loader-2" style="width:26px;height:26px;"></i></div>
          <div class="empty-title">Loading request…</div>
        </div>
      `,
    });

    let req;
    try {
      req = await adminStore.getLeaveById(requestId);
    } catch (err) {
      showToast(err.message || 'Could not load request details.', 'danger');
      closeModal();
      return;
    }

    const emp = req.employee || {};
    const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown';
    const detailLine = (label, value) => `
      <div style="display:flex; justify-content:space-between; gap:12px; padding:9px 0; border-bottom:1px dashed var(--border-light); font-size:14px;">
        <span style="color:var(--text-secondary);">${esc(label)}</span>
        <span class="cell-strong" style="text-align:right;">${value}</span>
      </div>
    `;

    openModal({
      title: `Leave Request · ${TYPE_LABELS[req.leaveType] || esc(req.leaveType)}`,
      bodyHtml: `
        <div style="display:flex; align-items:center; gap:12px; padding:12px; background-color:var(--primary-surface); border-radius:var(--radius-md); margin-bottom:18px;">
          <div class="av-circle av-md">${esc(name.split(' ').map(w => w[0]).slice(0, 2).join(''))}</div>
          <div style="flex:1;">
            <div class="cell-strong">${esc(name)}</div>
            <div style="font-size:12px; color:var(--text-secondary);">${esc(emp.department || '-')} · ${esc(emp.designation || '-')} · ${esc(emp.loginId || '')}</div>
          </div>
          ${StatusBadge(req.status)}
        </div>

        ${detailLine('Start Date', esc(dayOf(req.startDate)))}
        ${detailLine('End Date', esc(dayOf(req.endDate)))}
        ${detailLine('Requested Days', esc(String(req.requestedDays ?? '-')))}
        ${detailLine('Applied On', esc(dayOf(req.createdAt)))}
        ${detailLine('Attachment', req.attachment
          ? `<a class="attachment-link" href="${esc(req.attachment)}" target="_blank" rel="noopener noreferrer"><i data-lucide="paperclip" style="width:13px;height:13px;"></i> View document</a>`
          : '—')}
        ${detailLine('Remarks', req.remarks ? `<span style="max-width:280px; display:inline-block;">${esc(req.remarks)}</span>` : '—')}

        ${req.adminComment ? `
          <div class="comment-bubble" style="margin-top:16px;">
            <strong>Admin note:</strong> ${esc(req.adminComment)}
          </div>` : ''}

        ${req.decidedAt ? `
          <p style="font-size:12px; color:var(--text-tertiary); margin-top:10px;">
            <i data-lucide="user-check" style="width:13px;height:13px; vertical-align:-2px;"></i>
            Decided on ${esc(dayOf(req.decidedAt))}${req.decidedBy?.email ? ` by ${esc(req.decidedBy.email)}` : ''}
          </p>` : ''}

        ${req.status === 'PENDING' ? `
        <div class="form-group" style="margin-top:18px;">
          <label class="form-label" for="lv-decision-comment">Decision note (optional)</label>
          <textarea id="lv-decision-comment" class="form-textarea" rows="2" placeholder="Reason shown to the employee in their notification..."></textarea>
        </div>` : ''}
      `,
      footerHtml: req.status === 'PENDING' ? `
        <span style="flex:1;"></span>
        <button class="btn btn-danger" id="lv-reject-btn">
          <i data-lucide="x" style="width:15px;height:15px;"></i> Reject
        </button>
        <button class="btn btn-success" id="lv-approve-btn">
          <i data-lucide="check" style="width:15px;height:15px;"></i> Approve
        </button>` : `
        <span style="flex:1;"></span>
        <button class="btn btn-primary" id="lv-done-btn">Done</button>`,
    });

    document.getElementById('lv-done-btn')?.addEventListener('click', closeModal);

    document.getElementById('lv-approve-btn')?.addEventListener('click', () => {
      decide(req.id, 'APPROVED');
    });
    document.getElementById('lv-reject-btn')?.addEventListener('click', () => {
      const comment = document.getElementById('lv-decision-comment')?.value.trim();
      if (!comment) {
        showToast('Please add a rejection reason first.', 'danger');
        document.getElementById('lv-decision-comment')?.focus();
        return;
      }
      decide(req.id, 'REJECTED', comment);
    });
  }

  // ---------------------------------------------------------------- ACTIONS

  async function decide(requestId, action) {
    try {
      await adminStore.decideLeave(requestId, action);
      closeModal();
      showToast(
        `Request ${action === 'APPROVED' ? 'approved' : 'rejected'} — saved to database and employee notified.`,
        action === 'APPROVED' ? 'success' : 'danger'
      );
      await loadData();
    } catch (err) {
      showToast(err.message || 'Action failed.', 'danger');
    }
  }

  // -------------------------------------------------------------- DATA LOADER

  async function loadData() {
    try {
      ui.error = null;
      const [list, p, a, r] = await Promise.all([
        adminStore.getLeaves({
          status: ui.statusFilter || undefined,
          leaveType: ui.leaveType || undefined,
          department: ui.department || undefined,
          page: ui.page,
          limit: ui.limit,
        }),
        adminStore.getLeaves({ status: 'PENDING', page: 1, limit: 1 }),
        adminStore.getLeaves({ status: 'APPROVED', page: 1, limit: 1 }),
        adminStore.getLeaves({ status: 'REJECTED', page: 1, limit: 1 }),
      ]);
      ui.records = list.records || [];
      ui.total = list.total || 0;
      ui.totalPages = list.totalPages || 1;
      if (ui.page > ui.totalPages) { ui.page = Math.max(1, ui.totalPages); return loadData(); }
      ui.counts = { PENDING: p.total || 0, APPROVED: a.total || 0, REJECTED: r.total || 0 };
      ui.loaded = true;
    } catch (err) {
      ui.error = err.message || 'Failed to load leave requests.';
    }
    rerenderPageContent(view);
  }

  // -------------------------------------------------------------------- VIEW

  const view = {
    render() {
      if (!ui.loaded && !ui.error) return renderAdminLayout('/admin/leave', 'Leave Management', skeletonHtml());
      if (ui.error) return renderAdminLayout('/admin/leave', 'Leave Management', errorHtml());
      return renderAdminLayout('/admin/leave', 'Leave Management', contentHtml());
    },

    afterRender() {
      initAdminLayoutEvents();
      document.getElementById('lv-retry')?.addEventListener('click', () => { rerenderPageContent(view); loadData(); });
      if (!ui.loaded && !ui.error) {
        loadData();
        return;
      }
      view.bindEvents();
    },

    bindEvents() {
      document.querySelectorAll('[data-status-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          ui.statusFilter = btn.dataset.statusTab;
          ui.page = 1;
          loadData();
        });
      });

      const searchInput = document.getElementById('lv-filter-search');
      searchInput?.addEventListener('input', () => {
        ui.search = searchInput.value;
        rerenderPageContent(view);
      });

      document.getElementById('lv-filter-type')?.addEventListener('change', e => {
        ui.leaveType = e.target.value;
        ui.page = 1;
        loadData();
      });

      document.getElementById('lv-filter-dept')?.addEventListener('change', e => {
        ui.department = e.target.value;
        ui.page = 1;
        loadData();
      });

      document.getElementById('lv-filter-clear')?.addEventListener('click', () => {
        Object.assign(ui, { statusFilter: '', leaveType: '', department: '', search: '', page: 1 });
        loadData();
        showToast('Filters cleared.', 'info');
      });

      document.getElementById('lv-prev-page')?.addEventListener('click', () => { ui.page -= 1; loadData(); });
      document.getElementById('lv-next-page')?.addEventListener('click', () => { ui.page += 1; loadData(); });

      document.querySelectorAll('[data-leave-view]').forEach(btn =>
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openDetailsModal(btn.dataset.leaveView);
        }));

      document.querySelectorAll('[data-leave-approve]').forEach(btn =>
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          decide(btn.dataset.leaveApprove, 'APPROVED');
        }));

      document.querySelectorAll('[data-leave-reject]').forEach(btn =>
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openDetailsModal(btn.dataset.leaveReject);
        }));

      document.querySelectorAll('tr[data-leave-id]').forEach(row =>
        row.addEventListener('click', () => openDetailsModal(row.dataset.leaveId)));
    },

    unmount() { /* no subscriptions */ }
  };

  return view;
}
