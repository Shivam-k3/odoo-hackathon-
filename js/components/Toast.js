// DAYFLOW HRMS — TOAST NOTIFICATION MANAGER

import { esc } from '../core/api.js';

export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'danger') iconName = 'alert-triangle';

  // Message is injected via textContent — never raw HTML — so API error text
  // or user-controlled values can never inject markup.
  const icon = document.createElement('i');
  icon.setAttribute('data-lucide', iconName);
  icon.style.cssText = 'width: 18px; height: 18px;';
  const span = document.createElement('span');
  span.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(span);
  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 300ms ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
