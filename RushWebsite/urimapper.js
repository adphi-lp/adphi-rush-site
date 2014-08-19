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
		app.get(basepath + uri, authGet, function(req, res) {
			process(req, res, basepath, get);
		});
	}

	if (post !== undefined) {
		var authPost = controller.auth.post(auth);
		app.post(basepath + uri, authPost, function(req, res) {
			process(req, res, basepath, post);
		});
	}
}

function makeLinks(app, paths) {
	tools.file.walkSync(paths.controllers, function(filename) {
		if (!tools.str.endsWith(filename, '.js')) {
			return;
		}

		var controller = require(path.resolve(filename));
		makeLink(app, controller, paths.base);
	});
	links.sort();
}

function process(req, res, basepath, callback) {
	var response = {};
	for (var x in res) {
		response[x] = res[x];
	}
	response.redirect = function(path) {
		res.redirect(basepath + path);
	};

	response.render = function(page, info) {
		info.voteTypes = env.rushdb.SORTED_VOTE_TYPES;
		info.commentTypes = env.rushdb.SORTED_COMMENT_TYPES;
		info.accountType = auth.getAccountType(req, res);
		info.basepath = basepath;
		res.render(page, info);
	};

	callback(req, response);
}

module.exports = {
	setEnv : setEnv,
	makeLinks : makeLinks,
	links : links,
};