'use strict';

//constants
var BASE_PATH = '';
var DATABASE_URL = 'ADPhiRush';
var COLLECTIONS = ['brothers', 'rushees', 'comments', 'sponsors',
'votes', 'statuses', 'jaunts', 'vans'];

//get modules
var express = require('express');
var https = require('https');
var fs = require('fs');
// var Seq = require('seq');
var async = require('async');
var moment = require('moment');
var rushdb = require('./rushdb');
var tools = require('./tools');
var auth = require('./auth');
var toObjectID = require('mongojs').ObjectId;

//create app and connect
var app = express();
auth.setRedirect(BASE_PATH + '/login');
rushdb.connect(DATABASE_URL, COLLECTIONS);

//to ensure that you can sort fast
rushdb.ensureIndex('rushees', {first: 1, last: 1});
rushdb.ensureIndex('rushees', {last: 1, first: 1});
rushdb.ensureIndex('brothers', {first: 1, last: 1});
rushdb.ensureIndex('brothers', {last: 1, first: 1});

//TODO Comment sorting, etc.

//for parsing posts
app.use(express.bodyParser({uploadDir:__dirname+'/uploads'}));
//TODO: this is a really bad SECRET
app.use(express.cookieParser('ADPhiRush'));

//set path to static things
app.use(BASE_PATH+'/public/',express.static(__dirname+ '/public'));
app.use(BASE_PATH+'/css',express.static(__dirname + '/css'));
app.use(BASE_PATH+'/js',express.static(__dirname + '/js'));

//set path to the views (template) directory
app.set('views', __dirname + '/views');

app.get(BASE_PATH+'/search', auth.checkAuth, function(req, res){
	res.render('search.jade',{basepath:BASE_PATH});
});

app.get(BASE_PATH+'/vote', auth.checkAuth, function(req, res){
	var rusheeID = req.query.rID === undefined ? null : toObjectID(req.query.rID);
	var brotherID = req.query.bID === undefined ? null : toObjectID(req.query.bID);
	
	async.parallel({
		brother: function(cb) {
			if (brotherID === null) {
				cb(null, null);
			} else {
				rushdb.findOne('brothers', {_id : brotherID}, rushdb.augBrother, cb);
			}
		},
		rushee: function(cb) {
			if (rusheeID === null) {
				cb(null, null);
			} else {
				rushdb.findOne('rushees', {_id : rusheeID}, rushdb.augRushee, cb);
			}
		},
		brothers: function(cb) {
			rushdb.find('brothers', {}, {last: 1, first: 1}, rushdb.augBrother, cb);
		},
		jaunts: function(cb) {
			rushdb.find('jaunts', {}, {}, function(){}, cb);
		}
	},
	function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect(BASE_PATH+'/404');
			return;
		} else if (info.rushee === null) {
			console.log(new Error('no rushee'));
			res.redirect(BASE_PATH+'/404');
			return;
		}
		
		var rushee = info.rushee;
		var brother = info.brother;
		var brothers = info.brothers;
		var jaunts = info.jaunts;
		var brotherIDs = tools.map(brothers, function(b) {return b._id;});
		var query = {rusheeID: rushee._id, brotherID : {$in : brotherIDs}};
		
		async.parallel({
			statuses : function(cb) {
				rushdb.find('statuses', {rusheeID : rushee._id}, {_id:-1}, function(){}, cb);
			},
			votes : function(cb) {
				rushdb.find('votes', query, {_id:-1}, function(){}, cb);
			},
			comments : function(cb) {
				rushdb.find('comments', query, {_id:-1}, rushdb.augComment, cb);
			},
			sponsors : function (cb) {
				rushdb.find('sponsors', query, {_id: -1}, function(){}, cb);
			}
		},
		function(err, args) {
			if (err !== undefined && err !== null) {
				console.log(err);
				res.redirect(BASE_PATH + '/404');
				return;				
			}
			
			//join statuses, priorities, votes, comments, sponsors
			rushdb.joinProperty(args.statuses, 'statuses', [rushee], 'rusheeID');
			
			rushdb.joinAssoc(args.votes, 'votes',
				[rushee], 'rusheeID', 'rushee',
				brothers, 'brotherID', 'brother');
				
			rushdb.joinAssoc(args.sponsors, 'sponsors',
				[rushee], 'rusheeID', 'rushee',
				brothers, 'brotherID', 'brother');
			
			rushdb.joinAssoc(args.comments, 'comments',
				[rushee], 'rusheeID', 'rushee',
				brothers, 'brotherID', 'brother');
				
			//calculate votes and score
			rushee.vote = 0;
			for (var i = 0; i < brothers.length; i++) {
				//get latest vote
				brothers[i].votes[0] = brothers[i].votes[0] || rushdb.getNullVote(rushee, brothers[i]);
				
				//get brother vote
				if (brother !== null && brothers[i]._id.equals(brother._id)) {
						brother.vote = brothers[i].votes[0];
				}
				
				//count votes
				rushee.vote += brothers[i].votes[0].type.value;
			}
			
			//get votes and sort by type
			rushee.votesByType = tools.map(brothers, function(b){
				return b.votes[0];
			});
			
			rushee.votesByType.sort(function(a, b) {
				return b.type.value - a.type.value ||
					tools.strCmp(a.brother.name.toLowerCase(), b.brother.name.toLowerCase());
			});
			
			//get sponsors
			rushee.sponsorsList = [];
			for (var i = 0; i < brothers.length; i++) {
				//get latest sponsor
				brothers[i].sponsors[0] = brothers[i].sponsors[0] || false;
				
				if (brothers[i].sponsors[0]) {
					//push to list
					rushee.sponsorsList.push(brothers[i].name);
					
					//check if brother sponsor
					if (brother !== null && brothers[i]._id.equals(brother._id)) {
						brother.sponsor = true;
					}
				}
			}
			//get default status
			rushee.status = rushee.statuses[0] || rushdb.getNullStatus(rushee);
			//calculate comments
			rushee.comments = args.comments;
			//add vote types and comment types, base path, and info
			var v = rushdb.voteType;
			args.voteTypes = [v.DEF, v.YES, v.MET, v.NO, v.VETO, v.NULL];
			var c = rushdb.commentType;
			args.commentTypes = [c.GENERAL, c.CONTACT, c.INTEREST, c.EVENT, c.URGENT];
			args.basepath = BASE_PATH;
			args.rushee = rushee;
			args.brother = brother;
			args.brothers = brothers;
			args.jaunts = jaunts;
			
			res.render('vote.jade', args);
		});
	});	
});

app.post(BASE_PATH+'/vote', auth.checkAuth, function(req, res){
	var sponsor = (req.body.sponsor == 'Yes');
	var voteType = rushdb.voteType[req.body.vote];
	var commentText = req.body.comment;
	var commentType = rushdb.commentType[req.body.commentType.toUpperCase()];
	var commentJaunt = req.body.commentJaunt;
	var rusheeID = toObjectID(req.body.rID);
	var brotherID = toObjectID(req.body.bID);
	
	rushdb.insert('sponsors', {brotherID: brotherID, rusheeID: rusheeID, sponsor : sponsor});
	rushdb.insert('votes', {brotherID: brotherID, rusheeID: rusheeID, type: voteType});
	if (commentText !== '') {
		var comment = {
			brotherID: brotherID,
			rusheeID: rusheeID,
			type: commentType,
			text: commentText,
			jaunt: commentJaunt
		};
		rushdb.insert('comments', comment);
	}
	
	res.redirect(BASE_PATH+'/');	
});

app.get(BASE_PATH+'/editrushee', auth.checkAuth,  function(req, res) {
	var rusheeID = req.query.rID === undefined ? null : toObjectID(req.query.rID);
	
	async.waterfall([
		function(cb) {
			if (rusheeID === null) {
				cb(null, null);
			} else {
				rushdb.findOne('rushees', {_id: rusheeID}, rushdb.augRushee, cb);
			}
		},
		function(rushee, cb) {
			if (rushee !== null) {
				var accountType = auth.getAccountType(req, res);
				var args = {
					rushee:rushee,
					accountType: accountType,
					basepath:BASE_PATH
				};
				res.render('editrushee.jade', args);
			} else {
				res.render('404.jade',{basepath:BASE_PATH});
			}
		}
	],
	function (err) {
		console.log(err);
		res.render('404.jade',{basepath:BASE_PATH});
	});
});

app.post(BASE_PATH+'/editrushee', auth.checkAuth, function(req, res) {
	var rusheeID = toObjectID(req.body.rusheeID);
	var photo = req.files.photo;
	var photoLen = 10, photoPath = req.body.photoOld;
	if (photo.size !== 0) {
		var name = photo.name;
		var extension = name.substr(name.lastIndexOf('.')+1);
		photoPath = '/public/img/'+tools.randomString(photoLen,'')+'.'+extension;
	
		fs.readFile(req.files.photo.path, function(err, data) {
			var newPath = __dirname + photoPath;
			fs.writeFile(newPath, data, function(err) {
				if (err !== null && err !== undefined) {
					console.log('uploadpath: ' + req.files.photo.path);
					console.log("photopath: " + photoPath);
					console.log(err);
				}
			});
		});
	}
	var rushee = {
		first: req.body.first,
		last: req.body.last,
		nick: req.body.nick,
		dorm: req.body.dorm,
		phone: req.body.phone,
		email: req.body.email,
		year: req.body.year,
		visible: req.body.visible === 'on',
		priority: req.body.priority === 'on',
		photo: photoPath
	};
	
	rushdb.update('rushees', {_id:rusheeID}, {$set: rushee}, {}, function(err) {
		if (err === null || err === undefined) {
			res.redirect(BASE_PATH+'/viewRushees');
		} else {
			console.log(err);
			res.redirect(BASE_PATH+'/editRushees');
		}
	});
});

app.get(BASE_PATH+'/viewrushees', auth.checkAuth, function(req,res){
	async.parallel({
		brothers : function(cb) {
			rushdb.find('brothers', {}, {first: 1, last: 1}, rushdb.augBrother, cb);
		},
		rushees : function(cb) {
			rushdb.find('rushees', {}, {first : 1, last: 1}, rushdb.augRushee, cb);
		},
		statuses : function(cb) {
			rushdb.find('statuses', {}, {_id: -1}, function(){}, cb);
		}
	},
	function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect(BASE_PATH+'/404');
			return;
		} else if (info.rushee === null) {
			console.log(new Error('no rushee'));
			res.redirect(BASE_PATH+'/404');
			return;
		}
		
		//var brothers = info.brothers;
		var rushees = info.rushees;
		var statuses = info.statuses;
		//var brotherIDs = tools.map(brothers, function(b) {return b._id;});
		//var rusheeIDs = tools.map(rushees, function(r) {return r._id;});
		//var query = {rusheeID: {$in : rusheeIDs}, brotherID : {$in : brotherIDs}}; //TODO: BIDWORTHINESS
		
		rushdb.joinProperty(statuses, 'statuses', rushees, 'rusheeID');
		for (var i = 0; i < rushees.length; i++) {
			rushees[i].status = rushees[i].statuses[0] || rushdb.getNullStatus(rushees[i]);
		}
				
		info.inhouse = req.query.inhouse;
		info.priority = req.query.priority;
		info.basepath = BASE_PATH;
		info.accountType = auth.getAccountType(req, res);
		res.render('viewrushees.jade', info);
		// async.parallel({
			// votes : function(cb) {
				// rushdb.find('votes', query, {_id:-1}, function(){}, cb);
			// }
		// },
		// function(err, args) {
			// if (err !== undefined && err !== null) {
				// console.log(err);
				// res.redirect(BASE_PATH + '/404');
				// return;				
			// }
			// rushdb.joinAssocIndexed(args.votes, 'votesBy',
				// rushees, 'rusheeID', 'rushee',
				// brothers, 'brotherID', 'brother');
// 			
			// var v = rushdb.voteType;
			// args.voteTypes = [v.DEF, v.YES, v.MET, v.NO, v.VETO, v.NULL];
			// args.brothers = brothers;
			// args.rushees = rushees;
			// args.basepath = BASE_PATH;
			// res.render('viewrushees.jade', args);
		// });
	});
});

app.get(BASE_PATH+'/viewrusheevotes', auth.checkAuth, function(req, res) {
	async.parallel({
		brothers : function(cb) {
			rushdb.find('brothers', {}, {first: 1, last: 1}, rushdb.augBrother, cb);
		},
		rushees : function(cb) {
			rushdb.find('rushees', {}, {first : 1, last: 1}, rushdb.augRushee, cb);
		},
		statuses : function(cb) {
			rushdb.find('statuses', {}, {_id: -1}, function(){}, cb);
		}
	},
	function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect(BASE_PATH+'/404');
			return;
		}
		
		var brothers = info.brothers;
		var rushees = info.rushees;
		var statuses = info.statuses;
		var brotherIDs = tools.map(brothers, function(b) {return b._id;});
		var rusheeIDs = tools.map(rushees, function(r) {return r._id;});
		var query = {rusheeID: {$in : rusheeIDs}, brotherID : {$in : brotherIDs}};
		
		rushdb.joinProperty(statuses, 'statuses', rushees, 'rusheeID');
		for (var i = 0; i < rushees.length; i++) {
			rushees[i].status = rushees[i].statuses[0] || rushdb.getNullStatus(rushees[i]);
		}
		
		async.parallel({
			votes : function(cb) {
				rushdb.find('votes', query, {_id:-1}, function(){}, cb);
			}
		},
		function(err, args) {
			if (err !== undefined && err !== null) {
				console.log(err);
				res.redirect(BASE_PATH + '/404');
				return;				
			}
			rushdb.joinAssocIndexed(args.votes, 'votesBy',
				rushees, 'rusheeID', 'rushee',
				brothers, 'brotherID', 'brother');
			
			//default vote -> rushee.voteBy
			for (var i = 0; i < rushees.length; i++) {
				var r = rushees[i];
				r.voteBy = {};
				for (var j = 0; j < brothers.length; j++) {
					var b = brothers[j];
					r.voteBy[b._id] = r.votesBy[b._id][0] || rushdb.getNullVote(r, b);
				}
			}
			
			//aggregate -> brother.votesByType, calculate vote score
			for (var i = 0; i < rushees.length; i++) {
				var r = rushees[i];
				r.votesByType = {};
				r.voteScore = 0;
				for (var j in rushdb.voteType) {
					r.votesByType[rushdb.voteType[j]._id] = [];
				}
				for (var b in r.voteBy) {
					var vote = r.voteBy[b];
					r.votesByType[vote.type._id].push(vote);
					r.voteScore += vote.type.value;
				}
			}
			
			rushees.sort(function(a, b) {
				return b.voteScore - a.voteScore;
			});
			
			var v = rushdb.voteType;
			args.voteTypes = [v.DEF, v.YES, v.MET, v.NO, v.VETO, v.NULL];
			args.brothers = brothers;
			args.rushees = rushees;
			args.basepath = BASE_PATH;
			res.render('viewrusheevotes.jade', args);
		});
	});
});

app.get(BASE_PATH+'/viewbrothers', auth.checkAuth, function(req,res){
	rushdb.find('brothers', {}, {first: 1, last: 1}, rushdb.augBrother, function(err, docs) {
		if (err === null || err === undefined) {
			res.render('viewbrothers.jade', {brothers:docs, basepath:BASE_PATH});
		} else {
			res.redirect(BASE_PATH+'/404');
		}
	});
});

app.get(BASE_PATH+'/viewbrothervotes', auth.checkAuth, function(req,res){
	async.parallel({
		brothers : function(cb) {
			rushdb.find('brothers', {}, {first: 1, last: 1}, rushdb.augBrother, cb);
		},
		rushees : function(cb) {
			rushdb.find('rushees', {}, {first : 1, last: 1}, rushdb.augRushee, cb);
		},
		statuses : function(cb) {
			rushdb.find('statuses', {}, {_id: -1}, function(){}, cb);
		}
	},
	function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect(BASE_PATH+'/404');
			return;
		}
		
		var brothers = info.brothers;
		var rushees = info.rushees;
		var statuses = info.statuses;
		var brotherIDs = tools.map(brothers, function(b) {return b._id;});
		var rusheeIDs = tools.map(rushees, function(r) {return r._id;});
		var query = {rusheeID: {$in : rusheeIDs}, brotherID : {$in : brotherIDs}};
		
		rushdb.joinProperty(statuses, 'statuses', rushees, 'rusheeID');
		for (var i = 0; i < rushees.length; i++) {
			rushees[i].status = rushees[i].statuses[0] || rushdb.getNullStatus(rushees[i]);
		}
		async.parallel({
			votes : function(cb) {
				rushdb.find('votes', query, {_id:-1}, function(){}, cb);
			}
		},
		function(err, args) {
			if (err !== undefined && err !== null) {
				console.log(err);
				res.redirect(BASE_PATH + '/404');
				return;				
			}
			rushdb.joinAssocIndexed(args.votes, 'votesBy',
				rushees, 'rusheeID', 'rushee',
				brothers, 'brotherID', 'brother');
				
				
			//default vote -> brother.voteBy
			for (var i = 0; i < brothers.length; i++) {
				var b = brothers[i];
				b.voteBy = {};
				for (var j = 0; j < rushees.length; j++) {
					var r = rushees[j];
					b.voteBy[r._id] = b.votesBy[r._id][0] || rushdb.getNullVote(r, b);
				}
			}
				
			//aggregate -> brother.votesByType
			for (var i = 0; i < brothers.length; i++) {
				var b = brothers[i];
				b.votesByType = {};
				for (var j in rushdb.voteType) {
					b.votesByType[rushdb.voteType[j]._id] = [];
				}
				for (var r in b.voteBy) {
					var vote = b.voteBy[r];
					if (vote.rushee.visible) {
						b.votesByType[vote.type._id].push(vote);
					}
				}
			}
			//find brother votes
			var v = rushdb.voteType;
			args.voteTypes = [v.DEF, v.YES, v.MET, v.NO, v.VETO, v.NULL];
			args.brothers = brothers;
			args.rushees = rushees;
			args.basepath = BASE_PATH;
			res.render('viewbrothervotes.jade', args);
		});
	});
});
	
app.get(BASE_PATH+'/addbrother', auth.checkAdminAuth, function(req, res){
	res.render('addbrother.jade',{basepath:BASE_PATH});
});

app.post(BASE_PATH+'/addbrother', auth.checkAdminAuth, function(req,res) {
	var brother = {
		first: req.body.first,
		last: req.body.last,
		'class': req.body['class'],
		phone: req.body.phone,
		email: req.body.email
	};
	rushdb.insert('brothers', brother);
	res.render('addbrother.jade',{basepath:BASE_PATH});
});

app.get(BASE_PATH+'/addrushee', auth.checkAdminAuth, function(req,res) {
	res.render('addrushee.jade',{basepath:BASE_PATH});
});

app.post(BASE_PATH+'/addrushee', auth.checkAdminAuth, function(req,res) {
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
	
	var rushee = {
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

	rushdb.insert('rushees', rushee);
	res.render('addrushee.jade',{basepath:BASE_PATH});
});

app.get(BASE_PATH+'/', auth.checkFrontDeskAuth, function(req, res){
	var accountType = auth.getAccountType(req, res);
	if (accountType == auth.accountType.ADMIN) {
		res.render('index.jade', {accountType: accountType, basepath: BASE_PATH});
	} else if (accountType == auth.accountType.BROTHER) {
		res.redirect(BASE_PATH+'/viewrushees');
	} else if (accountType == auth.accountType.FRONTDESK) {
		res.redirect(BASE_PATH+'/frontdesk');
	} else {
		res.redirect(BASE_PATH+'/login');
	}
});

app.get(BASE_PATH+'/login', function(req,res){
	auth.logout(res);
	res.render('auth.jade',{basepath:BASE_PATH});
});

app.post(BASE_PATH+'/login', function(req,res){
	auth.login(req.body.username, req.body.password, res);
	
	res.redirect(BASE_PATH+'/');
});

app.get(BASE_PATH+'/frontdesk', function(req, res) {
	var rusheeID = req.query.rID === undefined ? null : toObjectID(req.query.rID);
	if (rusheeID === null) {
		rushdb.find('rushees', {}, {first: 1, last: 1}, rushdb.augRushee, function(err, docs) {
			if (err === null || err === undefined) {
				var accountType = auth.getAccountType(req, res);
				res.render('viewall.jade', {rushees: docs, accountType: accountType, basepath:BASE_PATH});
			} else {
				res.redirect(BASE_PATH+'/404');
			}
		});
	} else {
		rushdb.findOne('rushees', {_id : rusheeID}, rushdb.augRushee, function(err, doc) {
			if (err === null || err === undefined) {
				res.render('view.jade', {rushee: doc, basepath:BASE_PATH});
			} else {
				res.redirect(BASE_PATH+'/404');
			}
		});
	}
});

app.post(BASE_PATH+'/inhouse', auth.checkFrontDeskAuth, function(req, res) {
	var rusheeID = toObjectID(req.body.rID);
	
	//GOING IN
	rushdb.insert('statuses', {rusheeID: rusheeID, type : rushdb.statusType.IN});
	res.redirect(BASE_PATH+'/frontdesk');
});

app.post(BASE_PATH+'/outhouse', auth.checkFrontDeskAuth, function(req, res) {
	var rusheeID = toObjectID(req.body.rID);
	
	//GOING OUT
	rushdb.insert('statuses', {rusheeID: rusheeID, type : rushdb.statusType.OUT});
	res.redirect(BASE_PATH+'/frontdesk');
});

app.post(BASE_PATH+'/onjaunt', auth.checkFrontDeskAuth, function(req, res) {
	var rusheeID = toObjectID(req.body.rID);
	
	//ON JAUNT
	rushdb.insert('statuses', {rusheeID: rusheeID, type : rushdb.statusType.JAUNT});
	res.redirect(BASE_PATH+'/frontdesk');
});

app.get('*', function(req, res){
	res.render('404.jade',{basepath:BASE_PATH});
});

//listen on localhost:8000
// app.listen(8000,'localhost');
//var options = {
//	key:fs.readFileSync(__dirname+'/cert/key.pem'),
//	cert:fs.readFileSync(__dirname+'/cert/cert.pem')
//};

//https.createServer(options, app).listen(8000, '18.202.1.157');
// https.createServer(options, app).listen(8000, 'localhost');
// app.listen(8000,'18.202.1.157');
app.listen(8888,'localhost');
