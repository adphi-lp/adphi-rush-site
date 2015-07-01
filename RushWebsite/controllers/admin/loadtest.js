var rushdb;
var stats;

function setup(env) {
    rushdb = env.rushdb;
    stats = env.stats;
}

function uri() {
    return '/admin/loadtest';
}

function authGet(auth) {
    return auth.checkAdminAuth;
}

function get(req, res) {
    rushdb.loadTestInsertRushees();
    rushdb.loadTestInsertBrothers();
    res.redirect('/');
}

module.exports = {
    setup: setup,
    uri: uri(),
    auth: {
        get: authGet,
    },
    get: get
};
