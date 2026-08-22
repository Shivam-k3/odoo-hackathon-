// DAYFLOW HRMS — STATUS BADGE COMPONENT (ADMIN)
// Wireframe mapping: GREEN = Present · AIRPLANE = Approved Leave · YELLOW = Absent
// Accepts both legacy labels and backend enums (PRESENT / HALF_DAY / PENDING …).

import { esc } from '../../core/api.js';

const BADGE_MAP = {
  // Green family
  'present': { cls: 'badge-success', icon: null },
  'active': { cls: 'badge-success', icon: null },
  'approved': { cls: 'badge-success', icon: 'check' },

  // Airplane family (approved leave / on leave)
  'on leave': { cls: 'badge-info', icon: 'plane' },
  'approved leave': { cls: 'badge-info', icon: 'plane' },
  'leave': { cls: 'badge-info', icon: 'plane' },
  'work from home': { cls: 'badge-info', icon: 'home' },

  // Yellow family
  'absent': { cls: 'badge-warning', icon: null },
  'half-day': { cls: 'badge-warning', icon: 'clock' },
  'pending': { cls: 'badge-warning', icon: 'clock' },
  'probation': { cls: 'badge-warning', icon: null },

  // Danger family
  'rejected': { cls: 'badge-danger', icon: 'x' },
  'inactive': { cls: 'badge-danger', icon: null }
};

export function StatusBadge(status) {
  const raw = String(status || '').replace(/_/g, '-').toLowerCase();
  const conf = BADGE_MAP[raw] || { cls: 'badge-info', icon: null };
  return `
    <span class="badge ${conf.cls}">
      ${conf.icon ? `<i data-lucide="${conf.icon}" style="width: 12px; height: 12px;"></i>` : ''}
      <span>${esc(String(status || '').replace(/_/g, '-'))}</span>
    </span>
  `;
}

export function initStatusBadgeEvents() { /* declarative component - no events */ }
