var rushdb;
var stats;

function setup(env) {
	rushdb = env.rushdb;
	stats = env.stats;
}

function uri() {
	return '/brother/summaries';
}

function authGet(auth) {
	return auth.checkAuth;
}

function get(req, res) {
	var arrangeInPriVotes = function(info, render) {
		rushdb.makeCustomRushees(info, info.rushees, 'relevantRushees',function(r) {
			return r.status.type._id === 'IN' || r.priority === true;
		});
		info.relevantRushees.sort(function(a, b){
			var astat = a.status.type._id === 'IN' ? 1 : 0;
			var bstat = b.status.type._id === 'IN' ? 1 : 0;
			if (astat !== bstat) {
				return bstat - astat;
			}
			var apri = a.priority === true ? 1 : 0;
			var bpri = b.priority === true ? 1 : 0;
			
			return bpri - apri;
		});
		info.brothersortoff = true; //fix this
		rushdb.arrangeCustomVotes(info, render, 'relevantRushees', 'brothers');
	};
	rushdb.get(arrangeInPriVotes, {}, function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect('/404');
			return;
		}
		res.render('brother/summaries.jade', info);
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
