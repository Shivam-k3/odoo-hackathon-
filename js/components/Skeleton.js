// DAYFLOW HRMS — SKELETON LOADER HELPERS

export function renderSkeletonCard() {
  return `
    <div class="card skeleton-card">
      <div class="skeleton skeleton-title" style="width: 40%;"></div>
      <div class="skeleton skeleton-text" style="width: 70%;"></div>
      <div class="skeleton skeleton-text" style="width: 50%;"></div>
    </div>
  `;
}

export function renderSkeletonTable(rows = 5, cols = 4) {
  const headCols = Array(cols).fill('<th><div class="skeleton skeleton-text" style="width: 80%;"></div></th>').join('');
  const bodyRows = Array(rows).fill(0).map(() => {
    const rowCols = Array(cols).fill('<td><div class="skeleton skeleton-text" style="width: 90%;"></div></td>').join('');
    return `<tr>${rowCols}</tr>`;
  }).join('');

  return `
    <div class="table-container">
      <table class="data-table">
        <thead><tr>${headCols}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}
