//create an app server
var express = require('express');
var https = require('https');
var fs = require('fs');
var Seq = require('seq');
var moment = require('moment');
var app = express();
var databaseURL = 'ADPhiRush';
var collections = ['brothers', 'rushees', 'comments', 'sponsors',
'votes', 'statuses', 'voteTypes', 'commentTypes', 'jaunts', 'vans']
var db = require('mongojs').connect(databaseURL, collections);
var tools = require('./tools');

//constants
var NULL_VOTE = {name:'None', value:0};
var BASE_PATH = '';

//to ensure that you can sort
db.rushees.ensureIndex({first:1 , last:1});
db.brothers.ensureIndex({first:1 , last:1});
db.voteTypes.ensureIndex({value:-1});
//TODO Comment sorting, etc.

//for parsing posts
app.use(express.bodyParser({uploadDir:__dirname+'/uploads'}));
//TODO: this is a really bad SECRET
app.use(express.cookieParser('ADPhiRush'));

//set path to static things
app.use(BASE_PATH+'/img',express.static(__dirname+ '/img'))
app.use(BASE_PATH+'/css',express.static(__dirname + '/css'))
app.use(BASE_PATH+'/js',express.static(__dirname + '/js'))

//set path to the views (template) directory
app.set('views', __dirname + '/views');


app.get(BASE_PATH+'/search', function(req, res){
	var accountType = req.cookies.accountType;
	if (accountType != 'brother' && accountType != 'admin' ) {
		res.redirect(BASE_PATH+'/auth');
		return;
	}
	res.render('search.jade',{basepath:BASE_PATH});
});

app.get(BASE_PATH+'/vote', function(req, res){
	var accountType = req.cookies.accountType;
	if (accountType != 'brother' && accountType != 'admin' ) {
		res.redirect(BASE_PATH+'/auth');
		return;
	}
	
	//TODO implement sessions for brothers
	var rusheeID = req.query.rusheeID;
	var brotherID = req.query.brotherID;
	var submitted = req.query.submitted == 'true';
	try {
		rusheeID = db.ObjectId(rusheeID);
	} catch (err) {
		rusheeID = null;
	}
	
	try {
		brotherID = db.ObjectId(brotherID);
	} catch (err) {
		brotherID = null;
	}
	
	Seq().par(function() {
		//get brother
		if (brotherID == null) {
			this(null, null);
		} else {
			db.brothers.findOne({_id : brotherID}, this);
		}
	}).par(function() {
		//get rushee
		if (rusheeID == null) {
			this(null, null);
		} else {
			db.rushees.findOne({_id : rusheeID}, this);
		}
	}).par(function() {
		//get brother list
		var that = this;
		var brothers = [];
		db.brothers.find().sort({first:1, last:1}).forEach(function(err, doc) {
			if (doc == null) {
				that(null, brothers);
			} else {
				brothers.push(doc);
			}
		});
	}).par(function() {
		//get vote types
		var that = this;
		var voteTypes = [];
		db.voteTypes.find().sort({value:-1}).forEach(function(err, doc) {
			if (doc == null) {
				that(null, voteTypes);
			} else {
				voteTypes.push(doc);
			}
		});
	}).par(function() {
		//get comment types
		var that = this;
		var commentTypes = [];
		db.commentTypes.find().forEach(function(err, doc) {
			if (doc == null) {
				that(null, commentTypes);
			} else {
				commentTypes.push(doc);
			}
		});
	}).par(function() {
		//get jaunts
		var jaunts = ['None'];
		this(null, jaunts);
	}).seq(function(brother, rushee, brothers, voteTypes, commentTypes, jaunts) {
		//do some error checking, form names
		if (rushee == null) {
			this(new Error('no rushee'));
			return;
		}
				
		if (brother != null) {
			brother.name = brother.first + ' ' + brother.last;
		}
		
		if (rushee.nick != '') {
			rushee.name = rushee.first+' \"'+rushee.nick+'\" '+ rushee.last;
		} else {
			rushee.name = rushee.first + ' ' + rushee.last;
		}
		
		for (var i = 0; i < brothers.length; i++) {
			brothers[i].name = brothers[i].first + ' ' + brothers[i].last;
		}
		
		this(null, brother, rushee, brothers, voteTypes, commentTypes, jaunts);
	}).par(function(brother, rushee, brothers, voteTypes, commentTypes, jaunts) {
		//pass on variables
		var args = {brother:brother, rushee:rushee, brothers:brothers, voteTypes:voteTypes,
			commentTypes:commentTypes, jaunts:jaunts};
		this(null, args);
	}).par(function(brother, rushee, brothers, voteTypes, commentTypes, jaunts) {
		//get all votes on rushee
		var that = this;
		var voteIDs = [];
		var votes = [];
		
		db.votes.find({rusheeID: rushee._id}).forEach(function(err, doc){
			if (doc == null) {
				//TODO make this not run in O(votes * (voteTypes+brothers))
				for (var i = 0; i < voteIDs.length; i++) {
					var vote = {};
					for (var j = 0; j < voteTypes.length; j++) {
						if (voteIDs[i].voteID.equals(voteTypes[j]._id)) {
							vote.voteType = voteTypes[j];
						}
					}
					
					for (var j = 0; j < brothers.length; j++) {
						if (voteIDs[i].brotherID.equals(brothers[j]._id)) {
							vote.brother = brothers[j];
						}
					}
					votes.push(vote);
				}
				that(null, votes);
			} else {
				voteIDs.push(doc);
			}
		});
	}).par(function(brother, rushee, brothers, voteTypes, commentTypes, jaunts) {
		//get all comments on rushee
		var that = this;
		var commentIDs = [];
		var comments = [];
		db.comments.find({rusheeID: rushee._id}).sort({_id:-1}).forEach(function(err, doc){
			if (doc == null) {
				//TODO make this not run in O(comments * (brothers+types))
				for (var i = 0; i < commentIDs.length; i++) {
					var time = moment(commentIDs[i]._id.getTimestamp());
					var comment = {
						time:'Posted at ' + time.format('h:mm:ss a') 
							+ ' on ' + time.format('dddd, MMMM Do YYYY'),
						text:commentIDs[i].text
					};
					for (var j = 0; j < commentTypes.length; j++) {
						if (commentIDs[i].type.equals(commentTypes[j]._id)) {
							comment.type = commentTypes[j].name;
							comment.color = commentTypes[j].color;
						}
					}
					
					for (var j = 0; j < brothers.length; j++) {
						if (commentIDs[i].brotherID.equals(brothers[j]._id)) {
							comment.name = brothers[j].name;
						}
					}
					comments.push(comment);
				}
				that(null, comments);
			} else {
				commentIDs.push(doc);
			}
		});
	}).par(function(brother, rushee, brothers, voteTypes, commentTypes, jaunts) {
		//get all sponsors on rushee
		var that = this;
		var sponsorIDs = [];
		var sponsors = [];
		
		// var callback = function() {
			// Seq().extend(sponsorsID)
				// .parEach(function(doc) {
					// db.brothers.findOne({_id: doc.brotherID}, this.into(doc._id));
				// }).seq(function() {
					// for (var i = 0; i < sponsorsID.length; i++) {
						// sponsors.push(this.vars[sponsorsID[i]._id]);
					// }
// 					
					// that(null, sponsors);
				// }).catch(function(err) {
					// console.log(err);
					// that(null, sponsors);
				// });
		// };
		
		db.sponsors.find({rusheeID: rushee._id}).forEach(function(err, doc){
			if (doc == null) {
				//TODO make this not run in O(brothers * sponsors)
				for (var i = 0; i < sponsorIDs.length; i++) {
					var sponsor = null;
					for (var j = 0; j < brothers.length; j++) {
						if (sponsorIDs[i].brotherID.equals(brothers[j]._id)) {
							sponsor = brothers[j];
						}
					}
					sponsors.push(sponsor);
				}
				that(null, sponsors);
			} else {
				sponsorIDs.push(doc)
			}
		});		
	}).seq(function(args, votes, comments, sponsors) {
		//done, calculate, and render the page
		args.voteTypes.push(NULL_VOTE);
		
		//calculate vote score
		var vote = 0;
		for (var i = 0; i < votes.length; i++) {
			vote += votes[i].voteType.value;
		}
		args.rushee.vote = vote;
		
		//get votes
		args.rushee.votes = votes;
		
		for (var i = 0; i < args.brothers.length; i++) {
			var bro = args.brothers[i];
			var voted = false;
			for (var j = 0; j < args.rushee.votes.length; j++) {
				if (bro._id.equals(args.rushee.votes[j].brother._id)) {
					voted = true;
				}
			}
			if (!voted) {
				args.rushee.votes.push({
					voteType: NULL_VOTE,
					brother: bro
				});
			}
		}
		
		args.rushee.votes.sort(function(a, b) {
			if (a.voteType._id == undefined) {
				if (b.voteType._id == undefined) {
					return 0;
				} else {
					return 1;
				}
			} else if (b.voteType._id == undefined){
				return -1;
			} else if (a.voteType.value > b.voteType.value){
				return -1;
			} else if (a.voteType.value < b.voteType.value) {
				return 1;
			} else if (a.brother.name < b.brother.name) {
				return -1;
			} else if (a.brother.name > b.brother.name) {
				return 1;
			} else {
				return 0;
			} 
		});
		
		//is brother a sponsor?
		if (args.brother != null) {
			args.brother.sponsor = false;
			for (var i = 0; i < sponsors.length; i++) {
				if (sponsors[i]._id.equals(args.brother._id)) {
					args.brother.sponsor = true;
				}
			}
		}
		
		//calculate brother vote
		if (args.brother != null) {
			args.brother.vote = NULL_VOTE;
			for (var i = 0; i < votes.length; i++) {
				if (votes[i].brother._id.equals(args.brother._id)) {
					args.brother.vote = votes[i].voteType;
				}
			}
		}
		
		//calculate sponsors
		args.rushee.sponsors = [];
		if (sponsors != null) {
			for (var i = 0; i < sponsors.length; i++) {
				args.rushee.sponsors.push(sponsors[i].name);
			}
		}
		
		//calculate comments
		if (comments != null) {
			args.rushee.comments = comments;
		} else {
			args.rushee.comments = [];
		}
		
		//base path
		args.basepath = BASE_PATH;
		args.accountType = accountType;
		res.render('vote.jade', args);
	}).catch(function(err) {
		console.log(err);
  		res.redirect(BASE_PATH+'/404');
	});
});

app.post(BASE_PATH+'/vote', function(req, res){
	var accountType = req.cookies.accountType;
	if (accountType != 'brother' && accountType != 'admin' ) {
		res.redirect(BASE_PATH+'/auth');
		return;
	}
	
	var sponsor = (req.body.sponsor == 'Yes');
	var vote = req.body.vote;
	var commentText = req.body.comment;
	var commentType = db.ObjectId(req.body.commentType);
	var commentJaunt = req.body.commentJaunt;
	var rusheeID = db.ObjectId(req.body.rusheeID);
	var brotherID = db.ObjectId(req.body.brotherID);
	if (sponsor) {
		db.sponsors.update(
			{brotherID: brotherID, rusheeID: rusheeID},
			{$set : {brotherID: brotherID, rusheeID: rusheeID}},
			{upsert : true}
		);
	} else {
		db.sponsors.remove(
			{brotherID: brotherID, rusheeID: rusheeID}
		);
	}
	
	if (vote != 'undefined' && vote != 'null') {
		vote = db.ObjectId(vote);
		db.votes.update(
			{brotherID: brotherID, rusheeID: rusheeID},
			{$set : {brotherID: brotherID, rusheeID: rusheeID, voteID:vote}},
			{upsert : true}
		);
	} else {
		db.votes.remove(
			{brotherID: brotherID, rusheeID: rusheeID}
		);
	}
	
	if (commentText != '') {
		db.comments.insert(
			{brotherID: brotherID, rusheeID: rusheeID, text: commentText, type: commentType}
		);
	}
		
	res.redirect(BASE_PATH+'/vote?rusheeID='+rusheeID+'&brotherID='+brotherID+'&submitted=true');	
});

app.get(BASE_PATH+'/votesummary', function(req, res) {
	
});

app.get(BASE_PATH+'/editrushee', function(req, res) {
	var accountType = req.cookies.accountType;
	if (accountType != 'brother' && accountType != 'admin' ) {
		res.redirect(BASE_PATH+'/auth');
		return;
	}
	var rusheeID = db.ObjectId(req.query.rusheeID);
	Seq().seq(function() {
		if (rusheeID == null) {
			this(null, null)
		} else {
			db.rushees.findOne({_id: rusheeID},this);
		}
	}).seq(function(rushee){
		if (rushee != null) {
			var args = {
				rushee:rushee,
				basepath:BASE_PATH,
				accountType:accountType
			};
			res.render('editrushee.jade', args);
		} else {
			res.render('404.jade',{basepath:BASE_PATH});
		}
	}).catch(function(err){
		console.log(err);
		res.render('404.jade',{basepath:BASE_PATH});
	});
});

app.post(BASE_PATH+'/editrushee', function(req, res) {
	var accountType = req.cookies.accountType;
	if (accountType != 'brother' && accountType != 'admin' ) {
		res.redirect(BASE_PATH+'/auth');
		return;
	}
	
	var rusheeID = db.ObjectId(req.body.rusheeID);
	var photo = req.files.photo;
	var photoLen = 5, photoDefault = req.body.photoOld;
	if (photo.size == 0) {
		var photoPath = photoDefault;
	} else {
		name = photo.name;
		var extension = name.substr(name.lastIndexOf('.')+1);
		var photoPath = '/img/'+tools.randomString(5,'')+'.'+extension;
	
		fs.readFile(req.files.photo.path, function(err, data) {
			newPath = __dirname + photoPath;
			fs.writeFile(newPath, data, function(err) {
				if (err != null) {
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
		photo: photoPath
	};
	
	if (req.body.visible == 'true') {
		rushee.visible = true;
	} else if (req.body.visible == 'false'){
		rushee.visible = false;
	};

	db.rushees.update({_id:rusheeID},{$set: rushee},function(err) {
		if (!err) {
			res.redirect(BASE_PATH+'/viewRushees');
		} else {
			console.log(err);
		}
	});
});

app.get(BASE_PATH+'/viewrushees', function(req,res){
	var accountType = req.cookies.accountType;
	if (accountType != 'brother' && accountType != 'admin' ) {
		res.redirect(BASE_PATH+'/auth');
		return;
	}
	var rushees = new Array();
	var cursor = db.rushees.find().sort({first: 1, last: 1});
	
	cursor.forEach(function(err, doc) {
		if (doc ==  null) {
			//finished reading, render the page
			var args = {
				rushees:rushees,
				basepath:BASE_PATH,
				accountType:accountType
			}
			res.render('viewrushees.jade', args);
		} else {
			doc.name = tools.name(doc.first, doc.nick, doc.last);
			rushees.push(doc);
		}
	});
});

app.get(BASE_PATH+'/viewbrothers', function(req,res){
	var accountType = req.cookies.accountType;
	if (accountType != 'brother' && accountType != 'admin' ) {
		res.redirect(BASE_PATH+'/auth');
		return;
	}
	
	var brothers = new Array();
	var cursor = db.brothers.find().sort({first: 1, last: 1});
	
	cursor.forEach(function(err, doc) {
		if (doc ==  null) {
			//finished reading, render the page
			res.render('viewbrothers.jade', {brothers:brothers,basepath:BASE_PATH});
		} else {
			brothers.push(doc);
		}
	});
});
	
	
app.get(BASE_PATH+'/addbrother', function(req, res){
	var accountType = req.cookies.accountType;
	if (accountType != 'brother' && accountType != 'admin' ) {
		res.redirect(BASE_PATH+'/auth');
		return;
	}
	res.render('addbrother.jade',{basepath:BASE_PATH});
});

app.post(BASE_PATH+'/addbrother', function(req,res) {
	var accountType = req.cookies.accountType;
	if (accountType != 'brother' && accountType != 'admin' ) {
		res.redirect(BASE_PATH+'/auth');
		return;
	}
	var brother = {
		first: req.body.first,
		last: req.body.last,
		'class': req.body['class'],
		phone: req.body.phone,
		email: req.body.email
	};
	db.brothers.insert(brother);
	res.render('addbrother.jade',{basepath:BASE_PATH});
});

app.get(BASE_PATH+'/addrushee', function(req,res) {
	var accountType = req.cookies.accountType;
	if (accountType != 'brother' && accountType != 'admin' ) {
		res.redirect(BASE_PATH+'/auth');
		return;
	}
	res.render('addrushee.jade',{basepath:BASE_PATH});
});

app.post(BASE_PATH+'/addrushee', function(req,res) {
	var accountType = req.cookies.accountType;
	if (accountType != 'brother' && accountType != 'admin' ) {
		res.redirect(BASE_PATH+'/auth');
		return;
	}
	var photo = req.files.photo;
	var photoLen = 5, photoDefault = '/img/no_photo.jpg';
	if (photo.size == 0) {
		var photoPath = photoDefault;
	} else {
		name = photo.name;
		var extension = name.substr(name.lastIndexOf('.')+1);
		var photoPath = '/img/'+tools.randomString(5,'')+'.'+extension;
	
		fs.readFile(req.files.photo.path, function(err, data) {
			newPath = __dirname + photoPath;
			fs.writeFile(newPath, data, function(err) {
				if (err != null) {
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
		photo: photoPath
	};

	db.rushees.insert(rushee);
	res.render('addrushee.jade',{basepath:BASE_PATH});
});

app.get(BASE_PATH+'/', function(req, res){
	var accountType = req.cookies.accountType;
	if (accountType == 'admin')
		res.render('index.jade', {accountType : 'admin', basepath:BASE_PATH});
	else if (accountType == 'brother') {
		res.redirect(BASE_PATH+'/viewrushees');
	} else {
		res.redirect(BASE_PATH+'/auth');
	}
});

app.get(BASE_PATH+'/auth', function(req,res){
	res.render('auth.jade',{basepath:BASE_PATH});
});

app.post(BASE_PATH+'/auth', function(req,res){
	//TODO authenticate every page and not make hard coded
	res.clearCookie('accountType');
	if (req.body.username == 'admin' && req.body.password == 'jeffshen') {
		res.cookie('accountType', 'admin');
	} else if (req.body.username == 'brother' && req.body.password == 'adphi') {
		res.cookie('accountType', 'brother');
	}
	
	res.redirect(BASE_PATH+'/');
});

app.get('*', function(req, res){
	res.render('404.jade',{basepath:BASE_PATH});
});

//listen on localhost:8000
// app.listen(8000,'localhost');
var options = {
	key:fs.readFileSync(__dirname+'/cert/key.pem'),
	cert:fs.readFileSync(__dirname+'/cert/cert.pem')
};

//https.createServer(options, app).listen(8000, '18.202.1.157');
// https.createServer(options, app).listen(8000, 'localhost');
// app.listen(8000,'18.202.1.157');
app.listen(8000,'localhost');
