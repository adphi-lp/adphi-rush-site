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
	rushdb.get(rushdb.arrangeVoteTotal, {}, function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect('/404');
			return;
		}
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