var rushdb;
var stats;
var auth;

function setup(env) {
	rushdb = env.rushdb;
	stats = env.stats;
	auth = env.auth;
}

function uri() {
	return '/frontdesk/inhouse';
}

function authPost(auth) {
	return auth.checkFrontDeskAuth;
}

function post(req, res) {
	var rID = req.body.rID === undefined ? null : rushdb.toObjectID(req.body.rID);
	var cID = req.body.cID === undefined ? null : rushdb.toObjectID(req.body.cID);
	var isBrother = auth.getAccountType(req, res).isBrother();
	var redirect =  isBrother ? '/rushee/search' : '/frontdesk';
	
	if (rID !== null) {	
		rushdb.insertStatus(rID, 'IN');
		res.redirect(redirect);
	} else if (cID !== null) {
		rushdb.transferCandidate(cID, rushdb.insertRushee, function(err, docs) {
			if (err !== null && err !== undefined) {
				console.log(err);
				res.redirect('/404');
				return;
			}
			var newID = docs[0]._id;
			rushdb.insertStatus(newID, 'IN');
		});
		res.redirect(redirect);
	} else {
		console.log(new Error('no rushee or candidate ID.'));
		res.redirect('/404');
	}
}

module.exports = {
	setup : setup,
	uri : uri(),
	auth : {
		post : authPost,
	},
	post : post,
};
