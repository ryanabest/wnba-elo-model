const format = require('./format');

module.exports = {
  logo: function (teamAbbr) {
    return `https://secure.espn.com/combiner/i?img=/i/teamlogos/wnba/500/${this.logoSlugFromAbbr(teamAbbr)}.png&w=56&h=56`;
  },

  logoSlugFromAbbr: function (abbr) {
    switch (abbr) {
      case 'LVA':
        return 'lv';
      case 'LAS':
        return 'la';
      case 'CON':
        return 'conn';
      case 'NYL':
        return 'ny';
      case 'PHO':
        return 'phx';
      default:
        return abbr.toLowerCase();
    }
  },

  // LAS --> Los Angeles Sparks
  lookup: function (abbr) {
    return { ATL: 'Atlanta Dream', CHI: 'Chicago Sky', CON: 'Connecticut Sun', DAL: 'Dallas Wings', IND: 'Indiana Fever', LAS: 'Los Angeles Sparks', LVA: 'Las Vegas Aces', MIN: 'Minnesota Lynx', NYL: 'New York Liberty', PHO: 'Phoenix Mercury', SEA: 'Seattle Storm', WAS: 'Washington Mystics' }[abbr];
  },

  // LAS --> sparks
  slugFromAbbr: function (abbr) {
    return this.slugFromFullName(this.lookup(abbr));
  },

  // Los Angeles Sparks --> sparks
  slugFromFullName: function (name) {
    const strSplit = name.split(' ');
    return format.slugify(strSplit[strSplit.length - 1]);
  },

  // LAS --> Sparks
  nameFromAbbr: function (abbr) {
    const fullName = this.lookup(abbr).split(' ');
    return fullName[fullName.length - 1];
  },
}