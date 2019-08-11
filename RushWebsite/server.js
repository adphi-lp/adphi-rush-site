/*jslint node: true */
'use strict';

//constants
var BASE_PATH = '/rush_site';
var CONTROLLERS_PATH = __dirname + '/controllers';
var DATABASE_URL = 'mongodb://localhost:27017/adphi_rush';

//get modules
var express = require('express');
var https = require('https');
var fs = require('fs');
var async = require('async');
var moment = require('moment');
var rushdb = require('./rushdb');
var tools = require('./tools');
var auth = require('./auth');
var search = require('./search');
var stats = require('./stats');
var urimapper = require('./urimapper');

// create app and connect
var app = express();
auth.setRedirect(BASE_PATH + '/login');
rushdb.connect(DATABASE_URL);
var SECRET = 'feijowiefj98j213f8wef92832913823r';

// limit the upload size
app.use(express.limit('3mb'));
// for parsing posts
app.use(express.bodyParser({uploadDir: __dirname + '/uploads'}));
app.use(express.cookieParser(SECRET));
app.set('trust proxy', true);

// set path to static things
app.use(BASE_PATH + '/public/', express.static(__dirname + '/public'));
app.use(BASE_PATH + '/css', express.static(__dirname + '/css'));
app.use(BASE_PATH + '/js', express.static(__dirname + '/js'));

// set path to the views (template) directory
app.set('views', __dirname + '/views');
app.locals.basedir = app.get('views');

// make links
var env = {
    rushdb: rushdb,
    stats: stats,
    auth: auth,
    tools: tools,
    search: search,
    moment: moment,
    links: urimapper.links
};
urimapper.setEnv(env);
urimapper.makeLinks(app, {base: BASE_PATH, controllers: CONTROLLERS_PATH});

app.get('*', function (req, res) {
    res.render('404.jade', {basepath: BASE_PATH});
});

//var options = {
//	key:fs.readFileSync(__dirname+'/cert/key.pem'),
//	cert:fs.readFileSync(__dirname+'/cert/cert.pem')
//};

app.listen(8888, 'localhost');
