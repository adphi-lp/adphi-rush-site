//create an app server
var express = require('express');
var fs = require('fs');
var app = express();
//set path to the views (template) directory
app.set('views', __dirname + '/views');
//set path to static files
app.use('/public', express.static(__dirname + '/../public'));
//set path to static images
app.use('/img',express.static(__dirname + '/img'))
app.use('/css',express.static(__dirname + '/css'))


app.get('/vote', function(req, res){
	res.render('vote.jade',{brother: 'JS', rushee: 'rushee', phone: 'unknown', sponsor: ['JS', 'JS2']});});

app.post('/vote', function(req, res){
	res.render('vote.jade',{brother: 'JS', rushee: 'rushee', phone: 'unknown', sponsor: ['JS', 'JS2']});});
app.get('/', function(req, res){res.render('index.jade', {title: 'Rush home'});});
//listen on localhost:8000
app.listen(8000);
