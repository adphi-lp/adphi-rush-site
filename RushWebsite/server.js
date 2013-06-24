'use strict';

//constants
var BASE_PATH = '';
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
var toObjectID = require('mongojs').ObjectId;

//create app and connect
var app = express();
auth.setRedirect(BASE_PATH + '/login');
rushdb.connect(DATABASE_URL);

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

app.get(BASE_PATH+'/loadtest', auth.checkAdminAuth, function(req, res) {
	rushdb.loadTestInsertRushees();
	rushdb.loadTestInsertBrothers();
	res.redirect(BASE_PATH + '/');
});

app.get(BASE_PATH+'/search', auth.checkAuth, function(req, res){
	res.render('search.jade',{basepath:BASE_PATH});
});

app.get(BASE_PATH+'/vote', auth.checkAuth, function(req, res){
	var rusheeID = req.query.rID === undefined ? null : toObjectID(req.query.rID);
	var brotherID = req.query.bID === undefined ? null : toObjectID(req.query.bID);
	
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
		
		info.voteTypes = rushdb.SORTED_VOTE_TYPES;
		info.commentTypes = rushdb.SORTED_COMMENT_TYPES;
		info.jaunts = {};
		info.basepath = BASE_PATH;
		res.render('vote.jade', info);
		time = process.hrtime(time);
		console.log('vote took %d seconds and %d nanoseconds', time[0], time[1]);
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
		var commentJaunt = req.body['commentJaunt'+i]; //TODO, ignore for now
		
		if (commentText !== '') {
			rushdb.insertComment(rusheeID, brotherID, commentID, commentText);
		}
	}
	
	res.redirect(BASE_PATH+'/');	
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
	var rusheeID = toObjectID(req.body.rusheeID);
	
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
		visible: req.body.visible === 'on',
		priority: req.body.priority === 'on',
		photo: photoPath
	};
	
	rushdb.updateRushee(rusheeID, rushee, function(err) {
		if (err !== null && err !== undefined) {
			console.log(err);
			res.redirect(BASE_PATH+'/editRushees');
		} else {
			res.redirect(BASE_PATH+'/viewRushees');
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
		
		var q = req.query.q;
		if (q !== null && q !== undefined) {
			info.rushees = search.get(info.rushees, q);
			info.q = q;
		} else {
			info.q = '';
		}
		
		info.inhouse = req.query.inhouse;
		info.priority = req.query.priority;
		info.search = req.query.q;
		info.basepath = BASE_PATH;
		info.accountType = auth.getAccountType(req, res);
		res.render('viewrushees.jade', info);
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
	rushdb.get(rushdb.arrangeInHouseVotes, {}, function(err, info) {
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
		rushdb.get(rushdb.arrange, {}, function(err, info) {
			if (err !== null && err !== undefined) {
				console.log(err);
				res.redirect(BASE_PATH+'/404');
				return;
			}
			info.accountType = auth.getAccountType(req, res);
			info.basepath = BASE_PATH;
			res.render('viewall.jade', info);
		});
	} else {
		rushdb.getRushee(rusheeID, function(err, info) {
			if (err !== null && err !== undefined) {
				console.log(err);
				res.redirect(BASE_PATH+'/404');
				return;
			}
			info.basepath = BASE_PATH;
			res.render('view.jade', info);
		});
	}
});

app.post(BASE_PATH+'/inhouse', auth.checkFrontDeskAuth, function(req, res) {
	var rusheeID = toObjectID(req.body.rID);
	
	//GOING IN
	rushdb.insertStatus(rusheeID, 'IN');
	res.redirect(BASE_PATH+'/frontdesk');
});

app.post(BASE_PATH+'/outhouse', auth.checkFrontDeskAuth, function(req, res) {
	var rusheeID = toObjectID(req.body.rID);
	
	//GOING OUT
	rushdb.insertStatus(rusheeID, 'OUT');
	res.redirect(BASE_PATH+'/frontdesk');
});

app.post(BASE_PATH+'/onjaunt', auth.checkFrontDeskAuth, function(req, res) {
	var rusheeID = toObjectID(req.body.rID);
	
	//ON JAUNT
	rushdb.insertStatus(rusheeID, 'JAUNT');
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
