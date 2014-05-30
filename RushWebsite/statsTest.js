var stats1 = require('./stats');
var stats2 = require('./stats');

console.log(stats1.addStat('jaunts in ns', 2));
console.log(stats1.getStatCount('jaunts'));
console.log(stats2.getStatCount('jaunts'));


