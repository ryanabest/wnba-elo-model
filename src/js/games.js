const utils = require('./utils.js');
const games = require('../data/games.json');

class Games {
  constructor () {
    this.games = games;
    this.processed_games = utils.games.processGames(games);

    this.addUpcomingEventListener();
    this.addCompletedEventListener();
  }

  showMoreGames (type) {
    const template = require(`../templates/games/games-${type}.pug`);
    const div = document.querySelector(`#${type}-games`);
    const html = template({
      processedGames: this.processed_games,
      games: games,
      utils: utils,
      cutoff: null
    });
    div.innerHTML = html;
  }

  addUpcomingEventListener () {
    const btn = document.querySelector('#upcoming-games button');
    if (btn) btn.addEventListener('click', () => this.showMoreGames('upcoming'));
  }

  addCompletedEventListener () {
    const btn = document.querySelector('#completed-games button');
    if (btn) btn.addEventListener('click', () => this.showMoreGames('completed'));
  }
}

export { Games };