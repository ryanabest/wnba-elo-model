module.exports = {
  initSort: function (forecast) {
    return forecast.types.elo.sort((a, b) => {
      if (b.win_finals > a.win_finals) return 1;
      if (b.win_finals < a.win_finals) return -1;
      if (b.make_finals > a.make_finals) return 1;
      if (b.make_finals < a.make_finals) return -1;
      if (this.isPlayoffs(forecast)) {
          if (b.make_semi_finals > a.make_semi_finals) return 1;
          if (b.make_semi_finals < a.make_semi_finals) return -1;
          if (b.make_second_round > a.make_second_round) return 1;
          if (b.make_second_round < a.make_second_round) return -1;
      }
      if (b.make_playoffs > a.make_playoffs) return 1;
      if (b.make_playoffs < a.make_playoffs) return -1;
      if (b.point_diff > a.point_diff) return 1;
      if (b.point_diff < a.point_diff) return -1;
      return 0;
    });
  },

  isPlayoffs: function (forecast) {
    return Math.max(...forecast.types.elo.map(d => (d.wins - d.current_wins) + (d.losses - d.current_losses))) === 0;
  },

  joinOddsAndClinches: (team, field, clinches) => {
    const format = require('./format');
    const number = team[field];
    const clinch = clinches.filter(c => c.typ).find(c => c.typ.includes(field));
    if (clinch && clinch.typ.includes('elim') && number === 0) {
      return {
        number: -1,
        display: '—'
      };
    } else if (clinch && number === 1) {
      return {
        number: 101,
        display: '✓'
      };
    } else {
      return {
        number: number,
        display: `${format.odds(number)}%`
      };
    }
  },

  joinOddsAndPlayoffGameCount: (team, field, playoffGames) => {
    const format = require('./format');
    const number = team[field];
    if (number === 0 && playoffGames === 0) {
      return {
        number: -1,
        display: '—'
      };
    } else if (number === 1) {
      return {
        number: 101,
        display: '✓'
      };
    } else {
      return {
        number: number,
        display: `${format.odds(number)}%`
      };
    }
  },

  add1WeekChange: (weeklyForecasts) => {
    weeklyForecasts.forecasts.forEach((forecast, i) => {
      forecast.types.elo.forEach(team => {
        if (i === (weeklyForecasts.forecasts.length - 1)) {
          team.week_diff = '—';
        } else {
          const prevForecast = weeklyForecasts.forecasts[i + 1].types.elo.find(d => d.name === team.name);
          const diff = Math.round(team.elo) - Math.round(prevForecast.elo);
          team.week_diff = (diff === 0) ? 0 : diff;
        }
      });
    });
    return weeklyForecasts;
  }
};