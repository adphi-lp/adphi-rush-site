//create an app server
var express = require('express');
var fs = require('fs');
var app = express();
var databaseURL = 'ADPhiRush';
var collections = ['brothers', 'rushees', 'comments', 'sponsors',
'votes', 'statuses', 'commentTypes', 'jaunts', 'vans']
var db = require('mongojs').connect(databaseURL, collections);
var tools = require('./tools');

app.use(express.bodyParser());

//set path to the views (template) directory
app.set('views', __dirname + '/views');

//set path to static things
app.use('/img',express.static(__dirname + '/img'))
app.use('/css',express.static(__dirname + '/css'))
app.use('/js',express.static(__dirname + '/js'))


app.get('/search', function(req, res){
	res.render('search.jade');
});


app.get('/vote', function(req, res){
	var rusheeID = req.query['rusheeID'];
	var brother;
	if (req.session) {
		brotherID = req.session["BrotherID"];
		
		brother = client.getAll("");
	} else {
		brother = null;
	}
	
	var brother = {first:'Jeff', last:'Shen',class:'Celeritas',vote:'None',sponsor:false}
	var rushee = {id: 'ID', first: 'First', last: 'Last', nick: 'Nick', dorm: 'MacGregor', phone: '(555) 555-555', email: 'email@mit.edu', photo: '/img/Mc4M1.jpg'}
	var sponsors = ['Jeff Shen', 'Jon Chien']
	var vote = 9000
	var brothers = [{id: '1', first: 'Jeff', last: 'Shen', class: 'Celeritas'}]
	var types = ['General','Contact','Hobbies/Interests','Event/Jaunt Interest','Urgent']
	var jaunts = ['Jaunt 1', 'Jaunt 2']
	var comments = [{time:'1/16/2013 5:06 AM', type:'Contact', text:'Contacted someone about blah and blah, said they\'d be over for dinner tomorrow', name: 'Jeff Shen'}]
  
	res.render('vote.jade',{brother: 'JS', rushee: 'rushee', phone: 'unknown', sponsor: ['JS', 'JS2']});
	
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
	var photo = req.body.photo;
	var photoLen = 5, photoDefault = 'no_photo.jpg';
	if (photo == null) {
		var photoPath = photoDefault;
	} else {
		name = photo.name;
		var extension = name.substr(name.lastIndexOf('.')+1);
		var photoPath = tools.randomString(5,'')+extension;
	
		fs.readFile(req.files.photo.path, function(err, data) {
			newPath = __dirname + '/img/' + photoPath;
			fs.writeFile(newPath, data, function(err) {
				res.redirect('back');
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

app.get('/', function(req, res){res.render('index.jade', {title: 'Rush home'});});
//listen on localhost:8000
app.listen(8000,'localhost');
