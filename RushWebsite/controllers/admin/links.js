var rushdb;
var stats;
var links;

function setup(env) {
	rushdb = env.rushdb;
	stats = env.stats;
	links = env.links;
}

function uri() {
	return '/admin/links';
}

function authGet(auth) {
	return auth.checkAdminAuth;
}

function authPost(auth) {
	return auth.checkAdminAuth;
}

function get(req, res) {
	res.render('admin/links.jade', {links : links});
}

module.exports = {
	setup : setup,
	uri : uri(),
	auth : {
		get : authGet,
	},
	get : get,
};