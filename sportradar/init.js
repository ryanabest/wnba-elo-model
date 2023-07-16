const config = require('../config.js');
const Runner = require('./runner.js');

let games = [];
config.season_types.forEach(st => {
    games.push(...require(`./${config.season}_${st}.json`).games);
});
games = games.sort((a, b) => new Date(a.scheduled) - new Date(b.scheduled));

// const games = require(`./${config.season}_REG.json`).games;
const postGames = games.filter(d => d.status === 'closed');
const dates = postGames.map(d => {
    const date = new Date(d.scheduled);
    const nextDay = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }).split(',')[0]); // change time zone to et
    nextDay.setDate(nextDay.getDate() + 1); // set the date to the next morning (want to run as of 9am the next day)
    nextDay.setTime(nextDay.getTime() + ((9*60*60*1000))); // set the time to 9am
    return nextDay.toISOString(); // convert to iso string, which matches the format of the date in the API
});
const uniqDates = [...new Set(dates)];
uniqDates.unshift(config.preseason_dates[config.season]); // add pre-season

uniqDates.forEach((d, i) => {
    // const force = i === 0;
    // const force = (i === uniqDates.length - 1);
    const force = false;
    console.log(d, force);
    const runner = new Runner({ one_off: d, forecast_force_run: force});
    runner.run();
});
const d = uniqDates[0];
const runner = new Runner({ one_off: d, forecast_force_run: true });
runner.run();
console.log(d);