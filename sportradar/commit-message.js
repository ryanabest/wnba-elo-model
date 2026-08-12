const fs = require('fs');
const path = require('path');

let parseOutput = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { parseOutput += chunk; });
process.stdin.on('end', () => {
  const lines = parseOutput.split('\n');

  const gameResults = lines
    .filter(line => line.includes('~~~ ✅ GAME ENDED ~~~'))
    .map(line => {
      const match = line.match(/~~~ ✅ GAME ENDED ~~~ : (.+) ~ ELO shift: (.+)$/);
      return match ? { matchup: match[1], eloShift: match[2] } : null;
    })
    .filter(Boolean);

  // ~~ eliminations write four records per team (playoffs through finals), so we only report the
  // ~~ headline type for each team and let the downstream implications go unmentioned
  const clinchResults = lines
    .map(line => line.match(/~~~ (?:🏆|❌) CLINCH ~~~ : (\S+) - (\S+)/))
    .filter(Boolean)
    .map(match => ({ team: match[1], typ: match[2] }))
    .filter(c => ['make_playoffs', 'make_playoffs_elim'].includes(c.typ));

  // ~~ set by the workflow, since whether forecasts moved is a question about the git diff
  const forecastUpdated = process.env.FORECAST_UPDATED === 'true';

  const forecastsPath = path.join(__dirname, '../db/forecasts.json');
  const forecasts = JSON.parse(fs.readFileSync(forecastsPath, 'utf8'));

  const parts = [];
  const date = new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York'
  });

  const summary = [];
  if (gameResults.length > 0) {
    const noun = gameResults.length === 1 ? 'game' : 'games';
    summary.push(`${gameResults.length} ${noun} completed`);
  }
  if (clinchResults.length > 0) {
    const noun = clinchResults.length === 1 ? 'clinch' : 'clinches';
    summary.push(`${clinchResults.length} ${noun} recorded`);
  }
  if (forecastUpdated) summary.push('forecasts updated');
  parts.push(`${date}: ${summary.length ? summary.join(', ') : 'data updated'}`);
  parts.push('');

  if (gameResults.length > 0) {
    parts.push('Games:');
    gameResults.forEach(g => parts.push(`  ${g.matchup} ~ ELO shift: ${g.eloShift}`));
    parts.push('');
  }

  if (clinchResults.length > 0) {
    parts.push('Clinches:');
    clinchResults.forEach(c => {
      const label = c.typ === 'make_playoffs' ? 'clinched a playoff berth' : 'eliminated from playoff contention';
      parts.push(`  ${c.team} ${label}`);
    });
    parts.push('');
  }

  if (forecastUpdated && forecasts.length >= 2) {
    const newTeams = forecasts[0].types.elo;
    const oldTeams = forecasts[1].types.elo;
    const oldMap = Object.fromEntries(oldTeams.map(t => [t.name, t]));

    const changes = newTeams
      .map(team => {
        const old = oldMap[team.name];
        if (!old) return null;
        const oldPct = old.win_finals * 100;
        const newPct = team.win_finals * 100;
        const diff = newPct - oldPct;
        return { name: team.name, old: oldPct, new: newPct, diff };
      })
      .filter(c => c && Math.abs(c.diff) >= 0.5)
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    if (changes.length > 0) {
      parts.push('Championship Odds Changes:');
      changes.forEach(c => {
        const sign = c.diff > 0 ? '+' : '';
        parts.push(`  ${c.name}: ${c.old.toFixed(1)}% → ${c.new.toFixed(1)}% (${sign}${c.diff.toFixed(1)}pp)`);
      });
    }
  }

  process.stdout.write(parts.join('\n'));
});
