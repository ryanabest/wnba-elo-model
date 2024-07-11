const fs = require('fs');
const path = require('path');
const request = require('request');
const keys = require('../keys.json');
const config = require('../config.js');
const season = config.season;

const scrapeList = config.season_types.map(st => {
  const url = `https://api.sportradar.us/wnba/trial/v8/en/games/${season}/${st}/schedule.json?api_key=${keys.sportradar}`;
  const name = `${season}_${st}.json`;
  const filePath = path.join(__dirname, name);
  return { url, name, filePath };
});

scrapeList.push({
  url: `https://api.sportradar.us/wnba/trial/v8/en/series/${season}/PST/schedule.json?api_key=${keys.sportradar}`,
  name: `${season}_PST_SERIES.json`,
  filePath: path.join(__dirname, `${season}_PST_SERIES.json`)
});

for (let i = 0; i < scrapeList.length; i++) {
  const s = scrapeList[i];
  setTimeout(() => {
    request(s.url, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        const data = JSON.parse(body);
        console.log(`~~~~~~ SAVED ${s.name} ~~~~~~`);
        fs.writeFileSync(s.filePath, JSON.stringify(data, null, 4));
      } else {
        console.log(`~~~~~~ FAILED FOR ${s.url} ~~~~~~`);
        console.log(body);
        console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
      }
    })
  }, 3000 * i);
}
