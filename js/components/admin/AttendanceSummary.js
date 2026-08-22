// DAYFLOW HRMS — ATTENDANCE SUMMARY COMPONENT (ADMIN)
// Chip-style KPI strip for any set of attendance records.
// Expects backend-style summary values in DECIMAL HOURS.

import { formatHoursLabel } from '../../core/adminStore.js';

export function AttendanceSummary(summary = {}) {
  const items = [
    { label: 'Present', value: summary.present ?? 0, icon: 'check-circle', bg: 'var(--success-bg)', fg: 'var(--success)' },
    { label: 'Absent', value: summary.absent ?? 0, icon: 'x-circle', bg: 'var(--warning-bg)', fg: '#b06000' },
    { label: 'Half-day', value: summary.halfDay ?? 0, icon: 'clock', bg: '#fff4e5', fg: '#b06000' },
    { label: 'On Leave', value: summary.leave ?? 0, icon: 'plane', bg: 'var(--info-bg)', fg: 'var(--info)' },
    { label: 'Total Hours', value: formatHoursLabel(summary.totalWorkHours), icon: 'timer', bg: 'var(--primary-light)', fg: 'var(--primary)', raw: true },
    { label: 'Extra Hours', value: formatHoursLabel(summary.totalExtraHours), icon: 'zap', bg: 'var(--primary-light)', fg: 'var(--info)', raw: true }
  ];

  return `
    <div class="stats-grid" style="margin-bottom:20px;">
      ${items.map(i => `
        <div class="stat-card" style="align-items:center;">
          <div>
            <div class="stat-card-value" style="font-size:22px;">${i.value}</div>
            <div class="stat-card-label">${i.label}</div>
          </div>
          <div class="stat-card-icon" style="width:38px;height:38px;background-color:${i.bg};color:${i.fg};">
            <i data-lucide="${i.icon}" style="width:18px;height:18px;"></i>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
