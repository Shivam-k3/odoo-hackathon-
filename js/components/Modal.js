// DAYFLOW HRMS — REUSABLE MODAL COMPONENT

export function openModal({ title, bodyHtml, footerHtml, onClose }) {
  const container = document.getElementById('modal-container');
  if (!container) return;

  const modalHtml = `
    <div class="modal-backdrop" id="active-modal-backdrop">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="icon-btn" id="modal-close-btn">
            <i data-lucide="x" style="width: 18px; height: 18px;"></i>
          </button>
        </div>
        <div class="modal-body">
          ${bodyHtml}
        </div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
      </div>
    </div>
  `;

  container.innerHTML = modalHtml;
  if (window.lucide) window.lucide.createIcons();

  const backdrop = document.getElementById('active-modal-backdrop');
  const closeBtn = document.getElementById('modal-close-btn');

  const closeModal = () => {
    container.innerHTML = '';
    if (typeof onClose === 'function') onClose();
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });
  }
}

export function closeModal() {
  const container = document.getElementById('modal-container');
  if (container) container.innerHTML = '';
}
