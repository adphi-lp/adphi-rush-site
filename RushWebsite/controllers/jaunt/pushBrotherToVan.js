var rushdb;
var stats;

function setup(env) {
	rushdb = env.rushdb;
	stats = env.stats;
}

function uri() {
	return '/jaunt/pushBrotherToVan';
}

function authPost(auth) {
	return auth.checkAdminAuth;
}

function post(req, res) {
	var bid = rushdb.toObjectID(req.body.bID);
	var vid = rushdb.toObjectID(req.body.vID);
	
	rushdb.pushBrotherToVan(bid, vid);
	
	res.redirect('/jaunt/list');
}

module.exports = {
	setup : setup,
	uri : uri(),
	auth : {
		post : authPost,
	},
	post : post
};