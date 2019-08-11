var rushdb;
var stats;
var auth;

function setup(env) {
    rushdb = env.rushdb;
    stats = env.stats;
    auth = env.auth;
}

function uri() {
    return '/login';
}

function authGet(auth) {
    return auth.passAuth;
}

function authPost(auth) {
    return auth.passAuth;
}

function get(req, res) {
    auth.logout(res);
    res.render('login.jade', {});
}

function post(req, res) {
    auth.login(req.body.username, req.body.password, res);
    res.redirect('/');
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
