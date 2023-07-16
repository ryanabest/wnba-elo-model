const utils = require('./utils.js');
const weeklyForecasts = utils.forecast.add1WeekChange(require('../data/weekly_forecasts.json')).forecasts;
const clinches = require('../data/clinches.json');
const games = require('../data/games.json');

class Table {
  constructor () {
    this.tableTemplate = {
      reg: require('../templates/standings/reg/standings-table.pug'),
      pst: require('../templates/standings/pst/standings-table.pug')
    };
    this.forecastSelector = document.getElementById('standings-selector');

    this.initTableSorter();
    this.addEventListener();
  }

  initTableSorter () {
    const tableSorter = new utils.tableSorter.TableSorter(document.querySelector('table#standings'));
    tableSorter.initTableSorter();
  }

  addEventListener () {
    this.forecastSelector
      .addEventListener('change', (e) => {
        this.activeOption = this.forecastSelector.options[this.forecastSelector.selectedIndex];
        this.activeForecast = weeklyForecasts[this.forecastSelector.selectedIndex];
        this.displaySelectedForecast(this.activeForecast);
      });
  }

  displaySelectedForecast (forecast) {
    const isPlayoffs = utils.forecast.isPlayoffs(forecast);
    if (isPlayoffs) {
      document.querySelector('.table-cont').innerHTML = this.tableTemplate.pst({
        utils,
        forecast,
        games
      });
    } else {
      document.querySelector('.table-cont').innerHTML = this.tableTemplate.reg({
        utils,
        forecast,
        clinches
      });
    }
    this.initTableSorter();
  }
}

export { Table };