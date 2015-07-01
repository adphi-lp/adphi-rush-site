var rushdb;
var stats;

function setup(env) {
    rushdb = env.rushdb;
    stats = env.stats;
}

function uri() {
    return '/jaunt/edit';
}

function authGet(auth) {
    return auth.checkAdminAuth;
}

function authPost(auth) {
    return auth.checkAdminAuth;
}

function get(req, res) {
    var jauntID = req.query.jID === undefined ? null : rushdb.toObjectID(req.query.jID);
    var time = process.hrtime();

    var arrangeJaunt = function (info, render) {
        rushdb.arrangeJaunt(jauntID, info, render);
    };

    rushdb.get(arrangeJaunt, {}, function (err, info) {
        if (err !== undefined && err !== null) {
            console.log(err);
            res.redirect('/404');
            return;
        }

        if (info.jaunt !== null) {
            var date = new Date(info.jaunt.time);
            info.jaunt.dateISO = date.toISOString();
        }
        res.render('jaunt/edit.jade', info);
        time = process.hrtime(time);
        console.log('/editjaunt took %d seconds and %d nanoseconds', time[0], time[1]);
    });
}

function post(req, res) {
    var jID = parseInt(req.body.jID);
    var name = req.body.jName;
    var time = Date.parse(req.body.jTime);
    var vIDs = req.body.vID;
    if (vIDs === null || vIDs === undefined) {
        vIDs = [];
    }

    var jaunt = {
        name: name,
        time: time
    };
    rushdb.updateJaunt(jID, jaunt, function () {
        res.redirect('/jaunt/view?jID=' + jID);
    });
}

module.exports = {
    setup: setup,
    uri: uri(),
    auth: {
        get: authGet,
        post: authPost,
    },
    get: get,
    post: post
};
