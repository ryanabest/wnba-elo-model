const fs = require('fs');
const path = require('path');
const request = require('request');

for (let s = 1997; s < 2023; s++) {
  const url = `https://www.basketball-reference.com/wnba/years/${s}_games.html`;
  request(url, function (error, response, body) {
    const name = `schedule_${s}.html`;
    const fileDest = path.join(__dirname, 'bbref', name);
    if (!error && response.statusCode === 200) {
      console.log(`~~~~~~ SAVED ${name} ~~~~~~`);
      fs.writeFileSync(fileDest, body);
    } else {
      console.log(`~~~~~~ FAILED FOR ${url} ~~~~~~`);
    }
  });
}
