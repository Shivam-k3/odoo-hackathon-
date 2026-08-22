// DAYFLOW HRMS — ADMIN EMPLOYEE PROFILE VIEW (/admin/employees/:id)

import { adminStore, simulateFetch, formatINR } from '../../core/adminStore.js';
import { router } from '../../core/router.js';
import { renderAdminLayout, initAdminLayoutEvents, rerenderPageContent } from '../../components/admin/AdminLayout.js';
import { StatusBadge } from '../../components/admin/StatusBadge.js';
import { EmptyState } from '../../components/admin/EmptyState.js';
import { DepartmentOptions } from '../../components/admin/AttendanceFilters.js';
import { openModal, closeModal } from '../../components/Modal.js';
import { showToast } from '../../components/Toast.js';

const TABS = [
  { id: 'personal', label: 'Personal Information', icon: 'user' },
  { id: 'job', label: 'Job Information', icon: 'briefcase' },
  { id: 'documents', label: 'Resume & Skills', icon: 'file-text' },
  { id: 'salary', label: 'Salary Information', icon: 'wallet' },
  { id: 'bank', label: 'Bank Information', icon: 'landmark' }
];

export function createAdminEmployeeProfileView(params = {}) {
  const ui = {
    loaded: false,
    empId: params.id || null,
    tab: 'personal'
  };

  const detailItem = (label, value) => `
    <div class="detail-row">
      <div class="info-item-label">${label}</div>
      <div class="info-item-value">${value ?? '-'}</div>
    </div>
  `;

  function skeletonHtml() {
    return `
      <div class="skeleton" style="height:150px; border-radius:16px; margin-bottom:20px;"></div>
      <div class="skeleton" style="height:44px; margin-bottom:20px;"></div>
      <div class="skeleton" style="height:320px; border-radius:16px;"></div>
    `;
  }

  // ------------------------------------------------------------- TAB CONTENTS

  function personalTabHtml(emp) {
    return `
      ${DashboardSectionShell({
        title: 'Personal Details',
        icon: 'user',
        editId: 'edit-personal-btn',
        editLabel: 'Edit Personal Info',
        bodyHtml: `
          <div class="detail-grid">
            ${detailItem('Full Name', emp.name)}
            ${detailItem('Date of Birth', emp.dob)}
            ${detailItem('Gender', emp.gender)}
            ${detailItem('Phone', emp.phone)}
            ${detailItem('Emergency Contact', emp.emergencyContact)}
            ${detailItem('Address', emp.address)}
          </div>
          <div style="margin-top:18px;">
            <div class="info-item-label">About</div>
            <p style="font-size:14px; color:var(--text-main); line-height:1.6; margin-top:6px;">${emp.about}</p>
          </div>
        `
      })}
    `;
  }

  function jobTabHtml(emp) {
    return `
      ${DashboardSectionShell({
        title: 'Job Details',
        icon: 'briefcase',
        editId: 'edit-job-btn',
        editLabel: 'Edit Job Info',
        bodyHtml: `
          <div class="detail-grid">
            ${detailItem('Employee ID', `<span class="badge badge-info">${emp.id}</span>`)}
            ${detailItem('Department', emp.department)}
            ${detailItem('Job Position', emp.position)}
            ${detailItem('Employment Type', emp.employmentType)}
            ${detailItem('Reporting Manager', emp.manager)}
            ${detailItem('Work Location', emp.location)}
            ${detailItem('Shift', emp.shift)}
            ${detailItem('Joining Date', emp.joiningDate)}
            ${detailItem('Employment Status', StatusBadge(emp.employmentStatus))}
          </div>
        `
      })}
    `;
  }

  function documentsTabHtml(emp) {
    return `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:24px;">
        <!-- Resume card -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="file-text" style="width:18px;height:18px;color:var(--primary);"></i><span>Resume</span></h3>
          </div>
          <div style="display:flex; align-items:center; gap:14px; padding:14px; border:1px dashed var(--border-color); border-radius:var(--radius-md);">
            <div class="stat-card-icon" style="background-color:var(--danger-bg); color:var(--danger); width:42px; height:42px;">
              <i data-lucide="file-badge" style="width:20px;height:20px;"></i>
            </div>
            <div style="flex:1; min-width:0;">
              <div class="cell-strong" style="font-size:14px; word-break:break-all;">${emp.resume.name}</div>
              <div style="font-size:12px; color:var(--text-tertiary);">${emp.resume.size} · Updated ${emp.resume.updatedOn}</div>
            </div>
          </div>
          <div style="display:flex; gap:10px; margin-top:14px;">
            <button class="btn btn-secondary btn-sm" id="resume-download-btn">
              <i data-lucide="download" style="width:14px;height:14px;"></i> <span>Download</span>
            </button>
            <button class="btn btn-secondary btn-sm" id="resume-replace-btn">
              <i data-lucide="upload" style="width:14px;height:14px;"></i> <span>Replace</span>
            </button>
            <input type="file" id="resume-file-input" style="display:none;" />
          </div>

          <!-- Certifications -->
          <div class="card-header" style="margin-top:26px;">
            <h3 class="card-title"><i data-lucide="badge-check" style="width:18px;height:18px;color:var(--success);"></i><span>Certifications</span></h3>
            <button class="btn btn-secondary btn-xs" id="add-cert-btn"><i data-lucide="plus" style="width:13px;height:13px;"></i> Add</button>
          </div>
          <div id="cert-list" style="display:flex; flex-direction:column; gap:10px;">
            ${(emp.certifications || []).map((c, idx) => `
              <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 14px; background-color:var(--bg-page); border-radius:var(--radius-md);">
                <div>
                  <div style="font-weight:600; font-size:13px;">${c.name}</div>
                  <div style="font-size:12px; color:var(--text-secondary);">${c.issuer} · ${c.year}</div>
                </div>
                <button class="icon-btn" data-remove-cert="${idx}" title="Remove certification" style="width:30px;height:30px;">
                  <i data-lucide="trash-2" style="width:15px;height:15px;color:var(--danger);"></i>
                </button>
              </div>
            `).join('') || '<p style="font-size:13px; color:var(--text-tertiary);">No certifications on record.</p>'}
          </div>
        </div>

        <!-- Skills card -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="sparkles" style="width:18px;height:18px;color:#b06000;"></i><span>Skills</span></h3>
          </div>
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:8px;">Skills shown on the employee profile.</p>
          <div class="skills-container" style="margin-top:0;">
            ${(emp.skills || []).map((s, idx) => `
              <span class="skill-tag">
                ${s}
                <button class="remove-skill-btn" data-remove-skill="${idx}" title="Remove skill">
                  <i data-lucide="x" style="width:13px; height:13px;"></i>
                </button>
              </span>
            `).join('') || '<span style="font-size:13px;color:var(--text-tertiary);">No skills added yet.</span>'}
          </div>
          <form id="add-skill-form" style="display:flex; gap:8px; margin-top:18px;">
            <input type="text" id="new-skill-input" class="form-input" placeholder="e.g. React, SQL..." autocomplete="off" />
            <button type="submit" class="btn btn-primary btn-sm"><i data-lucide="plus" style="width:14px;height:14px;"></i> Add</button>
          </form>
        </div>
      </div>
    `;
  }

  function salaryTabHtml(emp) {
    const payslip = adminStore.getPayslip(emp.id);
    const s = payslip.slip;
    return `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:24px;">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="wallet" style="width:18px;height:18px;color:var(--primary);"></i><span>Salary Structure (mock preview)</span></h3>
            <button class="btn btn-primary btn-sm" id="profile-edit-salary-btn">
              <i data-lucide="pencil" style="width:14px;height:14px;"></i> Edit Salary
            </button>
          </div>

          <div class="salary-line earning"><span class="salary-label">Monthly Wage (CTC)</span><span class="salary-amount">${formatINR(s.grossWage)}</span></div>
          <div class="salary-line earning"><span class="salary-label">Basic Salary</span><span class="salary-amount">${formatINR(s.basicSalary)}</span></div>
          <div class="salary-line earning"><span class="salary-label">HRA</span><span class="salary-amount">${formatINR(s.hra)}</span></div>
          <div class="salary-line earning"><span class="salary-label">Standard Allowance</span><span class="salary-amount">${formatINR(s.standardAllowance)}</span></div>
          <div class="salary-line earning"><span class="salary-label">Performance Bonus</span><span class="salary-amount">${formatINR(s.performanceBonus)}</span></div>
          <div class="salary-line earning"><span class="salary-label">Leave Travel Allowance</span><span class="salary-amount">${formatINR(s.lta)}</span></div>
          <div class="salary-line earning"><span class="salary-label">Fixed Allowance</span><span class="salary-amount">${formatINR(s.fixedAllowance)}</span></div>

          <div style="margin-top:16px; padding-top:6px;">
            <div style="font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.4px; color:var(--text-tertiary); margin-bottom:4px;">Deductions & Contributions</div>
            <div class="salary-line deduction"><span class="salary-label">Employee PF</span><span class="salary-amount">-${formatINR(s.employeePF)}</span></div>
            <div class="salary-line"><span class="salary-label">Employer PF <em style="font-style:normal; font-size:11px; color:var(--text-tertiary);">(employer cost)</em></span><span class="salary-amount">${formatINR(s.employerPF)}</span></div>
            <div class="salary-line deduction"><span class="salary-label">Professional Tax</span><span class="salary-amount">-${formatINR(s.professionalTax)}</span></div>
          </div>

          <div class="salary-total">
            <span>Net Pay · Payable days: ${s.payableDays}</span>
            <span style="color:var(--success);">${formatINR(s.netPay)}</span>
          </div>
          <p style="font-size:12px; color:var(--text-tertiary); margin-top:12px;">
            <i data-lucide="info" style="width:13px;height:13px; vertical-align:-2px;"></i>
            Mock values only — the backend will compute real statutory figures.
          </p>
        </div>

        <div class="card" style="align-self:start;">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="receipt" style="width:18px;height:18px;color:var(--primary);"></i><span>Payslip Summary</span></h3>
            <span class="badge badge-success">${s.month}</span>
          </div>
          <div class="stat-value" style="color:var(--success);">${formatINR(s.netPay)}</div>
          <div style="font-size:13px; color:var(--text-secondary);">Estimated net take-home for ${s.payPeriod}</div>
          <div style="display:flex; flex-direction:column; gap:10px; margin-top:18px;">
            <div class="progress-row">
              <div class="progress-row-head"><span>Gross vs Net retention</span><span>${Math.round((s.netPay / s.grossWage) * 100)}%</span></div>
              <div class="progress-track"><div class="progress-fill" style="width:${Math.round((s.netPay / s.grossWage) * 100)}%; background-color:var(--success);"></div></div>
            </div>
          </div>
          <button class="btn btn-secondary btn-block btn-sm" id="goto-payroll-btn" style="margin-top:16px;">
            <span>Open Full Payroll Console</span>
            <i data-lucide="arrow-right" style="width:14px;height:14px;"></i>
          </button>
        </div>
      </div>
    `;
  }

  function bankTabHtml(emp) {
    const b = emp.bank;
    return `
      ${DashboardSectionShell({
        title: 'Bank & Statutory Details',
        icon: 'landmark',
        editId: 'edit-bank-btn',
        editLabel: 'Edit Bank Info',
        bodyHtml: `
          <div class="detail-grid">
            ${detailItem('Bank Name', b.bankName)}
            ${detailItem('Account Number', b.accountNumber)}
            ${detailItem('IFSC Code', b.ifsc)}
            ${detailItem('Branch', b.branch)}
            ${detailItem('PAN', b.pan)}
            ${detailItem('UAN (PF)', b.uan)}
          </div>
          <p style="font-size:12px; color:var(--text-tertiary); margin-top:16px;">
            <i data-lucide="lock" style="width:13px;height:13px; vertical-align:-2px;"></i>
            Account numbers are masked in the UI. Full details are only accessible to authorised payroll roles.
          </p>
        `
      })}
    `;
  }

  function DashboardSectionShell({ title, icon, editId, editLabel, bodyHtml }) {
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="${icon}" style="width:18px;height:18px;color:var(--primary);"></i><span>${title}</span></h3>
          <button class="btn btn-secondary btn-sm" id="${editId}"><i data-lucide="pencil" style="width:14px;height:14px;"></i> ${editLabel}</button>
        </div>
        ${bodyHtml}
      </div>
    `;
  }

  // ------------------------------------------------------------------- RENDER

  function contentHtml() {
    const emp = adminStore.getEmployeeById(ui.empId);
    if (!emp) {
      return EmptyState({
        variant: 'error',
        icon: 'alert-triangle',
        title: 'Employee not found',
        desc: `No employee exists with ID "${ui.empId}". The record may have been removed.`,
        actionsHtml: '<a href="#/admin/employees" class="btn btn-primary btn-sm">Back to Employee List</a>'
      });
    }

    const initials = emp.name.split(' ').map(w => w[0]).slice(0, 2).join('');
    const tabBody = {
      personal: () => personalTabHtml(emp),
      job: () => jobTabHtml(emp),
      documents: () => documentsTabHtml(emp),
      salary: () => salaryTabHtml(emp),
      bank: () => bankTabHtml(emp)
    }[ui.tab]();

    return `
      <a href="#/admin/employees" style="display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:500; margin-bottom:16px;">
        <i data-lucide="arrow-left" style="width:15px;height:15px;"></i> Back to Employees
      </a>

      <!-- Hero header -->
      <div class="card profile-hero">
        <div class="av-circle av-lg" style="${adminStore.avatarStyle(Number(emp.id.slice(-2)) || 0)}">${initials}</div>
        <div class="profile-hero-info">
          <div class="profile-hero-name">
            ${emp.name}
            <span class="badge badge-info">${emp.id}</span>
            ${StatusBadge(emp.employmentStatus)}
          </div>
          <div class="profile-hero-sub">${emp.position} · ${emp.department}</div>
          <div class="profile-hero-contact">
            <span><i data-lucide="mail" style="width:14px;height:14px;"></i> ${emp.email}</span>
            <span><i data-lucide="phone" style="width:14px;height:14px;"></i> ${emp.phone}</span>
            <span><i data-lucide="calendar" style="width:14px;height:14px;"></i> Joined ${emp.joiningDate}</span>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tab-container">
        ${TABS.map(t => `
          <button class="tab-btn ${ui.tab === t.id ? 'active' : ''}" data-tab="${t.id}">
            <i data-lucide="${t.icon}" style="width:15px;height:15px; vertical-align:-2px; margin-right:6px;"></i>${t.label}
          </button>
        `).join('')}
      </div>

      <div id="profile-tab-body">${tabBody}</div>
    `;
  }

  // ------------------------------------------------------------------- MODALS

  function openEditPersonalModal(emp) {
    openModal({
      title: 'Edit Personal Information',
      bodyHtml: `
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input type="text" id="f-phone" class="form-input" value="${emp.phone}" />
        </div>
        <div class="form-group">
          <label class="form-label">Address</label>
          <textarea id="f-address" class="form-textarea" rows="2">${emp.address}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Emergency Contact</label>
          <input type="text" id="f-emergency" class="form-input" value="${emp.emergencyContact}" />
        </div>
        <div class="form-group">
          <label class="form-label">About</label>
          <textarea id="f-about" class="form-textarea" rows="3">${emp.about}</textarea>
        </div>
      `,
      footerHtml: `
        <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="personal-save-btn">Save Changes</button>
      `
    });

    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
    document.getElementById('personal-save-btn').addEventListener('click', () => {
      adminStore.updateEmployee(emp.id, {
        phone: document.getElementById('f-phone').value.trim(),
        address: document.getElementById('f-address').value.trim(),
        emergencyContact: document.getElementById('f-emergency').value.trim(),
        about: document.getElementById('f-about').value.trim()
      });
      closeModal();
      showToast('Personal information updated.', 'success');
      rerenderPageContent(view);
    });
  }

  function openEditJobModal(emp) {
    openModal({
      title: 'Edit Job Information',
      bodyHtml: `
        <div class="form-group">
          <label class="form-label">Department</label>
          <select id="f-dept" class="form-select">${DepartmentOptions(emp.department)}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Job Position</label>
          <input type="text" id="f-position" class="form-input" value="${emp.position}" />
        </div>
        <div class="form-group">
          <label class="form-label">Employment Status</label>
          <select id="f-status" class="form-select">
            ${['Active', 'On Leave', 'Probation', 'Inactive'].map(s => `<option value="${s}" ${emp.employmentStatus === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Reporting Manager</label>
          <input type="text" id="f-manager" class="form-input" value="${emp.manager}" />
        </div>
        <div class="form-group">
          <label class="form-label">Work Location</label>
          <input type="text" id="f-location" class="form-input" value="${emp.location}" />
        </div>
      `,
      footerHtml: `
        <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="job-save-btn">Save Changes</button>
      `
    });

    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
    document.getElementById('job-save-btn').addEventListener('click', () => {
      adminStore.updateEmployee(emp.id, {
        department: document.getElementById('f-dept').value,
        position: document.getElementById('f-position').value.trim() || emp.position,
        employmentStatus: document.getElementById('f-status').value,
        manager: document.getElementById('f-manager').value.trim() || emp.manager,
        location: document.getElementById('f-location').value.trim() || emp.location
      });
      closeModal();
      showToast('Job information updated.', 'success');
      rerenderPageContent(view);
    });
  }

  function openEditSalaryModal(emp) {
    const slip = adminStore.getPayslip(emp.id).slip;
    openModal({
      title: 'Edit Salary',
      bodyHtml: `
        <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
          Update the monthly wage for <strong>${emp.name}</strong>. Component breakdown below is a mock preview;
          the backend will compute final statutory figures.
        </p>
        <div class="form-group">
          <label class="form-label required">Monthly Wage (₹)</label>
          <input type="number" id="f-wage" class="form-input" min="1" value="${slip.grossWage}" />
        </div>
        <div class="comment-bubble" id="wage-preview-note">
          Current net pay preview: <strong>${formatINR(slip.netPay)}</strong> · Payable days: ${slip.payableDays}
        </div>
      `,
      footerHtml: `
        <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="salary-save-btn">Save Salary</button>
      `
    });

    const wageInput = document.getElementById('f-wage');
    wageInput.addEventListener('input', () => {
      const preview = adminStore.computePayslip(Number(wageInput.value));
      document.getElementById('wage-preview-note').innerHTML =
        `New net pay preview: <strong>${formatINR(preview.netPay)}</strong> · Basic: ${formatINR(preview.basicSalary)} · PF: ${formatINR(preview.employeePF)}`;
    });

    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
    document.getElementById('salary-save-btn').addEventListener('click', () => {
      const ok = adminStore.saveWage(emp.id, Number(wageInput.value));
      closeModal();
      if (ok) {
        showToast('Salary updated (mock). Backend will compute actuals.', 'success');
        rerenderPageContent(view);
      } else {
        showToast('Please enter a valid wage amount.', 'danger');
      }
    });
  }

  function openEditBankModal(emp) {
    const b = emp.bank;
    openModal({
      title: 'Edit Bank Information',
      bodyHtml: `
        <div class="form-group">
          <label class="form-label">Bank Name</label>
          <input type="text" id="f-bankname" class="form-input" value="${b.bankName}" />
        </div>
        <div class="form-group">
          <label class="form-label">Account Number</label>
          <input type="text" id="f-acct" class="form-input" value="${b.accountNumber}" />
        </div>
        <div class="form-group">
          <label class="form-label">IFSC Code</label>
          <input type="text" id="f-ifsc" class="form-input" value="${b.ifsc}" />
        </div>
        <div class="form-group">
          <label class="form-label">Branch</label>
          <input type="text" id="f-branch" class="form-input" value="${b.branch}" />
        </div>
      `,
      footerHtml: `
        <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="bank-save-btn">Save Bank Info</button>
      `
    });

    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
    document.getElementById('bank-save-btn').addEventListener('click', () => {
      adminStore.updateEmployee(emp.id, {
        bank: {
          ...b,
          bankName: document.getElementById('f-bankname').value.trim(),
          accountNumber: document.getElementById('f-acct').value.trim(),
          ifsc: document.getElementById('f-ifsc').value.trim(),
          branch: document.getElementById('f-branch').value.trim()
        }
      });
      closeModal();
      showToast('Bank information updated.', 'success');
      rerenderPageContent(view);
    });
  }

  function openAddCertModal(emp) {
    openModal({
      title: 'Add Certification',
      bodyHtml: `
        <div class="form-group">
          <label class="form-label required">Certification Name</label>
          <input type="text" id="f-cert-name" class="form-input" placeholder="e.g. AWS Solutions Architect" />
        </div>
        <div class="form-group">
          <label class="form-label">Issuer</label>
          <input type="text" id="f-cert-issuer" class="form-input" placeholder="e.g. Amazon Web Services" />
        </div>
        <div class="form-group">
          <label class="form-label">Year</label>
          <input type="number" id="f-cert-year" class="form-input" min="2000" max="2100" placeholder="2026" />
        </div>
      `,
      footerHtml: `
        <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="cert-save-btn">Add Certification</button>
      `
    });

    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
    document.getElementById('cert-save-btn').addEventListener('click', () => {
      const name = document.getElementById('f-cert-name').value.trim();
      if (!name) {
        showToast('Certification name is required.', 'danger');
        return;
      }
      const certifications = [...(emp.certifications || []), {
        name,
        issuer: document.getElementById('f-cert-issuer').value.trim() || '-',
        year: document.getElementById('f-cert-year').value || new Date().getFullYear()
      }];
      adminStore.updateEmployee(emp.id, { certifications });
      closeModal();
      showToast('Certification added.', 'success');
      rerenderPageContent(view);
    });
  }

  // ---------------------------------------------------------------- BINDINGS

  function bindTabEvents(emp) {
    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        ui.tab = btn.dataset.tab;
        rerenderPageContent(view);
      });
    });

    document.getElementById('edit-personal-btn')?.addEventListener('click', () => openEditPersonalModal(emp));
    document.getElementById('edit-job-btn')?.addEventListener('click', () => openEditJobModal(emp));
    document.getElementById('edit-bank-btn')?.addEventListener('click', () => openEditBankModal(emp));

    // Documents tab
    document.getElementById('resume-download-btn')?.addEventListener('click', () =>
      showToast('Resume download is a mock action until backend file storage is connected.', 'info'));
    document.getElementById('resume-replace-btn')?.addEventListener('click', () => document.getElementById('resume-file-input')?.click());
    document.getElementById('resume-file-input')?.addEventListener('change', (e) => {
      if (e.target.files.length) {
        showToast(`"${e.target.files[0].name}" queued for upload (mock).`, 'info');
      }
    });
    document.getElementById('add-cert-btn')?.addEventListener('click', () => openAddCertModal(emp));

    document.querySelectorAll('[data-remove-cert]').forEach(btn => {
      btn.addEventListener('click', () => {
        const certifications = [...(emp.certifications || [])];
        certifications.splice(Number(btn.dataset.removeCert), 1);
        adminStore.updateEmployee(emp.id, { certifications });
        showToast('Certification removed.', 'success');
        rerenderPageContent(view);
      });
    });

    document.querySelectorAll('[data-remove-skill]').forEach(btn => {
      btn.addEventListener('click', () => {
        const skills = [...(emp.skills || [])];
        skills.splice(Number(btn.dataset.removeSkill), 1);
        adminStore.updateEmployee(emp.id, { skills });
        showToast('Skill removed.', 'success');
        rerenderPageContent(view);
      });
    });

    const addSkillForm = document.getElementById('add-skill-form');
    addSkillForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('new-skill-input');
      const skill = input.value.trim();
      if (!skill) return;
      if ((emp.skills || []).some(s => s.toLowerCase() === skill.toLowerCase())) {
        showToast('That skill already exists.', 'danger');
        return;
      }
      adminStore.updateEmployee(emp.id, { skills: [...(emp.skills || []), skill] });
      showToast('Skill added.', 'success');
      rerenderPageContent(view);
    });

    // Salary tab
    document.getElementById('profile-edit-salary-btn')?.addEventListener('click', () => openEditSalaryModal(emp));
    document.getElementById('goto-payroll-btn')?.addEventListener('click', () => router.navigate('/admin/payroll'));
  }

  const view = {
    render() {
      return renderAdminLayout('/admin/employees', 'Employee Profile', ui.loaded ? contentHtml() : skeletonHtml());
    },

    afterRender() {
      initAdminLayoutEvents();
      if (!ui.loaded) {
        simulateFetch(450).then(() => {
          ui.loaded = true;
          rerenderPageContent(view);
        });
      } else {
        view.bindEvents();
      }
    },

    bindEvents() {
      const emp = adminStore.getEmployeeById(ui.empId);
      if (!emp) return; // error state has no interactive controls
      bindTabEvents(emp);
    },

    unmount() { /* no subscriptions */ }
  };

  return view;
}
