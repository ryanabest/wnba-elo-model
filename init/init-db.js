const fs = require('fs');
const md5 = require('md5');
const path = require('path');
const config = require('../config');
const wnbaElo = require('../fit/wnba_elo.json').filter(d => d.season < config.season);

// ~~ teams
const teams = [];
wnbaElo
  .filter(d => d.season === (config.season - 1))
  .reverse()
  .forEach(game => {
    if (!teams.find(d => d.id === game.team1)) {
      teams.push({
        id: game.team1,
        elo: game.elo1_post
      });
    }
    if (!teams.find(d => d.id === game.team2)) {
      teams.push({
        id: game.team2,
        elo: game.elo2_post
      });
    }
  });
fs.writeFileSync(path.join(__dirname, '../db/teams.json'), JSON.stringify(teams, null, 4));

// ~~ games
const games = [];
// ~~ first assign playoff slugs to each game
const playoffSeries = {};
const playoffGames = wnbaElo.filter(d => d.playoff).reverse();
playoffGames.forEach(game => {
  if (!playoffSeries[game.season]) playoffSeries[game.season] = [];
  if (!playoffSeries[game.season].includes(`${game.team1}_${game.team2}`) && !playoffSeries[game.season].includes(`${game.team2}_${game.team1}`)) {
    playoffSeries[game.season].push(`${game.team1}_${game.team2}`);
  }
});
const confSemiStructure = ['finals', 'conf_finals', 'conf_finals', 'conf_semis', 'conf_semis', 'conf_semis', 'conf_semis'];
const singleElimStructure = ['finals', 'semis', 'semis', 'second_round', 'second_round', 'first_round', 'first_round'];
const playoffStructure = {
  1997: ['finals', 'semis', 'semis'],
  1998: ['finals', 'semis', 'semis'],
  1999: ['finals', 'conf_finals', 'conf_finals', 'conf_first_round', 'conf_first_round'],
  2000: confSemiStructure,
  2001: confSemiStructure,
  2002: confSemiStructure,
  2003: confSemiStructure,
  2004: confSemiStructure,
  2005: confSemiStructure,
  2006: confSemiStructure,
  2007: confSemiStructure,
  2008: confSemiStructure,
  2009: confSemiStructure,
  2010: confSemiStructure,
  2011: confSemiStructure,
  2012: confSemiStructure,
  2013: confSemiStructure,
  2014: confSemiStructure,
  2015: confSemiStructure,
  2016: singleElimStructure,
  2017: singleElimStructure,
  2018: singleElimStructure,
  2019: singleElimStructure,
  2020: singleElimStructure,
  2021: singleElimStructure,
  2022: ['finals', 'semis', 'semis', 'first_round', 'first_round', 'first_round', 'first_round']
};

wnbaElo.forEach(game => {
  const datetime = new Date(game.date);
  let playoff = null;
  if (game.playoff) {
    const index = Math.max(playoffSeries[game.season].indexOf(`${game.team1}_${game.team2}`), playoffSeries[game.season].indexOf(`${game.team2}_${game.team1}`));
    playoff = playoffStructure[game.season][index];
  }

  games.push({
    id: md5(JSON.stringify(game)),
    team1: game.team1,
    team2: game.team2,
    season: game.season,
    datetime,
    playoff,
    neutral: game.neutral,
    status: 'post',
    score1: game.score1,
    score2: game.score2,
    elo1_pre: game.elo1_pre,
    elo2_pre: game.elo2_pre,
    elo1_post: game.elo1_post,
    elo2_post: game.elo2_post,
    prob1: game.prob1,
    prob2: 1 - game.prob1,
    cc_final: game.cc_final === 1
  });
});
fs.writeFileSync(path.join(__dirname, '../db/games.json'), JSON.stringify(games, null, 4));

// ~~ forecasts
const forecasts = [];
fs.writeFileSync(path.join(__dirname, '../db/forecasts.json'), JSON.stringify(forecasts, null, 4));

// ~~ clinches
const clinches = [];
fs.writeFileSync(path.join(__dirname, '../db/clinches.json'), JSON.stringify(clinches, null, 4));
