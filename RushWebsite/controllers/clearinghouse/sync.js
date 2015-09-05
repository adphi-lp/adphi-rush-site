var rushdb;
var stats;

function setup(env) {
    rushdb = env.rushdb;
    stats = env.stats;
}

function uri() {
    return '/clearinghouse/sync';
}

function authGet(auth) {
    return auth.checkAdminAuth;
}

function authPost(auth) {
    return auth.checkAdminAuth;
}

function get(req, res) {
    var text = req.query.clearinghouse;

    if (text === undefined) {
        res.render('clearinghouse/sync.jade', {missingIDs: [], unsyncedRushees : []});
        return;
    }

    var regexp = /[\n\r]+/;
    var lines = text.split(regexp);
    var ids = {};

    for (var l = 0; l < lines.length; l++) {
        var line = lines[l];
        var trimmed = line.trim();
        if (trimmed.length == 0) {
            continue;
        }
        var word = trimmed.split(' ')[0];
        if (!word.match('[0-9]+')) {
            continue;
        }

        ids[word] = true;
    }

    rushdb.get(rushdb.arrange, {}, function (err, info) {
        info.unsyncedRushees = [];
        info.rusheeIDs = {};
        for (var i = 0; i < info.rushees.length; i++) {
            var rushee = info.rushees[i];
            var mitID = rushee.mitID || '';
            if (mitID.trim() === '') {
                continue;
            }
            // in clearinghouse === in house
            var type = rushee.status.type;
            info.rusheeIDs[mitID] = true;
            if ((ids[mitID] === true) !== (type === rushdb.StatusType.IN || type === rushdb.StatusType.JAUNT)) {
                info.unsyncedRushees.push(rushee);
            }
        }

        info.missingIDs = [];
        for (var id in ids) {
            if (info.rusheeIDs[id] === undefined) {
                info.missingIDs.push(id)
            }
        }

        res.render('clearinghouse/sync.jade', info);
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