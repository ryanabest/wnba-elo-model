const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const Clinches = require('../db/clinches.js');
const clinches = new Clinches();
const config = require('../config.js');
const teamUtils = require('../src/js/utils/team.js');

// ~~ both hosts silently drop requests whose TLS fingerprint isn't browser-like, so these have to
// ~~ go through node's native fetch — the `request` library never gets a response back
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'x-nba-stats-origin': 'stats',
  'x-nba-stats-token': 'true',
  'Referer': 'https://www.wnba.com/',
  'Origin': 'https://www.wnba.com'
};

// ~~ stats.nba.com is unreliable from datacenter IPs — it intermittently accepts a request and
// ~~ then never responds, which stalls the hourly job. bail out and let the fallback take over
const TIMEOUT = 20000;

class ClinchScraper {
  constructor () {
    this.season = config.season;
    this.url = `https://stats.nba.com/stats/leaguestandingsv3?LeagueID=10&SeasonType=Regular+Season&Season=${this.season}`
    this.pageUrl = 'https://www.wnba.com/standings';
    this.standingsPath = path.join(__dirname, 'standings.json');
    this.should_deploy = false;
  }

  // ~~ the api is the canonical source, but rows come back as bare arrays that need zipping
  // ~~ against the headers before they look like the team objects parse() expects
  async fetchFromApi () {
    const response = await fetch(this.url, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT) });
    if (!response.ok) throw new Error(`responded ${response.status}`);
    const data = await response.json();
    const standings = (data.resultSets || []).find(d => d.name === 'Standings');
    if (!standings) throw new Error('no Standings result set in response');
    return standings.rowSet.map(row => Object.fromEntries(standings.headers.map((h, i) => [h, row[i]])));
  }

  // ~~ the standings page embeds the very same team objects in its next.js payload, and it stays
  // ~~ reachable from github actions runners on cycles where the api host won't answer at all
  async fetchFromPage () {
    const response = await fetch(this.pageUrl, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT) });
    if (!response.ok) throw new Error(`responded ${response.status}`);
    const html = await response.text();
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) throw new Error('no __NEXT_DATA__ payload in page');
    return JSON.parse(match[1]).props?.pageProps?.standingsRowsData;
  }

  // ~~ pull down the latest standings and cache them to disk, falling back to the page scrape if
  // ~~ the api won't answer. resolves false if no source gave us usable data, so callers know not
  // ~~ to parse whatever stale file is already sitting there
  async fetchStandings () {
    const sources = [
      { name: 'stats.nba.com', fetch: () => this.fetchFromApi() },
      { name: 'wnba.com/standings', fetch: () => this.fetchFromPage() }
    ];

    for (const source of sources) {
      try {
        const teams = await source.fetch();

        // ~~ an unstarted season still responds 200, just with no teams in it
        if (!teams || !teams.length) {
          console.log(`~~~~~~ NO STANDINGS ROWS FROM ${source.name} ~~~~~~`);
          continue;
        }

        console.log(`~~~~~~ SAVED STANDINGS FOR CLINCHES (${source.name}) ~~~~~~`);
        fs.writeFileSync(this.standingsPath, JSON.stringify({ source: source.name, teams }, null, 4));
        return true;
      } catch (error) {
        console.log(`~~~~~~ FAILED FOR ${source.name} ~~~~~~`);
        console.log(`~~~~~~ ${error.message} ~~~~~~`);
      }
    }

    return false;
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
    const { teams } = JSON.parse(fs.readFileSync(this.standingsPath));

    // ~~ neither source carries a game date of its own, so clinches are stamped with the scrape date
    const dt = dayjs().format('YYYY-MM-DD');

    teams.forEach(team => {
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