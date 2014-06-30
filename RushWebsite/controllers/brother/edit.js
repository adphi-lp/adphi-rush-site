var rushdb;
var stats;

function setup(env) {
	rushdb = env.rushdb;
	stats = env.stats;
}

function uri() {
	return '/brother/edit';
}

function authGet(auth) {
	return auth.checkAdminAuth;
}

function authPost(auth) {
	return auth.checkAdminAuth;
}

function get(req, res) {
	var bID = req.query.bID === undefined ? null : rushdb.toObjectID(req.query.bID);
	
	rushdb.getBrother(bID, function(err, info) {
		if (err !== null && err !== undefined) {
			console.log(err);
			res.redirect('/404');
			return;
		}
		
		res.render('brother/edit.jade', info);
	});
}

function post(req, res) {
	var brotherID = rushdb.toObjectID(req.body.bID);
	var brother = {
		first: req.body.first,
		last: req.body.last,
		'class': req.body['class'],
		phone: req.body.phone,
		email: req.body.email
	};
	
	rushdb.updateBrother(brotherID, brother, function(err) {
		if (err !== null && err !== undefined) {
			console.log(err);
			res.redirect('/brother/edit?bID='+req.body.bID); //TODO error page
		} else {
			res.redirect('/brother/view?bID='+req.body.bID);
		}
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
