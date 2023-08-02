const fs = require('fs');
const path = require('path');

class Clinches {
  constructor () {
    this.clinches = require('./clinches.json');
  }

  save () {
    const filePath = path.join(__dirname, 'clinches.json');
    fs.writeFileSync(filePath, JSON.stringify(this.clinches, null, 4));
  }

  findClinch (clinch) {
    return this.clinches.find(d => 
      (d.season === clinch.season) &&
      (d.team_id === clinch.team_id) &&
      (d.typ === clinch.typ)
      );
  }

  addClinch(clinch) {
    const emoji = clinch.typ.includes('elim') ? '❌' : '🏆';
    console.log(`~~~ ${emoji} CLINCH ~~~ : ${clinch.team_id} - ${clinch.typ}`);
    this.clinches.push(clinch);
  }

  export (season) {
    return this.clinches.filter(d => d.season === +season);
  }
}

module.exports = Clinches;