const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const Clinches = require('../db/clinches.js');
const clinches = new Clinches();
const config = require('../config.js');
const teamUtils = require('../src/js/utils/team.js');

// ~~ stats.nba.com silently drops requests whose TLS fingerprint isn't browser-like, so the fetch
// ~~ below has to go through node's native fetch — the `request` library never gets a response back
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'x-nba-stats-origin': 'stats',
  'x-nba-stats-token': 'true',
  'Referer': 'https://www.wnba.com/',
  'Origin': 'https://www.wnba.com'
};

class ClinchScraper {
  constructor () {
    this.season = config.season;
    this.url = `https://stats.nba.com/stats/leaguestandingsv3?LeagueID=10&SeasonType=Regular+Season&Season=${this.season}`
    this.standingsPath = path.join(__dirname, 'standings.json');
    this.should_deploy = false;
  }

  // ~~ pull down the latest standings and cache them to disk. resolves false if we didn't get
  // ~~ usable data, so callers know not to parse whatever stale file is already sitting there
  async fetchStandings () {
    try {
      const response = await fetch(this.url, { headers: HEADERS });
      if (!response.ok) throw new Error(`responded ${response.status}`);
      const data = await response.json();
      const standings = (data.resultSets || []).find(d => d.name === 'Standings');

      // ~~ an unstarted season still responds 200, just with no rows in it
      if (!standings || !standings.rowSet.length) {
        console.log('~~~~~~ ERROR: no standings rows in response ~~~~~~');
        return false;
      }

      console.log('~~~~~~ SAVED STANDINGS FOR CLINCHES ~~~~~~');
      fs.writeFileSync(this.standingsPath, JSON.stringify(data, null, 4));
      return true;
    } catch (error) {
      console.log(`~~~~~~ FAILED FOR ${this.url} ~~~~~~`);
      console.log(`~~~~~~ ${error.message} ~~~~~~`);
      return false;
    }
  }

  // ~~ scrape the standings first, then parse them — the parse is worthless without a fresh file
  async scrape () {
    const fetched = await this.fetchStandings();
    if (!fetched) {
      console.log('~~~~~~ SKIPPING CLINCH PARSE (NO FRESH STANDINGS) ~~~~~~');
      return;
    }
    this.parse();
  }

  parse () {
    const season = this.season;
    // ~~ read rather than require, so we always pick up the file fetchStandings just wrote
    const data = JSON.parse(fs.readFileSync(this.standingsPath));
    const standings = data.resultSets.find(d => d.name === 'Standings');

    // ~~ leaguestandingsv3 has no game date of its own, so clinches are stamped with the scrape date
    const dt = dayjs().format('YYYY-MM-DD');

    standings.rowSet.forEach(row => {
      // ~~ rows come back as bare arrays, so zip them against the headers
      const team = {};
      standings.headers.forEach((header, i) => { team[header] = row[i]; });

      let clinchTypes = [];

      // ~~ clinch playoffs
      if (team.ClinchedPlayoffBirth === 1) {
        clinchTypes = ['make_playoffs'];
        // msg_start = ':medal: *CLINCH EARNED:*';
      }

      if (team.EliminatedConference === 1) {
        clinchTypes = ['make_playoffs_elim', 'make_semi_finals_elim', 'make_finals_elim', 'win_finals_elim'];
        // msg_start = ':house: *ELIMINATION:*'
      }

      clinchTypes.forEach(clinchType => {
        const apiClinch = {
          season: season,
          team_id: teamUtils.abbrFromSlug(team.TeamSlug),
          typ: clinchType,
          dt: dt
        };
        const clinch = clinches.findClinch(apiClinch);
        if (!clinch) {
          clinches.addClinch(apiClinch);
          clinches.save();
          fs.writeFileSync(path.join(__dirname, '../src/data/clinches.json'), JSON.stringify(clinches.export(season), null, 4));
          this.should_deploy = true;
        }
      });
    });
  }
}

module.exports = ClinchScraper;