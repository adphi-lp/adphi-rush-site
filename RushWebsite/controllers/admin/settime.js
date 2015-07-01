var rushdb;
var stats;
var moment;

function setup(env) {
    rushdb = env.rushdb;
    stats = env.stats;
    moment = env.moment;
}

function uri() {
    return '/admin/settime';
}

function authGet(auth) {
    return auth.checkAdminAuth;
}

function authPost(auth) {
    return auth.checkAdminAuth;
}

function get(req, res) {
    var ts = rushdb.getTimestamp();
    var dateISO = null;
    if (ts != null) {
        dateISO = moment(new Date(ts)).format('YYYY-MM-DDTHH:mm:ss.SSS');
    }
    res.render('admin/settime.jade', {ts: ts, dateISO: dateISO});
}

function post(req, res) {
    var time = moment(req.body.ts);
    var ts = (time && time.isValid()) ? time.valueOf() : null;
    rushdb.setTimestamp(ts);
    res.redirect('/admin/settime');
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