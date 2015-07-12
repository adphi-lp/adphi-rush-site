var rushdb;
var stats;
var moment;

function setup(env) {
    rushdb = env.rushdb;
    stats = env.stats;
    moment = env.moment;
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
            info.jaunt.dateISO = moment(info.jaunt.time).format('YYYY-MM-DDTHH:mm:ss.SSS');
        }
        res.render('jaunt/edit.jade', info);
    });
}

function post(req, res) {
    var jID = rushdb.toObjectID(req.body.jID);
    var name = req.body.jName;
    var time = moment(req.body.jTime).valueOf();

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
        post: authPost
    },
    get: get,
    post: post
};
