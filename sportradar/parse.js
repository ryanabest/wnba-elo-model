const Runner = require('./runner.js');
const ClinchScraper = require('../clinches/scraper');
const config = require('../config.js');

(async () => {
  const runner = new Runner({});
  runner.run();

  // ~~ awaited so the clinch scrape + parse is finished before we check should_deploy below
  const clinchScraper = new ClinchScraper();
  await clinchScraper.scrape();

// if (runner.should_deploy || clinchScraper.should_deploy) {
// if (runner.should_deploy) {
//   const webpack = require('webpack');
//   const config = require('../webpack.prod');
//   const compiler = webpack(config);
//   const ghpages = require('gh-pages');
  
//   // ~~ first compile webpack ~~ //
//   compiler.run((err, res) => {
//     if (err) console.log(err);

//     // // ~~ then publish on github pages ~~ //
//     ghpages.publish('dist', {
//       repo: `git@github.com:ryanabest/${config.season}-wnba-predictions.git`
//     }, (err) => {
//       console.log(err);
//     });
//   });
// }
})();
