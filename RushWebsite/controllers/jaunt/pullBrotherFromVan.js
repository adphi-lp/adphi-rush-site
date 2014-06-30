var rushdb;
var stats;

function setup(env) {
	rushdb = env.rushdb;
	stats = env.stats;
}

function uri() {
	return '/jaunt/pullBrotherFromVan';
}

function authPost(auth) {
	return auth.checkAdminAuth;
}

function post(req, res) {
	var bid = rushdb.toObjectID(req.body.bID);
	var vid = rushdb.toObjectID(req.body.vID);
	
	rushdb.pullBrotherFromVan(bid, vid, function(err, count) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect('/404');
			return;
		}
		res.redirect('/jaunt/list');
	});
}

module.exports = {
	setup : setup,
	uri : uri(),
	auth : {
		post : authPost,
	},
	post : post
};