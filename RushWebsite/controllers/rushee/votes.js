'use strict';
var rushdb;
var stats;

function setup(env) {
	rushdb = env.rushdb;
	stats = env.stats;
}

function uri() {
	return '/rushee/votes';
}

function authGet(auth) {
	return auth.checkAdminAuth;
}

function get(req, res) {
	var sortMethod = req.query.sortMethod;
	var sortFunction;
	switch (sortMethod) {
	case 'score':
		sortFunction = rushdb.arrangeVoteScore;
		break;
	case 'total':
		/* falls through */
	default:
		sortFunction = rushdb.arrangeVoteTotal;
	}
	rushdb.get(sortFunction, {}, function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect('/404');
			return;
		}
		info.sortMethod = sortMethod;
		res.render('rushee/votes.jade', info);
	});
}

module.exports = {
	setup : setup,
	uri : uri(),
	auth : {
		get : authGet,
	},
	get : get,
};