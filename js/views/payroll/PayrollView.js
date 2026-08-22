// DAYFLOW HRMS — EMPLOYEE PAYROLL VIEW (REAL BACKEND DATA)
// Every figure is computed by the backend payroll engine. No frontend math.

import { router } from '../../core/router.js';
import { api, esc, fmtINR } from '../../core/api.js';
import { renderSidebar, initSidebarEvents } from '../../components/Sidebar.js';
import { renderNavbar, initNavbarEvents } from '../../components/Navbar.js';
import { openModal } from '../../components/Modal.js';
import { showToast } from '../../components/Toast.js';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function periodLabel(year, month) {
  return `${MONTH_NAMES[(month || 1) - 1]} ${year}`;
}

export function createPayrollView() {
  let payrollData = null;

  return {
    render() {
      const currentPath = '/employee/payroll';

      return `
        <div class="main-layout">
          ${renderSidebar(currentPath)}

          <div class="content-wrapper">
            ${renderNavbar('Payroll & Compensation')}

            <main class="main-content">
              <div id="pr-error" style="display:none; margin-bottom:20px; padding:12px 16px; background-color:#fdecea; border:1px solid var(--danger); border-radius: var(--radius-md); color: var(--danger); font-size:13px;"></div>

              <!-- Summary Hero -->
              <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); margin-bottom: 24px;">
                <div class="card" style="background-color: var(--primary-surface); border-color: #d0e1fd;">
                  <div style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Estimated Monthly Net Pay</div>
                  <div class="stat-value" id="pr-netpay" style="color: var(--primary);">…</div>
                  <div style="font-size: 12px; color: var(--text-tertiary);" id="pr-netpay-sub">From your salary structure</div>
                </div>

                <div class="card">
                  <div style="font-size: 12px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 600;">Gross Monthly Earnings</div>
                  <div class="stat-value" id="pr-gross">…</div>
                  <div style="font-size: 12px; color: var(--text-tertiary);">Before deductions</div>
                </div>

                <div class="card">
                  <div style="font-size: 12px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 600;">Total Deductions</div>
                  <div class="stat-value" id="pr-deduct">…</div>
                  <div style="font-size: 12px; color: var(--text-tertiary);">PF + Professional Tax</div>
                </div>

                <div class="card">
                  <div style="font-size: 12px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 600;">Payable Days</div>
                  <div class="stat-value" id="pr-payable">…</div>
                  <div style="font-size: 12px; color: var(--text-tertiary);" id="pr-payable-sub">This month (backend-computed)</div>
                </div>
              </div>

              <!-- Salary Breakdown -->
              <div class="card" style="margin-bottom: 24px;">
                <div class="card-header">
                  <h3 class="card-title">
                    <i data-lucide="wallet" style="width: 18px; height: 18px; color: var(--primary);"></i>
                    <span>Salary Breakdown</span>
                  </h3>
                  <span class="badge badge-info" id="pr-currency-badge">INR ₹</span>
                </div>
                <div id="pr-breakdown-body">
                  <div style="color: var(--text-tertiary); font-size: 13px; padding: 16px 0;">Loading salary structure…</div>
                </div>
              </div>

              <!-- Payslips -->
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">
                    <i data-lucide="file-text" style="width: 18px; height: 18px; color: var(--primary);"></i>
                    <span>Payslip History</span>
                  </h3>
                </div>
                <div class="table-container">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th>Working Days</th>
                        <th>Payable Days</th>
                        <th>Gross</th>
                        <th>Deductions</th>
                        <th>Net Pay</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody id="pr-payslip-body">
                      <tr><td colspan="7" style="text-align:center; padding:32px; color: var(--text-tertiary);">Loading payslips…</td></tr>
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

      const errBox = document.getElementById('pr-error');
      const showError = (msg) => {
        if (!errBox) return;
        errBox.textContent = msg;
        errBox.style.display = 'block';
      };
      const hideError = () => { if (errBox) errBox.style.display = 'none'; };

      // ---- Salary breakdown ---------------------------------------------
      const breakdownRow = (label, value, opts = {}) => `
        <div style="display:flex; justify-content:space-between; padding:9px 0; ${opts.last ? '' : 'border-bottom:1px solid var(--border-light);'}">
          <span style="font-size:14px; ${opts.bold ? 'font-weight:700;' : 'color:var(--text-secondary);'}">${esc(label)}</span>
          <span style="font-size:14px; ${opts.bold ? `font-weight:700; color:${opts.color || 'var(--primary)'};` : 'font-weight:500;'}">${esc(value)}</span>
        </div>
      `;

      const renderBreakdown = (comps) => {
        const wrap = document.getElementById('pr-breakdown-body');
        if (!wrap) return;

        const earnings = [
          ['Basic Salary', comps.basicSalary],
          ['House Rent Allowance (HRA)', comps.hra],
          ['Standard Allowance', comps.standardAllowance],
          ['Performance Bonus', comps.performanceBonus],
          ['Leave Travel Allowance (LTA)', comps.lta],
          ['Fixed Allowance', comps.fixedAllowance],
        ];

        wrap.innerHTML = `
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:32px;">
            <div>
              <h4 style="font-size:13px; text-transform:uppercase; letter-spacing:0.5px; color:var(--success); margin-bottom:8px; font-weight:700;">Earnings</h4>
              ${earnings.map(([l, v]) => breakdownRow(l, fmtINR(v))).join('')}
              ${breakdownRow('Gross Earnings', fmtINR(comps.grossEarnings), { bold: true, color: 'var(--success)', last: true })}
            </div>
            <div>
              <h4 style="font-size:13px; text-transform:uppercase; letter-spacing:0.5px; color:var(--danger); margin-bottom:8px; font-weight:700;">Deductions</h4>
              ${breakdownRow('Employee PF (12% of Basic)', fmtINR(comps.employeePf))}
              ${breakdownRow('Professional Tax', fmtINR(comps.professionalTax), { last: true })}
              <h4 style="font-size:13px; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-tertiary); margin:20px 0 8px; font-weight:700;">Employer Contribution (not deducted)</h4>
              ${breakdownRow('Employer PF', fmtINR(comps.employerPf), { last: true })}
              ${breakdownRow('Monthly Net Take-Home', fmtINR(comps.netPay), { bold: true, color: 'var(--primary)' })}
            </div>
          </div>
        `;
      };

      // ---- Payslip detail modal ------------------------------------------
      const showPayslip = async (year, month) => {
        openModal({
          title: `Payslip — ${periodLabel(Number(year), Number(month))}`,
          bodyHtml: '<div style="padding:24px; text-align:center; color:var(--text-tertiary); font-size:13px;">Loading payslip…</div>',
          footerHtml: `
            <button class="btn btn-secondary" id="ps-close">Close</button>
            <button class="btn btn-primary" id="ps-print"><i data-lucide="printer" style="width:14px; height:14px;"></i><span>Print</span></button>
          `,
        });

        document.getElementById('ps-close')?.addEventListener('click', () => document.getElementById('modal-container').innerHTML = '');
        document.getElementById('ps-print')?.addEventListener('click', () => window.print());

        try {
          const data = await api.get(`/api/payroll/payslip?year=${year}&month=${month}`);
          const p = data.payslip;
          const modalBody = document.querySelector('.modal-card .modal-body');
          if (!modalBody || !p) return;
          modalBody.innerHTML = `
            <div style="border:1px solid var(--border-light); border-radius: var(--radius-md); overflow:hidden;">
              <div style="background:var(--primary-surface); padding:16px 20px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="font-weight:800; font-size:15px; letter-spacing:-0.2px;">DAYFLOW HRMS</div>
                  <div style="font-size:12px; color:var(--text-secondary);">Payslip for ${esc(periodLabel(p.periodYear, p.periodMonth))}</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:11px; color:var(--text-secondary); text-transform:uppercase;">Net Pay</div>
                  <div style="font-weight:800; font-size:18px; color:var(--primary);">${fmtINR(p.netPay)}</div>
                </div>
              </div>
              <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:0; border-bottom:1px solid var(--border-light);">
                ${[['Working Days', p.workingDays], ['Present', p.presentDays], ['Paid Leave', p.paidLeaveDays], ['Unpaid Leave', p.unpaidLeaveDays], ['Absent', p.absentDays], ['Payable Days', p.payableDays]]
                  .map(([l, v]) => `<div style="padding:10px 16px; border-right:1px solid var(--border-light);"><div style="font-size:11px; color:var(--text-tertiary); text-transform:uppercase;">${esc(l)}</div><div style="font-weight:700; font-size:14px;">${esc(String(v ?? '—'))}</div></div>`).join('')}
              </div>
              <div style="padding:16px 20px;">
                <table style="width:100%; font-size:13px;">
                  <thead><tr><td style="padding:4px 0; color:var(--success); font-weight:700; text-transform:uppercase; font-size:11px;">Earnings</td><td style="color:var(--danger); font-weight:700; text-transform:uppercase; font-size:11px;">Deductions</td></tr></thead>
                  <tr>
                    <td style="vertical-align:top; padding-right:24px;">
                      ${[['Basic Salary', p.basicSalary], ['HRA', p.hra], ['Standard Allowance', p.standardAllowance], ['Performance Bonus', p.performanceBonus], ['LTA', p.lta], ['Fixed Allowance', p.fixedAllowance]].map(([l, v]) => `<div style="display:flex; justify-content:space-between; padding:4px 0;"><span style="color:var(--text-secondary);">${esc(l)}</span><strong>${fmtINR(v)}</strong></div>`).join('')}
                      <div style="display:flex; justify-content:space-between; padding:6px 0; border-top:1px solid var(--border-light); margin-top:6px;"><strong>Gross</strong><strong>${fmtINR(p.grossEarnings)}</strong></div>
                    </td>
                    <td style="vertical-align:top;">
                      ${[['Employee PF', p.employeePf], ['Professional Tax', p.professionalTax]].map(([l, v]) => `<div style="display:flex; justify-content:space-between; padding:4px 0;"><span style="color:var(--text-secondary);">${esc(l)}</span><strong>${fmtINR(v)}</strong></div>`).join('')}
                      <div style="display:flex; justify-content:space-between; padding:6px 0; border-top:1px solid var(--border-light); margin-top:6px;"><strong>Total</strong><strong>${fmtINR((Number(p.employeePf) || 0) + (Number(p.professionalTax) || 0))}</strong></div>
                    </td>
                  </tr>
                </table>
              </div>
            </div>
          `;
        } catch (err) {
          const modalBody = document.querySelector('.modal-card .modal-body');
          if (modalBody) modalBody.innerHTML = `<div style="padding:24px; text-align:center; color:var(--danger); font-size:13px;">${esc(err.message || 'Could not load payslip.')}</div>`;
        }
      };

      // ---- Payslip table --------------------------------------------------
      const renderPayslips = (payslips) => {
        const body = document.getElementById('pr-payslip-body');
        if (!body) return;
        if (!payslips || !payslips.length) {
          body.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:32px; color: var(--text-tertiary);">No payslips generated yet. They will appear here once HR generates them.</td></tr>';
          return;
        }
        body.innerHTML = [...payslips]
          .sort((a, b) => (b.periodYear - a.periodYear) || (b.periodMonth - a.periodMonth))
          .map(p => {
            const deductions = (Number(p.employeePf) || 0) + (Number(p.professionalTax) || 0);
            return `
              <tr>
                <td style="font-weight: 600;">${esc(periodLabel(p.periodYear, p.periodMonth))}</td>
                <td>${esc(String(p.workingDays ?? '—'))}</td>
                <td>${esc(String(p.payableDays ?? '—'))}</td>
                <td>${fmtINR(p.grossEarnings)}</td>
                <td style="color: var(--danger);">${fmtINR(deductions)}</td>
                <td style="color: var(--primary);"><strong>${fmtINR(p.netPay)}</strong></td>
                <td><button class="btn btn-secondary btn-sm pr-view-btn" data-year="${p.periodYear}" data-month="${p.periodMonth}"><span>View</span><i data-lucide="eye" style="width: 12px; height: 12px;"></i></button></td>
              </tr>
            `;
          }).join('');

        body.querySelectorAll('.pr-view-btn').forEach(btn => {
          btn.addEventListener('click', () => showPayslip(btn.dataset.year, btn.dataset.month));
        });
        if (window.lucide) window.lucide.createIcons();
      };

      // ---- Load -----------------------------------------------------------
      const loadAll = async () => {
        try {
          hideError();
          payrollData = await api.get('/api/payroll/me'); // 404 → ApiError when no structure
          const comps = payrollData.components || {};

          document.getElementById('pr-netpay').textContent = fmtINR(comps.netPay);
          document.getElementById('pr-gross').textContent = fmtINR(comps.grossEarnings);
          document.getElementById('pr-deduct').textContent =
            fmtINR((Number(comps.employeePf) || 0) + (Number(comps.professionalTax) || 0));

          renderBreakdown(comps);
          renderPayslips(payrollData.payslips || []);

          try {
            const monthKey = new Date().toISOString().slice(0, 7);
            const pd = await api.get(`/api/payroll/me/payable-days?month=${monthKey}`);
            const el = document.getElementById('pr-payable');
            el.textContent = `${pd.payableDays ?? '—'} / ${pd.workingDays ?? '—'}`;
            document.getElementById('pr-payable-sub').textContent =
              `${pd.paidLeaveDays ?? 0} paid leave • ${pd.unpaidLeaveDays ?? 0} unpaid`;
          } catch (_) {
            document.getElementById('pr-payable').textContent = '—';
          }
        } catch (err) {
          if (err.status === 404) {
            // Empty state — no salary structure configured yet
            document.getElementById('pr-netpay').textContent = '—';
            document.getElementById('pr-gross').textContent = '—';
            document.getElementById('pr-deduct').textContent = '—';
            document.getElementById('pr-payable').textContent = '—';
            const wrap = document.getElementById('pr-breakdown-body');
            if (wrap) {
              wrap.innerHTML = `
                <div style="text-align:center; padding:40px 20px;">
                  <i data-lucide="wallet" style="width:40px; height:40px; color:var(--text-tertiary); opacity:0.5;"></i>
                  <div style="font-weight:600; margin-top:12px;">No salary structure yet</div>
                  <div style="font-size:13px; color:var(--text-tertiary); margin-top:4px;">HR hasn't configured compensation for your account. Contact your administrator.</div>
                </div>`;
              if (window.lucide) window.lucide.createIcons();
            }
            const pb = document.getElementById('pr-payslip-body');
            if (pb) pb.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:32px; color: var(--text-tertiary);">No payslips available.</td></tr>';
            return;
          }
          showError(err.message || 'Could not load payroll.');
          showToast(err.message || 'Could not load payroll.', 'danger');
        }
      };

      loadAll();
    },
  };
}
