// DAYFLOW HRMS — ACTIVITY LIST COMPONENT (ADMIN)

const TONE_STYLES = {
  success: { bg: 'var(--success-bg)', fg: 'var(--success)' },
  info: { bg: 'var(--info-bg)', fg: 'var(--info)' },
  warning: { bg: 'var(--warning-bg)', fg: '#b06000' },
  danger: { bg: 'var(--danger-bg)', fg: 'var(--danger)' },
  neutral: { bg: 'var(--bg-subtle)', fg: 'var(--text-secondary)' }
};

export function ActivityList(items = [], { emptyMessage = 'No recent activity.' } = {}) {
  if (!items.length) {
    return `<p style="font-size:13px;color:var(--text-tertiary);">${emptyMessage}</p>`;
  }

  return `
    <div style="display:flex; flex-direction:column; gap:16px;">
      ${items.map(item => {
        const tone = TONE_STYLES[item.tone] || TONE_STYLES.neutral;
        return `
          <div class="activity-item">
            <div class="activity-icon" style="background-color:${tone.bg}; color:${tone.fg};">
              <i data-lucide="${item.icon}" style="width:16px;height:16px;"></i>
            </div>
            <div style="flex:1; min-width:0;">
              <div class="activity-title">${item.title}</div>
              <div class="activity-desc">${item.desc}</div>
              <div class="activity-time">${item.time}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
