//create an app server
var express = require('express');
var fs = require('fs');
var Seq = require('seq');
var app = express();
var databaseURL = 'ADPhiRush';
var collections = ['brothers', 'rushees', 'comments', 'sponsors',
'votes', 'statuses', 'commentTypes', 'jaunts', 'vans']
var db = require('mongojs').connect(databaseURL, collections);
var tools = require('./tools');

//to ensure that you can sort
db.rushees.ensureIndex({first:1 , last:1});
db.brothers.ensureIndex({first:1 , last:1});
//TODO Comment sorting, etc.

//for parsing posts
app.use(express.bodyParser());

//set path to static things
app.use('/img',express.static(__dirname + '/img'))
app.use('/css',express.static(__dirname + '/css'))
app.use('/js',express.static(__dirname + '/js'))

//set path to the views (template) directory
app.set('views', __dirname + '/views');


app.get('/search', function(req, res){
	res.render('search.jade');
});

app.get('/vote', function(req, res){
	//TODO implement sessions for brothers
	var rusheeID = req.query.rusheeID;
	var brotherID = req.query.brotherID;
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
		that = this;
		var brothers = [];
		db.brothers.find().forEach(function(err, doc) {
			if (doc == null) {
				that(null, brothers);
			} else {
				brothers.push(doc);
			}
		});
	}).par(function() {
		//get vote types
		var voteTypes = ['Definite Yes', 'Yes', 'No', 'Veto', 'None'];
		this(null, voteTypes);
	}).par(function() {
		var commentTypes = ['General','Contact','Hobbies/Interests','Event/Jaunt Interest','Urgent']
		this(null, commentTypes);
	}).par(function() {
		var jaunts = ['Jaunt 1', 'Jaunt 2', 'None'];
		this(null, jaunts);
	}).seq(function(brother, rushee, brothers, voteTypes, commentTypes, jaunts) {
		if (brother == null) {
			brother = {vote: 'None', sponsor: 'false', name: null}
		} else {
			brother.name = brother.first + ' ' + brother.last;
		}
		
		if (rushee == null) {
			this(new Error('no rushee'));
			return;
		}
		
		if (rushee.nick != '') {
			rushee.name = rushee.first+' \"'+rushee.nick+'\" '+ rushee.last;
		} else {
			rushee.name = rushee.first + ' ' + rushee.last;
		}
		
		//TODO hard coded sponsors and comments
		var vote = 9000;
		var sponsor = false;
		var sponsors = ['Jeff Shen', 'Jon Chien'];
		var comments = [{time:'1/16/2013 5:06 AM', type:'Contact', text:'Contacted someone about blah and blah, said they\'d be over for dinner tomorrow', name: 'Jeff Shen'}];
		rushee.vote = vote;
		brother.sponsor = sponsor;
		rushee.sponsors = sponsors;
		this(null, brother, rushee, brothers, voteTypes, commentTypes, jaunts, comments);
	}).seq(function(brother, rushee, brothers, voteTypes, commentTypes, jaunts, comments) {
		//done, render the page
		var arguments= {brother: brother, rushee:rushee,brothers:brothers,
			voteTypes:voteTypes, types:commentTypes, jaunts:jaunts, comments:comments};
		res.render('vote.jade', arguments);
	}).catch(function(err) {
		console.log(err);
  		res.redirect('/404');
	});
	
});

app.get('/viewrushees', function(req,res){
	var rushees = new Array();
	var cursor = db.rushees.find().sort({first: 1, last: 1});
	
	cursor.forEach(function(err, doc) {
		if (doc ==  null) {
			//finished reading, render the page
			res.render('viewrushees.jade', {'rushees' : rushees});
		} else {
			rushees.push(doc);
		}
	});
});

app.get('/viewbrothers', function(req,res){
	var brothers = new Array();
	var cursor = db.brothers.find().sort({first: 1, last: 1});
	
	cursor.forEach(function(err, doc) {
		if (doc ==  null) {
			//finished reading, render the page
			res.render('viewbrothers.jade', {'brothers' : brothers});
		} else {
			brothers.push(doc);
		}
	});
});

app.post('/vote', function(req, res){
	res.render('vote.jade',{brother: 'JS', rushee: 'rushee', phone: 'unknown', sponsor: ['JS', 'JS2']});
});
	
	
app.get('/addbrother', function(req, res){
	res.render('addbrother.jade');
});

app.post('/addbrother', function(req,res) {
	var brother = {
		first: req.body.first,
		last: req.body.last,
		'class': req.body['class'],
		phone: req.body.phone,
		email: req.body.email
	};
	db.brothers.insert(brother);
	res.render('addbrother.jade');
});

app.get('/addrushee', function(req,res) {
	res.render('addrushee.jade');
});

app.post('/addrushee', function(req,res) {
	var photo = req.files.photo;
	var photoLen = 5, photoDefault = '/img/no_photo.jpg';
	if (photo.size == 0) {
		var photoPath = photoDefault;
		console.log('asdf');
	} else {
		name = photo.name;
		console.log(photo);
		var extension = name.substr(name.lastIndexOf('.')+1);
		var photoPath = '/img/'+tools.randomString(5,'')+'.'+extension;
	
		fs.readFile(req.files.photo.path, function(err, data) {
			newPath = __dirname + '/img/' + photoPath;
			fs.writeFile(newPath, data, function(err) {
				console.log(photoPath);
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
	res.render('addrushee.jade');
});

app.get('/test', function(req,res) {
	res.render('test.jade');
});

app.get('/', function(req, res){
	res.render('index.jade', {title: 'Rush home'});
});

app.get('*', function(req, res){
	res.render('404.jade');
});

//listen on localhost:8000
app.listen(8000,'18.202.1.157');
