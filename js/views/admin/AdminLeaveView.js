// DAYFLOW HRMS — ADMIN LEAVE MANAGEMENT VIEW (/admin/leave)
// Approve / Reject / Comment actions run on mock frontend state only.

import { adminStore, simulateFetch } from '../../core/adminStore.js';
import { renderAdminLayout, initAdminLayoutEvents, rerenderPageContent } from '../../components/admin/AdminLayout.js';
import { StatusBadge } from '../../components/admin/StatusBadge.js';
import { EmptyState } from '../../components/admin/EmptyState.js';
import { openModal, closeModal } from '../../components/Modal.js';
import { showToast } from '../../components/Toast.js';

export function createAdminLeaveView() {
  const ui = {
    loaded: false,
    statusFilter: '' // '' | 'Pending' | 'Approved' | 'Rejected'
  };

  const STATUS_TABS = [
    { id: '', label: 'All' },
    { id: 'Pending', label: 'Pending' },
    { id: 'Approved', label: 'Approved' },
    { id: 'Rejected', label: 'Rejected' }
  ];

  function skeletonHtml() {
    return `
      <div class="skeleton" style="height:44px; margin-bottom:20px;"></div>
      <div class="skeleton" style="height:420px; border-radius:16px;"></div>
    `;
  }

  function statsChipsHtml() {
    const counts = adminStore.getEmployeeLeaveStats();
    return `
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:18px;">
        <span class="badge badge-warning" style="font-size:13px; padding:6px 14px;">${counts.Pending} Pending</span>
        <span class="badge badge-success" style="font-size:13px; padding:6px 14px;">${counts.Approved} Approved</span>
        <span class="badge badge-danger" style="font-size:13px; padding:6px 14px;">${counts.Rejected} Rejected</span>
      </div>
    `;
  }

  function filteredLeaves() {
    return adminStore.getLeaves(ui.statusFilter);
  }

  function tableHtml(leaves) {
    if (!leaves.length) {
      return EmptyState({
        icon: 'calendar-check',
        title: ui.statusFilter ? `No ${ui.statusFilter.toLowerCase()} requests` : 'No leave requests yet',
        desc: 'Leave applications submitted by employees will appear here.'
      });
    }

    return `
      <div class="table-container">
        <div class="table-scroll table-min-880">
          <table class="data-table">
            <thead>
              <tr>
                <th>Request</th>
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
              ${leaves.map(req => {
                const emp = adminStore.getEmployeeById(req.employeeId);
                return `
                  <tr class="row-clickable" data-leave-id="${req.id}">
                    <td><span class="cell-strong">${req.id}</span><br /><span style="font-size:11px;color:var(--text-tertiary);">Applied ${req.appliedOn}</span></td>
                    <td>${EmployeeCellInline(emp)}</td>
                    <td>${req.type}</td>
                    <td>${req.startDate}</td>
                    <td>${req.endDate}</td>
                    <td><span class="cell-strong">${req.days}</span></td>
                    <td style="max-width:200px;">
                      <span class="cell-muted" title="${req.remarks}">${truncate(req.remarks, 42)}</span>
                    </td>
                    <td>
                      ${req.attachment
                        ? `<a class="attachment-link" href="#" onclick="return false;" title="${req.attachment.name}">
                             <i data-lucide="paperclip" style="width:13px;height:13px;"></i> File
                           </a>`
                        : '<span class="cell-muted">—</span>'}
                    </td>
                    <td>${StatusBadge(req.status)}</td>
                    <td style="text-align:right;">
                      <div class="action-cell" style="justify-content:flex-end;">
                        ${req.status === 'Pending' ? `
                          <button class="btn btn-success btn-xs" data-leave-approve="${req.id}" title="Approve">
                            <i data-lucide="check" style="width:12px;height:12px;"></i>
                          </button>
                          <button class="btn btn-danger btn-xs" data-leave-reject="${req.id}" title="Reject">
                            <i data-lucide="x" style="width:12px;height:12px;"></i>
                          </button>
                        ` : ''}
                        <button class="btn btn-secondary btn-xs" data-leave-view="${req.id}">
                          <i data-lucide="eye" style="width:13px;height:13px;"></i> View
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function EmployeeCellInline(emp) {
    if (!emp) return '<span class="cell-muted">Unknown</span>';
    return `
      <div class="employee-cell">
        <span class="av-circle av-sm" style="${adminStore.avatarStyle(Number(emp.id.slice(-2)) || 0)}">${emp.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
        <span style="min-width:0;">
          <span class="cell-strong" style="display:block;">${emp.name}</span>
          <span style="display:block; font-size:12px; color:var(--text-tertiary);">${emp.department}</span>
        </span>
      </div>
    `;
  }

  const truncate = (text = '', max = 40) => text.length > max ? text.slice(0, max) + '…' : text;

  function contentHtml() {
    const leaves = filteredLeaves();
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
        <div>
          <h2 style="font-size:22px; font-weight:700; letter-spacing:-0.4px;">Leave Management</h2>
          <p style="color:var(--text-secondary); font-size:13px; margin-top:2px;">Review and action employee leave requests.</p>
        </div>
      </div>

      ${statsChipsHtml()}

      <div class="tab-container">
        ${STATUS_TABS.map(t => `
          <button class="tab-btn ${ui.statusFilter === t.id ? 'active' : ''}" data-status-tab="${t.id}">
            ${t.label}${t.id === 'Pending' && adminStore.getEmployeeLeaveStats().Pending ? ` (${adminStore.getEmployeeLeaveStats().Pending})` : ''}
          </button>
        `).join('')}
      </div>

      ${tableHtml(leaves)}
    `;
  }

  // ------------------------------------------------------------- DETAILS MODAL

  function openDetailsModal(requestId) {
    const req = adminStore.getLeaveById(requestId);
    if (!req) return;
    const emp = adminStore.getEmployeeById(req.employeeId);

    const commentsHtml = (req.comments || []).map(c => `
      <div>
        <div class="comment-bubble"><strong>${c.author}:</strong> ${c.text}</div>
        <div class="comment-meta">${c.time}</div>
      </div>
    `).join('') || '<p style="font-size:13px; color:var(--text-tertiary);">No comments yet.</p>';

    const detailLine = (label, value) => `
      <div style="display:flex; justify-content:space-between; gap:12px; padding:9px 0; border-bottom:1px dashed var(--border-light); font-size:14px;">
        <span style="color:var(--text-secondary);">${label}</span>
        <span class="cell-strong" style="text-align:right;">${value}</span>
      </div>
    `;

    openModal({
      title: `Leave Request · ${req.id}`,
      bodyHtml: `
        <!-- Employee strip -->
        <div style="display:flex; align-items:center; gap:12px; padding:12px; background-color:var(--primary-surface); border-radius:var(--radius-md); margin-bottom:18px;">
          <div class="av-circle av-md" style="${adminStore.avatarStyle(Number(emp?.id.slice(-2)) || 0)}">${emp ? emp.name.split(' ').map(w => w[0]).slice(0, 2).join('') : '?'}</div>
          <div style="flex:1;">
            <div class="cell-strong">${emp ? emp.name : 'Unknown'}</div>
            <div style="font-size:12px; color:var(--text-secondary);">${emp ? `${emp.department} · ${emp.position}` : ''}</div>
          </div>
          ${StatusBadge(req.status)}
        </div>

        ${detailLine('Leave Type', req.type)}
        ${detailLine('Start Date', req.startDate)}
        ${detailLine('End Date', req.endDate)}
        ${detailLine('Number of Days', `${req.days}`)}
        ${detailLine('Applied On', req.appliedOn)}
        ${detailLine('Attachment', req.attachment
          ? `<span class="attachment-link"><i data-lucide="paperclip" style="width:13px;height:13px;"></i> ${req.attachment.name} (${req.attachment.size})</span>`
          : '—')}

        <div style="margin-top:16px;">
          <div class="info-item-label">Remarks</div>
          <p style="font-size:14px; line-height:1.55; margin-top:4px;">${req.remarks}</p>
        </div>

        ${req.decidedBy ? `
          <div class="comment-bubble" style="margin-top:14px; background-color:${req.status === 'Approved' ? 'var(--success-bg)' : 'var(--danger-bg)'};">
            <strong>${req.decidedBy}</strong> ${req.status.toLowerCase()} this request on ${req.decidedOn}.
          </div>` : ''}

        <div style="margin-top:20px;">
          <div class="info-item-label">Comments (${(req.comments || []).length})</div>
          <div style="display:flex; flex-direction:column; gap:10px; margin-top:8px;">${commentsHtml}</div>
        </div>

        <div class="form-group" style="margin-top:18px;">
          <label class="form-label" for="leave-comment-input">Add a comment</label>
          <textarea id="leave-comment-input" class="form-textarea" rows="2" placeholder="Write a note for the record..."></textarea>
        </div>
      `,
      footerHtml: `
        <button class="btn btn-secondary btn-sm" id="leave-comment-btn">
          <i data-lucide="message-square" style="width:14px;height:14px;"></i> Add Comment
        </button>
        ${req.status === 'Pending' ? `
          <span style="flex:1;"></span>
          <button class="btn btn-danger" id="leave-reject-btn">
            <i data-lucide="x" style="width:15px;height:15px;"></i> Reject
          </button>
          <button class="btn btn-success" id="leave-approve-btn">
            <i data-lucide="check" style="width:15px;height:15px;"></i> Approve
          </button>` : `
          <span style="flex:1;"></span>
          <button class="btn btn-primary" id="leave-done-btn">Done</button>`}
      `
    });

    document.getElementById('leave-comment-btn')?.addEventListener('click', () => {
      const input = document.getElementById('leave-comment-input');
      if (!input.value.trim()) {
        showToast('Comment cannot be empty.', 'danger');
        return;
      }
      adminStore.addLeaveComment(req.id, input.value);
      showToast('Comment added to request.', 'success');
      openDetailsModal(req.id); // re-render modal with new comment
    });

    document.getElementById('leave-done-btn')?.addEventListener('click', closeModal);

    const approveBtn = document.getElementById('leave-approve-btn');
    if (approveBtn) {
      approveBtn.addEventListener('click', () => {
        const comment = document.getElementById('leave-comment-input').value;
        adminStore.setLeaveDecision(req.id, 'Approved', comment);
        closeModal();
        showToast(`Request ${req.id} approved.`, 'success');
        rerenderPageContent(view);
      });
    }

    const rejectBtn = document.getElementById('leave-reject-btn');
    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => {
        const comment = document.getElementById('leave-comment-input').value;
        if (!comment.trim()) {
          showToast('Please add a rejection reason as a comment.', 'danger');
          return;
        }
        adminStore.setLeaveDecision(req.id, 'Rejected', comment);
        closeModal();
        showToast(`Request ${req.id} rejected.`, 'danger');
        rerenderPageContent(view);
      });
    }
  }

  function decide(requestId, decision) {
    const defaults = decision === 'Rejected' ? 'Rejected via quick action.' : '';
    const req = adminStore.setLeaveDecision(requestId, decision, defaults);
    if (req) {
      showToast(`Request ${requestId} ${decision.toLowerCase()} successfully.`, decision === 'Approved' ? 'success' : 'danger');
      rerenderPageContent(view);
    }
  }

  // ---------------------------------------------------------------- BINDINGS

  const view = {
    render() {
      return renderAdminLayout('/admin/leave', 'Leave Management', ui.loaded ? contentHtml() : skeletonHtml());
    },

    afterRender() {
      initAdminLayoutEvents();
      if (!ui.loaded) {
        simulateFetch(500).then(() => {
          ui.loaded = true;
          rerenderPageContent(view);
        });
      } else {
        view.bindEvents();
      }
    },

    bindEvents() {
      document.querySelectorAll('[data-status-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          ui.statusFilter = btn.dataset.statusTab;
          rerenderPageContent(view);
        });
      });

      document.querySelectorAll('[data-leave-view]').forEach(btn =>
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openDetailsModal(btn.dataset.leaveView);
        }));

      document.querySelectorAll('[data-leave-approve]').forEach(btn =>
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          decide(btn.dataset.leaveApprove, 'Approved');
        }));

      document.querySelectorAll('[data-leave-reject]').forEach(btn =>
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          decide(btn.dataset.leaveReject, 'Rejected');
        }));

      document.querySelectorAll('tr[data-leave-id]').forEach(row =>
        row.addEventListener('click', () => openDetailsModal(row.dataset.leaveId)));
    },

    unmount() { /* no subscriptions */ }
  };

  return view;
}
