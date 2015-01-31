var rushdb;
var stats;
var auth;

function setup(env) {
	rushdb = env.rushdb;
	stats = env.stats;
	auth = env.auth;
}

function uri() {
	return '/';
}

function authGet(auth) {
	return auth.checkFrontDeskAuth;
}

function get(req, res) {
	var accountType = auth.getAccountType(req, res);
	if (accountType.isAdmin()) {
		res.render('admin/index.jade', {});
	} else if (accountType.isBrother()) {
		res.redirect('/rushee/search');
	} else if (accountType.isFrontDesk()) {
		res.redirect('/frontdesk');
	} else {
		res.redirect('/login');
	}
}

module.exports = {
	setup : setup,
	uri : uri(),
	auth : {
		get : authGet,
	},
	get : get,
};
