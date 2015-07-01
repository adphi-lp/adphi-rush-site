var rushdb;
var stats;

function setup(env) {
    rushdb = env.rushdb;
    stats = env.stats;
}

function uri() {
    return '/rushee/log';
}

function authGet(auth) {
    return auth.checkAdminAuth;
}

function get(req, res) {
    rushdb.get(rushdb.arrange, {rushees: {sort: {_id: -1}}}, function (err, info) {
        if (err !== undefined && err !== null) {
            console.log(err);
            res.redirect('/404');
            return;
        }

        res.render('rushee/log.jade', info);
    });
}

module.exports = {
    setup: setup,
    uri: uri(),
    auth: {
        get: authGet,
    },
    get: get,
};
