'use strict';
var rushdb;
var stats;

function setup(env) {
    rushdb = env.rushdb;
    stats = env.stats;
}

function uri() {
    return '/clearinghouse/import';
}

function authGet(auth) {
    return auth.checkAdminAuth;
}

function authPost(auth) {
    return auth.checkAdminAuth;
}

function get(req, res) {
    var info = {};
    res.render('clearinghouse/import.jade', info);
}

function post(req, res) {
    var startIndex = parseInt(req.body.startIndex, 10);
    var endIndex = parseInt(req.body.endIndex, 10);
    for (var i = startIndex; i < endIndex; ++i) {
        rushdb.getCHRusheeData(i, function (data) {
            if (data.name) {
                var spaceIndex = data.name.indexOf(' ');
                var firstName = '';
                var lastName = '';
                if (spaceIndex !== -1) {
                    firstName = data.name.substring(0, spaceIndex).trim();
                    lastName = data.name.substring(spaceIndex).trim();
                } else {
                    firstName = data.name.trim();
                }
                var candidate = {
                    first: firstName,
                    last: lastName,
                    photo: rushdb.DEFAULT_PHOTO_PATH,
                    visible: true,
                    priority: false,
                    chID: data.chID
                };
                rushdb.insertCandidate(candidate);
            }
        });
    }
    res.redirect('/clearinghouse/login');
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
