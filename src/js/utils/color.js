const d3Scale = require('d3-scale');

module.exports = {
  cellColor1WeekChange: (number) => {
    const bound = 50;
    if (number < 0) {
      const color = d3Scale.scaleLinear()
        .domain([bound * -1, 0])
        .range(['#f3affb', '#faf1fa']);
      return color(number);
    } else if (number > 0) {
      const color = d3Scale.scaleLinear()
        .domain([0, bound])
        .range(['#f0f7ee', '#a7e29f']);
      return color(number);
    } else if (number === 0) { 
      return '#fffff'
    } else { // for 0 or —
      return 'transparent';
    }
  },

  cellColorWNBA: (pct) => {
    if (pct === 'blank') { return 'transparent'; }
    if (pct === -1) { return 'transparent'; } // eliminations
    if (pct === 101) { return '#fa4d00'; } // clinches
    const color = d3Scale.scaleLinear()
      .domain([0, 1])
      .range(['#FFFFFF', '#fa4d00']);
    return color(pct);
  }
}