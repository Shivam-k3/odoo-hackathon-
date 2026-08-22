// DAYFLOW HRMS — DASHBOARD CARD COMPONENT (ADMIN)
// Generic titled card shell with optional header action link/button.

export function DashboardCard({ title, icon, headerExtra = '', bodyHtml = '', footerHtml = '', cardId = '' } = {}) {
  return `
    <div class="card" ${cardId ? `id="${cardId}"` : ''}>
      <div class="card-header" style="margin-bottom: 16px;">
        <h3 class="card-title">
          ${icon ? `<i data-lucide="${icon}" style="width: 18px; height: 18px; color: var(--primary);"></i>` : ''}
          <span>${title}</span>
        </h3>
        ${headerExtra}
      </div>
      ${bodyHtml}
      ${footerHtml ? `<div style="margin-top: 18px;">${footerHtml}</div>` : ''}
    </div>
  `;
}

export function CardLinkBtn({ id, label, icon = 'arrow-right' } = {}) {
  return `
    <button class="btn btn-secondary btn-sm" id="${id}" style="display:inline-flex; align-items:center; gap:6px;">
      <span>${label}</span>
      <i data-lucide="${icon}" style="width: 14px; height: 14px;"></i>
    </button>
  `;
}
