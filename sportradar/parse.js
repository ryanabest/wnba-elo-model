const Runner = require('./runner.js');
const ClinchScraper = require('../clinches/scraper');

const runner = new Runner({});
runner.run();

const clinchScraper = new ClinchScraper();
clinchScraper.scrape();

// ~~ TO-DO: CLINCH SCRAPER RUNS ASYNC, SO BY THE TIME THIS SCRIPT GETS HERE IT'S NOT FINISHED
// ~~ ACTUALLY SCRAPE CLINCHES FIRST, THEN PARSE THEM
if (runner.should_deploy || clinchScraper.should_deploy) {
  const webpack = require('webpack');
  const config = require('../webpack.prod');
  const compiler = webpack(config);
  const ghpages = require('gh-pages');
  
  // ~~ first compile webpack ~~ //
  compiler.run((err, res) => {
    if (err) console.log(err);

    // // ~~ then publish on github pages ~~ //
    ghpages.publish('dist', {
      repo: 'git@github.com:ryanabest/2023-wnba-predictions.git'
    }, (err) => {
      console.log(err);
    });
  });
}