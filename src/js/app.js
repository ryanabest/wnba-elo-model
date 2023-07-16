/* eslint no-unused-vars: off */
require('../stylesheets/app.scss');
import { Table } from './table';
import { Games } from './games';

window.page = page;

if (window.page === 'standings') {
  const standingsTable = new Table();
} else if (window.page === 'games') {
  const games = new Games();
}

const baseUrl = window.location.href.replace('games/', '');
document.querySelector('#standings-link').setAttribute('href', baseUrl);
document.querySelector('#games-link').setAttribute('href', `${baseUrl}games/`);