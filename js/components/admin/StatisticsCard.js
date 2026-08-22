// DAYFLOW HRMS — STATISTICS CARD COMPONENT (ADMIN)

import { StatusBadge } from './StatusBadge.js';

/**
 * Renders a KPI card for the dashboard stats row.
 * opts: { icon, iconBg, iconColor, value, label, trendText, trendDir ('up'|'down'|'flat'), extraBadge }
 */
export function StatisticsCard(opts = {}) {
  const {
    icon = 'users',
    iconBg = 'var(--primary-light)',
    iconColor = 'var(--primary)',
    value = '0',
    label = '',
    trendText = '',
    trendDir = 'flat',
    extraBadge = ''
  } = opts;

  return `
    <div class="stat-card">
      <div>
        <div class="stat-card-value">${value}</div>
        <div class="stat-card-label">${label}</div>
        ${trendText ? `<span class="stat-trend ${trendDir}">
          <i data-lucide="${trendDir === 'up' ? 'trending-up' : trendDir === 'down' ? 'trending-down' : 'minus'}" style="width: 13px; height: 13px;"></i>
          ${trendText}
        </span>` : ''}
      </div>
      <div class="stat-card-icon" style="background-color:${iconBg}; color:${iconColor}; position:relative;">
        <i data-lucide="${icon}" style="width: 22px; height: 22px;"></i>
        ${extraBadge ? `<span style="position:absolute; top:-6px; right:-8px;">${StatusBadge(extraBadge)}</span>` : ''}
      </div>
    </div>
  `;
}
