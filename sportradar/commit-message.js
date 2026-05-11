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
      const match = line.match(/~~~ ✅ GAME ENDED ~~~ : (.+) ~ ELO shift/);
      return match ? match[1] : null;
    })
    .filter(Boolean);

  const forecastsPath = path.join(__dirname, '../db/forecasts.json');
  const forecasts = JSON.parse(fs.readFileSync(forecastsPath, 'utf8'));

  const parts = [];
  const date = new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York'
  });

  if (gameResults.length > 0) {
    const noun = gameResults.length === 1 ? 'game' : 'games';
    parts.push(`${date}: ${gameResults.length} ${noun} completed, forecasts updated`);
  } else {
    parts.push(`${date}: forecasts updated`);
  }
  parts.push('');

  if (gameResults.length > 0) {
    parts.push('Games:');
    gameResults.forEach(g => parts.push(`  ${g}`));
    parts.push('');
  }

  if (forecasts.length >= 2) {
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
