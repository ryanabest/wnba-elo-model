const games = require('../db/games.json');
const config = require('../config');
const season = config.season;

const seasonGames = games.filter(g => g.season === season);
console.log(`Season ${season} has ${seasonGames.length} games in the database.`);

const gamesPerTeam = seasonGames.reduce((acc, g) => {
  acc[g.team1] = (acc[g.team1] || 0) + 1;
  acc[g.team2] = (acc[g.team2] || 0) + 1;
  return acc;
}, {});

const teams = Object.keys(gamesPerTeam);
console.log(`Season ${season} has ${teams.length} teams in the database.`);

const minGames = Math.min(...Object.values(gamesPerTeam));
const maxGames = Math.max(...Object.values(gamesPerTeam));
console.log(`Teams in season ${season} have between ${minGames} and ${maxGames} games in the database.`);

const homeGamesPerTeam = seasonGames.reduce((acc, g) => {
  acc[g.team1] = (acc[g.team1] || 0) + 1;
  return acc;
}, {});

const awayGamesPerTeam = seasonGames.reduce((acc, g) => {
  acc[g.team2] = (acc[g.team2] || 0) + 1;
  return acc;
}, {});

const minHomeGames = Math.min(...Object.values(homeGamesPerTeam));
const maxHomeGames = Math.max(...Object.values(homeGamesPerTeam));
const minAwayGames = Math.min(...Object.values(awayGamesPerTeam));
const maxAwayGames = Math.max(...Object.values(awayGamesPerTeam));

console.log(`Teams in season ${season} have between ${minHomeGames} and ${maxHomeGames} home games in the database.`);
console.log(`Teams in season ${season} have between ${minAwayGames} and ${maxAwayGames} away games in the database.`);