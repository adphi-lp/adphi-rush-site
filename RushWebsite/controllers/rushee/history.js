var rushdb;
var stats;

function setup(env) {
	rushdb = env.rushdb;
	stats = env.stats;
}

function uri() {
	return '/rushee/history';
}

function authGet(auth) {
	return auth.checkAdminAuth;
}

function get(req, res) {
	var rusheeID = req.query.rID === undefined ? null : rushdb.toObjectID(req.query.rID);
	var brotherID = req.query.bID === undefined ? null : rushdb.toObjectID(req.query.bID);
	
	rushdb.get(rushdb.arrange, {}, function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect('/404');
			return;
		}
		res.render('rushee/history.jade', info);
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
