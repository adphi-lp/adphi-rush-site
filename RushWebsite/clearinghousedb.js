'use strict';

var logdb;
var request = require('request');
var jar = request.jar();
var cookies = request.defaults({
	jar : jar,
});

var user = 'jdshen';
var pass = 'asdfasdf';
 
var useragent ='Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36' + 
	' (KHTML, like Gecko) Chrome/36.0.1985.143 Safari/537.36';

var postOptions = {
	timeout: 1000,
	method : 'POST',
	followAllRedirects : true,
	gzip : true,
	jar : jar,
	headers : {
		Accept : 'text/html',
		'Accept-Language' : 'en-US,en;q=0.8',
		Connection : 'keep-alive',
		Host : 'ifc.mit.edu',
		Origin : 'http://ifc.mit.edu',
		Referer : 'http://ifc.mit.edu/ch/',
		'User-Agent' : useragent,
	},
};

var post = request.defaults(postOptions);

var getOptions = {
	timeout: 1000,
	method : 'GET',
	followAllRedirects : true,
	gzip : true,
	headers : {
		Accept : 'text/html',
		'Accept-Language' : 'en-US,en;q=0.8',
		Connection : 'keep-alive',
		Host : 'ifc.mit.edu',
		Referer : 'http://ifc.mit.edu/ch/',
		'User-Agent' : useragent,
	},
	jar : jar,
};
	
var get = request.defaults(getOptions);

function importLog(db) {
	logdb = db;
}

function rawLogin(chID, action, callback) {
	var options = {
		uri : 'http://ifc.mit.edu/login.php',
		form : {
			u : user,
			p : pass,
			x : 'Log In',
			ref : '/ch/index.php',
		},
	};
	post(options, function(err, res, body) {
		if (err !== undefined && err !== null) {
			logError(chID, err, callback);
			return;
		}
		
		if (isIndexPage(body)) {
			action(chID, false, callback);
			return;
		}
		
		logBadPage(chID, body, callback);
	});
}

function handleAction(err, res, body, chID, login, action, callback) {
	if (err !== undefined && err !== null) {
		logError(chID, err, callback);
		return;	
	}
	
	if (isIndexPage(body)) {
		callback(null);
		return;
	}
	
	if (isAlreadyPage(body) || isNotCurrentlyPage(body)) {
		logBadPage(chID, body, callback);
		return;
	}
	
	if (isLoginPage(body)) {
		if (login) {
			rawLogin(chID, action, callback);
			return;
		}
		
		logBadPage(chID, body, callback);
			return;
	}
	
	logBadPage(chID, body, callback);
}

function rawInhouse(chID, login, callback) {
	var options = {
		uri : 'http://ifc.mit.edu/ch/checkout.php',
		qs : {
			jaunt : 'false',
			rushee : chID,
		},
	};
	get(options, function(err, res, body) {
		handleAction(err, res, body, chID, login, rawInhouse, callback);
	});
}

function rawOuthouse(chID, login, callback) {
	var options = {
		uri : 'http://ifc.mit.edu/ch/checkin.php',
		qs : {
			rushee : chID,
		},
	};
	get(options, function(err, res, body) {
		handleAction(err, res, body, chID, login, rawOuthouse, callback);
	});
}

function rawOnjaunt(chID, login, callback) {
	var options = {
		uri : 'http://ifc.mit.edu/ch/checkout.php',
		qs : {
			jaunt : 'true',
			rushee : chID,
		},
	};
	get(options, function(err, res, body) {
		handleAction(err, res, body, chID, login, rawOnjaunt, callback);
	});
}

function inhouse(chID, callback) {
	rawInhouse(chID, true, callback);
}

function outhouse(chID, callback) {
	rawOuthouse(chID, true, callback);
}

function onjaunt(chID, callback) {
	rawOnjaunt(chID, true, callback);
}

function getCookies() {
	return jar.getCookies('http://ifc.mit.edu');
}

function setCookie(cookie) {
	return jar.setCookie(cookies.cookie(cookie), 'http://ifc.mit.edu');
}

function delCookie(cookie) {
	var c = cookies.cookie(cookie);
	c.setMaxAge("-Infinity");
	return jar.setCookie(c, 'http://ifc.mit.edu');
}

function setLogin(u, p) {
	user = u;
	pass = p;
}

function getLogin() {
	return {
		user : user,
		pass : pass,
	};
}

function isLoginPage(html) {
	return html.indexOf('Please log in!') > -1;
}

function isIndexPage(html) {
	return html.indexOf('Manage Rushees') > -1;
}

function isAlreadyPage(html) {
	return html.indexOf('already') > -1;
}

function isNotCurrentlyPage(html) {
	return html.indexOf('not currently') > -1;
}

function logError(chID, err, callback) {
	console.log(err);
	logdb.log({
		chID : chID,
		err : err,
	}, callback);
}

function logBadPage(chID, body, callback) {
	var logObject = {
		chID : chID,
		isLoginPage : isLoginPage(body),
		isIndexPage : isIndexPage(body),
		isNotCurrentlyPage : isNotCurrentlyPage(body),
		isAlreadyPage : isAlreadyPage(body),
		body : body,
	};
	console.log("Logging: " + logObject);
	logdb.log(logObject, callback);
}

/*
console.log(setCookie('authuser=jdshen'));
console.log(setCookie('authtok=%3DKXnA--E%251'));

/*
outhouse(1, function(err, res, body) {
	console.log(isLoginPage(body));
	console.log(isIndexPage(body));
	console.log(isNotCurrently(body));
	console.log(isAlreadyPage(body));
	console.log(body);
});

inhouse(1, function(err, res, body) {
	console.log(body);
});
*/

module.exports = {
	importLog : importLog,
	
	inhouse : inhouse,
	outhouse : outhouse,
	onjaunt : onjaunt,

	getCHCookies : getCookies,
	setCHCookie : setCookie,
	delCHCookie : delCookie,
	
	setCHLogin : setLogin,
	getCHLogin : getLogin,
};
