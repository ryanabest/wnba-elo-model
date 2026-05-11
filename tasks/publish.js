const ghpages = require('gh-pages');
const config = require('../config.js');

const token = process.env.GH_PAT;
const repo = token
  ? `https://x-access-token:${token}@github.com/ryanabest/${config.season}-wnba-predictions.git`
  : `git@github.com:ryanabest/${config.season}-wnba-predictions.git`;

const opts = { repo };
if (token) {
  opts.user = {
    name: 'github-actions[bot]',
    email: 'github-actions[bot]@users.noreply.github.com'
  };
}

ghpages.publish('dist', opts, (err) => {
  if (err) console.error(err);
  else console.log('Deployed successfully');
});
