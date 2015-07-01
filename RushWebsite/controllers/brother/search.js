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
    var time = process.hrtime();

    rushdb.get(rushdb.arrange, {}, function (err, info) {
        if (err !== undefined && err !== null) {
            console.log(err);

            time = process.hrtime(time);
            time = time[0] * 1e9 + time[1];
            stats.addStat('/viewbrothers in ns', time);

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
        get: authGet,
    },
    get: get,
};
