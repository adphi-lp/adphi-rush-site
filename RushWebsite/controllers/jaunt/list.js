var rushdb;
var stats;

function setup(env) {
	rushdb = env.rushdb;
	stats = env.stats;
}

function uri() {
	return '/jaunt/list';
}

function authGet(auth) {
	return auth.checkAdminAuth;
}

function authPost(auth) {
	return auth.checkAdminAuth;
}

function get(req, res) {
	var time = process.hrtime();
	
	rushdb.get(rushdb.arrange, {}, function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect('/404');
			return;
		}

		res.render('jaunt/list.jade', info);
		time = process.hrtime(time);
		time = time[0]*1e9 + time[1];
		stats.addStat('/jaunts in ns', time);
	});
}

function post(req, res) {
	var name = req.body.jName;
	var time = Date.parse(req.body.jTime);
	
	var jaunt = {
		name : name,
		time : time,
		vIDs : []
	};
	rushdb.insertJaunt(jaunt);
	res.redirect('/jaunt/list');
}

module.exports = {
	setup : setup,
	uri : uri(),
	auth : {
		get : authGet,
		post : authPost,
	},
	get : get,
	post : post
};
