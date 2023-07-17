'use strict';

const md5 = require('md5');
const _ = require('underscore');

const Game = require('./game.js');
const Team = require('./team.js');
const Series = require('./series.js');

class League {
  constructor (numSims, games) {
    this.numSims = numSims;
    this.games = games.sort((a, b) => new Date(a.datetime) - new Date(b.datetime)); // sort games earliest to latest
    this.season = games[0].season;
    this.numGamesInSeason = 40;
  }

  init () {
    [this.teams, this.teamsByAbbr] = this.initTeamList(this.games);
    this.games = this.initGameList(this.games, this.teamsByAbbr);
  }

  initTeamList (games) {
    const teams = [];
    const allTeams = _.chain([_.pluck(games, 'team1'), _.pluck(games, 'team2')])
      .flatten()
      .uniq()
      .value();

    allTeams.forEach(team => {
      const teamGames = games.filter(g => (g.team1 === team) || (g.team2 === team));
      const firstNonPostGame = teamGames.find(g => g.status !== 'post');
      const postGames = teamGames.filter(g => g.status === 'post');
      const lastPostGame = postGames[postGames.length - 1];
      const initElo = firstNonPostGame ? firstNonPostGame[firstNonPostGame.team1 === team ? 'elo1_pre' : 'elo2_pre'] : lastPostGame[lastPostGame.team1 === team ? 'elo1_post' : 'elo2_post'];
      const currentWins = games.filter(g => g.status === 'post' && ((g.team1 === team && g.score1 > g.score2) || (g.team2 === team && g.score2 > g.score1)));
      const currentLosses = games.filter(g => g.status === 'post' && ((g.team1 === team && g.score1 < g.score2) || (g.team2 === team && g.score2 < g.score1)));

      teams.push(new Team({
        abbr: team,
        init_elo: initElo,
        current_wins: currentWins.filter(g => !g.playoff).length,
        current_losses: currentLosses.filter(g => !g.playoff).length,
        current_point_diff: postGames.filter(g => !g.playoff).length > 0 ? postGames.filter(g => !g.playoff).map(g => g.team1 === team ? g.score1 - g.score2 : g.score2 - g.score1).reduce((a, b) => a + b) : 0,
        current_playoff_wins: currentWins.filter(g => g.playoff).length,
        current_playoff_losses: currentLosses.filter(g => g.playoff).length
      }));
    });
    return [teams, _.indexBy(teams, t => t.abbr)];
  }

  initGameList (games, teamsByAbbr) {
    const allGames = [];
    games.forEach(g => {
      g.team1 = teamsByAbbr[g.team1];
      g.team2 = teamsByAbbr[g.team2];
      allGames.push(new Game(g));
    });
    return allGames;
  }

  generateKey () {
    const postGameIds = this.games.filter(g => g.status === 'post').map(g => g.id).sort();
    this.key = md5(postGameIds.join('-'));
  }

  simulate () {
    this.addMissingGames();
    for (let i = 0; i < this.numSims; i++) {
      this.simulateRegularSeason();
      this.calculateRegSeasonStats();
      this.calculatePlayoffOdds();
      this.simulatePlayoffs();
      this.calculatePlayoffStats();
      this.resetSeasonSim();
    }
    this.calcTeamAverages();
    // const gameLeverages = this.calcGameLeverages();
    const forecast = this.compileForecast();
    // return [forecast, gameLeverages];
    return [forecast];
  }

  addMissingGames () {
    let missingHomeGames = [];
    let missingAwayGames = [];
    this.teams.forEach(t => {
      const teamHomeGames = this.games.filter(g => !g.playoff).filter(g => g.team1.abbr === t.abbr);
      const teamAwayGames = this.games.filter(g => !g.playoff).filter(g => g.team2.abbr === t.abbr);
      const teamMissingHomeGames = (this.numGamesInSeason / 2) - teamHomeGames.length;
      const teamMissingAwayGames = (this.numGamesInSeason / 2) - teamAwayGames.length;
      for (let i = 0; i < teamMissingHomeGames; i++) missingHomeGames.push(t);
      for (let i = 0; i < teamMissingAwayGames; i++) missingAwayGames.push(t);
    });

    while (missingHomeGames.length > 0) {
      missingHomeGames = _.shuffle(missingHomeGames); // randomize the order of the home team for this game
      missingAwayGames = _.shuffle(missingAwayGames); // randomize the order of the away team for this game
      const team1 = missingHomeGames.pop(); // pull the last team out of the list .. they will be the home team
      while (_.uniq(missingAwayGames).length > 1 && missingAwayGames[missingAwayGames.length - 1] === team1) missingAwayGames = _.shuffle(missingAwayGames); // make sure the last team in the away list isn't the team we just pulled to be the home team, unless it's the only team left
      const team2 = missingAwayGames.pop(); // pull the last team out of the away list .. they will be the away team
      const opts = { // add this new random game to the schedule between these two teams
        team1: team1,
        team2: team2,
        playoff: false,
        netural: false,
        status: 'pre',
        rand: Math.random() // ~~ add a random number here so the id hash we create is unique
      };
      opts.id = md5(JSON.stringify(opts));
      this.games.push(new Game(opts));
    }
  }

  simulateRegularSeason () {
    this.reg_season_games = this.games.filter(g => !g.playoff);
    this.reg_season_games.forEach(g => g.processGame());
  }

  calculateRegSeasonStats () {
    // calculate wins, losses, and point differential per team
    this.teams.forEach(team => {
      const wins = team.current_wins + this.reg_season_games.filter(g => g.status !== 'post' && ((g.team1 === team && g.sim.homewin) || (g.team2 === team && !g.sim.homewin))).length;
      const losses = team.current_losses + this.reg_season_games.filter(g => g.status !== 'post' && ((g.team1 === team && !g.sim.homewin) || (g.team2 === team && g.sim.homewin))).length;
      const winPct = wins / (wins + losses);
      const teamGames = this.reg_season_games.filter(g => g.status !== 'post' && (g.team1 === team || g.team2 === team));
      let simPointDiff = 0;
      if (teamGames.length > 0) {
        const pointDiffs = teamGames.map(g => g.sim.winning_team === team ? g.sim.margin : g.sim.margin * -1);
        simPointDiff = pointDiffs.reduce((a, b) => a + b);
      }

      team.season_sims.push({
        abbr: team.abbr,
        wins: wins,
        winPct: winPct,
        losses: losses,
        point_diff: (team.current_point_diff + simPointDiff) / (team.current_wins + team.current_losses + teamGames.length),
        elo_end: team.elo
      });
    });
  }

  calculatePlayoffOdds () {
    this.seasonSim = this.teams.map(t => t.season_sims[t.season_sims.length - 1]);
    this.season500Teams = this.seasonSim.filter(t => t.wins >= t.losses).map(t => t.abbr);
    this.season500Games = this.reg_season_games.filter(g => (this.season500Teams.indexOf(g.team1.abbr) > -1 || this.season500Teams.indexOf(g.team2.abbr) > -1));
    const seasonSimSorted = this.seedTeams(this.seasonSim);
    seasonSimSorted.forEach((t, i) => {
      t.seed = i + 1; // which seed did they get this season?
      t.make_playoffs = t.seed <= 8 ? 1 : 0; // eight teams qualify for playoffs
      for (let j = 0; j < this.seasonSim.length; j++) { // for every possible seed they could've gotten...
        t[`seed_${j + 1}`] = i === j ? 1 : 0; // ...flag the seed they got, so we can average these values across simulated seasons
      }
    });
  }

  seedTeams (teamList) {
    // this function takes a list of teams, and passes them thru the tiebreaking process
    // whenever at least one team is eliminated, it'll sort the teams by that tiebreaker, and return that list of sorted teams
    // the process is then started again from the beginning with the new list of teams – if there are any existing ties that need to be sorted, they'll be passed back into this function
    const tiedTeamAbbrs = teamList.map(t => t.abbr);

    // ~~~ TEAM STANDINGS ARE BASED ON OVERALL WIN PERCENTAGE, REGARDLESS OF CONFERENCE ~~ //
    teamList.forEach(t => {
      t.sortVals = {};
      t.tiebreakerAgainst = tiedTeamAbbrs;
    });
    const teamsByWinPct = _.groupBy(teamList, d => d.winPct);
    if (Object.keys(teamsByWinPct).length !== 1) {
      return this.sortTeamsByTiebreaker(teamsByWinPct);
    }

    // ~~ FIRST TIE-BREAKER IS WIN PCT IN HEAD TO HEAD MATCHUP AMONG TIED TEAMS ~~ //
    const h2hGames = this.reg_season_games.filter(g => (tiedTeamAbbrs.indexOf(g.team1.abbr) > -1) && (tiedTeamAbbrs.indexOf(g.team2.abbr) > -1));
    const h2hPost = h2hGames.filter(g => g.status === 'post');
    const h2hUpcoming = h2hGames.filter(g => g.status !== 'post');
    teamList.forEach(t => {
      this.calcWinPctH2h(t, h2hPost, h2hUpcoming);
      t.tiebreakerAgainst = tiedTeamAbbrs;
    });
    const teamsByH2hPct = _.groupBy(teamList, d => d.sortVals.winPctH2h);
    if (Object.keys(teamsByH2hPct).length !== 1) { // if this tie breaker successfully split teams into groups, deal with those groups
      return this.sortTeamsByTiebreaker(teamsByH2hPct); // sort teams within each tiebreaker val, starting from the beginning for teams that are still tied
    } // if this tie breaker didn't successfully split up any teams, continue on to next tiebreaker below

    // ~~ SECOND TIE-BREAKER IS WIN PERCENTAGE AGAINST TEAMS THAT FINISHED THE SEASON .500 OR ABOVE ~~//
    teamList.forEach(t => {
      this.calcWinPct500(t, this.season500Games);
      t.tiebreakerAgainst = tiedTeamAbbrs;
    });
    const teamsByWinPct500 = _.groupBy(teamList, d => d.sortVals.winPct500);
    if (Object.keys(teamsByWinPct500).length !== 1) {
      return this.sortTeamsByTiebreaker(teamsByWinPct500);
    }

    // ~~ THIRD TIE-BREAKER IS AGGREGATE POINT DIFFERENTIAL IN GAMES AMONG TIED TEAMS ~~ //
    teamList.forEach(t => {
      this.calcPointDiffH2h(t, h2hPost, h2hUpcoming);
      t.tiebreakerAgainst = tiedTeamAbbrs;
    });
    const teamsByPointDiffH2h = _.groupBy(teamList, d => d.sortVals.pointDiffH2h);
    if (Object.keys(teamsByPointDiffH2h).length !== 1) {
      return this.sortTeamsByTiebreaker(teamsByPointDiffH2h);
    }

    // ~~ FOURTH TIE-BREAKER IS AGGREGATE POINT DIFFERENTIAL IN ALL GAMES ~~ //
    teamList.forEach(t => {
      this.calcPointDiffAll(t);
      t.tiebreakerAgainst = tiedTeamAbbrs;
    });
    const teamsByPointDiffAll = _.groupBy(teamList, d => d.sortVals.pointDiffAll);
    if (Object.keys(teamsByPointDiffAll).length !== 1) {
      return this.sortTeamsByTiebreaker(teamsByPointDiffAll);
    }

    // ~~ LAST TIE-BREAKER IS RANDOMNESS (COIN FLIP) ~~ //
    return _.shuffle(teamList);
  }

  sortTeamsByTiebreaker (teamsByTiebreaker) {
    // teamsByTiebreaker is a dictionary of all teams, grouped by the value for the specific tiebreaker we're looking at
    let sortedTeams = [];
    Object.keys(teamsByTiebreaker).sort((a, b) => b - a) // first, sort all the tiebreaker values
      .forEach(tiebreakerVal => {
        const teams = teamsByTiebreaker[tiebreakerVal]; // which team(s) have that tiebreaker val?
        if (teams.length === 1) { // there is only one team that has this tiebreaker value
          sortedTeams.push(teams[0]); // we can add that team to our main list
        } else { // if there are multiple teams tied with the same tiebreaker value
          sortedTeams = sortedTeams.concat(this.seedTeams(teams)); // re-start the tied teams through the tiebreaking process
        }
      });
    return sortedTeams;
  }

  calcWinPctH2h (team, h2hPost, h2hUpcoming) {
    // first tie-breaker is winning percentage among all head-to-head games involving tied teams
    const h2hPostTeam = h2hPost.filter(g => g.team1.abbr === team.abbr || g.team2.abbr === team.abbr);
    const h2hUpcomingTeam = h2hUpcoming.filter(g => g.team1.abbr === team.abbr || g.team2.abbr === team.abbr);
    const winsPost = h2hPostTeam.filter(g => (g.team1.abbr === team.abbr && g.score1 > g.score2) || (g.team2.abbr === team.abbr && g.score2 > g.score1)).length;
    const winsUpcoming = h2hUpcomingTeam.filter(g => (g.team1.abbr === team.abbr && g.sim.homewin) || (g.team2.abbr === team.abbr && !g.sim.homewin)).length;
    team.sortVals.winPctH2h = (winsPost + winsUpcoming) / (h2hPostTeam.length + h2hUpcomingTeam.length);
  }

  calcWinPct500 (team, games500) {
    // second tie-breaker is winning pct against teams with a .500 record or better at the end of the season
    const team500Games = games500.filter(g => g.team1.abbr === team.abbr || g.team2.abbr === team.abbr);
    const games500Post = team500Games.filter(g => g.status === 'post');
    const games500Upcoming = team500Games.filter(g => g.status !== 'post');

    const wins500Post = games500Post.filter(g => ((g.team1.abbr === team.abbr) && (g.score1 > g.score2)) || ((g.team2.abbr === team.abbr) && (g.score2 > g.score1))).length;
    const wins500Upcoming = games500Upcoming.filter(g => ((g.team1.abbr === team.abbr) && g.sim.homewin) || ((g.team2.abbr === team.abbr) && !g.sim.homewin)).length;
    team.sortVals.winPct500 = (wins500Post + wins500Upcoming) / (games500Post.length + games500Upcoming.length);
  }

  calcPointDiffH2h (team, h2hPost, h2hUpcoming) {
    // third tie-breaker is point differential in games involving tied teams
    const pointDiffPost = h2hPost
      .filter(g => g.team1.abbr === team.abbr || g.team2.abbr === team.abbr)
      .map(g => g.team1.abbr === team.abbr ? g.score1 - g.score2 : g.score2 - g.score1)
      .reduce((sum, value) => { return sum + value; }, 0);
    const pointDiffUpcoming = h2hUpcoming
      .filter(g => g.team1.abbr === team.abbr || g.team2.abbr === team.abbr)
      .map(g => g.sim.winning_team.abbr === team.abbr ? g.sim.margin : g.sim.margin * -1)
      .reduce((sum, value) => { return sum + value; }, 0);
    team.sortVals.pointDiffH2h = pointDiffPost + pointDiffUpcoming;
  }

  calcPointDiffAll (team) {
    // fourth tie-breaker is point differential in all games
    const teamGames = this.reg_season_games.filter(g => (g.team1.abbr === team.abbr) || (g.team2.abbr === team.abbr));
    const pointDiffPostAll = teamGames.filter(g => g.status === 'post')
      .map(g => g.team1.abbr === team.abbr ? g.score1 - g.score2 : g.score2 - g.score1)
      .reduce((sum, value) => { return sum + value; }, 0);
    const pointDiffUpcomingAll = teamGames.filter(g => g.status !== 'post')
      .map(g => g.sim.winning_team.abbr === team.abbr ? g.sim.margin : g.sim.margin * -1)
      .reduce((sum, value) => { return sum + value; }, 0);
    team.sortVals.pointDiffAll = pointDiffPostAll + pointDiffUpcomingAll;
  }

  simulatePlayoffs () {
    // https://www.wnba.com/news/wnba-approves-new-playoff-format/
    const playoffTeams = this.seasonSim
      .filter(t => t.make_playoffs)
      .sort((a, b) => a.seed - b.seed)
      .map(t => this.teamsByAbbr[t.abbr]);

    const completedPlayoffGames = this.games.filter(g => g.playoff && g.status === 'post');
    const scheduledPlayoffGames = this.games.filter(g => g.playoff && g.status !== 'post');

    this.playoffs = { round_winners: {}, all_playoff_games: [] };

    // ~~ FIRST ROUND — three games — [1v8 / 4v5] ~ [3v6 / 2v7] ~~ //
    const bracketOneRoundOne = [];
    const oneEight = new Series({
      round: 'first_round',
      games_length: 3,
      team1: playoffTeams[0],
      team2: playoffTeams[7],
      completed_games: completedPlayoffGames,
      scheduled_games: scheduledPlayoffGames
    });
    const fourFive = new Series({
      round: 'first_round',
      games_length: 3,
      team1: playoffTeams[3],
      team2: playoffTeams[4],
      completed_games: completedPlayoffGames,
      scheduled_games: scheduledPlayoffGames
    });
    bracketOneRoundOne.push(oneEight, fourFive);

    const bracketTwoRoundOne = [];
    const threeSix = new Series({
      round: 'first_round',
      games_length: 3,
      team1: playoffTeams[2],
      team2: playoffTeams[5],
      completed_games: completedPlayoffGames,
      scheduled_games: scheduledPlayoffGames
    });
    const twoSeven = new Series({
      round: 'first_round',
      games_length: 3,
      team1: playoffTeams[1],
      team2: playoffTeams[6],
      completed_games: completedPlayoffGames,
      scheduled_games: scheduledPlayoffGames
    });
    bracketTwoRoundOne.push(threeSix, twoSeven);

    [bracketOneRoundOne, bracketTwoRoundOne].forEach(bracket => {
      bracket.forEach(s => {
        s.simulate();
        s.games.forEach(g => this.playoffs.all_playoff_games.push(g));
      });
    });

    this.playoffs.round_winners.round_one = {};
    this.playoffs.round_winners.round_one.bracket_one = bracketOneRoundOne
      .map(s => s.series_winner)
      .sort((a, b) => a.season_sims[a.season_sims.length - 1].seed - b.season_sims[b.season_sims.length - 1].seed);

    this.playoffs.round_winners.round_one.bracket_two = bracketTwoRoundOne
      .map(s => s.series_winner)
      .sort((a, b) => a.season_sims[a.season_sims.length - 1].seed - b.season_sims[b.season_sims.length - 1].seed);

    // ~~ SEMIS — five games — [1v8 winner / 4v5 winner] ~ [3v6 winner / 2v7 winner] ~~ //
    const semis = [];
    const bracketOneSemi = new Series({
      round: 'semis',
      games_length: 5,
      team1: this.playoffs.round_winners.round_one.bracket_one[0],
      team2: this.playoffs.round_winners.round_one.bracket_one[1],
      completed_games: completedPlayoffGames,
      scheduled_games: scheduledPlayoffGames
    });
    const bracketTwoSemi = new Series({
      round: 'semis',
      games_length: 5,
      team1: this.playoffs.round_winners.round_one.bracket_two[0],
      team2: this.playoffs.round_winners.round_one.bracket_two[1],
      completed_games: completedPlayoffGames,
      scheduled_games: scheduledPlayoffGames
    });
    semis.push(bracketOneSemi, bracketTwoSemi);

    semis.forEach(s => {
      s.simulate();
      s.games.forEach(g => this.playoffs.all_playoff_games.push(g));
    });

    this.playoffs.round_winners.semis = semis
      .map(s => s.series_winner)
      .sort((a, b) => a.season_sims[a.season_sims.length - 1].seed - b.season_sims[b.season_sims.length - 1].seed);

    // ~~ FINALS — five games — Lower v. Higher ~~ //
    this.playoffs.finals = new Series({
      round: 'finals',
      games_length: 5,
      team1: this.playoffs.round_winners.semis[0],
      team2: this.playoffs.round_winners.semis[1],
      completed_games: completedPlayoffGames,
      scheduled_games: scheduledPlayoffGames
    });
    this.playoffs.finals.simulate();
    this.playoffs.finals.games.forEach(g => this.playoffs.all_playoff_games.push(g));
    this.playoffs.round_winners.finals = this.playoffs.finals.series_winner;
  }

  calculatePlayoffStats () {
    const semiTeams = _.flatten(Object.values(this.playoffs.round_winners.round_one));
    this.teams.forEach(t => {
      const seasonSim = t.season_sims[t.season_sims.length - 1];
      const playoffCols = ['win_finals', 'make_finals', 'make_semis'];
      playoffCols.forEach(col => { seasonSim[col] = 0; });

      // populate playoff cols based on playoff performance
      if (this.playoffs.round_winners.finals.abbr === t.abbr) { // ~~ FINALS WINNERS ~~ //
        playoffCols.forEach(col => { seasonSim[col] = 1; });
      } else if (this.playoffs.round_winners.semis.findIndex(d => d.abbr === t.abbr) > -1) { // ~~ MADE FINALS, BUT DIDN'T WIN ~~ //
        seasonSim.make_finals = 1;
        seasonSim.make_semis = 1;
      } else if (semiTeams.findIndex(d => d.abbr === t.abbr) > -1) { // ~~ MADE SEMIS, BUT NOT FINALS ~~ //
        seasonSim.make_semis = 1;
      }
    });
  }

  calcTeamAverages () {
    this.teams.forEach(t => {
      const avg = (key) => {
        return t.season_sims
          .map(d => d[key])
          .reduce((a, b) => a + b) / t.season_sims.length;
      };
      t.wins = avg('wins');
      t.losses = avg('losses');
      t.point_diff = avg('point_diff');
      t.elo_end = avg('elo_end');
      t.make_playoffs = avg('make_playoffs');
      t.make_semis = avg('make_semis');
      t.make_finals = avg('make_finals');
      t.win_finals = avg('win_finals');

      // console.log([t.abbr, t.init_elo, t.init_elo - t.elo_end]);

      // const utils = require('./utils.js');
      // console.log(
      //   [
      //     t.abbr,
      //     utils.functions.fixedRound(t.make_playoffs * 100, 2),
      //     utils.functions.fixedRound(t.make_semis * 100, 2),
      //     utils.functions.fixedRound(t.make_finals * 100, 2),
      //     utils.functions.fixedRound(t.win_finals * 100, 2)
      //   ]
      // );

      for (let i = 0; i < this.teams.length; i++) {
        const seed = i + 1;
        t[`seed_${seed}`] = avg(`seed_${seed}`);
      }
    });
  }

  calcGameLeverages () {
    const gameLeverages = [];
    const nonPostGames = this.games.filter(g => g.status === 'pre');
    nonPostGames.forEach(game => {
      // ~~ who is each team
      const team1 = this.teamsByAbbr[game.team1.abbr];
      const team2 = this.teamsByAbbr[game.team2.abbr];

      // ~~ these will be the percentage of simulations where they won the finals and make the playoffs, based on the outcome of the game
      const team1Wins = { next_benchmark: 0, win_finals: 0 };
      const team1Losses = { next_benchmark: 0, win_finals: 0 };
      const team2Wins = { next_benchmark: 0, win_finals: 0 };
      const team2Losses = { next_benchmark: 0, win_finals: 0 };

      // ~~ these will be counts of games won by each team
      let team1SimWins = 0;
      let team2SimWins = 0;

      if (!game.playoff) {
        game.season_sims.forEach((gameSim, i) => { // ~~ for every simulation of this game
          if (gameSim.winning_team.abbr === team1.abbr) { // ~~ if team1 won
            team1SimWins += 1; // ~~ count it in the running tally of team 1 wins
            team1Wins.next_benchmark += team1.season_sims[i].make_playoffs; // ~~ did team1 make the playoffs in this simualtion?
            team1Wins.win_finals += team1.season_sims[i].win_finals; // ~~ did team1 win the finals in this simualtion?
            team2Losses.next_benchmark += team2.season_sims[i].make_playoffs; // ~~ did team2 make the playoffs in this simualtion?
            team2Losses.win_finals += team2.season_sims[i].win_finals; // ~~ did team2 win the finals in this simualtion?
          } else { // ~~ now do the same for games where team2 won
            team2SimWins += 1;
            team1Losses.next_benchmark += team1.season_sims[i].make_playoffs;
            team1Losses.win_finals += team1.season_sims[i].win_finals;
            team2Wins.next_benchmark += team2.season_sims[i].make_playoffs;
            team2Wins.win_finals += team2.season_sims[i].win_finals;
          }
        });
      } else {
        const nextRound = {
          first_round: 'make_semis',
          semis: 'make_finals'
        };
        const playoffGame = this.playoffs.all_playoff_games.find(g => g.id === game.id);
        if (!playoffGame) return;
        playoffGame.season_sims.forEach((gameSim, i) => { // ~~ for every simulation of this game
          if (!gameSim.winning_team) return;
          if (gameSim.winning_team.abbr === team1.abbr) { // ~~ if team1 won
            team1SimWins += 1; // ~~ count it in the running tally of team 1 wins
            team1Wins.win_finals += team1.season_sims[i].win_finals; // ~~ did team1 win the finals in this simualtion?
            team2Losses.win_finals += team2.season_sims[i].win_finals; // ~~ did team2 win the finals in this simualtion?
            if (nextRound[game.playoff]) {
              team1Wins.next_benchmark += team1.season_sims[i][nextRound[game.playoff]]; // ~~ did team1 make the next round in this simualtion?
              team2Losses.next_benchmark += team2.season_sims[i][nextRound[game.playoff]]; // ~~ did team2 make the next round in this simualtion?
            }
          } else if (gameSim.winning_team.abbr === team2.abbr) { // ~~ now do the same for games where team2 won
            team2SimWins += 1;
            team1Losses.win_finals += team1.season_sims[i].win_finals;
            team2Wins.win_finals += team2.season_sims[i].win_finals;
            if (nextRound[game.playoff]) {
              team1Losses.next_benchmark += team1.season_sims[i][nextRound[game.playoff]];
              team2Wins.next_benchmark += team2.season_sims[i][nextRound[game.playoff]];
            }
          }
        });
      }

      const baselines = {
        team1: {
          next_benchmark: (team1Wins.next_benchmark + team1Losses.next_benchmark) / (team1SimWins + team2SimWins),
          win_finals: (team1Wins.win_finals + team1Losses.win_finals) / (team1SimWins + team2SimWins)
        },
        team2: {
          next_benchmark: (team2Wins.next_benchmark + team2Losses.next_benchmark) / (team1SimWins + team2SimWins),
          win_finals: (team2Wins.win_finals + team2Losses.win_finals) / (team1SimWins + team2SimWins)
        }
      };

      const swings = {
        up: {
          team1: Math.max((team1Wins.next_benchmark / team1SimWins) - baselines.team1.next_benchmark, (team1Wins.win_finals / team1SimWins) - baselines.team1.win_finals),
          team2: Math.max((team2Wins.next_benchmark / team2SimWins) - baselines.team2.next_benchmark, (team2Wins.win_finals / team2SimWins) - baselines.team2.win_finals)
        },
        down: {
          team1: Math.min((team1Losses.next_benchmark / team2SimWins) - baselines.team1.next_benchmark, (team1Losses.win_finals / team2SimWins) - baselines.team1.win_finals),
          team2: Math.min((team2Losses.next_benchmark / team1SimWins) - baselines.team2.next_benchmark, (team2Losses.win_finals / team1SimWins) - baselines.team2.win_finals)
        }
      };

      const eloDiff = game.calcEloDiff();
      const prob1 = game.calcProb1(eloDiff);

      const team1Leverage = Math.abs(swings.up.team1) + Math.abs(swings.down.team1) >= 1 ? 0.5 : (Math.abs(swings.up.team1) * prob1) + (Math.abs(swings.down.team1) * (1 - prob1));
      const team2Leverage = Math.abs(swings.up.team2) + Math.abs(swings.down.team2) >= 1 ? 0.5 : (Math.abs(swings.up.team2) * (1 - prob1)) + (Math.abs(swings.down.team2) * prob1);

      const gameLeverageObj = {
        id: game.id,
        team1_leverage: team1Leverage,
        team2_leverage: team2Leverage
      };

      // ~~ return the results
      gameLeverages.push(gameLeverageObj);
    });

    return gameLeverages;
  }

  compileForecast () {
    if (!this.key) this.generateKey();

    const forecast = this.teams.map(t => {
      return {
        name: t.abbr,
        conference: t.conference,
        elo: t.init_elo,
        current_wins: t.current_wins,
        current_losses: t.current_losses,
        wins: t.wins,
        losses: t.losses,
        point_diff: t.point_diff,
        make_playoffs: t.make_playoffs,
        seed_1: t.seed_1,
        seed_2: t.seed_2,
        seed_3: t.seed_3,
        seed_4: t.seed_4,
        seed_5: t.seed_5,
        seed_6: t.seed_6,
        seed_7: t.seed_7,
        seed_8: t.seed_8,
        seed_9: t.seed_9,
        seed_10: t.seed_10,
        seed_11: t.seed_11,
        seed_12: t.seed_12,
        make_semi_finals: t.make_semis,
        make_finals: t.make_finals,
        win_finals: t.win_finals
      };
    });
    return [{ type: 'elo', season: this.season, key: this.key, teams: forecast }];
  }

  resetSeasonSim () {
    this.reset();
    this.teams.forEach(t => t.reset());
    this.games.forEach(g => g.reset());
    return this;
  }

  reset () {
    this.seasonSim = null;
    this.season500Teams = null;
    this.season500Games = null;
    this.playoffSeries = null;
  }
}

module.exports = League;
