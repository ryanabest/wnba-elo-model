const config = require('../config.js');
const League = require('./league.js');

const Games = require('../db/games.js');
const gamesDb = new Games();

class Model {
  constructor (opts) {
    this.num_of_sims = opts.num_of_sims || config.numOfSims;
    this.force_run = opts.force_run || false;
    this.games = opts.games || gamesDb.export(config.season);
  }

  run () {
    const league = new League(this.num_of_sims, this.games.filter(d => !d.cc_final));
    league.init(); // this takes the games and creates a team list and a games list
    league.generateKey(); // this generates a unique key based on which games haven't been played yet

    const dbForecasts = require('../db/forecasts.json');
    const forecasts = dbForecasts.filter(d => d.season === config.season);
    const keys = forecasts.map(d => d.key);
    if (!this.force_run && (keys.length > 0) && (keys.indexOf(league.key) > -1)) {
      // don't run the forecast if our current key is already in the database
      console.log(' ~~~ ALREADY RAN THIS FORECAST! GOODBYE! ~~~ ');
      console.log('');
      return this;
    }

    // run the forecast
    console.log('~~~ running forecast ~~~');
    // [this.forecast, this.game_leverages] = league.simulate();
    [this.forecast] = league.simulate();
    console.log('~~~ forecast run finished ~~~');
    console.log('');  
  }
}

module.exports = Model;
