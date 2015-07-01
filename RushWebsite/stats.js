'use strict';

var CONVERSIONS = {
    'ns': 1,
    'us': 1e3,
    'ms': 1e6,
    'cs': 1e7,
    'ds': 1e8,
    's': 1e9,
};

var stats = {};

function addStat(n, v) {
    var name = getName(n),
        unit = getUnit(n),
        value = v * CONVERSIONS[unit];
    if (stats.hasOwnProperty(name)) {
        var curr = stats[name];
        curr.times.push(value);
        curr.sum += value;
    }
    else {
        stats[name] = {'times': [value], 'sum': value};
    }
    return stats;
}

function getStatAverage(n) {
    var count = getStatCount(n);
    return count ? getStatSum(n) / count : 0;
}

function getName(n) {
    return n.split(' ')[0];
}

function getUnit(n) {
    return n.split(' ')[2];
}

function getStatSum(n) {
    var name = getName(n),
        unit = getUnit(n);
    return stats.hasOwnProperty(name) ? stats[name].sum / CONVERSIONS[unit] : 0;
}

function getStatCount(n) {
    var name = getName(n);
    return stats.hasOwnProperty(name) ? stats[name].times.length : 0;
}

function resetStat(n) {
    var name = getName(n);
    stats[name] = null;
}


module.exports = {
    CONVERSIONS: CONVERSIONS,
    stats: stats,
    addStat: addStat,
    getName: getName,
    getUnit: getUnit,
    getStatAverage: getStatAverage,
    getStatSum: getStatSum,
    getStatCount: getStatCount,
    resetStat: resetStat
};


