const Runner = require('./runner.js');
const ClinchScraper = require('../clinches/scraper');

const runner = new Runner({});
runner.run();

const clinchScraper = new ClinchScraper();
clinchScraper.scrape();

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