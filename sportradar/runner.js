const fs = require('fs');
const path = require('path');

const config = require('../config.js');
const Games = require('../db/games.js');
const Teams = require('../db/teams.js');
const Forecasts = require('../db/forecasts.js');
const Model = require('../monte-carlo/model.js');

const series = require(`./${config.season}_PST_SERIES.json`)
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

class Runner {
  constructor (opts) {
    this.one_off = opts.one_off || null;
    this.season = config.season;
    this.pre_season = opts.pre_season || null;
    this.forecast_force_run = opts.forecast_force_run || false;
  }

  run () {
    // ~~ classes that will control updating and saving data in my "database"
    const games = new Games();
    const teams = new Teams();
    const forecasts = new Forecasts();
    games.teams = teams;

    this.should_deploy = false;
    this.updated_games = false;
    this.updated_teams = false;
    this.should_email = true;
    this.save_data = true;

    config.season_types.forEach(seasonType => {
      const apiGames = require(`./${this.season}_${seasonType}.json`).games;
      const foundIds = [];

      apiGames.forEach(apiGame => {
        if (apiGame.title && apiGame.title.includes('All-Star Game')) return; // all-star game

        const team1 = teams.findTeam(apiGame.home.alias);
        const team2 = teams.findTeam(apiGame.away.alias);
        if (!team1 || !team2) return; // ~~ skip next game if there are unrecognized teams playing ~~ //

        // ~~ add playoff round name to apiGame object ~~ //
        if (seasonType === 'PST') {
          const playoff = series.find(s => s.teams.includes(apiGame.home.alias) && s.teams.includes(apiGame.away.alias)).playoff;
          apiGame.playoff = playoff;
        }

        // ~~ add game id to list of games we have in the api
        // ~~ we'll use this later to clear out games from the database that aren't in the api
        foundIds.push(apiGame.id);

        // ~~ find game from db based on api id
        let game = games.findGame(apiGame.id);

        /// /////////////////////////////////////////// ///
        /// / ~~~ ADDING & REMOVING GAMES FROM DB ~~~ / ///
        /// /////////////////////////////////////////// ///

        // ~~ DELETE GAME IF IT'S POSTPONED ~~ //
        const isPostponed = apiGame.status === 'postponed';
        if (game && (game.status === 'pre') && isPostponed) {
          // ~~ TO-DO: ADD MESSAGE OF SOME KIND
          games.deleteGame(game.id);
          this.should_deploy = true;
          this.updated_games = true;
          return; // ~~ SKIP TO THE NEXT GAME ~~ //
        }

        // ~~ DELETE GAME IF API HAS DIFFERENT TEAMS IN THE GAME ~~ //
        // ~~ usually just going to be home/away team switched ~~ //
        if (game && (game.status === 'pre') && ((game.team1 !== team1.id) || (game.team2 !== team2.id))) {
          // TO-DO: ADD MESSAGE OF SOME KIND
          games.deleteGame(game.id);
          game = null; // ~~ set game as null so it gets re-added with the right teams in the next step
          this.should_deploy = true;
          this.updated_games = true;
        }

        // ~~ DELETE GAME IF IT IS MARKED AS "UNNECESSARY" ~~ //
        if (game && (game.status === 'pre') && (apiGame.status === 'unnecessary')) {
          // TO-DO: ADD MESSAGE OF SOME KIND
          games.deleteGame(game.id);
          game = null;
          this.should_deploy = true;
          this.updated_games = true;
        }

        // ~~ ADD GAME IF IT IS MISSING (INCLUDES RESCHEDULED GAMES) ~~ //
        if (!game && (apiGame.status === 'scheduled') && (!isPostponed)) {
          // TO-DO: ADD MESSAGE OF SOME KIND
          games.addGameFromAPI(apiGame, seasonType);
          game = games.findGame(apiGame.id);
          this.should_deploy = true;
          this.updated_games = true;
          this.forecast_force_run = true; // ~~ force a forecast run if we're adding a new game, since we need to recalculate leverages
        } else if (!game) {
          return; // ~~ skip this game if we don't have a record for it, but we don't want to add it to our db ~~ //
        }

        /// ///////////////////////// ///
        /// / ~~~ PROCESS GAMES ~~~ / ///
        /// ///////////////////////// ///

        // ~~ CHANGE DATETIME OF GAME IF NECESSARY ~~ //
        if ((game.datetime !== apiGame.scheduled) && (game.status !== 'post')) {
          // TO-DO: ADD MESSAGE OF SOME KIND
          games.updateGame(game.id, { datetime: apiGame.scheduled });
          this.should_deploy = true;
          this.updated_games = true;
        }

        // ~~ UPDATE THE GAME TO POST WHEN IT IS OVER ~~ //
        if (apiGame.status === 'closed') {
          if (this.one_off && (new Date(apiGame.scheduled) >= new Date(this.one_off))) {
            return; // ~~ skip game if we're running a "one-off" forecast and this game is after the one-off date
          }
          if (game.status !== 'post') { // ~~ UPDATE THE GAME TO POST WHEN IT IS OVER ~~ //
            // TO-DO: ADD MESSAGE OF SOME KIND
            // const note = Object.assign({ subject: `${new Date().toISOString()} 📢 ~GAME ENDED~ : ${team2.id} @ ${team1.id} (${apiGame.away_points}-${apiGame.home_points}) -- ${game.id}`}, this.email_options);
            games.handleGameEnd(game, team1, team2, apiGame.home_points, apiGame.away_points);
            teams.updateTeam(team1.id, { elo: game.elo1_post });
            teams.updateTeam(team2.id, { elo: game.elo2_post });
            this.should_deploy = true;
            this.updated_games = true;
            this.updated_teams = true;
            if (seasonType === 'CC') this.forecast_force_run = true; // ~~ need to force a run for commissioner's cup finals, since they are not included in the games but the elos update
          }

          // ~~ IF THE API SCORE IS DIFF THAN OUR GAME SCORE FOR POST GAMES, UPDATE GAME ~~ //
          if ((game.status === 'post') && (game.score1) && ((game.score1 !== apiGame.home_points) || (game.score2 !== apiGame.away_points))) {
            // TO-DO: ADD MESSAGE OF SOME KIND
            // ~~ ONLY UPDATE IF IT'S WITHIN 24 HOURS OF THE GAME ~~ //
            if ((new Date().getTime() - new Date(game.datetime).getTime()) < (60 * 60 * 24)) {
              games.handleGameEnd(game, team1, team2, apiGame.home_points, apiGame.away_points);
              teams.updateTeam(team1.id, { elo: game.elo1_post });
              teams.updateTeam(team2.id, { elo: game.elo2_post });
              this.should_deploy = true;
              this.updated_games = true;
              this.updated_teams = true;
              this.forecast_force_run = true; // ~~ need to force a run since we will already have a forecast ran with the wrong score for this game
            }
          }
        } // ~~ closes if API game is final
      }); // ~~ closes apiGame loop

      /// ////////////////////////////////// ///
      /// / ~~~ DELETE UNMATCHED GAMES ~~~ / ///
      /// ////////////////////////////////// ///

      const missingGameIds = games.getMissingGameIds(foundIds, seasonType);
      if (missingGameIds.length > 3) {
        // TO-DO: ADD MESSAGE OF SOME KIND
        // ~~ if there are more than three games in the database that are missing from the API, ping Slack instead of deleting them so we can investigate
        // console.log(' ~~~ LOTS OF MISSING GAMES: ~~~ ');
        // missingGameIds.forEach(id => console.log(id));
      } else {
        missingGameIds.forEach(id => {
          const game = games.findGame(id);
          if (game.status === 'pre') {
            // TO-DO: ADD MESSAGE OF SOME KIND
            games.deleteGame(id);
            this.should_deploy = true;
            this.updated_games = true;
          }
        });
      }
    }); // ~~ closes seasonType loop

    if (this.should_deploy || this.forecast_force_run) {
      let gamesForModel = games.export(config.season);
      const firstPlayoffGame = gamesForModel.find(d => d.playoff);
      if (this.one_off && firstPlayoffGame && (new Date(this.one_off) < new Date(firstPlayoffGame.datetime))) { // if it's not a playoff game
        gamesForModel = gamesForModel.filter(d => !d.playoff); // exclude scheduled playoff games from model if the oneoff date is before the start of the playoffs
      } else if (firstPlayoffGame && this.one_off) { // if it is a playoff game
        gamesForModel = gamesForModel.filter(d => (new Date(d.datetime) <= new Date(this.one_off))); // don't include future playoff games
      }
      const model = new Model({
        force_run: this.forecast_force_run,
        games: gamesForModel
      });
      model.run();
      if (!model.forecast) return this;

      forecasts.addForecast(model.forecast, this.one_off);

      // if (this.one_off) {
      //   const filePath = path.join(__dirname, `../archive/forecasts/${this.one_off}.json`);
      //   fs.writeFileSync(filePath, JSON.stringify(model.forecast, null, 4));
      // }

      games.updateLeverages(model.game_leverages);
      this.updates_teams = true;
      this.updated_games = true;

      fs.writeFileSync(path.join(__dirname, '../src/data/games.json'), JSON.stringify(games.export(config.season), null, 4));
      fs.writeFileSync(path.join(__dirname, '../src/data/weekly_forecasts.json'), JSON.stringify(forecasts.getWeeklyForecasts(config.season), null, 4));
    }

    if (this.save_data) {
      if (this.should_deploy || this.forecast_force_run) forecasts.save(this.one_off);
      if (this.updated_games) games.save();
      if (this.updated_teams) teams.save();
    }
  }
}

module.exports = Runner;
