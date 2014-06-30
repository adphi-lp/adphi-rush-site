var rushdb;
var stats;

function setup(env) {
	rushdb = env.rushdb;
	stats = env.stats;
}

function uri() {
	return '/brother/view';
}

function authGet(auth) {
	return auth.checkAdminAuth;
}

function get(req, res) {
	var brotherID = req.query.bID === undefined ? null : rushdb.toObjectID(req.query.bID);
	
	var time = process.hrtime();
	var arrangeBrother = function(info, render) {
		rushdb.arrangeBrother(brotherID, info, render);
	};
	
	rushdb.get(arrangeBrother, {}, function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect('/404');
			return;
		}
		
		res.render('brother/view.jade', info);
		time = process.hrtime(time);
		time = time[0]*1e9 + time[1];
		stats.addStat('/viewbrother in ns', time);
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
