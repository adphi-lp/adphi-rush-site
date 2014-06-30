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
	//TODO cleanup photo code
	var photo = req.files.photo;
	var photoLen = 10, photoPath = '/public/img/no_photo.jpg';
	if (photo.size !== 0) {
		var name = photo.name;
		var extension = name.substr(name.lastIndexOf('.')+1);
		photoPath = '/public/img/'+tools.randomString(photoLen,'')+'.'+extension;
	
		fs.readFile(req.files.photo.path, function(err, data) {
			var newPath = __dirname + photoPath;
			fs.writeFile(newPath, data, function(err) {
				if (err !== null) {
					console.log('uploadpath: ' + req.files.photo.path);
					console.log("photopath: " + photoPath);
					console.log(err);
				}
			});
		});
	}
	
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

	rushdb.insertCandidate(cand);
	res.redirect('/admin/addcandidate');
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
