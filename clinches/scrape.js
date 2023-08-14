const fs = require('fs');
const path = require('path');
const request = require('request');
const Clinches = require('../db/clinches.js');
const clinches = new Clinches();

const config = require('../config.js');
const season = config.season;
const url = `https://data.wnba.com/data/5s/v2015/json/mobile_teams/wnba/${season}/10_standings.json`;

request(url, function (error, response, body) {
  if (!error && response.statusCode === 200) {
    const data = JSON.parse(body);

    // ~~ if there's an error
    if (data['Message'] && (data['Message'] === 'Object not found.')) {
      console.log(`~~~~~~ ERROR: ${data['Message']} ~~~~~~`);
      return this;
    }

    console.log('~~~~~~ SAVED STANDINGS FOR CLINCHES ~~~~~~');
    fs.writeFileSync(path.join(__dirname, 'standings.json'), JSON.stringify(data, null, 4));
  } else {
    console.log(`~~~~~~ FAILED FOR ${url} ~~~~~~`);
  }
});