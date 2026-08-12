// ~~ standalone entry point for refreshing standings.json on its own.
// ~~ the hourly flow doesn't need this — sportradar/parse.js scrapes before it parses.
const ClinchScraper = require('./scraper.js');

const clinchScraper = new ClinchScraper();
clinchScraper.fetchStandings();
