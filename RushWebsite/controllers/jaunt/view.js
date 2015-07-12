var rushdb;
var stats;

function setup(env) {
    rushdb = env.rushdb;
    stats = env.stats;
}

function uri() {
    return '/jaunt/view';
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
        res.render('jaunt/view.jade', info);
    });
}

function post(req, res) {
    var name = req.body.vName;
    var driver = req.body.vDriver;
    var id = rushdb.toObjectID(req.body.jID);

    var van = {
        name: name,
        driver: driver,
        rIDs: [],
        bIDs: []
    };

    rushdb.insertVan(van, function (err, docs) {
        var vID = docs[0]._id;
        rushdb.pushVanToJaunt(vID, id);
    });

    res.redirect('/jaunt/view?jID=' + id);
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
