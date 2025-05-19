const fs = require('fs');
const path = require('path');
const teamUtils = require('../src/js/utils/team.js');

class Teams {
  constructor () {
    this.teams = require('./teams.json');
  }

  save () {
    const filePath = path.join(__dirname, 'teams.json');
    fs.writeFileSync(filePath, JSON.stringify(this.teams, null, 4));
  }

  findTeam (id) {
    return this.teams.find(t => t.id === teamUtils.getTeamId(id));
  }

  updateTeam (id, updates) {
    this.teams = this.teams.map(t => {
      if (t.id !== id) return t;
      Object.entries(updates).forEach(update => {
        const [val, col] = update;
        t[val] = col;
      });
      return t;
    });
  }
}

module.exports = Teams;
