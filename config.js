module.exports = {
  season: 2023,
  season_types: ['REG', 'CC', 'PST'],
  season_types_games_filters: {
    REG: (d) => !d.playoff && !d.cc_final,
    CC: (d) => !d.playoff && d.cc_final,
    PST: (d) => d.playoff
  },
  preseason_dates: {
    2022: '2022-05-03T13:00:00.000Z',
    2023: '2023-05-17T13:00:00.000Z'
  },
  numOfSims: 40000
};
