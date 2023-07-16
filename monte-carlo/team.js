'use strict';
const utils = require('./utils.js');

class Team {
  constructor (opts) {
    // console.log(opts);
    this.abbr = opts.abbr;
    this.conference = utils.teamConferenceLookup()[this.abbr];
    this.init_elo = opts.init_elo;
    this.elo = opts.init_elo;
    this.current_wins = opts.current_wins;
    this.current_losses = opts.current_losses;
    this.current_point_diff = opts.current_point_diff;
    this.current_playoff_wins = opts.current_playoff_wins;
    this.current_playoff_losses = opts.current_playoff_losses;
    this.season_sims = [];
  }

  reset () {
    this.elo = this.init_elo;
  }
}

module.exports = Team;
