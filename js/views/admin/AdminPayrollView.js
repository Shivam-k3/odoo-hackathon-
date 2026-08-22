// DAYFLOW HRMS — ADMIN PAYROLL VIEW (/admin/payroll)
// The backend payroll engine is the single source of truth:
//   GET  /api/admin/payroll                       (org payslip totals)
//   GET  /api/admin/payroll/:employeeId           (structure + engine components)
//   POST | PUT /api/admin/payroll/:employeeId     (create/update authorized wage)
//   POST /api/admin/payroll/:employeeId/generate-payslip
// No salary formulas exist in this file — every figure is rendered verbatim
// from server responses.

import { adminStore, formatINR } from '../../core/adminStore.js';
import { esc, currentMonthKey } from '../../core/api.js';
import { renderAdminLayout, initAdminLayoutEvents, rerenderPageContent } from '../../components/admin/AdminLayout.js';
import { AttendanceTable } from '../../components/admin/AttendanceTable.js';
import { EmptyState } from '../../components/admin/EmptyState.js';
import { openModal, closeModal } from '../../components/Modal.js';
import { showToast } from '../../components/Toast.js';

export function createAdminPayrollView() {
  const ui = {
    loaded: false,
    error: null,
    employees: [],
    overview: null,
    selectedId: '',
    detail: null,          // { salaryStructure, components, payslips }
    detailError: null,
    detailLoading: false,
    month: currentMonthKey(),
    generating: false,
  };

  // ------------------------------------------------------------- SKELETONS

  function skeletonHtml() {
    return `
      <div class="skeleton" style="height:110px; border-radius:16px; margin-bottom:20px;"></div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:24px;">
        <div class="skeleton" style="height:420px; border-radius:16px;"></div>
        <div class="skeleton" style="height:420px; border-radius:16px;"></div>
      </div>
    `;
  }

  function errorHtml() {
    return `
      <div style="padding:40px; text-align:center;">
        <i data-lucide="alert-triangle" style="width:36px; height:36px; color:var(--danger);"></i>
        <div style="font-weight:600; margin-top:12px;">Could not load payroll</div>
        <div style="font-size:13px; color:var(--text-tertiary); margin-top:4px;">${esc(ui.error || 'Unknown error')}</div>
        <button class="btn btn-primary btn-sm" id="pay-retry" style="margin-top:16px;">Retry</button>
      </div>
    `;
  }

  const salaryLine = (label, amount, cls = '', sub = '') => `
    <div class="salary-line ${cls}">
      <span class="salary-label">${esc(label)}${sub ? ` <em style="font-style:normal; font-size:11px; color:var(--text-tertiary);">(${esc(sub)})</em>` : ''}</span>
      <span class="salary-amount">${amount}</span>
    </div>
  `;

  // ------------------------------------------------------------------ RENDER

  function controlsHtml() {
    const ov = ui.overview;
    return `
      <div class="card" style="margin-bottom:24px;">
        <div style="display:flex; align-items:flex-end; gap:18px; flex-wrap:wrap;">
          <div class="filter-group grow-lg" style="max-width:300px;">
            <label class="filter-label" for="pay-employee-select">Select Employee</label>
            <select id="pay-employee-select" class="form-select">
              ${ui.employees.map(e => `<option value="${esc(e.id)}" ${e.id === ui.selectedId ? 'selected' : ''}>${esc(e.name)} (${esc(e.loginId || '')})</option>`).join('')}
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label" for="pay-month-input">Pay Period</label>
            <input type="month" id="pay-month-input" class="form-input" value="${esc(ui.month)}" />
          </div>

          <button class="btn btn-primary" id="pay-generate-btn" ${ui.generating || !ui.selectedId ? 'disabled' : ''}>
            ${ui.generating
              ? '<i data-lucide="loader-2" style="width:15px;height:15px; animation: spin 1s linear infinite;"></i> Generating…'
              : '<i data-lucide="receipt-text" style="width:15px;height:15px;"></i> Generate Payslip'}
          </button>

          <button class="btn btn-secondary" id="pay-edit-salary-btn">
            <i data-lucide="pencil" style="width:15px;height:15px;"></i> ${ui.detail ? 'Edit Salary' : 'Set Up Salary'}
          </button>

          ${ov ? `
          <div style="margin-left:auto; text-align:right;">
            <span class="badge badge-success" style="font-size:13px; padding:6px 14px;">${ov.count} payslip(s)</span>
            <div style="font-size:12px; color:var(--text-tertiary); margin-top:4px;">
              Org gross ${formatINR(ov.totals?.totalGross ?? 0)} · Net ${formatINR(ov.totals?.totalNet ?? 0)}
            </div>
          </div>` : ''}
        </div>
      </div>
    `;
  }

  function detailHtml() {
    if (!ui.selectedId) {
      return '<div class="card">No employees available for payroll.</div>';
    }
    if (ui.detailLoading) {
      return `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:24px;">
          <div class="skeleton" style="height:420px; border-radius:16px;"></div>
          <div class="skeleton" style="height:420px; border-radius:16px;"></div>
        </div>`;
    }
    if (ui.detailError) {
      const isMissing = /no salary structure/i.test(ui.detailError || '');
      return `
        <div class="card" style="padding:8px;">
          ${EmptyState({
            icon: isMissing ? 'wallet' : 'alert-triangle',
            title: isMissing ? 'No salary structure yet' : 'Could not load payroll details',
            desc: esc(isMissing
              ? 'Set a monthly wage for this employee — every statutory component will be derived automatically.'
              : ui.detailError),
          })}
          <div style="display:flex; justify-content:center; padding-bottom:18px;">
            <button class="btn btn-primary btn-sm" id="pay-setup-btn">
              <i data-lucide="${isMissing ? 'plus' : 'rotate-cw'}" style="width:14px;height:14px;"></i>
              ${isMissing ? 'Set Monthly Wage' : 'Retry'}
            </button>
          </div>
        </div>`;
    }

    const d = ui.detail;
    if (!d) return '';
    const c = d.components;
    const structure = d.salaryStructure;
    const netPct = c.grossEarnings ? Math.round((c.netPay / c.grossEarnings) * 100) : 0;

    const payslipsTable = d.payslips.length ? AttendanceTable([
      { label: 'Period', render: p => `<span class="cell-strong">${esc(`${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`)}</span>` },
      { label: 'Working Days', key: 'workingDays' },
      { label: 'Present', key: 'presentDays' },
      { label: 'Paid Leave', key: 'paidLeaveDays' },
      { label: 'Unpaid', key: 'unpaidLeaveDays' },
      { label: 'Payable Days', render: p => `<span class="cell-strong">${esc(String(p.payableDays))}</span>` },
      { label: 'Gross', render: p => formatINR(p.grossEarnings) },
      { label: 'Net Pay', render: p => `<span class="cell-strong" style="color:var(--success);">${formatINR(p.netPay)}</span>` },
      { label: 'Generated', render: p => esc(String(p.generatedAt || '').slice(0, 10)) },
    ], d.payslips, { minWidthClass: 'table-min-960', emptyMessage: 'No payslips generated.' })
      : EmptyState({
        icon: 'file-text',
        title: 'No payslips yet',
        desc: 'Pick a pay period above and click Generate Payslip.',
      });

    return `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:24px; margin-bottom:24px;">
        <!-- Earnings -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="plus-circle" style="width:18px;height:18px;color:var(--success);"></i><span>Earnings</span></h3>
            <span style="font-size:12px; color:var(--text-tertiary);">Effective ${esc(String(structure.effectiveFrom || '').slice(0, 10))}</span>
          </div>
          ${salaryLine('Monthly Wage (CTC)', formatINR(c.monthlyWage))}
          ${salaryLine('Basic Salary', formatINR(c.basicSalary))}
          ${salaryLine('HRA', formatINR(c.hra))}
          ${salaryLine('Standard Allowance', formatINR(c.standardAllowance))}
          ${salaryLine('Performance Bonus', formatINR(c.performanceBonus))}
          ${salaryLine('Leave Travel Allowance', formatINR(c.lta))}
          ${salaryLine('Fixed Allowance', formatINR(c.fixedAllowance))}
          ${salaryLine('Gross Earnings', formatINR(c.grossEarnings), 'earning')}

          <p style="font-size:12px; color:var(--text-tertiary); margin-top:14px;">
            <i data-lucide="shield-check" style="width:13px;height:13px; vertical-align:-2px;"></i>
            Computed by the Dayflow payroll engine on the server.
          </p>
        </div>

        <div style="display:flex; flex-direction:column; gap:24px;">
          <!-- Deductions -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i data-lucide="minus-circle" style="width:18px;height:18px;color:var(--danger);"></i><span>Deductions & Contributions</span></h3>
            </div>
            ${salaryLine('Employee PF', `- ${formatINR(c.employeePf)}`, 'deduction')}
            ${salaryLine('Employer PF', formatINR(c.employerPf), '', 'employer cost, not deducted')}
            ${salaryLine('Professional Tax', `- ${formatINR(c.professionalTax)}`, 'deduction')}
          </div>

          <!-- Net pay highlight -->
          <div class="card" style="background-color:var(--primary-surface); border-color:#d0e1fd;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap;">
              <div>
                <div style="font-size:13px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.4px;">Net Pay</div>
                <div class="stat-value" style="color:var(--primary);">${formatINR(c.netPay)}</div>
                <div style="font-size:12px; color:var(--text-tertiary);">${d.payslips.length} payslip(s) generated</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:26px;">🧾</div>
                <div style="font-size:12px; color:var(--text-tertiary);">${netPct}% retained</div>
              </div>
            </div>
            <div class="progress-track" style="margin-top:16px; background-color:#dbe7fb;">
              <div class="progress-fill" style="width:${netPct}%; background-color:var(--primary);"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="history" style="width:18px;height:18px;color:var(--primary);"></i><span>Payslip History</span></h3>
        </div>
        ${payslipsTable}
      </div>
    `;
  }

  function contentHtml() {
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
        <div>
          <h2 style="font-size:22px; font-weight:700; letter-spacing:-0.4px;">Payroll</h2>
          <p style="color:var(--text-secondary); font-size:13px; margin-top:2px;">Salary structures, payslip generation and payouts — powered by the backend engine.</p>
        </div>
      </div>
      ${controlsHtml()}
      ${detailHtml()}
    `;
  }

  // -------------------------------------------------------------- DATA LOADER

  async function loadInitial() {
    try {
      ui.error = null;
      const [empPage, overview] = await Promise.all([
        adminStore.queryEmployees({ page: 1, limit: 300 }),
        adminStore.getPayrollOverview(),
      ]);
      ui.employees = empPage.employees || [];
      ui.overview = overview;
      if (!ui.selectedId && ui.employees.length) ui.selectedId = ui.employees[0].id;
      ui.loaded = true;
    } catch (err) {
      ui.error = err.message || 'Failed to load payroll.';
    }
    rerenderPageContent(view);
    if (ui.loaded && ui.selectedId) loadDetail();
  }

  async function loadDetail() {
    if (!ui.selectedId) return;
    ui.detailLoading = true;
    ui.detailError = null;
    ui.detail = null;
    rerenderPageContent(view);
    try {
      ui.detail = await adminStore.getEmployeePayroll(ui.selectedId);
    } catch (err) {
      ui.detailError = err.message || 'Could not load payroll details.';
    }
    ui.detailLoading = false;
    rerenderPageContent(view);
  }

  // ------------------------------------------------------------------ MODAL

  function openWageModal() {
    const emp = ui.employees.find(e => e.id === ui.selectedId);
    const existing = ui.detail?.salaryStructure;
    openModal({
      title: existing ? 'Edit Salary' : 'Set Up Salary',
      bodyHtml: `
        <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
          Update the monthly wage for <strong>${esc(emp ? emp.name : 'this employee')}</strong>.
          All statutory components (Basic, HRA, PF, PT…) are derived by the backend payroll engine —
          this screen never computes them itself.
        </p>
        <div class="form-group">
          <label class="form-label required">Monthly Wage (₹)</label>
          <input type="number" id="modal-wage-input" class="form-input" min="1" step="0.01"
                 value="${existing ? esc(String(existing.monthlyWage)) : ''}" placeholder="e.g. 50000" />
        </div>
      `,
      footerHtml: `
        <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="modal-wage-save">
          <i data-lucide="save" style="width:14px;height:14px;"></i> ${existing ? 'Save Changes' : 'Create Structure'}
        </button>`,
    });

    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
    document.getElementById('modal-wage-save').addEventListener('click', async () => {
      const value = Number(document.getElementById('modal-wage-input').value);
      if (!Number.isFinite(value) || value <= 0) {
        showToast('Enter a valid positive monthly wage.', 'danger');
        return;
      }
      try {
        // POST creates, PUT updates — recover transparently from a stale UI.
        if (existing) await adminStore.updateWage(ui.selectedId, value);
        else await adminStore.saveWage(ui.selectedId, value);
        closeModal();
        showToast(`Salary ${existing ? 'updated' : 'created'} and saved to database.`, 'success');
        await loadDetail();
      } catch (err) {
        if (String(err.message || '').toLowerCase().includes('already exists')) {
          try {
            await adminStore.updateWage(ui.selectedId, value);
            closeModal();
            showToast('Salary updated and saved to database.', 'success');
            await loadDetail();
            return;
          } catch (retryErr) {
            showToast(retryErr.message || 'Update failed.', 'danger');
            return;
          }
        }
        showToast(err.message || 'Save failed.', 'danger');
      }
    });
  }

  async function generatePayslip() {
    if (!ui.detail) {
      showToast('Set up a salary structure before generating payslips.', 'danger');
      return;
    }
    ui.generating = true;
    rerenderPageContent(view);
    try {
      const res = await adminStore.generatePayslip(ui.selectedId, ui.month);
      ui.generating = false;
      const p = res.payslip || {};
      const b = res.attendanceBreakdown || {};
      openModal({
        title: `Payslip · ${esc(String(p.periodYear || ''))}-${esc(String(p.periodMonth || '').padStart(2, '0'))}`,
        bodyHtml: `
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:14px;">
            Payslip stored in PostgreSQL. Employee notified. Attendance breakdown straight from the engine:
          </p>
          <div style="display:grid; gap:6px; font-size:14px;">
            <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-secondary);">Working days</span><strong>${esc(String(b.workingDays ?? '-'))}</strong></div>
            <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-secondary);">Present days</span><strong>${esc(String(b.presentDays ?? '-'))}</strong></div>
            <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-secondary);">Paid leave days</span><strong>${esc(String(b.paidLeaveDays ?? '-'))}</strong></div>
            <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-secondary);">Unpaid leave days</span><strong>${esc(String(b.unpaidLeaveDays ?? '-'))}</strong></div>
            <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-secondary);">Absent days</span><strong>${esc(String(b.absentDays ?? '-'))}</strong></div>
            <div style="display:flex; justify-content:space-between; border-top:1px dashed var(--border-light); padding-top:8px; margin-top:4px;"><span style="color:var(--text-secondary);">Payable days</span><strong>${esc(String(b.payableDays ?? '-'))}</strong></div>
            <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-secondary);">Net pay</span><strong style="color:var(--success);">${formatINR(p.netPay)}</strong></div>
          </div>
        `,
        footerHtml: `<span style="flex:1;"></span><button class="btn btn-primary" id="modal-done-btn">Done</button>`,
      });
      document.getElementById('modal-done-btn')?.addEventListener('click', closeModal);
      showToast('Payslip generated and saved.', 'success');
      await Promise.all([loadDetail(), refreshOverview()]);
    } catch (err) {
      ui.generating = false;
      rerenderPageContent(view);
      showToast(err.message || 'Payslip generation failed.', 'danger');
    }
  }

  async function refreshOverview() {
    try {
      ui.overview = await adminStore.getPayrollOverview();
    } catch (_) { /* non-fatal */ }
  }

  // -------------------------------------------------------------------- VIEW

  const view = {
    render() {
      if (!ui.loaded && !ui.error) return renderAdminLayout('/admin/payroll', 'Payroll', skeletonHtml());
      if (ui.error) return renderAdminLayout('/admin/payroll', 'Payroll', errorHtml());
      return renderAdminLayout('/admin/payroll', 'Payroll', contentHtml());
    },

    afterRender() {
      initAdminLayoutEvents();
      document.getElementById('pay-retry')?.addEventListener('click', () => { rerenderPageContent(view); loadInitial(); });
      if (!ui.loaded && !ui.error) {
        loadInitial();
        return;
      }
      view.bindEvents();
    },

    bindEvents() {
      document.getElementById('pay-employee-select')?.addEventListener('change', e => {
        ui.selectedId = e.target.value;
        loadDetail();
      });

      document.getElementById('pay-month-input')?.addEventListener('change', e => {
        if (e.target.value) ui.month = e.target.value;
      });

      document.getElementById('pay-edit-salary-btn')?.addEventListener('click', () => {
        if (!ui.selectedId) { showToast('Select an employee first.', 'danger'); return; }
        openWageModal();
      });

      document.getElementById('pay-setup-btn')?.addEventListener('click', () => {
        openWageModal();
      });

      document.getElementById('pay-generate-btn')?.addEventListener('click', generatePayslip);
    },

    unmount() { /* no subscriptions */ }
  };

  return view;
}
