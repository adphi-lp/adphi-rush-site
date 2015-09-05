'use strict';

var rushdb;
var stats;

function setup(env) {
    rushdb = env.rushdb;
    stats = env.stats;
}

function uri() {
    return '/rushee/add';
}

function authGet(auth) {
    return auth.checkAdminAuth;
}

function authPost(auth) {
    return auth.checkAdminAuth;
}

function get(req, res) {
    res.render('rushee/add.jade', {});
}

function post(req, res) {
    rushdb.uploadPhoto(req.files.photo, function (err, photoPath) {
        // ignore error
        var rushee = {
            first: req.body.first,
            last: req.body.last,
            nick: req.body.nick,
            dorm: req.body.dorm,
            phone: req.body.phone,
            email: req.body.email,
            mitID: req.body.mitID,
            year: req.body.year,
            photo: photoPath,
            visible: true,
            priority: false,
            eligible: false
        };

        rushdb.insertRushee(rushee);
        res.redirect('/rushee/add', {});
    });
}

module.exports = {
    setup: setup,
    uri: uri(),
    auth: {
        get: authGet,
        post: authPost
    },
    get: get,
    post: post
};
