var rushdb;
var stats;

function setup(env) {
    rushdb = env.rushdb;
    stats = env.stats;
}

function uri() {
    return '/admin/editannouncement';
}

function authGet(auth) {
    return auth.checkAdminAuth;
}

function authPost(auth) {
    return auth.checkAdminAuth;
}

function get(req, res) {
    var announcement = rushdb.getAnnouncement();
    res.render('admin/editannouncement.jade', {'globalAnnouncement': announcement})
}

function post(req, res) {
    rushdb.setAnnouncement(req.body.comment);

    res.redirect('/rushee/search');
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