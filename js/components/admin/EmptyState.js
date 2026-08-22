// DAYFLOW HRMS — EMPTY / ERROR STATE COMPONENT (ADMIN)

export function EmptyState({ icon = 'inbox', title = 'Nothing here yet', desc = '', actionsHtml = '', variant = 'empty' } = {}) {
  const iconColor = variant === 'error' ? 'var(--danger)' : 'var(--text-tertiary)';
  const iconBg = variant === 'error' ? 'var(--danger-bg)' : 'var(--bg-subtle)';
  return `
    <div class="${variant === 'error' ? 'error-state' : 'empty-state'}">
      <div class="empty-icon" style="background-color:${iconBg}; color:${iconColor};">
        <i data-lucide="${icon}" style="width:28px; height:28px;"></i>
      </div>
      <div class="empty-title">${title}</div>
      ${desc ? `<p class="empty-desc">${desc}</p>` : ''}
      ${actionsHtml}
    </div>
  `;
}
