var rushdb;
var stats;

function setup(env) {
	rushdb = env.rushdb;
	stats = env.stats;
}

function uri() {
	return '/admin/addcandidate';
}

function authGet(auth) {
	return auth.checkAdminAuth;
}

function authPost(auth) {
	return auth.checkAdminAuth;
}

function get(req, res) {
	res.render('admin/addcandidate.jade',{});
}

function post(req, res) {
	rushdb.uploadPhoto(req.files.photo, function(err, photoPath) {
		// ignore error
		var cand = {
			first: req.body.first,
			last: req.body.last,
			nick: req.body.nick,
			dorm: req.body.dorm,
			phone: req.body.phone,
			email: req.body.email,
			year: req.body.year,
			photo: photoPath,
			visible: true,
			priority: false
		};


		rushdb.insertCandidate(cand, function(err) {
			if (err !== undefined && err !== null) {
				console.log(err);
				res.redirect('/404');
				return;
			}

			res.redirect('/admin/addcandidate');
		});
	});
}

module.exports = {
	setup : setup,
	uri : uri(),
	auth : {
		get : authGet,
		post : authPost,
	},
	get : get,
	post : post,
};
