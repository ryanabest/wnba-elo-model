const fs = require('fs');
const path = require('path');
const Clinches = require('../db/clinches.js');
const clinches = new Clinches();
const config = require('../config.js');

class ClinchScraper {
  constructor () {
    this.season = config.season;
    this.url = `https://data.wnba.com/data/5s/v2015/json/mobile_teams/wnba/${this.season}/10_standings.json`
    this.should_deploy = false;
  }

  scrape () {
    const season = this.season;
    const data = require('./standings.json');
    const dt = data.sta.gdte;

    data.sta.co.forEach(conference => {
      conference.di[0].t.forEach(team => {
        let clinchTypes = [];

        // ~~ clinch playoffs
        if (team.cli === 1) {
          clinchTypes = ['make_playoffs'];
          // msg_start = ':medal: *CLINCH EARNED:*';
        }

        if (team.elim === 1) {
          clinchTypes = ['make_playoffs_elim', 'make_semi_finals_elim', 'make_finals_elim', 'win_finals_elim'];
          // msg_start = ':house: *ELIMINATION:*'
        }

        clinchTypes.forEach(clinchType => {
          if (clinchType === null) return;
          const apiClinch = {
            season: season,
            team_id: team.ta,
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
    });
  }
}

module.exports = ClinchScraper;