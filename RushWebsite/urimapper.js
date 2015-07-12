'use strict';

var auth = require('./auth');
var tools = require('./tools');
var path = require('path');

var env;

var links = [];

function setEnv(environ) {
    env = environ;
}

function makeLink(app, controller, basepath) {
    var uri = controller.uri;
    var get = controller.get;
    var post = controller.post;

    links.push(uri);

    controller.setup(env);

    if (get !== undefined) {
        var authGet = controller.auth.get(auth);
        app.get(basepath + uri, authGet, function (req, res) {
            processPage(req, res, basepath, uri, get);
        });
    }

    if (post !== undefined) {
        var authPost = controller.auth.post(auth);
        app.post(basepath + uri, authPost, function (req, res) {
            processPage(req, res, basepath, uri, post);
        });
    }
}

function makeLinks(app, paths) {
    tools.file.walkSync(paths.controllers, function (filename) {
        if (!tools.str.endsWith(filename, '.js')) {
            return;
        }

        var controller = require(path.resolve(filename));
        makeLink(app, controller, paths.base);
    });
    links.sort();
}

function processPage(req, res, basepath, uri, callback) {
    var time = process.hrtime();
    var response = {};
    for (var x in res) {
        response[x] = res[x];
    }
    response.redirect = function (path) {
        res.redirect(basepath + path);
    };

    response.render = function (page, info) {
        info.voteTypes = env.rushdb.SORTED_VOTE_TYPES;
        info.commentTypes = env.rushdb.SORTED_COMMENT_TYPES;
        info.accountType = auth.getAccountType(req, res);
        info.StatusType = env.rushdb.StatusType;
        info.basepath = basepath;
        res.render(page, info);
        env.stats.addDiff(uri, time);
    };

    callback(req, response);
}

module.exports = {
    setEnv: setEnv,
    makeLinks: makeLinks,
    links: links
};