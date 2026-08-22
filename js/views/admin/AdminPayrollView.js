// DAYFLOW HRMS — ADMIN PAYROLL VIEW (/admin/payroll)
// MOCK PREVIEW ONLY: component figures come from fixed demo ratios.
// No statutory payroll calculations are performed here — the backend will
// supply real computed values once integrated.

import { adminStore, simulateFetch, formatINR } from '../../core/adminStore.js';
import { renderAdminLayout, initAdminLayoutEvents, rerenderPageContent } from '../../components/admin/AdminLayout.js';
import { openModal, closeModal } from '../../components/Modal.js';
import { showToast } from '../../components/Toast.js';
import { StatusBadge } from '../../components/admin/StatusBadge.js';

export function createAdminPayrollView() {
  const ui = {
    loaded: false,
    selectedId: '',
    wageInputValue: null,
    recomputing: false
  };

  function skeletonHtml() {
    return `
      <div class="skeleton" style="height:110px; border-radius:16px; margin-bottom:20px;"></div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:24px;">
        <div class="skeleton" style="height:420px; border-radius:16px;"></div>
        <div class="skeleton" style="height:420px; border-radius:16px;"></div>
      </div>
    `;
  }

  const salaryLine = (label, amount, cls = '', sub = '') => `
    <div class="salary-line ${cls}">
      <span class="salary-label">${label}${sub ? ` <em style="font-style:normal; font-size:11px; color:var(--text-tertiary);">(${sub})</em>` : ''}</span>
      <span class="salary-amount">${amount}</span>
    </div>
  `;

  // ------------------------------------------------------------------ RENDER

  function contentHtml() {
    if (!ui.selectedId) {
      const firstActive = adminStore.getEmployees().find(e => e.employmentStatus !== 'Inactive') || adminStore.getEmployees()[0];
      ui.selectedId = firstActive ? firstActive.id : '';
    }

    const data = adminStore.getPayslip(ui.selectedId);
    if (!data) {
      return '<div class="card">No employees available for payroll.</div>';
    }

    const { employee: emp, slip } = data;
    const wageShown = ui.wageInputValue ?? slip.grossWage;
    const netPct = Math.round((slip.netPay / slip.grossWage) * 100);

    const employeeOptions = adminStore.getEmployees().map(e => `
      <option value="${e.id}" ${e.id === ui.selectedId ? 'selected' : ''}>
        ${e.name} (${e.id})${e.employmentStatus === 'Inactive' ? ' — Inactive' : ''}
      </option>
    `).join('');

    return `
      <!-- Controls card -->
      <div class="card" style="margin-bottom:24px;">
        <div style="display:flex; align-items:flex-end; gap:18px; flex-wrap:wrap;">
          <div class="filter-group" style="max-width:300px; flex:1;">
            <label class="filter-label" for="pay-employee-select">Select Employee</label>
            <select id="pay-employee-select" class="form-select">${employeeOptions}</select>
          </div>

          <div class="filter-group" style="max-width:190px;">
            <label class="filter-label" for="pay-wage-input">Monthly Wage (₹)</label>
            <input type="number" id="pay-wage-input" class="form-input" min="1" value="${wageShown}" />
          </div>

          <button class="btn btn-primary" id="pay-recompute-btn" ${ui.recomputing ? 'disabled' : ''}>
            ${ui.recomputing
              ? '<i data-lucide="loader-2" style="width:15px;height:15px; animation: spin 1s linear infinite;"></i> Recomputing...'
              : '<i data-lucide="refresh-cw" style="width:15px;height:15px;"></i> Recompute'}
          </button>

          <button class="btn btn-secondary" id="pay-edit-salary-btn">
            <i data-lucide="pencil" style="width:15px;height:15px;"></i> Edit Salary
          </button>

          <div style="margin-left:auto; text-align:right;">
            <span class="badge badge-success" style="font-size:13px; padding:6px 14px;">${slip.month}</span>
            <div style="font-size:12px; color:var(--text-tertiary); margin-top:4px;">Pay period: ${slip.payPeriod}</div>
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:24px;">
        <!-- Earnings -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="plus-circle" style="width:18px;height:18px;color:var(--success);"></i><span>Earnings</span></h3>
            <span style="display:flex; align-items:center; gap:8px;">
              ${StatusBadge(emp.employmentStatus)}
            </span>
          </div>
          ${salaryLine('Monthly Wage (CTC)', formatINR(slip.grossWage))}
          ${salaryLine('Basic Salary', formatINR(slip.basicSalary), 'earning', '50% of wage')}
          ${salaryLine('HRA', formatINR(slip.hra), 'earning', '25% of wage')}
          ${salaryLine('Standard Allowance', formatINR(slip.standardAllowance))}
          ${salaryLine('Performance Bonus', formatINR(slip.performanceBonus))}
          ${salaryLine('Leave Travel Allowance', formatINR(slip.lta))}
          ${salaryLine('Fixed Allowance', formatINR(slip.fixedAllowance))}

          <p style="font-size:12px; color:var(--text-tertiary); margin-top:14px;">
            <i data-lucide="info" style="width:13px;height:13px; vertical-align:-2px;"></i>
            Mock split ratios for UI preview only — backend computes real components.
          </p>
        </div>

        <div style="display:flex; flex-direction:column; gap:24px;">
          <!-- Deductions -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i data-lucide="minus-circle" style="width:18px;height:18px;color:var(--danger);"></i><span>Deductions & Contributions</span></h3>
            </div>
            ${salaryLine('Employee PF', '- ' + formatINR(slip.employeePF), 'deduction')}
            ${salaryLine('Employer PF', formatINR(slip.employerPF), '', 'employer cost, not deducted')}
            ${salaryLine('Professional Tax', '- ' + formatINR(slip.professionalTax), 'deduction')}
            ${salaryLine('Total Deductions', '- ' + formatINR(slip.totalDeductions), 'deduction')}
            ${salaryLine('Payable Days', `<span>${slip.payableDays}</span>`)}
          </div>

          <!-- Net pay highlight -->
          <div class="card" style="background-color:var(--primary-surface); border-color:#d0e1fd;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap;">
              <div>
                <div style="font-size:13px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.4px;">Net Pay</div>
                <div class="stat-value" style="color:var(--primary);">${formatINR(slip.netPay)}</div>
                <div style="font-size:12px; color:var(--text-tertiary);">Next payout: ${slip.nextPayoutDate}</div>
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
    `;
  }

  // ------------------------------------------------------------------- MODAL

  function openEditSalaryModal() {
    const emp = adminStore.getEmployeeById(ui.selectedId);
    const slip = adminStore.getPayslip(ui.selectedId).slip;
    openModal({
      title: 'Edit Salary',
      bodyHtml: `
        <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
          Update the monthly wage for <strong>${emp.name}</strong>. A new mock component breakdown will be shown;
          final statutory values will be computed by the backend.
        </p>
        <div class="form-group">
          <label class="form-label required">Monthly Wage (₹)</label>
          <input type="number" id="modal-wage-input" class="form-input" min="1" value="${slip.grossWage}" />
        </div>
        <div class="comment-bubble" id="modal-wage-note">
          Preview — Basic: ${formatINR(slip.basicSalary)} · HRA: ${formatINR(slip.hra)} · Employee PF: ${formatINR(slip.employeePF)} · Net: ${formatINR(slip.netPay)}
        </div>
      `,
      footerHtml: `
        <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="modal-wage-save">Save & Recompute</button>
      `
    });

    const input = document.getElementById('modal-wage-input');
    input.addEventListener('input', () => {
      const p = adminStore.computePayslip(Number(input.value));
      document.getElementById('modal-wage-note').innerHTML =
        `Preview — Basic: ${formatINR(p.basicSalary)} · HRA: ${formatINR(p.hra)} · Employee PF: ${formatINR(p.employeePF)} · Net: ${formatINR(p.netPay)}`;
    });

    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
    document.getElementById('modal-wage-save').addEventListener('click', () => {
      const ok = adminStore.saveWage(ui.selectedId, Number(input.value));
      closeModal();
      if (ok) {
        ui.wageInputValue = null;
        showToast('Salary updated and recomputed (mock).', 'success');
        rerenderPageContent(view);
      } else {
        showToast('Please enter a valid wage.', 'danger');
      }
    });
  }

  // ---------------------------------------------------------------- BINDINGS

  const view = {
    render() {
      return renderAdminLayout('/admin/payroll', 'Payroll', ui.loaded ? contentHtml() : skeletonHtml());
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
      document.getElementById('pay-employee-select')?.addEventListener('change', e => {
        ui.selectedId = e.target.value;
        ui.wageInputValue = null;
        rerenderPageContent(view);
      });

      document.getElementById('pay-edit-salary-btn')?.addEventListener('click', openEditSalaryModal);

      const recomputeBtn = document.getElementById('pay-recompute-btn');
      recomputeBtn?.addEventListener('click', () => {
        const wageInput = document.getElementById('pay-wage-input');
        const value = Number(wageInput.value);
        if (!value || value <= 0) {
          showToast('Enter a valid monthly wage first.', 'danger');
          return;
        }

        ui.recomputing = true;
        rerenderPageContent(view);

        simulateFetch(700).then(() => {
          adminStore.saveWage(ui.selectedId, value); // persists mock override + activity entry
          ui.recomputing = false;
          ui.wageInputValue = null;
          showToast('Breakdown recomputed with mock ratios.', 'success');
          rerenderPageContent(view);
        });
      });
    },

    unmount() { /* no subscriptions */ }
  };

  return view;
}
