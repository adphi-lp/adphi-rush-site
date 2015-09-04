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
    return '/rushee/monitor';
}

function authGet(auth) {
    return auth.checkAdminAuth;
}

function calcThisRequestTime(lastRequestTime, rushees) {
    var thisRequestTime = undefined;
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

function getRushees(rushees, options, cmp) {
    var f = function (rushee) {
        return search.filterRushee(rushee, options);
    };

    var result = tools.filter(rushees, f);
    result.sort(cmp);
    return result;
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

        var lastRequestTime = parseInt(req.query.lastRequestTime, 10);

        var options = {
            inhouse: true,
            priority: false,
            outhouse: false,
            onjaunt: false,
            bidworthy: false,
            visible: true,
            hidden: false,
            candidate: false
        };

        info.leftCol = getRushees(info.rushees, options, search.priorityCmp);
        info.rightCol = getRushees(info.rushees, options, search.updateCmp);


        info.lastRequestTime = calcThisRequestTime(lastRequestTime, info.rushees);
        res.render('rushee/monitor.jade', info);
    });
}

module.exports = {
    setup: setup,
    uri: uri(),
    auth: {
        get: authGet
    },
    get: get
};
