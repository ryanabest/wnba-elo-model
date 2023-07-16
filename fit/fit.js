const fs = require('fs');
const path = require('path');

const HCA = 80.0; // ~~ home court advantage
const K = 28.0; // ~~ how fast the team ratings change – this how many points the winning team would gain and the losing team would lose if there were no adjustments based on which team was favored or the margin of victory. So the higher the number, the more ratings change based on recent results
const REVERT = 0.5; // ~~ how much we revert teams between seasons – the higher the number, the closer they go to average at the start of each season
const PLAYOFF_ELO_MULT = 1.25; // ~~ better teams are favored by more in the playoffs – the higher the number, the more good teams are favored in playoffs. 1 is baseline (no more of an advantage for good teams in the playoffs)

const rawGames = require(path.join(__dirname, 'games.json'));

const runEloModel = (games, HCA, K, REVERT, PLAYOFF_ELO_MULT) => {
  // ~~ create a dict that will store (and update) Elo scores and season
  const teams = {};

  games.forEach(game => {
    // ~~ Set baseline Elo for every team – 1500 if they were an original team, 1300 if they were an expansion team (first season was after 1997)
    [game.team1, game.team2].forEach(id => {
      if (!teams[id]) {
        teams[id] = {
          id: id,
          season: game.season,
          elo: (game.season === 1997) ? 1500 : 1300
        };
      }
    });

    // ~~ go find Elo info for both teams
    const team1 = teams[game.team1];
    const team2 = teams[game.team2];

    // ~~ if it's the first game of a new season, revert towards the mean, and set the season to the current one
    [team1, team2].forEach(team => {
      if (team.season && (game.season !== team.season)) {
        team.elo = (1500 * REVERT) + (team.elo * (1 - REVERT));
        team.season = game.season;
      }
    });

    // ~~ set the pre-game Elos for both teams to their most recent Elo scores
    game.elo1_pre = team1.elo;
    game.elo2_pre = team2.elo;

    // ~~ calculate Elo diff, then add adjustments
    let eloDiff = team1.elo - team2.elo;
    eloDiff += ((game.neutral === 1) ? 0 : HCA); // ~~ add homefield advantage if this is not a netural-site game
    eloDiff *= ((game.playoff === 1) ? PLAYOFF_ELO_MULT : 1); // ~~ add playoff multiplier if this is a playoff game

    // ~~ calculate probability of team 1 winning based on Elo diff
    // ~~ this is a set formula used for calculating win pcts --> https://medium.com/cantors-paradise/the-mathematics-of-elo-ratings-b6bfc9ca1dba
    game.prob1 = 1.0 / (Math.pow(10.0, (-eloDiff / 400.0)) + 1.0);

    // ~~ first export shifts without a MOV multiplier
    // ~~ in order to fit elo diff to score diff and calculate the expected margin of victory based on un-adjusted elo diff
    // const movMult = 1;
    // const movMultExpected = 1;

    // ~~ margin of victory multiplier
    // ~~ the formula does account for diminishing returns – going from a 5 to 10-point win matters more than going from a 25 to 30-point win
    // ~~ First, what was their margin of victory?
    const movMult = Math.abs(game.score1 - game.score2) ** 0.8;
    // ~~ What was the winner's _expected_ margin of victory based on the difference in elo vs the other team?
    // ~~ using R, I fit a linear model to x = elo_diff (for winner) and y = abs(score_diff)
    // ~~ this downweights blowouts by teams that we'd expect to win by a lot, and upweights blowouts by teams we wouldn't expect to win by a lot
    // ~~ this should deal with autocorrelation, but to test this I need to check if team's elo ratings before and after monte carlo sims are close to equal
    const movMultExpected = 6.12 + ((game.result1 * 2 - 1) * (0.006 * eloDiff));

    // ~~ calculate how much each team's Elo should shift up (for the winner) and down (for the loser)
    // ~~ shifts take into account the K-factor, margin for victory, and whether the team was an underdog coming in
    const shift = K * (movMult / movMultExpected) * (game.result1 - game.prob1);

    if (game.date === '2022-05-06' && game.team1 === 'WAS') {
      console.log(shift);
    }

    // ~~ shift each team's Elo, and set their post-game Elos to their new shfited score
    team1.elo += shift;
    team2.elo -= shift;
    game.elo1_post = team1.elo;
    game.elo2_post = team2.elo;
  });

  // ~~ brier scores measure the accuracy of probabilistic predictions
  // ~~ it is the mean squared error as applied to the predicted probabilities
  const brier = games.map(game => ((game.result1 - game.prob1) * (game.result1 - game.prob1))).reduce((a, b) => a + b) / games.length;
  const briefRef = games.map(game => ((game.result1 - 0.5) * (game.result1 - 0.5))).reduce((a, b) => a + b) / games.length;

  return [games, brier, briefRef];
};

const flagChamps = (games) => {
  // ~~ sort games by descending date
  // ~~ the last game in each season is the championship clincher by definition
  games = games.reverse();
  let season = games[0].season;
  games.forEach(game => {
    if (game.season === season) {
      game.champ = (game.score1 > game.score2) ? game.team1 : game.team2;
      season -= 1;
    } else {
      game.champ = null;
    }
  });
  return games.reverse();
};

let [games, brier, brierRef] = runEloModel(rawGames, HCA, K, REVERT, PLAYOFF_ELO_MULT);
games = flagChamps(games);
console.log(brier.toFixed(4));
console.log(brierRef.toFixed(4));
console.log(1 - (brier / brierRef));
fs.writeFileSync(path.join(__dirname, 'wnba_elo.json'), JSON.stringify(games));

// ~~ write to csv
const replacer = (key, value) => value === null ? '' : value; // specify how you want to handle null values here
const header = Object.keys(games[0]);
const csv = [
  header.join(','), // header row first
  ...games.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
].join('\r\n');
fs.writeFileSync(path.join(__dirname, 'wnba_elo.csv'), csv);
