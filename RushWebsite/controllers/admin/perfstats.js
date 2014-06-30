var rushdb;
var stats;

function setup(env) {
	rushdb = env.rushdb;
	stats = env.stats;
}

function uri() {
	return '/admin/perfstats';
}

function authGet(auth) {
	return auth.checkAdminAuth;
}

function get(req, res) {
	var timeUnit = 'ns'; //can change to s, ms, etc
	var info = {};
	info.stats = [];
	//breaks in IE8...lemme know if this is a thing I should care about
	var keys = Object.keys(stats.stats);
	for(var i = 0; i < keys.length; i++) {
		var pageName = keys[i];
		var query = pageName + ' in ' + timeUnit;
		info.stats[i] = {
			name: pageName,
			sum: stats.getStatSum(query),
			count: stats.getStatCount(query),
			average: stats.getStatAverage(query)
		};
	}
	res.render('admin/perfstats.jade', info);
}

module.exports = {
	setup : setup,
	uri : uri(),
	auth : {
		get : authGet,
	},
	get : get,
};
