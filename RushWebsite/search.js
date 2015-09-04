'use strict';

var tools = require("./tools");

/**
 * Options:
 * inhouse - only in house rushees, default false
 * outhouse - only out of house rushees, default false
 * onjaunt - only rushees on jaunt, default false
 * priority - only priority rushees, default false
 * visible - show only visible rushees, default false
 * hidden - show hidden, and only hidden rushees, default false
 * candidate - only candidates, default false
 */
function filterRushee(rushee, options) {
    return (options.inhouse !== true || rushee.status.type._id === 'IN') &&
        (options.outhouse !== true || rushee.status.type._id === 'OUT') &&
        (options.onjaunt !== true || rushee.status.type._id === 'JAUNT') &&
        (options.priority !== true || rushee.priority === true) && //undefined = false
        (options.visible !== true || rushee.visible !== false) && //undefined = true
        (options.bidworthy !== true || rushee.bidworthy) &&
            //hidden xor visible
        ((options.hidden === true) !== (rushee.visible !== false)) &&
        ((options.candidate !== true) || (rushee.candidate === true)); //undefined = false;
}

function get(rushees, query) {
    var words = split(query);
    var ranking = [];
    for (var i = 0, l = rushees.length; i < l; i++) {
        var rushee = rushees[i];
        ranking[i] = [rushee, rank(rushee, words), i];
    }

    ranking.sort(function (a, b) {
        if (b[1] != a[1]) {
            return b[1] - a[1];
        } else {
            return a[2] - b[2];
        }
    });

    var results = ranking.slice(0, 10);

    return tools.map(results, function (r) {
        return r[0];
    });
}

function split(query) {
    return query.split(' ');
}

function rank(rushee, words) {
    var count = 0;
    count += rankWords(rushee, words);
    count += rankStatus(rushee, words);
    return count;
}

function rankWords(rushee, words) {
    var count = 0;
    for (var i = 0, l = words.length; i < l; i++) {
        var word = words[i];
        for (var field in rushee) {
            var value = rushee[field];
            if (typeof value === "string") {
                if (value.toUpperCase().indexOf(word.toUpperCase()) !== -1) {
                    count += 5;
                }
            } else if (tools.isArray(value)) {
                for (var j = 0, m = value.length; j < m; j++) {
                    if (typeof value[j] === "string") {
                        if (value[j].toUpperCase().indexOf(word.toUpperCase()) !== -1) {
                            count += 5;
                        }
                    }
                }
            }

        }
    }
    return count;
}

function rankStatus(rushee) {
    if (rushee.status === undefined || rushee.status === null) {
        return 0;
    }

    var count = 1;
    if (rushee.status.type._id === "IN") {
        count += 4;
    } else if (rushee.status.type._id === "JAUNT") {
        count += 3;
    } else if (rushee.status.type._id === "OUT") {
        count += 2;
    } else {
        count += 1;
    }
    return count;
}

// Sorts by : (-eligible) > priority > in > jaunt > voteTotal
function priorityCmp(a, b) {
    var abid = a.eligible && a.bidworthy ? 1 : 0;
    var bbid = b.eligible && b.bidworthy ? 1 : 0;
    if (bbid !== abid) {
        return abid - bbid;
    }

    var apri = a.priority === true ? 1 : 0;
    var bpri = b.priority === true ? 1 : 0;
    if (bpri !== apri) {
        return bpri - apri;
    }

    var ain = a.status.type._id === 'IN' ? 1 : 0;
    var bin = b.status.type._id === 'IN' ? 1 : 0;
    if (bin !== ain) {
        return bin - ain;
    }

    var ajaunt = a.status.type._id === 'JAUNT' ? 1 : 0;
    var bjaunt = b.status.type._id === 'JAUNT' ? 1 : 0;
    if (bjaunt !== ajaunt) {
        return bjaunt - ajaunt;
    }

    return b.voteTotal - a.voteTotal;
}

// last status update first
function updateCmp(a, b) {
    if (a.status.ts === undefined) {
        if (b.status.ts === undefined) {
            return 0;
        } else {
            return 1;
        }
    } else if (b.status.ts === undefined) {
        return -1;
    }

    if (a.status.ts > b.status.ts) {
        return -1;
    } else if (a.status.ts < b.status.ts) {
        return 1;
    }
    return 0;
}

module.exports = {
    get: get,
    priorityCmp : priorityCmp,
    updateCmp : updateCmp,
    filterRushee: filterRushee
};
