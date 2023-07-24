const utils = require('./utils.js');
const games = require('../data/games.json');

class Games {
  constructor () {
    this.games = games;
    this.processed_games = utils.games.processGames(games);
    this.cutoff = 7;

    this.setTemplates();
    this.render();
    this.addUpcomingEventListener();
    this.addCompletedEventListener();
  }

  setTemplates() {
    this.games_recent = require('../templates/games/games-recent.pug');
    this.games_upcoming = require('../templates/games/games-upcoming.pug');
    this.games_completed = require('../templates/games/games-completed.pug');
  }

  render () {
    const opts = {
      processedGames: this.processed_games,
      cutoff: this.cutoff,
      utils
    };

    const numRecent = Object.keys(this.processed_games.recent).length;
    if (numRecent > 0) {
      const html = this.games_recent(opts);
      document.querySelector('#recent-games').innerHTML = html;
    }

    const numPre = Object.keys(this.processed_games.pre).length;
    if (numPre > 0) {
      const html = this.games_upcoming(opts);
      document.querySelector('#upcoming-games').innerHTML = html;
    }

    const numPost = Object.keys(this.processed_games.post).length;
    if (numPost > 0) {
      const html = this.games_completed(opts);
      document.querySelector('#completed-games').innerHTML = html;
    }
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