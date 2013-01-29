//create an app server
var express = require('express');
var app = express();
var databaseURL = 'ADPhiRush';
var collections = ['brothers', 'rushees', 'comments', 'sponsors',
'votes', 'statuses', 'commentTypes', 'jaunts', 'vans']
var db = require('mongojs').connect(databaseURL, collections);

//set path to the views (template) directory
app.set('views', __dirname + '/views');
//set path to static files
// app.use('/public', express.static(__dirname + '/../public'));
//set path to static images
app.use('/img',express.static(__dirname + '/img'))
app.use('/css',express.static(__dirname + '/css'))
app.use('/js',express.static(__dirname + '/js'))


app.get('/search', function(req, res){
	res.render('search.jade');
});

app.get('/vote', function(req, res){
	var rusheeID = req.query["RusheeID"];
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
	res.render('vote.jade',{brother: 'JS', rushee: 'rushee', phone: 'unknown', sponsor: ['JS', 'JS2']});});
	
	
app.get('/addbrother', function(req, res){
	res.render('addbrother.jade');
});

app.get('/', function(req, res){res.render('index.jade', {title: 'Rush home'});});
//listen on localhost:8000
app.listen(8000,'localhost');

