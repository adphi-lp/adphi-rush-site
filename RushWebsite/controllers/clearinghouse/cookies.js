var rushdb;
var stats;

function setup(env) {
    rushdb = env.rushdb;
    stats = env.stats;
}

function uri() {
    return '/clearinghouse/cookies';
}

function authGet(auth) {
    return auth.checkAdminAuth;
}

function authPost(auth) {
    return auth.checkAdminAuth;
}

function get(req, res) {
    info = {
        cookies: rushdb.getCHCookies(),
    };
    res.render('clearinghouse/cookies.jade', info);
}

function post(req, res) {
    var cookie = req.body.cookie;
    var action = req.body.action;
    if (action === 'set') {
        rushdb.setCHCookie(cookie);
    } else if (action === 'del') {
        rushdb.delCHCookie(cookie);
    }
    res.redirect('/clearinghouse/cookies');
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
