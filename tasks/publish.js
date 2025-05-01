const ghpages = require('gh-pages');
const config = require('../config.js');

ghpages.publish('dist', {
  repo: `git@github.com:ryanabest/${config.season}-wnba-predictions.git`
}, (err) => {
  console.log(err);
});
