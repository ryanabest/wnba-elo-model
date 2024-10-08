const fs = require('fs');
const path = require('path');
const forecastUtils = require('../src/js/utils/forecast.js');

class Forecasts {
  constructor () {
    this.forecasts = require('./forecasts.json');
  }

  save () {
    const filePath = path.join(__dirname, 'forecasts.json');
    fs.writeFileSync(filePath, JSON.stringify(this.forecasts, null, 4));
  }

  addForecast (forecast, datetime) {
    datetime = datetime || new Date().toISOString();
    if (this.forecasts.find(d => d.key === forecast[0].key)) {
      this.forecasts = this.forecasts.filter(d => d.key !== forecast[0].key)
    }
    
    const exp = {
      last_updated: datetime,
      key: forecast[0].key,
      season: forecast[0].season,
      types: {
          elo: forecast[0].teams
      }
    }

    this.forecasts.unshift(exp);
  }

  getWeeklyForecasts (season) {
    const forecasts = this.forecasts
      .filter(d => d.season === season)
      .sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated));

    const lastUpdated = forecasts[0].last_updated;
    const weeklyForecasts = {
      last_updated: lastUpdated,
      forecasts: [forecasts[0]]
    }
    
    // ~~ loop back week by week and pull latest forecast for that date
    const date = new Date(lastUpdated);
    while(true) {
      date.setDate(date.getDate() - 7);
      const forecast = forecasts.find(d => new Date(d.last_updated) <= date);
      if (!forecast) break; 
      if (weeklyForecasts.forecasts.find(d => d.last_updated === forecast.last_updated)) continue; // handle olympic break skipping a buncha weeks
      weeklyForecasts.forecasts.push(forecast);
    }

    // ~~ make sure we always have the pre-season forecast
    if (weeklyForecasts.forecasts[weeklyForecasts.forecasts.length - 1].key !== forecasts[forecasts.length - 1].key) {
      weeklyForecasts.forecasts.push(forecasts[forecasts.length - 1])
    }

    // ~~ make sure we always have the "start of playoffs" forecast
    const playoffForecasts = forecasts.filter(d => forecastUtils.isPlayoffs(d));
    if (playoffForecasts.length > 0) {
      const firstPlayoffForecast = playoffForecasts
        .sort((a, b) => new Date(a.last_updated) - new Date(b.last_updated))[0];

      if (!weeklyForecasts.forecasts.find(d => d.key === firstPlayoffForecast.key)) {
        weeklyForecasts.forecasts.push(firstPlayoffForecast);
      }
    }

    weeklyForecasts.forecasts = weeklyForecasts.forecasts.sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated))
    

    return weeklyForecasts;
  }
}

module.exports = Forecasts;
