var rushdb;
var stats;

function setup(env) {
    rushdb = env.rushdb;
    stats = env.stats;
}

function uri() {
    return '/brother/search';
}

function authGet(auth) {
    return auth.checkAdminAuth;
}

function get(req, res) {
    rushdb.get(rushdb.arrange, {}, function (err, info) {
        if (err !== undefined && err !== null) {
            console.log(err);
            res.redirect('/404');
            return;
        }

        res.render('brother/search.jade', info);
    });
}

module.exports = {
    setup: setup,
    uri: uri(),
    auth: {
        get: authGet
    },
    get: get
};
