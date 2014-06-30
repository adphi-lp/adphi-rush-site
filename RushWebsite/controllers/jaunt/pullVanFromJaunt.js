var rushdb;
var stats;

function setup(env) {
	rushdb = env.rushdb;
	stats = env.stats;
}

function uri() {
	return '/jaunt/pullVanFromJaunt';
}

function authPost(auth) {
	return auth.checkAdminAuth;
}

function post(req, res) {
	var jid = rushdb.toObjectID(req.body.jID);
	var vid = rushdb.toObjectID(req.body.vID);
	
	rushdb.pullVanFromJaunt(vid, jid, function(err, count) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect('/404');
			return;
		}
		rushdb.removeVan(vid);
	});
	
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