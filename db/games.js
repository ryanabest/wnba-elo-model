const fs = require('fs');
const path = require('path');
const config = require('../config.js');
const teamUtils = require('../src/js/utils/team.js');

class Games {
  constructor () {
    this.games = require('./games.json');
    this.HCA = 80.0;
    this.PLAYOFF_ELO_MULT = 1.25;
    this.K = 28.0;
    this.SPREAD_MULT = 26.0;
  }

  save () {
    const filePath = path.join(__dirname, 'games.json');
    fs.writeFileSync(filePath, JSON.stringify(this.games, null, 4));
  }

  export (season) {
    const games = this.games
      .filter(d => d.season === season)
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
      .map(d => {
        const elo1Pre = d.elo1_pre || this.teams.findTeam(d.team1).elo;
        const elo2Pre = d.elo2_pre || this.teams.findTeam(d.team2).elo;
        const eloDiff = this.getEloDiff(elo1Pre, elo2Pre, d.neutral, d.playoff);
        const eloProb1 = this.getEloProb1(eloDiff);
        const eloSpread = this.getEloSpread(eloDiff);
        return {
          id: d.id,
          team1: d.team1,
          team2: d.team2,
          season: d.season,
          datetime: d.datetime,
          playoff: d.playoff,
          neutral: d.neutral,
          status: d.status,
          score1: d.score1,
          score2: d.score2,
          elo1_pre: elo1Pre,
          elo2_pre: elo2Pre,
          elo1_post: d.elo1_post,
          elo2_post: d.elo2_post,
          prob1: d.prob1 || eloProb1,
          prob2: d.prob2 || (1 - eloProb1),
          elo_spread: -1 * (Math.round(eloSpread * 2) / 2),
          cc_final: d.cc_final
        }
      });
    return games;
  }

  findGame (id) {
    return this.games.find(g => g.id === id);
  }

  deleteGame (id) {
    this.games = this.games.filter(g => g.id !== id);
  }

  addGameFromAPI (apiGame, seasonType) {
    // ~~ ADD GAME AS A PRE-GAME
    const game = {
      id: apiGame.id,
      team1: teamUtils.getTeamId(apiGame.home.alias),
      team2: teamUtils.getTeamId(apiGame.away.alias),
      season: config.season,
      datetime: apiGame.scheduled,
      playoff: apiGame.playoff || null,
      neutral: 0,
      status: 'pre',
      score1: null,
      score2: null,
      elo1_pre: null,
      elo2_pre: null,
      elo1_post: null,
      elo2_post: null,
      prob1: null,
      prob2: null,
      cc_final: (seasonType === 'CC')
    };

    // ~~ add to running list of db games
    this.games.push(game);
  }

  updateGame (id, updates) {
    this.games = this.games.map(g => {
      if (g.id !== id) return g;
      Object.entries(updates).forEach(update => {
        const [val, col] = update;
        g[val] = col;
      });
      return g;
    });
  }

  handleGameStart (game, team1, team2) {
    if (game.status !== 'pre') return;
    const elo1 = game.elo1_pre || team1.elo;
    const elo2 = game.elo2_pre || team2.elo;
    const eloDiff = this.getEloDiff(elo1, elo2, game.neutral, game.playoff);
    const eloProb1 = this.getEloProb1(eloDiff);
    this.updateGame(game.id, {
      status: 'live',
      elo1_pre: elo1,
      elo2_pre: elo2,
      prob1: eloProb1,
      prob2: (1 - eloProb1)
    });
  }

  handleGameEnd (game, team1, team2, s1, s2) {
    if (!game.elo1_pre || !game.elo2_pre) {
      this.handleGameStart(game, team1, team2);
    }
    const eloDiff = this.getEloDiff(game.elo1_pre, game.elo2_pre, game.neutral, game.playoff);
    const shift = this.getEloShift(s1, s2, eloDiff);
    this.updateGame(game.id, {
      status: 'post',
      score1: s1,
      score2: s2,
      elo1_post: game.elo1_pre + shift,
      elo2_post: game.elo2_pre - shift
    });
  }

  getEloDiff (elo1, elo2, neutral, playoff) {
    let eloDiff = elo1 - elo2;
    eloDiff += (neutral ? 0 : this.HCA);
    eloDiff *= (playoff ? this.PLAYOFF_ELO_MULT : 1);
    return eloDiff;
  }

  getEloProb1 (eloDiff) {
    return 1.0 / (Math.pow(10.0, (-eloDiff / 400.0)) + 1.0);
  }

  getEloSpread (eloDiff) {
    return eloDiff / this.SPREAD_MULT;
  }

  getEloShift (s1, s2, eloDiff) {
    const margin = s1 - s2;
    const homewin = (s1 > s2) ? 1 : 0;
    const result = (homewin * 2) - 1; // ~~ 1 if hometeam wins, -1 if away team wins ~~ //

    const marginMult = Math.abs(margin) ** 0.8;
    const marginExpectedMult = 6.12 + (result * (0.006 * eloDiff));

    const eloProb1 = this.getEloProb1(eloDiff);
    
    const shift = this.K * (marginMult / marginExpectedMult) * (homewin - eloProb1);
    return shift;
  }

  getMissingGameIds (foundIds, seasonType) {
    const missingGameIds = this.games
      .filter(d => d.season === config.season)
      .filter(d => config.season_types_games_filters[seasonType](d))
      .filter(d => !foundIds.includes(d.id))
      .map(d => d.id);
    return missingGameIds;
  }

  updateLeverages (gameLeverages) {
    gameLeverages.forEach(g => {
      this.updateGame(g.id, {
        leverage1: g.team1_leverage,
        leverage2: g.team2_leverage
      });
    });
  }
}

module.exports = Games;
