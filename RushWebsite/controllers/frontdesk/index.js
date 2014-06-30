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
	return '/frontdesk';
}

function authGet(auth) {
	return auth.checkFrontDeskAuth;
}

function get(req, res) {
	var rID = req.query.rID === undefined ? null : rushdb.toObjectID(req.query.rID);
	var cID = req.query.cID === undefined ? null : rushdb.toObjectID(req.query.cID);
	
	if (rID !== null) {
		rushdb.getRushee(rID, function(err, info) {
			if (err !== null && err !== undefined) {
				console.log(err);
				res.redirect('/404');
				return;
			}
			res.render('frontdesk/view.jade', info);
		});
	} else if (cID !== null) {
		rushdb.getCandidate(cID, function(err, info) {
			if (err !== null && err !== undefined) {
				console.log(err);
				res.redirect('/404');
				return;
			}
			info.rushee = info.candidate;
			res.render('frontdesk/view.jade', info);
		});
	} else {
		rushdb.get(rushdb.arrange, {}, function(err, info) {
			if (err !== null && err !== undefined) {
				console.log(err);
				res.redirect('/404');
				return;
			}
			
			var accountType = auth.getAccountType(req, res);
			info.search = req.query.q;
			info.outhouse = req.query.outhouse;
			info.onjaunt = req.query.onjaunt;
			info.inhouse = req.query.inhouse;
			info.hidden = req.query.hidden;
			info.candidate = req.query.candidate;
			
			var options = {
				inhouse : info.inhouse === 'on',
				priority : info.priority === 'on',
				outhouse : info.outhouse === 'on',
				onjaunt : info.onjaunt === 'on',
				visible : !accountType.isAdmin(),
				hidden : info.hidden === 'on' && accountType.isAdmin(),
				candidate : info.candidate === 'on' && accountType.isAdmin()
			};
			
			var f = function(rushee) {
				return search.filterRushee(rushee, options);
			};
			
			var q = info.search;
			if (q === null || q === undefined) {
				var results = info.rushees.concat(info.candidates);
				info.rushees = tools.filter(results, function (rushee) {
					return search.filterRushee(rushee, {inhouse: true});
				});
				info.q = '';
			} else if (q !== "") {
				var results = info.rushees.concat(info.candidates);
				results = tools.filter(results, f);
				results = search.get(results, q);
				info.rushees = results;
				info.q = q;
			} else {
				var results = info.rushees.concat(info.candidates);
				results = tools.filter(results, f);
				info.rushees = results;
				info.q = q;
			}
			
			res.render('frontdesk/search.jade', info);
		});
	}
}

module.exports = {
	setup : setup,
	uri : uri(),
	auth : {
		get : authGet,
	},
	get : get,
};
