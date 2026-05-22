/* eslint no-unused-vars: off */
require('../stylesheets/app.scss');
import { Table } from './table';
import { Games } from './games';

const compiledAtEl = document.querySelector('#compiled-at');
if (compiledAtEl) {
  const compiledAt = compiledAtEl.getAttribute('data-datetime');
  const compiledAtDate = new Date(compiledAt);
  if (!Number.isNaN(compiledAtDate.getTime())) {
    compiledAtEl.textContent = compiledAtDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}

window.page = page;

if (window.page === 'standings') {
  const standingsTable = new Table();
} else if (window.page === 'games') {
  const games = new Games();
}

const baseUrl = window.location.href.replace('games/', '');
document.querySelector('#standings-link').setAttribute('href', baseUrl);
document.querySelector('#games-link').setAttribute('href', `${baseUrl}games/`);