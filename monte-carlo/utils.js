'use strict';

const getRndmNormalStdDev = () => {
  // https://stackoverflow.com/a/36481059
  let u = 0; let v = 0;
  while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

const avg = (array) => {
  if (array.length === 0) return 0;
  return array.reduce((a, b) => a + b) / array.length;
};

const fixedRound = (number, precision) => {
  if (typeof number === 'undefined') {
    throw new Error();
  }
  const multiplier = Math.pow(10, precision + 1);
  const wholeNumber = Math.floor(number * multiplier);
  return (Math.round(wholeNumber / 10) * 10 / multiplier).toFixed(precision);
};

module.exports = {
  functions: { getRndmNormalStdDev, avg, fixedRound },
  teamLookup: function () {
    return { ATL: 'Atlanta Dream', CHI: 'Chicago Sky', CON: 'Connecticut Sun', DAL: 'Dallas Wings', IND: 'Indiana Fever', LAS: 'Los Angles Sparks', LVA: 'Las Vegas Aces', MIN: 'Minnesota Lynx', NYL: 'New York Libery', PHO: 'Pheonix Mercury', SEA: 'Seattle Storm', WAS: 'Washington Mystics' };
  },
  teamConferenceLookup: function () {
    return { ATL: 'Eastern', CHI: 'Eastern', CON: 'Eastern', DAL: 'Western', IND: 'Eastern', LAS: 'Western', LVA: 'Western', MIN: 'Western', NYL: 'Eastern', PHO: 'Western', SEA: 'Western', WAS: 'Western' };
  }
};
