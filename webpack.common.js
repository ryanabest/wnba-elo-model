const fs = require('fs');
const path = require('path');

// https://www.youtube.com/playlist?list=PLblA84xge2_zwxh3XJqy6UVxS60YdusY8
const HtmlWebpackPlugin = require('html-webpack-plugin');
const utils = require('./src/js/utils');

const fetchData = () => {
  const config = require('./config');

  const Games = require('./db/games.js');
  const Teams = require('./db/teams.js');
  const Forecasts = require('./db/forecasts.js');
  const Clinches = require('./db/clinches.js');

  const games = new Games();
  const teams = new Teams();
  const forecasts = new Forecasts();
  const clinches = new Clinches();
  games.teams = teams;

  fs.writeFileSync(path.join(__dirname, './src/data/games.json'), JSON.stringify(games.export(config.season), null, 4));
  fs.writeFileSync(path.join(__dirname, './src/data/weekly_forecasts.json'), JSON.stringify(forecasts.getWeeklyForecasts(config.season), null, 4));
  fs.writeFileSync(path.join(__dirname, './src/data/clinches.json'), JSON.stringify(clinches.export(config.season), null, 4));
}
fetchData();

const weeklyForecasts = utils.forecast.add1WeekChange(require('./src/data/weekly_forecasts.json'));
const clinches = require('./src/data/clinches.json');
const games = require('./src/data/games.json');
// const processedGames = utils.games.processGames(games);

const forecast = weeklyForecasts.forecasts[0];

const templateVars = {
  utils,
  lastUpdated: weeklyForecasts.last_updated,
  clinches,
  games
}

const plugins = [
  new HtmlWebpackPlugin({
    template: './src/templates/index.pug',
    favicon: './src/images/favicon.png',
    templateParameters: Object.assign({
      forecast,
      weeklyForecasts: weeklyForecasts.forecasts,
      page: 'standings'
    }, templateVars)
  }),
  new HtmlWebpackPlugin({
    template: './src/templates/index.pug',
    filename: 'games/index.html',
    favicon: './src/images/favicon.png',
    templateParameters: Object.assign({
      page: 'games',
      cutoff: 7
      // recentPostGames: processedGames.recentPost,
      // preGames: processedGames.pre,
      // postGames: processedGames.post,
    }, templateVars)
  })
];

module.exports = {
  entry: './src/js/app.js',
  module: {
    rules: [
      // Include pug-loader to process the pug files
      {
        test: /\.pug$/,
        use: ['pug-loader']
      },
      {
        test: /\.(png|jpg|gif)$/i,
        type: 'asset/resource'
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource'
      }
    ]
  },
  plugins
};
