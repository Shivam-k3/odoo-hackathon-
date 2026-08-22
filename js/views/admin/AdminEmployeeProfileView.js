// DAYFLOW HRMS — ADMIN EMPLOYEE PROFILE VIEW (/admin/employees/:id)
// All data from GET /api/employees/:id + GET /api/admin/payroll/:id.
// Mutations go through PUT /api/employees/:id and admin payroll endpoints.

import { adminStore, formatINR } from '../../core/adminStore.js';
import { esc } from '../../core/api.js';
import { renderAdminLayout, initAdminLayoutEvents, rerenderPageContent } from '../../components/admin/AdminLayout.js';
import { StatusBadge } from '../../components/admin/StatusBadge.js';
import { openModal, closeModal } from '../../components/Modal.js';
import { showToast } from '../../components/Toast.js';

const CERT_SEPARATOR = ' :: ';
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function parseCert(str) {
  const [name = '', issuer = '', year = ''] = String(str).split(CERT_SEPARATOR).map(s => s.trim());
  return { name, issuer, year };
}

function detailItem(label, valueHtml) {
  return `
    <div>
      <div class="info-item-label">${esc(label)}</div>
      <div class="info-item-value">${valueHtml ?? '<span style="color:var(--text-tertiary);">—</span>'}</div>
    </div>
  `;
}

function DashboardSectionShell({ title, icon, editId, editLabel, bodyHtml }) {
  return `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title"><i data-lucide="${icon}" style="width:18px;height:18px;color:var(--primary);"></i><span>${title}</span></h3>
        ${editId ? `<button class="btn btn-secondary btn-sm" id="${editId}"><i data-lucide="edit-3" style="width:14px;height:14px;"></i> ${editLabel}</button>` : ''}
      </div>
      ${bodyHtml}
    </div>
  `;
}

export function createAdminEmployeeProfileView(params = {}) {
  const ui = {
    empId: params.id || '',
    loaded: false,
    error: null,
    tab: 'personal',
    employee: null,   // backend record
    payroll: null,    // {salaryStructure, components, payslips}
    payrollError: null,
  };

  // ------------------------------------------------------------- TAB CONTENTS

  function personalTabHtml(emp) {
    return DashboardSectionShell({
      title: 'Personal Details', icon: 'user',
      editId: 'edit-personal-btn', editLabel: 'Edit Personal Info',
      bodyHtml: `
        <div class="detail-grid">
          ${detailItem('Full Name', esc(`${emp.firstName} ${emp.lastName}`.trim()))}
          ${detailItem('Date of Birth', emp.dob ? esc(String(emp.dob).slice(0, 10)) : '')}
          ${detailItem('Gender', emp.gender)}
          ${detailItem('Phone', emp.phone)}
          ${detailItem('Address', emp.address)}
        </div>
        <div style="margin-top:18px;">
          <div class="info-item-label">About</div>
          <p style="font-size:14px; color:var(--text-main); line-height:1.6; margin-top:6px;">${emp.about ? esc(emp.about) : '<span style="color:var(--text-tertiary);">Not provided.</span>'}</p>
        </div>
      `,
    });
  }

  function jobTabHtml(emp) {
    return DashboardSectionShell({
      title: 'Job Details', icon: 'briefcase',
      editId: 'edit-job-btn', editLabel: 'Edit Job Info',
      bodyHtml: `
        <div class="detail-grid">
          ${detailItem('Employee ID', `<span class="badge badge-info">${esc(emp.loginId)}</span>`)}
          ${detailItem('Department', emp.department)}
          ${detailItem('Job Position', emp.designation)}
          ${detailItem('Joining Date', emp.joiningDate ? esc(String(emp.joiningDate).slice(0, 10)) : '')}
          ${detailItem('Account Status', StatusBadge(emp.user?.status))}
          ${detailItem('Role', `<span class="badge badge-info">${esc(emp.user?.role || 'EMPLOYEE')}</span>`)}
        </div>
      `,
    });
  }

  function documentsTabHtml(emp) {
    const certs = (emp.certifications || []).map(parseCert);
    return `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:24px;">
        <!-- Certifications -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="badge-check" style="width:18px;height:18px;color:var(--success);"></i><span>Certifications</span></h3>
            <button class="btn btn-secondary btn-xs" id="add-cert-btn"><i data-lucide="plus" style="width:13px;height:13px;"></i> Add</button>
          </div>
          <div id="cert-list" style="display:flex; flex-direction:column; gap:10px;">
            ${certs.map((c, idx) => `
              <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 14px; background-color:var(--bg-page); border-radius:var(--radius-md);">
                <div>
                  <div style="font-weight:600; font-size:13px;">${esc(c.name)}</div>
                  <div style="font-size:12px; color:var(--text-secondary);">${c.issuer ? esc(c.issuer) : ''}${c.year ? ` · ${esc(c.year)}` : ''}</div>
                </div>
                <button class="icon-btn" data-remove-cert="${idx}" title="Remove certification" style="width:30px;height:30px;">
                  <i data-lucide="trash-2" style="width:15px;height:15px;color:var(--danger);"></i>
                </button>
              </div>
            `).join('') || '<p style="font-size:13px; color:var(--text-tertiary);">No certifications on record.</p>'}
          </div>
        </div>

        <!-- Skills -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="sparkles" style="width:18px;height:18px;color:#b06000;"></i><span>Skills</span></h3>
          </div>
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:8px;">Skills shown on the employee profile.</p>
          <div class="skills-container" style="margin-top:0;">
            ${(emp.skills || []).map((s, idx) => `
              <span class="skill-tag">
                ${esc(s)}
                <button class="remove-skill-btn" data-remove-skill="${idx}" title="Remove skill">
                  <i data-lucide="x" style="width:13px; height:13px;"></i>
                </button>
              </span>`).join('') || '<p style="font-size:13px; color:var(--text-tertiary);">No skills listed.</p>'}
          </div>
          <button class="btn btn-secondary btn-sm" id="add-skill-btn" style="margin-top:16px;">
            <i data-lucide="plus" style="width:13px;height:13px;"></i> Add Skill
          </button>
        </div>
      </div>
    `;
  }

  function salaryTabHtml(payroll) {
    if (ui.payrollError || !payroll || !payroll.salaryStructure) {
      return DashboardSectionShell({
        title: 'Salary & Payroll', icon: 'wallet',
        bodyHtml: `
          <div style="padding:20px; text-align:center;">
            <p style="font-size:13px; color:var(--text-tertiary);">
              ${ui.payrollError ? esc(ui.payrollError) : 'No salary structure configured for this employee yet.'}
            </p>
            <button class="btn btn-primary btn-sm" id="set-wage-btn" style="margin-top:12px;">
              <i data-lucide="wallet" style="width:14px;height:14px;"></i> Set Monthly Wage
            </button>
          </div>
        `,
      });
    }

    const comps = payroll.components || {};
    const struct = payroll.salaryStructure;

    return DashboardSectionShell({
      title: 'Salary & Payroll', icon: 'wallet',
      editId: 'edit-salary-btn', editLabel: 'Update Wage',
      bodyHtml: `
        <div class="stats-grid" style="margin-bottom:18px;">
          <div class="stat-card">
            <div>
              <div class="stat-card-label">Monthly Wage</div>
              <div class="stat-card-value">${formatINR(struct.monthlyWage)}</div>
              <div class="stat-card-sub">Effective ${esc(String(struct.effectiveFrom).slice(0, 10))}</div>
            </div>
            <div class="stat-card-icon" style="background-color:var(--primary-light);color:var(--primary);">
              <i data-lucide="wallet" style="width:20px;height:20px;"></i>
            </div>
          </div>
          <div class="stat-card">
            <div>
              <div class="stat-card-label">Net Take-Home</div>
              <div class="stat-card-value" style="color:var(--success);">${formatINR(comps.netPay)}</div>
              <div class="stat-card-sub">After PF + Professional Tax</div>
            </div>
            <div class="stat-card-icon" style="background-color:var(--success-bg);color:var(--success);">
              <i data-lucide="banknote" style="width:20px;height:20px;"></i>
            </div>
          </div>
        </div>

        <h4 style="font-size:13px; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-tertiary); margin-bottom:10px;">Component Breakdown (backend-computed)</h4>
        <div class="table-container">
          <table class="data-table">
            <tbody>
              <tr><td>Basic Salary</td><td style="text-align:right;">${formatINR(comps.basicSalary)}</td></tr>
              <tr><td>HRA</td><td style="text-align:right;">${formatINR(comps.hra)}</td></tr>
              <tr><td>Standard Allowance</td><td style="text-align:right;">${formatINR(comps.standardAllowance)}</td></tr>
              <tr><td>Performance Bonus</td><td style="text-align:right;">${formatINR(comps.performanceBonus)}</td></tr>
              <tr><td>LTA</td><td style="text-align:right;">${formatINR(comps.lta)}</td></tr>
              <tr><td>Fixed Allowance</td><td style="text-align:right;">${formatINR(comps.fixedAllowance)}</td></tr>
              <tr><td><strong>Gross Earnings</strong></td><td style="text-align:right;"><strong>${formatINR(comps.grossEarnings)}</strong></td></tr>
              <tr><td>Employee PF (deducted)</td><td style="text-align:right; color:var(--danger);">-${formatINR(comps.employeePf)}</td></tr>
              <tr><td>Professional Tax (deducted)</td><td style="text-align:right; color:var(--danger);">-${formatINR(comps.professionalTax)}</td></tr>
              <tr><td>Employer PF (employer cost)</td><td style="text-align:right; color:var(--text-tertiary);">${formatINR(comps.employerPf)}</td></tr>
              <tr><td><strong style="color:var(--primary);">Monthly Net Pay</strong></td><td style="text-align:right;"><strong style="color:var(--primary);">${formatINR(comps.netPay)}</strong></td></tr>
            </tbody>
          </table>
        </div>

        <!-- Payslip generation + history -->
        <div class="card-header" style="margin-top:24px;">
          <h3 class="card-title"><i data-lucide="file-text" style="width:18px;height:18px;color:var(--primary);"></i><span>Payslips</span></h3>
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="month" id="generate-payslip-month" class="form-input" style="width:auto; padding:4px 10px;" />
            <button class="btn btn-primary btn-xs" id="generate-payslip-btn"><i data-lucide="zap" style="width:12px;height:12px;"></i> Generate</button>
          </div>
        </div>
        <div class="table-container" style="margin-top:10px;">
          <table class="data-table">
            <thead><tr><th>Period</th><th>Working Days</th><th>Payable Days</th><th>Gross</th><th>Net Pay</th></tr></thead>
            <tbody>
              ${(payroll.payslips || []).map(p => `
                <tr>
                  <td style="font-weight:600;">${MONTH_NAMES[(p.periodMonth || 1) - 1]} ${p.periodYear}</td>
                  <td>${p.workingDays ?? '—'}</td>
                  <td>${p.payableDays ?? '—'}</td>
                  <td>${formatINR(p.grossEarnings)}</td>
                  <td style="color:var(--success); font-weight:700;">${formatINR(p.netPay)}</td>
                </tr>`).join('') || '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-tertiary);">No payslips generated.</td></tr>'}
            </tbody>
          </table>
        </div>
      `,
    });
  }

  function accountTabHtml(emp) {
    return DashboardSectionShell({
      title: 'Account & Access', icon: 'shield',
      bodyHtml: `
        <div class="detail-grid">
          ${detailItem('Login Email', emp.email)}
          ${detailItem('Role', `<span class="badge badge-info">${esc(emp.user?.role || 'EMPLOYEE')}</span>`)}
          ${detailItem('Status', StatusBadge(emp.user?.status))}
          ${detailItem('User ID', `<code style="font-size:11px;">${esc(emp.userId || '')}</code>`)}
        </div>
        <div style="display:flex; gap:10px; margin-top:20px;">
          <select id="acct-role" class="form-select" style="max-width:220px;">
            <option value="EMPLOYEE" ${emp.user?.role === 'EMPLOYEE' ? 'selected' : ''}>EMPLOYEE</option>
            <option value="ADMIN_HR" ${emp.user?.role === 'ADMIN_HR' ? 'selected' : ''}>ADMIN_HR</option>
          </select>
          <select id="acct-status" class="form-select" style="max-width:220px;">
            <option value="ACTIVE" ${emp.user?.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
            <option value="PENDING" ${emp.user?.status === 'PENDING' ? 'selected' : ''}>PENDING</option>
            <option value="INACTIVE" ${emp.user?.status === 'INACTIVE' ? 'selected' : ''}>INACTIVE</option>
          </select>
          <button class="btn btn-primary btn-sm" id="acct-save-btn">Save Access Changes</button>
        </div>
      `,
    });
  }

  // ------------------------------------------------------------------ SHELL

  function contentHtml() {
    const emp = ui.employee;
    const fullName = `${emp.firstName} ${emp.lastName}`.trim();
    const initials = fullName.split(' ').map(w => w[0]).slice(0, 2).join('');

    const tabs = [
      { id: 'personal', label: 'Personal', icon: 'user' },
      { id: 'job', label: 'Job', icon: 'briefcase' },
      { id: 'documents', label: 'Documents', icon: 'file-badge' },
      { id: 'salary', label: 'Salary', icon: 'wallet' },
      { id: 'account', label: 'Account', icon: 'shield' },
    ];

    let tabHtml = '';
    if (ui.tab === 'personal') tabHtml = personalTabHtml(emp);
    else if (ui.tab === 'job') tabHtml = jobTabHtml(emp);
    else if (ui.tab === 'documents') tabHtml = documentsTabHtml(emp);
    else if (ui.tab === 'salary') tabHtml = salaryTabHtml(ui.payroll);
    else if (ui.tab === 'account') tabHtml = accountTabHtml(emp);

    return `
      <!-- Profile header -->
      <div class="card profile-header-card">
        <div class="av-circle av-lg" style="${adminStore.avatarStyle(fullName.length)}">${esc(initials)}</div>
        <div style="flex:1;">
          <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <h2 style="font-size:21px; font-weight:700;">${esc(fullName)}</h2>
            <span class="badge badge-info">${esc(emp.loginId)}</span>
            ${StatusBadge(emp.user?.status)}
          </div>
          <p style="color:var(--text-secondary); font-size:13px; margin-top:2px;">${esc(emp.designation || 'Staff')} · ${esc(emp.department || 'General')} · ${esc(emp.email)}</p>
        </div>
        <a href="#/admin/employees" class="btn btn-secondary btn-sm"><i data-lucide="arrow-left" style="width:14px;height:14px;"></i> Back</a>
      </div>

      <div class="tab-container" id="profile-tabs">
        ${tabs.map(t => `
          <button class="tab-btn ${ui.tab === t.id ? 'active' : ''}" data-tab="${t.id}">
            <i data-lucide="${t.icon}" style="width:15px;height:15px; vertical-align:-2px; margin-right:4px;"></i>${t.label}
          </button>`).join('')}
      </div>

      <div id="profile-tab-content">${tabHtml}</div>
    `;
  }

  function errorHtml() {
    return `
      <div style="padding:40px; text-align:center;">
        <i data-lucide="alert-triangle" style="width:36px; height:36px; color:var(--danger);"></i>
        <div style="font-weight:600; margin-top:12px;">Could not load this employee</div>
        <div style="font-size:13px; color:var(--text-tertiary); margin-top:4px;">${esc(ui.error)}</div>
        <a href="#/admin/employees" class="btn btn-primary btn-sm" style="margin-top:16px;">Back to Employees</a>
      </div>
    `;
  }

  // ------------------------------------------------------------------ DATA

  async function loadData() {
    try {
      ui.error = null;
      ui.employee = await adminStore.getEmployeeById(ui.empId);
      try {
        ui.payroll = await adminStore.getEmployeePayroll(ui.empId);
        ui.payrollError = null;
      } catch (err) {
        ui.payroll = null;
        ui.payrollError = err.status === 404 ? null : (err.message || 'Could not load payroll.');
      }
      ui.loaded = true;
    } catch (err) {
      ui.error = err.message || 'Failed to load employee.';
    }
    rerenderPageContent(view);
  }

  async function patchEmployee(patch, successMsg) {
    try {
      await adminStore.updateEmployee(ui.empId, patch);
      showToast(successMsg, 'success');
      await loadData(); // server reconciliation
    } catch (err) {
      showToast(err.message || 'Update failed.', 'danger');
    }
  }

  // ------------------------------------------------------------------ MODALS

  function modalErr(msg) {
    const box = document.getElementById('modal-error-box');
    if (!box) { showToast(msg, 'danger'); return; }
    box.textContent = msg;
    box.style.display = 'block';
  }

  function openEditPersonalModal(emp) {
    openModal({
      title: 'Edit Personal Information',
      bodyHtml: `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div class="form-group"><label class="form-label">First Name *</label><input id="ep-first" class="form-input" value="${esc(emp.firstName)}" /></div>
          <div class="form-group"><label class="form-label">Last Name *</label><input id="ep-last" class="form-input" value="${esc(emp.lastName)}" /></div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div class="form-group"><label class="form-label">Date of Birth</label><input type="date" id="ep-dob" class="form-input" value="${emp.dob ? esc(String(emp.dob).slice(0, 10)) : ''}" /></div>
          <div class="form-group"><label class="form-label">Gender</label>
            <select id="ep-gender" class="form-select">
              ${['', 'Male', 'Female', 'Other'].map(g => `<option value="${g}" ${(emp.gender || '') === g ? 'selected' : ''}>${g || 'Prefer not to say'}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group"><label class="form-label">Phone</label><input id="ep-phone" class="form-input" value="${esc(emp.phone || '')}" /></div>
        <div class="form-group"><label class="form-label">Address</label><textarea id="ep-address" class="form-textarea" rows="2">${esc(emp.address || '')}</textarea></div>
        <div class="form-group"><label class="form-label">About / Bio</label><textarea id="ep-about" class="form-textarea" rows="3">${esc(emp.about || '')}</textarea></div>
        <div id="modal-error-box" style="display:none; padding:10px 12px; background-color:#fdecea; border:1px solid var(--danger); border-radius:var(--radius-sm); color:var(--danger); font-size:13px;"></div>
      `,
      footerHtml: `
        <button class="btn btn-secondary" id="ep-cancel">Cancel</button>
        <button class="btn btn-primary" id="ep-save">Save Changes</button>
      `,
    });

    document.getElementById('ep-cancel').addEventListener('click', closeModal);
    document.getElementById('ep-save').addEventListener('click', () => {
      const firstName = document.getElementById('ep-first').value.trim();
      const lastName = document.getElementById('ep-last').value.trim();
      if (!firstName || !lastName) { modalErr('First and last names are required.'); return; }
      patchEmployee({
        firstName,
        lastName,
        dob: document.getElementById('ep-dob').value || null,
        gender: document.getElementById('ep-gender').value || null,
        phone: document.getElementById('ep-phone').value.trim() || null,
        address: document.getElementById('ep-address').value.trim() || null,
        about: document.getElementById('ep-about').value.trim() || null,
      }, 'Personal details updated.');
      closeModal();
    });
  }

  function openEditJobModal(emp) {
    openModal({
      title: 'Edit Job Information',
      bodyHtml: `
        <div class="form-group"><label class="form-label">Department</label>
          <select id="ej-dept" class="form-select">
            ${['', 'Engineering', 'Human Resources', 'Finance', 'Marketing', 'Sales', 'Operations', 'Design', 'Product', 'General']
              .map(d => `<option value="${d}" ${(emp.department || '') === d ? 'selected' : ''}>${d || 'Unassigned'}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">Job Position / Designation</label><input id="ej-pos" class="form-input" value="${esc(emp.designation || '')}" /></div>
        <div class="form-group"><label class="form-label">Joining Date</label><input type="date" id="ej-joined" class="form-input" value="${emp.joiningDate ? esc(String(emp.joiningDate).slice(0, 10)) : ''}" /></div>
        <div id="modal-error-box" style="display:none; padding:10px 12px; background-color:#fdecea; border:1px solid var(--danger); border-radius:var(--radius-sm); color:var(--danger); font-size:13px;"></div>
      `,
      footerHtml: `
        <button class="btn btn-secondary" id="ej-cancel">Cancel</button>
        <button class="btn btn-primary" id="ej-save">Save Changes</button>
      `,
    });

    document.getElementById('ej-cancel').addEventListener('click', closeModal);
    document.getElementById('ej-save').addEventListener('click', () => {
      patchEmployee({
        department: document.getElementById('ej-dept').value || null,
        designation: document.getElementById('ej-pos').value.trim() || null,
        joiningDate: document.getElementById('ej-joined').value || undefined,
      }, 'Job details updated.');
      closeModal();
    });
  }

  async function saveWage(wageValue) {
    const wage = Number(wageValue);
    if (!wage || wage <= 0) { modalErr('Enter a valid positive monthly wage in ₹.'); return false; }
    try {
      if (ui.payroll?.salaryStructure) {
        await adminStore.updateWage(ui.empId, wage);
      } else {
        await adminStore.saveWage(ui.empId, wage);
      }
      showToast('Salary structure saved.', 'success');
      closeModal();
      ui.payrollError = null;
      await loadData();
      return true;
    } catch (err) {
      modalErr(err.message || 'Failed to save wage.');
      return false;
    }
  }

  function openEditSalaryModal(existingWage = '') {
    openModal({
      title: existingWage ? 'Update Monthly Wage' : 'Set Monthly Wage',
      bodyHtml: `
        <div class="form-group">
          <label class="form-label required">Gross Monthly Wage (₹)</label>
          <input type="number" min="1" step="0.01" id="wage-input" class="form-input" placeholder="e.g. 50000" value="${esc(String(existingWage))}" />
          <div style="font-size:12px; color:var(--text-tertiary); margin-top:6px;">
            PF (12% of basic), professional tax and net pay are computed by the backend payroll engine — never in the browser.
          </div>
        </div>
        <div id="modal-error-box" style="display:none; padding:10px 12px; background-color:#fdecea; border:1px solid var(--danger); border-radius:var(--radius-sm); color:var(--danger); font-size:13px;"></div>
      `,
      footerHtml: `
        <button class="btn btn-secondary" id="ws-cancel">Cancel</button>
        <button class="btn btn-primary" id="ws-save">Save Wage</button>
      `,
    });

    document.getElementById('ws-cancel').addEventListener('click', closeModal);
    document.getElementById('ws-save').addEventListener('click', () => saveWage(document.getElementById('wage-input').value));
  }

  function bindTabEvents() {
    const emp = ui.employee;

    document.querySelectorAll('#profile-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.tab !== ui.tab) {
          ui.tab = btn.dataset.tab;
          rerenderPageContent(view);
        }
      });
    });

    document.getElementById('edit-personal-btn')?.addEventListener('click', () => openEditPersonalModal(emp));
    document.getElementById('edit-job-btn')?.addEventListener('click', () => openEditJobModal(emp));
    document.getElementById('set-wage-btn')?.addEventListener('click', () => openEditSalaryModal());
    document.getElementById('edit-salary-btn')?.addEventListener('click', () => openEditSalaryModal(ui.payroll?.salaryStructure?.monthlyWage || ''));

    // Generate payslip
    document.getElementById('generate-payslip-btn')?.addEventListener('click', async () => {
      const monthInput = document.getElementById('generate-payslip-month');
      const month = monthInput.value || new Date().toISOString().slice(0, 7);
      const btn = document.getElementById('generate-payslip-btn');
      btn.disabled = true;
      try {
        await adminStore.generatePayslip(ui.empId, month);
        showToast(`Payslip generated for ${month}.`, 'success');
        await loadData();
      } catch (err) {
        showToast(err.message || 'Payslip generation failed.', 'danger');
        btn.disabled = false;
      }
    });

    // Account changes
    document.getElementById('acct-save-btn')?.addEventListener('click', () => {
      const role = document.getElementById('acct-role').value;
      const status = document.getElementById('acct-status').value;
      patchEmployee({ role, status }, 'Access settings updated.');
    });

    // Skills
    document.getElementById('add-skill-btn')?.addEventListener('click', () => {
      openModal({
        title: 'Add Skill',
        bodyHtml: `
          <div class="form-group">
            <label class="form-label required">Skill</label>
            <input id="new-skill-input" class="form-input" placeholder="e.g. React, Payroll Compliance" />
          </div>
          <div id="modal-error-box" style="display:none; padding:10px 12px; background-color:#fdecea; border:1px solid var(--danger); border-radius:var(--radius-sm); color:var(--danger); font-size:13px;"></div>
        `,
        footerHtml: `
          <button class="btn btn-secondary" id="ns-cancel">Cancel</button>
          <button class="btn btn-primary" id="ns-save">Add Skill</button>
        `,
      });
      document.getElementById('ns-cancel').addEventListener('click', closeModal);
      document.getElementById('ns-save').addEventListener('click', () => {
        const skill = document.getElementById('new-skill-input').value.trim();
        if (!skill) { modalErr('Skill cannot be empty.'); return; }
        closeModal();
        patchEmployee({ skills: [...(emp.skills || []), skill] }, `Skill '${skill}' added.`);
      });
    });

    document.querySelectorAll('.remove-skill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.removeSkill);
        const skills = (emp.skills || []).filter((_, i) => i !== idx);
        patchEmployee({ skills }, 'Skill removed.');
      });
    });

    // Certifications
    document.getElementById('add-cert-btn')?.addEventListener('click', () => {
      openModal({
        title: 'Add Certification',
        bodyHtml: `
          <div class="form-group"><label class="form-label required">Title</label><input id="nc-name" class="form-input" /></div>
          <div class="form-group"><label class="form-label required">Issuer</label><input id="nc-issuer" class="form-input" /></div>
          <div class="form-group"><label class="form-label">Year</label><input id="nc-year" class="form-input" placeholder="2026" /></div>
          <div id="modal-error-box" style="display:none; padding:10px 12px; background-color:#fdecea; border:1px solid var(--danger); border-radius:var(--radius-sm); color:var(--danger); font-size:13px;"></div>
        `,
        footerHtml: `
          <button class="btn btn-secondary" id="nc-cancel">Cancel</button>
          <button class="btn btn-primary" id="nc-save">Add Certification</button>
        `,
      });
      document.getElementById('nc-cancel').addEventListener('click', closeModal);
      document.getElementById('nc-save').addEventListener('click', () => {
        const name = document.getElementById('nc-name').value.trim();
        const issuer = document.getElementById('nc-issuer').value.trim();
        const year = document.getElementById('nc-year').value.trim();
        if (!name || !issuer) { modalErr('Title and issuer are required.'); return; }
        closeModal();
        patchEmployee({
          certifications: [...(emp.certifications || []), `${name}${CERT_SEPARATOR}${issuer}${CERT_SEPARATOR}${year}`],
        }, 'Certification added.');
      });
    });

    document.querySelectorAll('[data-remove-cert]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.removeCert);
        const certifications = (emp.certifications || []).filter((_, i) => i !== idx);
        patchEmployee({ certifications }, 'Certification removed.');
      });
    });
  }

  const view = {
    render() {
      if (!ui.loaded && !ui.error) {
        return renderAdminLayout(`/admin/employees/${ui.empId}`, 'Employee Profile', `
          <div class="skeleton" style="height:150px; border-radius:16px; margin-bottom:20px;"></div>
          <div class="skeleton" style="height:44px; margin-bottom:20px;"></div>
          <div class="skeleton" style="height:320px; border-radius:16px;"></div>
        `);
      }
      if (ui.error) return renderAdminLayout(`/admin/employees/${ui.empId}`, 'Employee Profile', errorHtml());
      return renderAdminLayout(`/admin/employees/${ui.empId}`, 'Employee Profile', contentHtml());
    },

    afterRender() {
      initAdminLayoutEvents();
      if (!ui.loaded && !ui.error) { loadData(); return; }
      bindTabEvents();
    },

    bindEvents() { bindTabEvents(); },

    unmount() { /* stateless */ }
  };

  return view;
}
