var rushdb;
var stats;

function setup(env) {
    rushdb = env.rushdb;
    stats = env.stats;
}

function uri() {
    return '/clearinghouse/login';
}

function authGet(auth) {
    return auth.checkAdminAuth;
}

function authPost(auth) {
    return auth.checkAdminAuth;
}

function get(req, res) {
    info = rushdb.getCHLogin();
    res.render('clearinghouse/login.jade', info);
}

function post(req, res) {
    var user = req.body.user;
    var pass = req.body.pass;
    rushdb.setCHLogin(user, pass);
    res.redirect('/clearinghouse/login');
}

module.exports = {
    setup: setup,
    uri: uri(),
    auth: {
        get: authGet,
        post: authPost,
    },
    get: get,
    post: post,
};
