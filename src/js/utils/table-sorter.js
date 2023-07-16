class TableSorter {
  constructor (tableEl) {
    this.tableEl = tableEl;
    this.sortedCol = this.tableEl.querySelector('.sorted') ? this.tableEl.querySelector('.sorted').dataset.col : null;
    this.sortedAsc = this.tableEl.querySelector('.sorted') ? this.tableEl.querySelector('.sorted').dataset.asc : null;
  }

  get sortableTableHeaders () {
    return this.tableEl.querySelectorAll('thead > tr.sortable th:not(.nosort)');
  }

  initTableSorter () {
    // Adapted from https://stackoverflow.com/questions/14267781/sorting-html-table-with-javascript
    const getCellValue = (tr, idx) => tr.children[idx].getAttribute('data-val') || tr.children[idx].innerText || tr.children[idx].textContent;

    const comparer = (idx, asc) => (a, b) => ((v1, v2) =>
      v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2)
    )(getCellValue(asc ? a : b, idx), getCellValue(asc ? b : a, idx));

    this.sortableTableHeaders.forEach(th => th.addEventListener('click', (e) => {
      const prevCol = this.sortedCol;
      this.sortedCol = th.getAttribute('data-col');
      if (prevCol === this.sortedCol) {
        this.sortedAsc = !this.sortedAsc;
      } else {
        this.sortedAsc = th.dataset.asc;
      }

      const tbody = this.tableEl.querySelector('tbody');
      Array.from(tbody.querySelectorAll('tr'))
        .sort(comparer(Array.from(th.parentNode.children).indexOf(th), this.sortedAsc))
        .forEach(tr => tbody.appendChild(tr));

      this.tableEl.querySelectorAll('.sorted').forEach(th => {
        th.classList.remove('sorted');
        th.classList.remove('desc');
        th.classList.remove('asc');
      });
      th.classList.add('sorted');
      th.classList.add(this.sortedAsc ? 'asc' : 'desc');
    }));
  }
}

module.exports = {
  TableSorter
};