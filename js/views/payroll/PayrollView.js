// DAYFLOW HRMS — EMPLOYEE PAYROLL VIEW (READ-ONLY FRONTEND)

import { store } from '../../core/store.js';
import { router } from '../../core/router.js';
import { renderSidebar, initSidebarEvents } from '../../components/Sidebar.js';
import { renderNavbar, initNavbarEvents } from '../../components/Navbar.js';
import { openModal, closeModal } from '../../components/Modal.js';
import { showToast } from '../../components/Toast.js';

export function createPayrollView() {
  return {
    render() {
      const state = store.getState();
      const user = state.user || {};
      const payroll = state.payroll || {};

      const currentPath = '/employee/payroll';

      // Indian Rupee formatting (en-IN grouping; 2 decimals only when paise exist)
      const fmt = (val) => {
        if (typeof val !== 'number') return val;
        return val.toLocaleString('en-IN', Number.isInteger(val)
          ? { maximumFractionDigits: 0 }
          : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      return `
        <div class="main-layout">
          ${renderSidebar(currentPath)}

          <div class="content-wrapper">
            ${renderNavbar('My Payroll')}

            <main class="main-content">
              <!-- Payroll Summary Header -->
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
                <div>
                  <h2 style="font-size: 20px; font-weight: 700;">Salary Breakdown — ${payroll.month || 'August 2026'}</h2>
                  <p style="font-size: 13px; color: var(--text-secondary);">Pay Period: ${payroll.payPeriod || 'Aug 01, 2026 - Aug 31, 2026'} • Payable Days: ${payroll.payableDays || 22} Days</p>
                </div>

                <button class="btn btn-primary btn-lg" id="view-payslip-btn">
                  <i data-lucide="file-text" style="width: 18px; height: 18px;"></i>
                  <span>View Pay Slip</span>
                </button>
              </div>

              <!-- Top Payroll Summary KPIs (India-First Currency ₹) -->
              <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin-bottom: 32px;">
                <div class="card">
                  <div style="font-size: 12px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 600;">Gross Monthly Wage</div>
                  <div class="stat-value">₹${fmt(payroll.grossWage || 50000)}</div>
                  <div style="font-size: 12px; color: var(--text-secondary);">Total Earnings</div>
                </div>

                <div class="card">
                  <div style="font-size: 12px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 600;">Total Deductions</div>
                  <div class="stat-value" style="color: var(--danger);">₹${fmt(payroll.totalDeductions || 3200)}</div>
                  <div style="font-size: 12px; color: var(--text-secondary);">PF (12%) & Prof. Tax</div>
                </div>

                <div class="card">
                  <div style="font-size: 12px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 600;">Net Take-Home Pay</div>
                  <div class="stat-value" style="color: var(--success);">₹${fmt(payroll.netPay || 46800)}</div>
                  <div style="font-size: 12px; color: var(--text-secondary);">Direct Bank Deposit</div>
                </div>
              </div>

              <!-- Detailed Itemized Read-Only Table -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                <!-- Earnings Table -->
                <div class="card">
                  <div class="card-header">
                    <h3 class="card-title" style="color: var(--success);">
                      <i data-lucide="trending-up" style="width: 18px; height: 18px;"></i>
                      <span>Earnings & Allowances</span>
                    </h3>
                  </div>

                  <div class="table-container">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Component</th>
                          <th style="text-align: right;">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Basic Salary</td>
                          <td style="text-align: right; font-weight: 600;">₹${fmt(payroll.basicSalary || 25000)}</td>
                        </tr>
                        <tr>
                          <td>House Rent Allowance (HRA)</td>
                          <td style="text-align: right; font-weight: 600;">₹${fmt(payroll.hra || 12500)}</td>
                        </tr>
                        <tr>
                          <td>Standard Allowance</td>
                          <td style="text-align: right; font-weight: 600;">₹${fmt(payroll.standardAllowance || 4167)}</td>
                        </tr>
                        <tr>
                          <td>Performance Bonus</td>
                          <td style="text-align: right; font-weight: 600;">₹${fmt(payroll.performanceBonus || 2082.50)}</td>
                        </tr>
                        <tr>
                          <td>Leave Travel Allowance (LTA)</td>
                          <td style="text-align: right; font-weight: 600;">₹${fmt(payroll.lta || 2082.50)}</td>
                        </tr>
                        <tr>
                          <td>Fixed Special Allowance</td>
                          <td style="text-align: right; font-weight: 600;">₹${fmt(payroll.fixedAllowance || 4168)}</td>
                        </tr>
                        <tr style="background-color: var(--success-bg); font-weight: 700;">
                          <td>Total Gross Earnings</td>
                          <td style="text-align: right; color: var(--success); font-size: 16px;">₹${fmt(payroll.grossWage || 50000)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- Deductions & Contribution Table -->
                <div class="card">
                  <div class="card-header">
                    <h3 class="card-title" style="color: var(--danger);">
                      <i data-lucide="trending-down" style="width: 18px; height: 18px;"></i>
                      <span>Deductions & Contributions</span>
                    </h3>
                  </div>

                  <div class="table-container">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Component</th>
                          <th style="text-align: right;">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Employee PF Contribution (12% of Basic)</td>
                          <td style="text-align: right; font-weight: 600; color: var(--danger);">₹${fmt(payroll.employeePF || 3000)}</td>
                        </tr>
                        <tr>
                          <td>Employer PF Contribution (Co.)</td>
                          <td style="text-align: right; font-weight: 600;">₹${fmt(payroll.employerPF || 3000)}</td>
                        </tr>
                        <tr>
                          <td>Professional Tax</td>
                          <td style="text-align: right; font-weight: 600; color: var(--danger);">₹${fmt(payroll.professionalTax || 200)}</td>
                        </tr>
                        <tr>
                          <td>Unpaid Days Deduction (${payroll.unpaidDays || 0} days)</td>
                          <td style="text-align: right; font-weight: 600;">₹0</td>
                        </tr>
                        <tr style="height: 90px;"><td colspan="2"></td></tr>
                        <tr style="background-color: var(--danger-bg); font-weight: 700;">
                          <td>Total Deductions</td>
                          <td style="text-align: right; color: var(--danger); font-size: 16px;">₹${fmt(payroll.totalDeductions || 3200)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
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

      // Pay slip preview modal
      document.getElementById('view-payslip-btn')?.addEventListener('click', () => {
        const state = store.getState();
        const u = state.user || {};
        const p = state.payroll || {};
        const fmt = (val) => {
          if (typeof val !== 'number') return val;
          return val.toLocaleString('en-IN', Number.isInteger(val)
            ? { maximumFractionDigits: 0 }
            : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        openModal({
          title: `Salary Pay Slip — ${p.month || 'August 2026'}`,
          bodyHtml: `
            <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 24px; background-color: var(--bg-surface);">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--primary); padding-bottom: 16px; margin-bottom: 16px;">
                <div>
                  <h3 style="font-size: 20px; font-weight: 700; color: var(--primary);">DAYFLOW HRMS</h3>
                  <div style="font-size: 12px; color: var(--text-secondary);">Official Employee Pay Statement</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-weight: 600; font-size: 14px;">${p.month || 'August 2026'}</div>
                  <div style="font-size: 11px; color: var(--text-tertiary);">Status: PAID</div>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; margin-bottom: 20px; padding: 12px; background-color: var(--bg-subtle); border-radius: var(--radius-sm);">
                <div><strong>Employee Name:</strong> ${u.name || 'Sarah Jenkins'}</div>
                <div><strong>Employee ID:</strong> ${u.id || 'EMP-1042'}</div>
                <div><strong>Designation:</strong> ${u.designation || 'Senior Frontend Developer'}</div>
                <div><strong>Department:</strong> ${u.department || 'Engineering'}</div>
                <div><strong>Payable Days:</strong> ${p.payableDays || 22} Days</div>
                <div><strong>Bank Acc:</strong> HDFC **** 4819</div>
              </div>

              <table class="data-table" style="font-size: 13px; margin-bottom: 16px;">
                <thead>
                  <tr>
                    <th>Earnings Component</th>
                    <th style="text-align: right;">Amount (₹)</th>
                    <th>Deduction Component</th>
                    <th style="text-align: right;">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Basic Salary</td><td style="text-align: right;">₹${fmt(p.basicSalary)}</td><td>Employee PF (12%)</td><td style="text-align: right;">₹${fmt(p.employeePF)}</td></tr>
                  <tr><td>HRA</td><td style="text-align: right;">₹${fmt(p.hra)}</td><td>Professional Tax</td><td style="text-align: right;">₹${fmt(p.professionalTax)}</td></tr>
                  <tr><td>Standard Allowance</td><td style="text-align: right;">₹${fmt(p.standardAllowance)}</td><td>-</td><td style="text-align: right;">-</td></tr>
                  <tr><td>Performance Bonus</td><td style="text-align: right;">₹${fmt(p.performanceBonus)}</td><td>-</td><td style="text-align: right;">-</td></tr>
                  <tr><td>LTA</td><td style="text-align: right;">₹${fmt(p.lta)}</td><td>-</td><td style="text-align: right;">-</td></tr>
                  <tr><td>Fixed Allowance</td><td style="text-align: right;">₹${fmt(p.fixedAllowance)}</td><td>-</td><td style="text-align: right;">-</td></tr>
                  <tr style="font-weight: 700; background-color: var(--bg-subtle);">
                    <td>Total Gross</td><td style="text-align: right; color: var(--success);">₹${fmt(p.grossWage)}</td>
                    <td>Total Deductions</td><td style="text-align: right; color: var(--danger);">₹${fmt(p.totalDeductions)}</td>
                  </tr>
                </tbody>
              </table>

              <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; background-color: var(--primary-light); border-radius: var(--radius-md);">
                <div style="font-weight: 700; font-size: 16px; color: var(--primary);">Net Payable Take-Home Amount</div>
                <div style="font-weight: 700; font-size: 22px; color: var(--primary);">₹${fmt(p.netPay)}</div>
              </div>
            </div>
          `,
          footerHtml: `
            <button class="btn btn-secondary" id="close-payslip">Close</button>
            <button class="btn btn-primary" id="print-payslip">
              <i data-lucide="printer" style="width: 14px; height: 14px;"></i>
              <span>Print Pay Slip</span>
            </button>
          `
        });

        document.getElementById('close-payslip')?.addEventListener('click', closeModal);
        document.getElementById('print-payslip')?.addEventListener('click', () => {
          window.print();
        });
      });
    }
  };
}
