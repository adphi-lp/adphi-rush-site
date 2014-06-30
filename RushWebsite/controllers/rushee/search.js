var rushdb;
var stats;
var auth;
var tools;
var search;

function setup(env) {
	rushdb = env.rushdb;
	stats = env.stats;
	auth = env.auth;
	tools = env.tools;
	search = env.search;
}

function uri() {
	return '/rushee/search';
}

function authGet(auth) {
	return auth.checkAuth;
}

function get(req, res) {
	rushdb.get(rushdb.arrange, {}, function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect('/404');
			return;
		}
		
		info.inhouse = req.query.inhouse;
		info.priority = req.query.priority;
		info.outhouse = req.query.outhouse;
		info.onjaunt = req.query.onjaunt;
		info.search = req.query.q;
		info.bidworthy = req.query.bidworthy;
		info.hidden = req.query.hidden;
		var accountType = auth.getAccountType(req, res);
		
		var options = {
			inhouse : info.inhouse === 'on',
			priority : info.priority === 'on',
			outhouse : info.outhouse === 'on',
			onjaunt : info.onjaunt === 'on',
			bidworthy : info.bidworthy === 'on' ? info.bidScore : false,
			visible : !accountType.isAdmin(),
			hidden : info.hidden === 'on' && accountType.isAdmin(),
			candidate : false
		};

		var q = info.search;
		var prisort = function(a, b) {
			var abid = a.voteScore >= info.bidScore ? 1 : 0;
			var bbid = b.voteScore >= info.bidScore ? 1 : 0;
			if (bbid !== abid) {
				return abid - bbid;
			}
			var apri = a.priority === true ? 1 : 0;
			var bpri = b.priority === true ? 1 : 0;
			if (bpri !== apri) {
				return bpri - apri;
			}
			
			var ain = a.status.type._id === 'IN' ? 1 : 0;
			var bin = b.status.type._id === 'IN' ? 1 : 0;
			if (bin !== ain) {
				return bin - ain;
			}
			
			var ajaunt = a.status.type._id === 'JAUNT' ? 1 : 0;
			var bjaunt = b.status.type._id === 'JAUNT' ? 1 : 0;
			if (bjaunt !== ajaunt) {
				return bjaunt - ajaunt;
			}
			
			return b.voteScore - a.voteScore;
		};
		if (q === null || q === undefined) {
			info.rushees = tools.filter(info.rushees, function (rushee) {
				return search.filterRushee(rushee, {inhouse: true});
			});
			
			info.rushees.sort(prisort);
			info.q = '';
		} else {
			var f = function(rushee) {
				return search.filterRushee(rushee, options);
			};
			q = q.trim();
			if (q !== '') {
				info.rushees = tools.filter(info.rushees, f);
				info.rushees.sort(prisort);
				info.rushees = search.get(info.rushees, q);
				info.q = q;
			} else {
				info.rushees = tools.filter(info.rushees, f);
				info.rushees.sort(prisort);
				info.q = q;
			}
		}
		
		res.render('rushee/search.jade', info);
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
