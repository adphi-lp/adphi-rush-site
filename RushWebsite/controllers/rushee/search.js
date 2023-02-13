'use strict';
var rushdb;
var stats;
var auth;
var tools;
var search;
var moment;

function setup(env) {
    rushdb = env.rushdb;
    stats = env.stats;
    auth = env.auth;
    tools = env.tools;
    search = env.search;
    moment = env.moment;
}

function uri() {
    return '/rushee/search';
}

function authGet(auth) {
    return auth.checkAuth;
}

function calcThisRequestTime(lastRequestTime, rushees) {
    var thisRequestTime;
    for (var i = 0; i < rushees.length; ++i) {
        var rushee = rushees[i];
        var statusTime = rushee.status.ts && rushee.status.ts.getTime();

        if (isNaN(lastRequestTime) || statusTime === undefined) {
            rushee.status.updated = false;
        } else {
            rushee.status.updated = lastRequestTime < statusTime;
        }

        if (thisRequestTime === undefined) {
            thisRequestTime = statusTime;
        } else if (statusTime !== undefined) {
            thisRequestTime = (thisRequestTime > statusTime) ? thisRequestTime : statusTime;
        }
    }
    return thisRequestTime;
}

function get(req, res) {
    rushdb.get(rushdb.arrange, {}, function (err, info) {
        if (err !== undefined && err !== null) {
            console.log(err);
            res.redirect('/404');
            return;
        }
        // add global comment
        info.globalAnnouncement = rushdb.getAnnouncement();

        info.inhouse = req.query.inhouse;
        info.priority = req.query.priority;
        info.outhouse = req.query.outhouse;
        info.onjaunt = req.query.onjaunt;
        info.search = req.query.q;
        info.bidworthy = req.query.bidworthy;
        info.hidden = req.query.hidden;
        info.sortMethod = req.query.sortMethod;
        var lastRequestTime = parseInt(req.query.lastRequestTime, 10);
        var accountType = auth.getAccountType(req, res);

        var options = {
            inhouse: info.inhouse === 'on',
            priority: info.priority === 'on',
            outhouse: info.outhouse === 'on',
            onjaunt: info.onjaunt === 'on',
            bidworthy: info.bidworthy === 'on',
            visible: !accountType.isAdmin(),
            hidden: info.hidden === 'on' && accountType.isAdmin(),
            candidate: false
        };

        var q = info.search;
        var prisort = function (a, b) {
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
        };
        var lastStatusUpdateSort = function (a, b) {
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
        };
        var sortFunc;
        switch (info.sortMethod) {
            case 'lastStatusUpdate':
                sortFunc = lastStatusUpdateSort;
                break;
            case 'priority':
            /* falls through */
            default:
                sortFunc = prisort;
        }
        if (q === null || q === undefined) {
            info.rushees = tools.filter(info.rushees, function (rushee) {
                return search.filterRushee(rushee, {inhouse: true});
            });

            info.rushees.sort(sortFunc);
            info.q = '';
        } else {
            var f = function (rushee) {
                return search.filterRushee(rushee, options);
            };
            q = q.trim();
            if (q !== '') {
                info.rushees = tools.filter(info.rushees, f);
                info.rushees.sort(sortFunc);
                info.rushees = search.get(info.rushees, q);
                info.q = q;
            } else {
                info.rushees = tools.filter(info.rushees, f);
                info.rushees.sort(sortFunc);
                info.q = q;
            }
        }

        var thisRequestTime = calcThisRequestTime(lastRequestTime, info.rushees);
        info.lastRequestTime = thisRequestTime;
        res.render('rushee/search.jade', info);
    });
}

module.exports = {
    setup: setup,
    uri: uri(),
    auth: {
        get: authGet,
    },
    get: get,
};
