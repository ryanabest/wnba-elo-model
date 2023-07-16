const numUtils = require('./num');
const forecastUtils = require('./forecast');
const dayjs = require('dayjs');
const localizedFormat = require('dayjs/plugin/localizedFormat');
dayjs.extend(localizedFormat);

module.exports = {
  slugify: (str) => {
    return str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').trim();
  },
  publishTime: (datetime) => {
    const day = dayjs(datetime);
    return day.format('lll');
  },
  plusMinus: (number) => {
    return (number <= 0 || isNaN(parseInt(number))) ? number : '+' + number;
  },
  odds: (number) => {
    if (number > 0.99) {
      return '>99';
    }

    if (number < 0.01) {
      return '<1';
    }
    return numUtils.fixedRound(number * 100, 0);
  },
  formatSelectLabels: (forecasts) => {
    const playoffForecasts = forecasts.filter(d => forecastUtils.isPlayoffs(d));
    const withLabels = forecasts.map((forecast, i) => {
      const day = dayjs(forecast.last_updated);
      let label = day.format('MMM D');
      if (i === (forecasts.length - 1)) label = 'Preseason';
      if (playoffForecasts.length > 0) {
        if (forecastUtils.isPlayoffs(forecast) && Math.max(...forecast.types.elo.map(d => d.win_finals)) === 1) label = 'End of playoffs'
        if (forecast.key === playoffForecasts[playoffForecasts.length - 1].key) label = 'Start of playoffs';
      }
      return { forecast, label }
    });
    return withLabels;
  },
  gameDay: (datetime) => {
    const day = dayjs(datetime);
    return day.format('dddd, MMMM D');
  },
  gameTime: (datetime) => {
    const dt = new Date(datetime);
    let timeStr = dt.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' });
    if (timeStr[0] === '0') timeStr = timeStr.substring(1);
    return timeStr;
  },
  eloSpread: (number) => {
    if (number > 0) return '';
    if (number === 0) return 'PK';
    return numUtils.fixedRound(number, 1);
  },
  playoffRoundDisplay: (round) => {
    return {
      first_round: 'First Round',
      semis: 'Semifinals',
      finals: 'Finals'
    }[round]
  }
}