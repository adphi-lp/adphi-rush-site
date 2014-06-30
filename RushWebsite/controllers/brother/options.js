var rushdb;
var stats;

function setup(env) {
	rushdb = env.rushdb;
	stats = env.stats;
}

function uri() {
	return '/brother/options';
}

function authGet(auth) {
	return auth.checkAdminAuth;
}

function authPost(auth) {
	return auth.checkAdminAuth;
}

function get(req, res) {
	rushdb.get(rushdb.arrange, {}, function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect('/404');
			return;
		}
		res.render('brother/options.jade', info);
	});
}

function post(req, res) {
	var pre = req.body.pre || {};
	var post = req.body.post || {};
	var errorLog = function(err) {
		if (err !== null && err !== undefined) {
			console.log(err);
		}
	};

	for (var b in pre) {
		if (!post[b]) {
			var bid = rushdb.toObjectID(b.replace('brother', ''));
			rushdb.updateBrother(bid, {met: false}, errorLog);
		}
	}
	
	for (var b in post) {
		if (!pre[b]) {
			var bid = rushdb.toObjectID(b.replace('brother', ''));
			rushdb.updateBrother(bid, {met: true}, errorLog);
		}
	}
	res.redirect('/brother/options');
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