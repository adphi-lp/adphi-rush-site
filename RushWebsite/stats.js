'use strict';

var CONVERSIONS = {
    'ns': 1,
    'us': 1e3,
    'ms': 1e6,
    'cs': 1e7,
    'ds': 1e8,
    's': 1e9
};

var stats = {};

function addDiff(name, initial) {
    var diff = process.hrtime(initial);
    var time = diff[0] * 1e9 + diff[1];
    addStat(name, 'ns', time);
    return process.hrtime();
}

function addStat(n, u, v) {
    var name = n,
        unit = u,
        value = v * CONVERSIONS[unit];
    if (stats.hasOwnProperty(name)) {
        var curr = stats[name];
        curr.times.push(value);
        curr.sum += value;
    } else {
        stats[name] = {'times': [value], 'sum': value};
    }
    return stats;
}

function getStatAverage(n, unit) {
    var count = getStatCount(n);
    return count ? getStatSum(n, unit) / count : 0;
}

function getStatSum(name, unit) {
    return stats.hasOwnProperty(name) ? stats[name].sum / CONVERSIONS[unit] : 0;
}

function getStatCount(name) {
    return stats.hasOwnProperty(name) ? stats[name].times.length : 0;
}

function resetStat(name) {
    stats[name] = null;
}


module.exports = {
    CONVERSIONS: CONVERSIONS,
    stats: stats,
    addDiff: addDiff,
    addStat: addStat,
    getStatAverage: getStatAverage,
    getStatSum: getStatSum,
    getStatCount: getStatCount,
    resetStat: resetStat
};


