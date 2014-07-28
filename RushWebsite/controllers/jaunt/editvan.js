var rushdb;
var stats;

function setup(env) {
	rushdb = env.rushdb;
	stats = env.stats;
}

function uri() {
	return '/jaunt/editvan';
}

function authGet(auth) {
	return auth.checkAdminAuth;
}

function authPost(auth) {
	return auth.checkAdminAuth;
}

function get(req, res) {
	var vID = rushdb.toObjectID(req.query.vID);
	rushdb.getVan(vID, function(err, info) {
		if (err !== null && err !== undefined) {
			console.log(err);
			res.redirect('/404');
			return;
		}
		res.render('jaunt/editvan.jade', info);
	});
}

function post(req, res) {
var vID = rushdb.toObjectID(req.body.vID);
	var van = {
		name: req.body.name,
		driver: req.body.driver
	};
	rushdb.updateVan(vID, van, function(err) {
		if (err !== null && err !== undefined) {
			console.log(err);
			res.redirect('/404');
			return;
		}
		res.redirect('/jaunt/list');
	});
}

module.exports = {
	setup: setup,
	uri : uri(),
	auth : {
		get : authGet,
		post : authPost,
	},
	get : get,
	post : post
};