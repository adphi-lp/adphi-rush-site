var rushdb;
var stats;

function setup(env) {
    rushdb = env.rushdb;
    stats = env.stats;
}

function uri() {
    return '/jaunt/pushRusheeToVan';
}

function authPost(auth) {
    return auth.checkAdminAuth;
}

function post(req, res) {
    var rid = rushdb.toObjectID(req.body.rID);
    var vid = rushdb.toObjectID(req.body.vID);

    rushdb.pushRusheeToVan(rid, vid);

    res.redirect('/jaunt/list');
}

module.exports = {
    setup: setup,
    uri: uri(),
    auth: {
        post: authPost,
    },
    post: post
};