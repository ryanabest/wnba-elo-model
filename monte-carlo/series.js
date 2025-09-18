/* eslint */
'use strict';
const Game = require('./game.js');

class Series {
  constructor (opts) {
    this.round = opts.round;
    this.games_length = opts.games_length;
    this.wins_to_advance = Math.ceil(opts.games_length / 2);
    this.team1 = opts.team1;
    this.team2 = opts.team2;
    this.team1_wins = 0;
    this.team2_wins = 0;
    this.completed_games = opts.completed_games.filter(g => (g.team1.abbr === this.team1.abbr && g.team2.abbr === this.team2.abbr) || (g.team1.abbr === this.team2.abbr && g.team2.abbr === this.team1.abbr));
    this.scheduled_games = opts.scheduled_games.filter(g => (g.team1.abbr === this.team1.abbr && g.team2.abbr === this.team2.abbr) || (g.team1.abbr === this.team2.abbr && g.team2.abbr === this.team1.abbr));
    this.completed_and_scheduled_games = this.completed_games.concat(this.scheduled_games);

    // if (this.round === 'first_round' && this.team1.abbr === 'MIN') {
    //   // console.log(this.team1.abbr, this.team2.abbr);
    //   opts.completed_games.filter(g => g.team1.abbr === 'MIN' || g.team2.abbr === 'MIN') 
    //     .forEach(g => console.log(g));
    //   // console.log(opts.completed_games.filter(g => (g.team1.abbr === 'MIN' && g.team2.abbr === 'SEA')).length);
    // }
  }

  simulate () {
    this.populateGames();
    this.matchGames();
    this.simulateGames();
    this.series_winner = this.team1_wins === this.wins_to_advance ? this.team1 : this.team2;
  }

  populateGames () {
    this.games = [];
    for (let g = 0; g < this.games_length; g++) {
      let homeTeam;
      let awayTeam;

      if (this.round === 'first_round') { // first round of the playoffs is 1-1-1 format
        homeTeam = (g === 0 || g === 2) ? this.team1 : this.team2;
        awayTeam = (g === 0 || g === 2) ? this.team2 : this.team1;
      } else { // for all other rounds, higher seed hosts games 1, 2, 5 and 7
        homeTeam = (g <= 1 || g === 4 || g === 6) ? this.team1 : this.team2;
        awayTeam = (g <= 1 || g === 4 || g === 6) ? this.team2 : this.team1;
      }

      const game = new Game({
        team1: homeTeam,
        team2: awayTeam,
        playoff: true,
        netural: false,
        status: 'pre'
      });
      this.games.push(game);
    }
  }

  matchGames () {
    this.completed_and_scheduled_games.forEach((g, i) => {
      this.games[i] = g;
    });
  }

  simulateGames () {
    this.games.forEach(game => {
      if (this.team1_wins >= this.wins_to_advance || this.team2_wins >= this.wins_to_advance) return this;

      game.processGame();

      if (game.status === 'post') {
        const winningTeam = game.score1 > game.score2 ? game.team1 : game.team2;
        this.team1_wins += winningTeam.abbr === this.team1.abbr ? 1 : 0;
        this.team2_wins += winningTeam.abbr === this.team2.abbr ? 1 : 0;
      } else {
        this.team1_wins += game.sim.winning_team.abbr === this.team1.abbr ? 1 : 0;
        this.team2_wins += game.sim.winning_team.abbr === this.team2.abbr ? 1 : 0;
      }
    });
  }
}

module.exports = Series;
