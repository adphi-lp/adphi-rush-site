var rushdb;
var stats;

function setup(env) {
	rushdb = env.rushdb;
	stats = env.stats;
}

function uri() {
	return '/frontdesk/addrushee';
}

function authGet(auth) {
	return auth.checkFrontDeskAuth;
}

function authPost(auth) {
	return auth.checkFrontDeskAuth;
}

function get(req, res) {
	res.render('frontdesk/addrushee.jade', {});
}

function post(req, res) {
	var photoPath = rushdb.DEFAULT_PHOTO_PATH;
	var first = req.body.first || '';
	var last = req.body.last || '';
	var nick = req.body.nick || '';
	var dorm = req.body.dorm || '';
	var phone = req.body.phone || '';
	var year = req.body.year || '';
	var email = req.body.email || '';
	
	var rushee = {
		first: first,
		last: last,
		nick: nick,
		dorm: dorm,
		phone: phone,
		email: email,
		year: year,
		photo: photoPath,
		visible: true,
		priority: false
	};

	rushdb.insertRushee(rushee, function(err, docs) {
		if (err !== null && err !== undefined) {
			console.log(err);
			res.redirect('/404');
			return;
		}
		var newID = docs[0]._id;
		rushdb.insertStatus(newID, 'IN');
	});
	res.redirect('/frontdesk');
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