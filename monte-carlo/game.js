/* eslint */
'use strict';
const utils = require('./utils.js');

class Game {
  constructor (opts) {
    this.HCA = 80.0;
    this.PLAYOFF_ELO_MULT = 1.25;
    this.K = 28.0;
    this.SPREAD_MULT = 26.0;
    this.MOV_STDEV = 12.76;

    this.sim = {};
    this.season_sims = [];

    this.id = opts.id;
    this.datetime = new Date(opts.datetime);
    this.status = opts.status;
    this.team1 = opts.team1;
    this.team2 = opts.team2;
    this.neutral = opts.neutral;
    this.playoff = opts.playoff;
    this.score1 = opts.score1;
    this.score2 = opts.score2;
    this.elo1_pre = opts.elo1_pre;
    this.elo2_pre = opts.elo2_pre;
    this.elo1_post = opts.elo1_post;
    this.elo2_post = opts.elo2_post;
    this.prob1 = opts.prob1;
    this.elo_spread = this.calcEloDiff() / this.SPREAD_MULT;
  }

  processGame () {
    if (this.status === 'post') return this;
    this.simGame();
  }

  simGame () {
    this.sim.elo_diff = this.calcEloDiff();
    this.calcWinner();
    this.calcMarginOfVictory();
    this.shiftElos();
  }

  calcEloDiff () {
    let eloDiff = this.team1.elo - this.team2.elo;
    eloDiff += this.neutral ? 0 : this.HCA;
    eloDiff *= this.playoff ? this.PLAYOFF_ELO_MULT : 1;
    return eloDiff;
  }

  calcProb1 (eloDiff) {
    return 1.0 / (Math.pow(10.0, (-eloDiff / 400.0)) + 1.0);
  }

  calcWinner () {
    // calculate probability of team 1 winning based on Elo diff
    // this is a set formula used for calculating win pcts --> https://medium.com/cantors-paradise/the-mathematics-of-elo-ratings-b6bfc9ca1dba
    this.sim.prob1 = this.calcProb1(this.sim.elo_diff);
    this.sim.homewin = Math.random() < this.sim.prob1;
    this.sim.winning_team = this.sim.homewin ? this.team1 : this.team2;
    this.sim.favewin = ((this.sim.prob1 >= 0.5) && this.sim.homewin) || ((this.sim.prob1 < 0.5) && !this.sim.homewin);
    this.sim.elo_spread = this.sim.elo_diff / this.SPREAD_MULT;
  }

  calcMarginOfVictory () {
    let margin = null;
    while (true) {
      // assume margin of victories are a normal distribution, centered on the simulated elo margin of victory
      // grab a random margin of victory within that normal distribution
      margin = Math.abs(this.sim.elo_spread) + (utils.functions.getRndmNormalStdDev() * this.MOV_STDEV);

      // margin > 0 means the favorite won, margin < 0 means the underdog won
      if (((margin >= 0) && this.sim.favewin) || ((margin < 0) && !this.sim.favewin)) {
        margin = Math.round(Math.abs(margin));
        break;
      }
    }
    if (margin === 0) margin = 1;
    this.sim.margin = margin;

    // margin of victory multiplier ~~ more notes in fit/fit.js
    this.sim.margin_mult = Math.abs(this.sim.margin) ** 0.8;

    // expected margin of victory multiplier ~~ more notes in fit/fit.js
    this.sim.margin_expected_mult = 6.12 + ((this.sim.homewin * 2 - 1) * (0.006 * this.sim.elo_diff));
  }

  shiftElos () {
    // calculate how much each team's Elo should shift up (for the winner) and down (for the loser)
    // shifts take into account the K-factor, margin for victory, and whether the team was an underdog coming in
    this.sim.shift = this.K * (this.sim.margin_mult / this.sim.margin_expected_mult) * (this.sim.homewin - this.sim.prob1);
    this.team1.elo += this.sim.shift;
    this.team2.elo -= this.sim.shift;
  }

  reset () {
    // console.log(this.sim);
    // this.season_sims.push({
    //   wins: this.sim.wins,
    //   losses: this.sim.losses,
    //   point_diff: this.sim.point_diff,
    //   elo_end: this.sim.elo_end,
    //   make_playoffs: this.sim.make_playoffs,
    //   make_semis: this.sim.make_semis,
    //   make_finals: this.sim.make_finals,
    //   win_finals: this.sim.win_finals
    // });
    this.sim = {};
  }
}

module.exports = Game;
