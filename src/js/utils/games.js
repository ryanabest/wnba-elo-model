const _ = require('underscore');

module.exports = {
  processGames: (games) => {
    const pre = games
      .filter(d => d.status === 'pre')
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

    // ~~ get the datetime yesterday as of 9am — will filter out "recent" post games separate from post games
    const today = new Date();
    const now = new Date(today.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const latestPostGame = games
      .map(d => {
        const dt = new Date(d.datetime);
        return {
          dt: new Date(dt.toLocaleString('en-US', { timeZone: 'America/New_York' })),
          status: d.status
        };
      })
      .sort((a, b) => b.dt.getTime() - a.dt.getTime())
      .find(d => d.status === 'post');
    
    let minHourDiff;
    let recentDateString;
    let separateRecentPost = false;

    if (latestPostGame) {
      minHourDiff = (now.getTime() - latestPostGame.dt.getTime()) / (1000 * 60 * 60);
      separateRecentPost = minHourDiff <= 20;
      recentDateString = latestPostGame.dt.toLocaleDateString('en-US');
    }

    const post = games
      .filter(d => d.status === 'post')
      .filter(d => {
        if (!separateRecentPost) return true;
        const dt = new Date(d.datetime);
        const dtDateString = dt.toLocaleDateString('en-US', { timeZone: 'America/New_York' });
        return recentDateString !== dtDateString;
      })
      .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

    const recentPost = games
      .filter(d => d.status === 'post')
      .filter(d => {
        if (!separateRecentPost) return false;
        const dt = new Date(d.datetime);
        const dtDateString = dt.toLocaleDateString('en-US', { timeZone: 'America/New_York' });
        return recentDateString === dtDateString;
      })
      .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

    const group = (games) => {
      // let days = [...new Set(games.map(d => new Date(d.datetime).toLocaleDateString('en-US', { timeZone: 'America/New_York' })))]; // unique list of days present for upcoming games
      // if (cutoff) days = days.slice(0, cutoff);
      // games = games.filter(g => days.includes(new Date(g.datetime).toLocaleDateString('en-US', { timeZone: 'America/New_York' })))
      // const grouped = _.groupBy(games, d => new Date(d.datetime).toLocaleDateString('en-US', { timeZone: 'America/New_York' }));
      return _.groupBy(games, d => new Date(d.datetime).toLocaleDateString('en-US', { timeZone: 'America/New_York' }));
    }
    
    return {
      recentPost: group(recentPost),
      pre: group(pre),
      post: group(post)
    };
  },

  getPlayoffRecordByRound: (games, teamAbbr) => {
    const gamesByRound = _.groupBy(games, g => g.playoff);
    const roundRecords = [];
    Object.entries(gamesByRound).forEach(d => {
      const games = d[1];
      const roundWins = games.filter(g => ((g.team1 === teamAbbr) && (g.score1 > g.score2)) || ((g.team2 === teamAbbr) && (g.score2 > g.score1))).length;
      const roundLosses = games.length - roundWins;
      roundRecords.push(`${roundWins}-${roundLosses}`);
    });
    return roundRecords.join(', ');
  },

  getPlayoffSeriesInfo: (game, allGames) => {
    if (!game.playoff) return null; // ~~ only relevant for playoff games
    const seriesGames = allGames.filter(g => (g.playoff === game.playoff) && ((g.team1 === game.team1 && g.team2 === game.team2) || (g.team2 === game.team1 && g.team1 === game.team2))); // ~~ find all the games for this playoff series
    const seriesGamesSorted = seriesGames.sort((a, b) => {
      if (a.datetime > b.datetime) { return 1; }
      if (a.datetime < b.datetime) { return -1; }
      return 0;
    });
    const gameIndex = seriesGamesSorted.findIndex(g => g.id === game.id);
    const postGames = seriesGamesSorted.filter((g, i) => (g.status === 'post') && (i <= gameIndex));
    const team1 = seriesGamesSorted[0].team1;
    const team1Wins = postGames.filter(g => (g.team1 === team1 && g.score1 > g.score2) || (g.team2 === team1 && g.score2 > g.score1)).length;
    const team1Losses = postGames.length - team1Wins;

    const gameNumber = gameIndex + 1;
    const seriesRecord = postGames.length === 0 ? '' : `${Math.max(team1Wins, team1Losses)}-${Math.min(team1Wins, team1Losses)}`;
    // which team do we display the series record next to?
    let seriesTeam;
    if (team1Wins === team1Losses && game.status === 'post') { // if the series is tied and this is a post game, assign the record to the team that won
      seriesTeam = game.score1 > game.score2 ? game.team1 : game.team2;
    } else { // otherwise (series isn't tied or this is in an upcoming game), give it to whoever is winning the series, or the series' home team
      seriesTeam = team1Wins >= team1Losses ? team1 : seriesGamesSorted[0].team2;
    }
    return { gameNumber, seriesRecord, seriesTeam };
  }
}