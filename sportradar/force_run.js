const Runner = require('./runner.js');
const runner = new Runner({});
runner.forecast_force_run = true;
runner.run();