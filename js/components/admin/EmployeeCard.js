// DAYFLOW HRMS — EMPLOYEE CARD COMPONENT (ADMIN)
// Compact employee snapshot used on the dashboard & employees page.

import { StatusBadge } from './StatusBadge.js';

export function getInitials(name = '') {
  return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

/**
 * emp: employee object; avatarStyleHtml: inline style from adminStore.avatarStyle(i)
 * opts: { showContact, buttonLabel }
 */
export function EmployeeCard(emp, avatarStyleHtml = '', opts = {}) {
  if (!emp) return '';
  const initials = getInitials(emp.name);
  return `
    <article class="emp-card card-hover">
      <div class="emp-card-top">
        <div class="av-circle av-md" style="${avatarStyleHtml}">${initials}</div>
        <div style="min-width:0; flex:1;">
          <div class="emp-card-name">${emp.name}</div>
          <div class="emp-card-role">${emp.position}</div>
        </div>
        ${StatusBadge(emp.employmentStatus)}
      </div>
      <div class="emp-card-meta">
        <span><i data-lucide="hash" style="width:14px;height:14px;color:var(--text-tertiary);"></i> ${emp.id}</span>
        <span><i data-lucide="building-2" style="width:14px;height:14px;color:var(--text-tertiary);"></i> ${emp.department}</span>
        ${opts.showContact ? `<span><i data-lucide="mail" style="width:14px;height:14px;color:var(--text-tertiary);"></i> ${emp.email}</span>` : ''}
      </div>
      <a href="#/admin/employees/${emp.id}" class="btn btn-secondary btn-sm btn-block" style="justify-content:center; display:inline-flex; align-items:center; gap:6px;">
        <i data-lucide="eye" style="width:14px;height:14px;"></i>
        <span>${opts.buttonLabel || 'View Profile'}</span>
      </a>
    </article>
  `;
}
