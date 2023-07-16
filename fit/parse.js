const fs = require('fs');
const path = require('path');
const jsdom = require('jsdom');
const { put } = require('request');
const { JSDOM } = jsdom;

const bbrefPath = path.join(__dirname, 'bbref');
// team converts, to account for franchises moving locations
const teamConverts = {
  ORL: 'CON',
  UTA: 'LVA',
  DET: 'DAL',
  TUL: 'DAL',
  SAS: 'LVA'
};

let out = [];

const files = fs.readdirSync(bbrefPath);
files.forEach(file => {
  if (file === '.DS_Store') return;
  const season = +file.split('.')[0].split('_')[1];
  const html = fs.readFileSync(path.join(bbrefPath, file));
  const doc = (new JSDOM(html)).window.document;
  const table = doc.querySelector('table#schedule');

  let playoff = 0; // first rows are not in the playoffs

  table.querySelectorAll('tr').forEach(tr => {
    // once we hit a row that says "Playoffs", all following rows are playoff games
    if (tr.querySelectorAll('th')[0].textContent === 'Playoffs') {
      playoff = 1;
    }

    const tds = tr.querySelectorAll('td');

    // skip the header row and the "Playoffs" row, which contain no actual data
    if (tds.length === 0) {
      return;
    }

    // get date, which is in the row's th
    const datestr = tr.querySelector('th').getAttribute('csk').slice(0, 8);
    const date = `${datestr.slice(0, 4)}-${datestr.slice(4, 6)}-${datestr.slice(6, 8)}`;

    // teams and score information
    let score2 = tds[1].textContent;
    let score1 = tds[3].textContent;
    if (score1 === '') {
      return;
    }
    score2 = +score2;
    score1 = +score1;

    let team2 = tds[0].querySelector('a').getAttribute('href').split('/')[3];
    const name2 = tds[0].querySelector('a').textContent;
    let team1 = tds[2].querySelector('a').getAttribute('href').split('/')[3];
    const name1 = tds[2].querySelector('a').textContent;

    team2 = teamConverts[team2] || team2;
    team1 = teamConverts[team1] || team1;

    // set a "result" for each game: 1 for a win (by team 1), 0 for a loss, and 0.5 for a tie
    let result1;
    if (score1 > score2) result1 = 1;
    else if (score2 > score1) result1 = 0;
    else result1 = 0.5;

    out.push({
      season,
      date,
      team1,
      team2,
      name1,
      name2,
      neutral: (season === 2020) ? 1 : 0, // wubble games were neutral
      playoff,
      score1,
      score2,
      result1,
      cc_final: 0
    });
  });
});

// ~~ add two commissioner's cup final games
out.push({
  season: 2021,
  date: '2021-08-13',
  team1: 'SEA',
  team2: 'CON',
  name1: 'Seattle Storm',
  name2: 'Connecticut Sun',
  netural: 0,
  playoff: 0,
  score1: 79,
  score2: 57,
  result1: 1,
  cc_final: 1
});
out.push({
  season: 2022,
  date: '2022-07-27',
  team1: 'CHI',
  team2: 'LVA',
  name1: 'Chicago Sky',
  name2: 'Las Vegas Aces',
  netural: 0,
  playoff: 0,
  score1: 83,
  score2: 93,
  result1: 0,
  cc_final: 1
});

out = out.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
fs.writeFileSync(path.join(__dirname, 'games.json'), JSON.stringify(out));
