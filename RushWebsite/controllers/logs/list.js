var rushdb;
var stats;

function setup(env) {
	rushdb = env.rushdb;
	stats = env.stats;
}

function uri() {
	return '/logs/list';
}

function authGet(auth) {
	return auth.checkAdminAuth;
}

function authPost(auth) {
	return auth.checkAdminAuth;
}

function get(req, res) {
	rushdb.getLog(function (err, docs) {
		if (err !== null && err !== undefined) {
			console.log(err);
			res.redirect('/404');
			return;
		}
		
		info = {
			logs : docs
		};
		
		res.render('logs/list.jade', info);
	});
}

function post(req, res) {
	res.redirect('/404');
}

module.exports = {
	setup : setup,
	uri : uri(),
	auth : {
		get : authGet,
		post : authPost,
	},
	get : get,
	post : post,
};
