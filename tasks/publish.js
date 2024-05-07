const ghpages = require('gh-pages');

ghpages.publish('dist', {
  repo: 'git@github.com:ryanabest/2024-wnba-predictions.git'
}, (err) => {
  console.log(err);
});
