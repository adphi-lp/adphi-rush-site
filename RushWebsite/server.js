'use strict';

//constants
var BASE_PATH = '/rushsite20';
var DATABASE_URL = 'ADPhiRush';

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
var search = require('./search');
var toObjectID = rushdb.toObjectID;

//create app and connect
var app = express();
auth.setRedirect(BASE_PATH + '/login');
rushdb.connect(DATABASE_URL);

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

app.get(BASE_PATH+'/loadtest', auth.checkAdminAuth, function(req, res) {
	rushdb.loadTestInsertRushees();
	rushdb.loadTestInsertBrothers();
	res.redirect(BASE_PATH + '/');
});

app.get(BASE_PATH+'/search', auth.checkAuth, function(req, res){
	res.render('search.jade',{basepath:BASE_PATH});
});

app.get(BASE_PATH+'/jaunt', auth.checkAuth, function(req, res){
	var jauntID = req.query.jID === undefined ? null : toObjectID(req.query.jID);
	
	var time = process.hrtime();
	
	var arrangeJaunt = function(info, render) {
		rushdb.arrangeJaunt(jauntID, info, render);
	};
	
	rushdb.get(arrangeJaunt, {}, function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect(BASE_PATH+'/404');
			return;
		}
		
		info.voteTypes = rushdb.SORTED_VOTE_TYPES;
		info.commentTypes = rushdb.SORTED_COMMENT_TYPES;
		info.accountType = auth.getAccountType(req, res);
		info.basepath = BASE_PATH;
		res.render('jaunt.jade', info);
		time = process.hrtime(time);
		console.log('/jaunt took %d seconds and %d nanoseconds', time[0], time[1]);
	});
});

app.post(BASE_PATH+'/jaunt', auth.checkAuth, function(req, res){
	var name = req.body.vName;
	var driver = req.body.vDriver;
	var id = toObjectID(req.body.jID);
	
	var van = {
		name : name,
		driver : driver,
		rIDs : [],
		bIDs : []
	};
	
	rushdb.insertVan(van, function(err, docs) {
		var vID = docs[0]._id;
		rushdb.pushVanToJaunt(vID, id);
	});
	
	res.redirect(BASE_PATH+'/jaunt?jID=' + id);
});

app.post(BASE_PATH+'/pushRusheeToVan', auth.checkAuth, function(req, res){
	var rid = toObjectID(req.body.rID);
	var vid = toObjectID(req.body.vID);
	
	rushdb.pushRusheeToVan(rid, vid);
	
	res.redirect(BASE_PATH+'/jaunts');
});

app.post(BASE_PATH+'/pushBrotherToVan', auth.checkAuth, function(req, res){
	var bid = toObjectID(req.body.bID);
	var vid = toObjectID(req.body.vID);
	
	rushdb.pushBrotherToVan(bid, vid);
	
	res.redirect(BASE_PATH+'/jaunts');
});

app.post(BASE_PATH+'/pullVanFromJaunt', auth.checkAuth, function(req, res){
	var jid = toObjectID(req.body.jID);
	var vid = toObjectID(req.body.vID);
	
	rushdb.pullVanFromJaunt(vid, jid, function(err, count) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect(BASE_PATH+'/404');
			return;
		}
		rushdb.removeVan(vid);
	});
	
	res.redirect(BASE_PATH+'/jaunts');
});


app.post(BASE_PATH+'/pullRusheeFromVan', auth.checkAuth, function(req, res){
	var rid = toObjectID(req.body.rID);
	var vid = toObjectID(req.body.vID);
	
	rushdb.pullRusheeFromVan(rid, vid, function(err, count) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect(BASE_PATH+'/404');
			return;
		}
		res.redirect(BASE_PATH+'/jaunts');
	});
});

app.post(BASE_PATH+'/pullBrotherFromVan', auth.checkAuth, function(req, res){
	var bid = toObjectID(req.body.bID);
	var vid = toObjectID(req.body.vID);
	
	rushdb.pullBrotherFromVan(bid, vid, function(err, count) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect(BASE_PATH+'/404');
			return;
		}
		res.redirect(BASE_PATH+'/jaunts');
	});
});

app.get(BASE_PATH+'/jaunts', auth.checkAuth, function(req, res){
	var time = process.hrtime();
	
	rushdb.get(rushdb.arrange, {}, function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect(BASE_PATH+'/404');
			return;
		}
		
		info.voteTypes = rushdb.SORTED_VOTE_TYPES;
		info.commentTypes = rushdb.SORTED_COMMENT_TYPES;
		info.basepath = BASE_PATH;
		res.render('jaunts.jade', info);
		time = process.hrtime(time);
		console.log('/jaunts took %d seconds and %d nanoseconds', time[0], time[1]);
	});
});

app.get(BASE_PATH+'/importcand', auth.checkAdminAuth, function(req, res) {
	res.render('importcand.jade', {basepath:BASE_PATH});
});

app.post(BASE_PATH+'/importcand', auth.checkAdminAuth, function(req, res) {
	var candtext = req.body.cand;
	rushdb.importCand(candtext);
	res.redirect(BASE_PATH + '/');
});

app.get(BASE_PATH+'/copycol', auth.checkAdminAuth, function(req, res) {
	res.render('copycol.jade', {basepath:BASE_PATH});
});

app.post(BASE_PATH+'/copycol', auth.checkAdminAuth, function(req, res) {
	rushdb.copyCol('import', req.body.col);
	res.redirect(BASE_PATH + '/');
});


app.post(BASE_PATH+'/jaunts', auth.checkAuth, function(req, res){
	var name = req.body.jName;
	var time = Date.parse(req.body.jTime);
	
	var jaunt = {
		name : name,
		time : time,
		vIDs : []
	};
	rushdb.insertJaunt(jaunt);
	res.redirect(BASE_PATH+'/jaunts');
});

app.get(BASE_PATH+'/vote', auth.checkAuth, function(req, res){
	var rusheeID = req.query.rID === undefined ? null : toObjectID(req.query.rID);
	var brotherID = req.query.bID === undefined ? null : toObjectID(req.query.bID);
	if (brotherID !== null) {
		res.cookie('brotherID', brotherID);
	}
	
	var time = process.hrtime();
	var arrangeVote = function(info, render) {
		rushdb.arrangeVote(rusheeID, brotherID, info, render);
	};
	
	rushdb.get(arrangeVote, {}, function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect(BASE_PATH+'/404');
			return;
		}
		
		if (brotherID === null) {
			info.brotherID = toObjectID(req.cookies.brotherID);
		}
		
		info.voteTypes = rushdb.SORTED_VOTE_TYPES;
		info.commentTypes = rushdb.SORTED_COMMENT_TYPES;
		info.accountType = auth.getAccountType(req, res);
		info.basepath = BASE_PATH;
		res.render('vote.jade', info);
		time = process.hrtime(time);
		console.log('/vote took %d seconds and %d nanoseconds', time[0], time[1]);
	});
});

app.post(BASE_PATH+'/vote', auth.checkAuth, function(req, res) {
	var sponsor = (req.body.sponsor == 'Yes');
	var voteID = req.body.vote;
	var rusheeID = toObjectID(req.body.rID);
	var brotherID = toObjectID(req.body.bID);
	
	rushdb.insertSponsor(rusheeID, brotherID, sponsor);
	rushdb.insertVote(rusheeID, brotherID, voteID);
	
	for (var i = 0; i < 2; i++) {
		var commentText = req.body['comment'+i];
		var commentID = req.body['commentType'+i].toUpperCase();
		var commentJaunt = req.body['commentJaunt'+i];
		
		if (commentText !== '' || commentJaunt !== 'null') {
			if (commentJaunt === 'null') {
				rushdb.insertComment(rusheeID, brotherID, commentID, commentText);
			} else {
				var jauntID = toObjectID(commentJaunt);
				rushdb.insertComment(rusheeID, brotherID, commentID, commentText, jauntID);
			}
		}
	}
	
	res.redirect(BASE_PATH+'/vote?rID=' + rusheeID);
});

app.get(BASE_PATH+'/editcomment', auth.checkAdminAuth, function(req, res){
	var cID = req.query.cID === undefined ? null : toObjectID(req.query.cID);
	
	var time = process.hrtime();
	var arrangeComment = function(info, render) {
		rushdb.arrangeComment(cID, info, render);
	};
	
	rushdb.get(arrangeComment, {}, function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect(BASE_PATH+'/404');
			return;
		}
		
		info.voteTypes = rushdb.SORTED_VOTE_TYPES;
		info.commentTypes = rushdb.SORTED_COMMENT_TYPES;
		info.accountType = auth.getAccountType(req, res);
		info.basepath = BASE_PATH;
		res.render('editcomment.jade', info);
		time = process.hrtime(time);
		console.log('/editcomment took %d seconds and %d nanoseconds', time[0], time[1]);
	});
});

app.post(BASE_PATH+'/editcomment', auth.checkAuth, function(req, res) {
	var commentText = req.body.comment;
	var commentType = req.body.commentType.toUpperCase();
	var commentID = toObjectID(req.body.commentID);
	var commentJaunt = req.body.commentJaunt;
	
	if (commentText !== '' || commentJaunt !== 'null') {
		if (commentJaunt === 'null') {
			rushdb.updateComment(commentID, commentType, commentText);
		} else {
			var jauntID = toObjectID(commentJaunt);
			rushdb.updateComment(commentID, commentType, commentText, jauntID);
		}
	}
	
	res.redirect(BASE_PATH+'/viewrushees');
});

app.get(BASE_PATH+'/editrushee', auth.checkAuth,  function(req, res) {
	var rusheeID = req.query.rID === undefined ? null : toObjectID(req.query.rID);
	
	rushdb.getRushee(rusheeID, function(err, info) {
		if (err !== null && err !== undefined) {
			console.log(err);
			res.redirect(BASE_PATH+'/404');
			return;
		}
		
		info.accountType = auth.getAccountType(req, res);
		info.basepath = BASE_PATH;
		res.render('editrushee.jade', info);
	});
});

app.post(BASE_PATH+'/editrushee', auth.checkAuth, function(req, res) {
	var rusheeID = toObjectID(req.body.rID);
	
	//TODO clean up photo code
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
		cross1 : req.body.cross1,
		cross2 : req.body.cross2,
		photo: photoPath
	};
	
	var accountType = auth.getAccountType(req, res);
	if (accountType.isAdmin()) {
		rushee.visible = req.body.visible === 'on';
		rushee.priority = req.body.priority === 'on';
	}
	
	rushdb.updateRushee(rusheeID, rushee, function(err) {
		if (err !== null && err !== undefined) {
			console.log(err);
			res.redirect(BASE_PATH+'/editrushees'); //TODO error page
		} else {
			res.redirect(BASE_PATH+'/viewrushees');
		}
	});
});

app.get(BASE_PATH+'/editbrother', auth.checkAuth,  function(req, res) {
	var bID = req.query.bID === undefined ? null : toObjectID(req.query.bID);
	
	rushdb.getBrother(bID, function(err, info) {
		if (err !== null && err !== undefined) {
			console.log(err);
			res.redirect(BASE_PATH+'/404');
			return;
		}
		
		info.accountType = auth.getAccountType(req, res);
		info.basepath = BASE_PATH;
		res.render('editbrother.jade', info);
	});
});

app.post(BASE_PATH+'/editbrother', auth.checkAuth, function(req, res) {
	var brotherID = toObjectID(req.body.bID);
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
			res.redirect(BASE_PATH+'/editbrothers'); //TODO error page
		} else {
			res.redirect(BASE_PATH+'/viewbrothers');
		}
	});
});

app.get(BASE_PATH+'/viewrushees', auth.checkAuth, function(req,res){
	rushdb.get(rushdb.arrange, {}, function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect(BASE_PATH+'/404');
			return;
		}
		
		info.inhouse = req.query.inhouse;
		info.priority = req.query.priority;
		info.outhouse = req.query.outhouse;
		info.onjaunt = req.query.onjaunt;
		info.search = req.query.q;
		info.basepath = BASE_PATH;
		info.accountType = auth.getAccountType(req, res);
		info.bidworthy = req.query.bidworthy;
		info.hidden = req.query.hidden;
		
		var options = {
			inhouse : info.inhouse === 'on',
			priority : info.priority === 'on',
			outhouse : info.outhouse === 'on',
			onjaunt : info.onjaunt === 'on',
			bidworthy : info.bidworthy === 'on' ? info.bidScore : false,
			visible : !info.accountType.isAdmin(),
			hidden : info.hidden === 'on' && info.accountType.isAdmin(),
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
		
		res.render('viewrushees.jade', info);
	});
});

app.get(BASE_PATH+'/newrushees', auth.checkAdminAuth, function(req,res){
	rushdb.get(rushdb.arrange, {rushees : {sort : {_id : -1}}}, function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect(BASE_PATH+'/404');
			return;
		}
		
		info.basepath = BASE_PATH;
		info.accountType = auth.getAccountType(req, res);
		res.render('newrushees.jade', info);
	});
});

app.get(BASE_PATH+'/viewrusheevotes', auth.checkAuth, function(req, res) {
	rushdb.get(rushdb.arrangeVoteScore, {}, function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect(BASE_PATH+'/404');
			return;
		}
		info.voteTypes = rushdb.SORTED_VOTE_TYPES;
		info.basepath = BASE_PATH;
		res.render('viewrusheevotes.jade', info);
	});
});

app.get(BASE_PATH+'/viewbrother', auth.checkAuth, function(req, res){
	var brotherID = req.query.bID === undefined ? null : toObjectID(req.query.bID);
	
	var time = process.hrtime();
	var arrangeBrother = function(info, render) {
		rushdb.arrangeBrother(brotherID, info, render);
	};
	
	rushdb.get(arrangeBrother, {}, function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect(BASE_PATH+'/404');
			return;
		}
		
		info.voteTypes = rushdb.SORTED_VOTE_TYPES;
		info.commentTypes = rushdb.SORTED_COMMENT_TYPES;
		info.accountType = auth.getAccountType(req, res);
		info.basepath = BASE_PATH;
		res.render('viewbrother.jade', info);
		time = process.hrtime(time);
		console.log('viewbrother took %d seconds and %d nanoseconds', time[0], time[1]);
	});
});

app.get(BASE_PATH+'/viewhistory', auth.checkAdminAuth, function(req, res) {
	var rusheeID = req.query.rID === undefined ? null : toObjectID(req.query.rID);
	var brotherID = req.query.bID === undefined ? null : toObjectID(req.query.bID);
	
	rushdb.get(rushdb.arrange, {}, function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect(BASE_PATH+'/404');
			return;
		}
		info.voteTypes = rushdb.SORTED_VOTE_TYPES;
		info.commentTypes = rushdb.SORTED_COMMENT_TYPES;
		info.basepath = BASE_PATH;
		res.render('viewhistory.jade', info);
	});
});

app.get(BASE_PATH+'/viewbrothers', auth.checkAuth, function(req,res){
	rushdb.get(rushdb.arrange, {}, function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect(BASE_PATH+'/404');
			return;
		}
		
		info.basepath = BASE_PATH;
		res.render('viewbrothers.jade', info);
	});
});

app.get(BASE_PATH+'/viewbrothervotes', auth.checkAuth, function(req,res){
	var arrangeInPriVotes = function(info, render) {
		rushdb.makeCustomRushees(info, info.rushees, 'relevantRushees',function(r) {
			return r.status.type._id === 'IN' || r.priority === true;
		});
		info.relevantRushees.sort(function(a, b){
			var astat = a.status.type._id === 'IN' ? 1 : 0;
			var bstat = b.status.type._id === 'IN' ? 1 : 0;
			if (astat !== bstat) {
				return bstat - astat;
			}
			var apri = a.priority === true ? 1 : 0;
			var bpri = b.priority === true ? 1 : 0;
			
			return bpri - apri;
		});
		rushdb.arrangeCustomVotes(info, render, 'relevantRushees', 'brothers');
	};
	rushdb.get(arrangeInPriVotes, {}, function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect(BASE_PATH+'/404');
			return;
		}
		info.voteTypes = rushdb.SORTED_VOTE_TYPES;
		info.basepath = BASE_PATH;
		res.render('viewbrothervotes.jade', info);
	});
});

app.get(BASE_PATH+'/viewbrothersummary', auth.checkAuth, function(req,res){
	var arrangeInPriVotes = function(info, render) {
		rushdb.makeCustomRushees(info, info.rushees, 'relevantRushees',function(r) {
			return r.status.type._id === 'IN' || r.priority === true;
		});
		info.relevantRushees.sort(function(a, b){
			var astat = a.status.type._id === 'IN' ? 1 : 0;
			var bstat = b.status.type._id === 'IN' ? 1 : 0;
			if (astat !== bstat) {
				return bstat - astat;
			}
			var apri = a.priority === true ? 1 : 0;
			var bpri = b.priority === true ? 1 : 0;
			
			return bpri - apri;
		});
		info.brothersortoff = true; //fix this
		rushdb.arrangeCustomVotes(info, render, 'relevantRushees', 'brothers');
	};
	rushdb.get(arrangeInPriVotes, {}, function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect(BASE_PATH+'/404');
			return;
		}
		info.voteTypes = rushdb.SORTED_VOTE_TYPES;
		info.basepath = BASE_PATH;
		info.accountType = auth.getAccountType(req, res);
		res.render('viewbrothersummary.jade', info);
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
	rushdb.insertBrother(brother);
	res.render('addbrother.jade',{basepath:BASE_PATH});
});

app.get(BASE_PATH+'/addcandidate', auth.checkAdminAuth, function(req,res) {
	res.render('addcandidate.jade',{basepath:BASE_PATH});
});

app.post(BASE_PATH+'/addcandidate', auth.checkAdminAuth, function(req,res) {
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
	res.render('addcandidate.jade',{basepath:BASE_PATH});
});

app.get(BASE_PATH+'/addrushee', auth.checkAdminAuth, function(req,res) {
	res.render('addrushee.jade',{basepath:BASE_PATH});
});

app.post(BASE_PATH+'/addrushee', auth.checkAdminAuth, function(req,res) {
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

	rushdb.insertRushee(rushee);
	res.render('addrushee.jade',{basepath:BASE_PATH});
});


app.get(BASE_PATH+'/newrushee', auth.checkFrontDeskAuth, function(req,res) {
	res.render('addrusheefront.jade',{basepath:BASE_PATH});
});

app.post(BASE_PATH+'/newrushee', auth.checkFrontDeskAuth, function(req,res) {
	var photoPath = '/public/img/no_photo.jpg';
	var first = req.body.first || '';
	var last = req.body.last || '';
	var nick = req.body.nick || '';
	var dorm = req.body.dorm || '';
	var phone = req.body.phone || '';
	var year = req.body.year || '';
	var email = req.body.email || '';
	var photo = photoPath;
	
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
			res.redirect(BASE_PATH+'/404');
			return;
		}
		var newID = docs[0]._id;
		rushdb.insertStatus(newID, 'IN');
	});
	res.redirect(BASE_PATH+'/frontdesk');
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

app.get(BASE_PATH+'/frontdesk', auth.checkFrontDeskAuth, function(req, res) {
	var rusheeID = req.query.rID === undefined ? null : toObjectID(req.query.rID);
	var cID = req.query.cID === undefined ? null : toObjectID(req.query.cID);
	
	if (rusheeID !== null) {
		rushdb.getRushee(rusheeID, function(err, info) {
			if (err !== null && err !== undefined) {
				console.log(err);
				res.redirect(BASE_PATH+'/404');
				return;
			}
			info.basepath = BASE_PATH;
			res.render('view.jade', info);
		});
	} else if (cID !== null) {
		rushdb.getCandidate(cID, function(err, info) {
			if (err !== null && err !== undefined) {
				console.log(err);
				res.redirect(BASE_PATH+'/404');
				return;
			}
			info.rushee = info.candidate;
			info.basepath = BASE_PATH;
			res.render('view.jade', info);
		});
	} else {
		rushdb.get(rushdb.arrange, {}, function(err, info) {
			if (err !== null && err !== undefined) {
				console.log(err);
				res.redirect(BASE_PATH+'/404');
				return;
			}
			
			info.accountType = auth.getAccountType(req, res);
			info.search = req.query.q;
			info.basepath = BASE_PATH;
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
				visible : !info.accountType.isAdmin(),
				hidden : info.hidden === 'on' && info.accountType.isAdmin(),
				candidate : info.candidate === 'on' && info.accountType.isAdmin()
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
			
			res.render('viewall.jade', info);
		});
	}
});

app.post(BASE_PATH+'/inhouse', auth.checkFrontDeskAuth, function(req, res) {
	var rID = req.body.rID === undefined ? null : toObjectID(req.body.rID);
	var cID = req.body.cID === undefined ? null : toObjectID(req.body.cID);
	var redirect = req.body.redirect;
	
	//GOING IN
	if (rID !== null) {	
		rushdb.insertStatus(rID, 'IN');
		res.redirect(redirect);
	} else if (cID !== null) {
		rushdb.transferCandidate(cID, rushdb.insertRushee, function(err, docs) {
			if (err !== null && err !== undefined) {
				console.log(err);
				res.redirect(BASE_PATH+'/404');
				return;
			}
			var newID = docs[0]._id;
			rushdb.insertStatus(newID, 'IN');
		});
		res.redirect(redirect);
	} else {
		console.log(new Error('no rushee or candidate ID.'));
		res.redirect(BASE_PATH+'/404');
	}

});

app.post(BASE_PATH+'/outhouse', auth.checkFrontDeskAuth, function(req, res) {
	var rID = req.body.rID === undefined ? null : toObjectID(req.body.rID);
	var cID = req.body.cID === undefined ? null : toObjectID(req.body.cID);
	var redirect = req.body.redirect;
	
	//GOING OUT
	if (rID !== null) {	
		rushdb.insertStatus(rID, 'OUT');
		res.redirect(redirect);
	} else if (cID !== null) {
		rushdb.transferCandidate(cID, rushdb.insertRushee, function(err, docs) {
			if (err !== null && err !== undefined) {
				console.log(err);
				res.redirect(BASE_PATH+'/404');
				return;
			}
			var newID = docs[0]._id;
			rushdb.insertStatus(newID, 'OUT');
		});
		res.redirect(redirect);
	} else {
		console.log(new Error('no rushee or candidate ID.'));
		res.redirect(BASE_PATH+'/404');
	}
});

app.post(BASE_PATH+'/onjaunt', auth.checkFrontDeskAuth, function(req, res) {
	var rID = req.body.rID === undefined ? null : toObjectID(req.body.rID);
	var cID = req.body.cID === undefined ? null : toObjectID(req.body.cID);
	var redirect = req.body.redirect;
	
	//ON JAUNT
	if (rID !== null) {	
		rushdb.insertStatus(rID, 'JAUNT');
		res.redirect(redirect);
	} else if (cID !== null) {
		rushdb.transferCandidate(cID, rushdb.insertRushee, function(err, docs) {
			if (err !== null && err !== undefined) {
				console.log(err);
				res.redirect(BASE_PATH+'/404');
				return;
			}
			var newID = docs[0]._id;
			rushdb.insertStatus(newID, 'JAUNT');
		});
		res.redirect(redirect);
	} else {
		console.log(new Error('no rushee or candidate ID.'));
		res.redirect(BASE_PATH+'/404');
	}
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
