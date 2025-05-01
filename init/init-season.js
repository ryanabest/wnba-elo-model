const fs = require('fs');
const path = require('path');
const config = require('../config');
const season = config.season;

const teams = require('../db/teams.json');

const reg = require(`../sportradar/${season}_REG.json`).games;
const cc = require(`../sportradar/${season}_CC.json`).games;
const pst = require(`../sportradar/${season}_PST.json`).games;
const series = require(`../sportradar/${season}_PST_SERIES.json`)
  .series.map(s => {
    const title = s.title.split(' - ')[0];
    const playoff = {
      'First Round': 'first_round',
      'Semifinals': 'semis',
      'WNBA Finals': 'finals'
    }[title];
    const teams = s.participants.map(p => p.team.alias);
    return { playoff, teams };
  });
const games = []; // this will be the list I compile reg, pst and cc games into in a standard format so I can add them to my "db"

// ~~ add expansion teams ~~ //
if (season === 2025) teams.push({id: "GSV"}) // Golden State Valkyries in 2025

// ~~ regular season games ~~ //
reg.forEach(g => {
  if (!teams.find(d => d.id === g.home.alias) || !teams.find(d => d.id === g.away.alias)) return; // ~~ skip unknown teams
  if (g.title && g.title.includes('All-Star Game')) return; // all-star game
  games.push({
    id: g.id,
    team1: g.home.alias,
    team2: g.away.alias,
    datetime: g.scheduled,
    playoff: null,
    cc_final: false,
    venue: g.venue
  });
});

// ~~ commissioner's cup final ~~ //
cc.forEach(g => {
  if (!teams.find(d => d.id === g.home.alias) || !teams.find(d => d.id === g.away.alias)) return; // ~~ skip unknown teams
  games.push({
    id: g.id,
    team1: g.home.alias,
    team2: g.away.alias,
    datetime: g.scheduled,
    playoff: null,
    cc_final: true,
    venue: g.venue
  });
});

// ~~ playoff games ~~ //
pst.forEach(g => {
  if (!teams.find(d => d.id === g.home.alias) || !teams.find(d => d.id === g.away.alias)) return; // ~~ skip unknown teams
  // if (g.status === 'unnecessary') return; // "unnecessary" playoff games
  const playoff = series.find(s => s.teams.includes(g.home.alias) && s.teams.includes(g.away.alias)).playoff;
  games.push({
    id: g.id,
    team1: g.home.alias,
    team2: g.away.alias,
    datetime: g.scheduled,
    playoff,
    cc_final: false,
    venue: g.venue
  });
});

// ~~ add all games (as pre games)
const dbGames = require('../db/games.json');
games.forEach(game => {
  if (game.status === 'postponed') return;
  dbGames.push({
    id: game.id,
    team1: game.team1,
    team2: game.team2,
    season: season,
    datetime: game.datetime,
    playoff: game.playoff,
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
    cc_final: game.cc_final
  });
});
fs.writeFileSync(path.join(__dirname, '../db/games.json'), JSON.stringify(dbGames, 0, 4));

// ~~ revert elo's for every team
const REVERT = 0.5;
teams.forEach(team => {
  const elo = team.elo;
  team.elo = !!elo ? (elo * (1 - REVERT)) + (1500 * REVERT) : 1300; // if this is an expansion team (and therefore didn't have an Elo), give them the default starting Elo of 1300
});
fs.writeFileSync(path.join(__dirname, '../db/teams.json'), JSON.stringify(teams, 0, 4));
