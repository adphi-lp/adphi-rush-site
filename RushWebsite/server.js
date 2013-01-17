//create an app server
var express = require('express');
var fs = require('fs');
var app = express();
var redis = require('redis')
var client = redis.createClient();

//key namespaces
var globalKNS = "0:"; //
var brotherKNS = "1:"; //kns:brotherID
var rusheeKNS = "2:"; //kns:rusheeID
var commentKNS = "3:"; //kns:brotherID:rusheeID
var commentByBrotherKNS = "4:"; //kns:brotherID
var commentByRusheeKNS = "5:";  //kns:rusheeID
var voteKNS = "6:"; //kns:brotherID:rusheeID string
var voteByBrotherKNS = "7:"; //kns:brotherID 
var voteByRusheeKNS = "8:"; //kns:rusheeID  
var sponsorKNS = "9:"; //kns:brotherID:rusheeID string (1 = true, 0 = false)
var sponsorByBrotherKNS = "10:"; //kns:brotherID set
var sponsorByRusheeKNS = "11:"; //kns:rusheeID set

//global variables
var commentByDate = "0";
var brotherList = "1";
var rusheeList = "2";

//field name space
var sponsorFNS = "0:";
var voteFNS = "1:";
var commentFNS = "2:";

client.on("error", function (err) {
    console.log("Error " + err);
});

process.on('SIGINT', function() {
  client.shutdown();
  process.exit();
});

//set path to the views (template) directory
app.set('views', __dirname + '/views');
//set path to static files
app.use('/public', express.static(__dirname + '/../public'));
//set path to static images
app.use('/img',express.static(__dirname + '/img'))
app.use('/css',express.static(__dirname + '/css'))


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
app.get('/', function(req, res){res.render('index.jade', {title: 'Rush home'});});
//listen on localhost:8000
app.listen(8000);

