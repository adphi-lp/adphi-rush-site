'use strict';

var loginPage = null;

var accountType = {
	BROTHER: {
		name: 'brother',
		isFrontDesk : function() {return true;},
		isBrother : function() {return true;},
		isAdmin : function() {return false;}
	},
	
	FRONTDESK: {
		name: 'frontdesk',
		isFrontDesk : function() {return true;},
		isBrother : function() {return false;},
		isAdmin : function() {return false;}
	},
	
	ADMIN: {
		name :'admin',
		isFrontDesk : function() {return true;},
		isBrother : function() {return true;},
		isAdmin : function() {return true;}
	},
	
	NULL: {
		name :'none',
		isFrontDesk : function() {return false;},
		isBrother : function() {return false;},
		isAdmin : function() {return false;}
	}
};

function setCookie(res, key, value) {
	res.cookie(key, value, {signed : true});
}

function getCookie(req, id) {
	return req.signedCookies[id];
}

function clearCookie(res, key) {
	res.clearCookie(key);
}

function getAccountType(req, res) {
	var name = getCookie(req, 'accountType');
	if (name === accountType.ADMIN.name) {
		return accountType.ADMIN;
	} else if (name === accountType.BROTHER.name){
		return accountType.BROTHER;
	} else if (name === accountType.FRONTDESK.name){
		return accountType.FRONTDESK;
	} else {
		return accountType.NULL	;
	}
}

function setRedirect(page) {
	loginPage = page;
}

function checkAuth(req, res, next) {
	if (!getAccountType(req, res).isBrother()) {
		res.redirect(loginPage);
		return;
	}
	
	next();
}

function checkFrontDeskAuth(req, res, next) {
	if (!getAccountType(req, res).isFrontDesk()) {
		res.redirect(loginPage);
		return;
	}
	
	next();
}

function checkAdminAuth(req, res, next) {
	if (!getAccountType(req,res).isAdmin()) {
		res.redirect(loginPage);
		return;
	}
	
	next();
}

function login(username, password, res) {
	if (username.toLowerCase() === 'admin' && password.toLowerCase() === 'rhythm7') {
		setCookie(res, 'accountType', accountType.ADMIN.name);
		return true;
	} else if (username.toLowerCase() === 'brother' && password.toLowerCase() === 'leebhenry') {
		setCookie(res, 'accountType', accountType.BROTHER.name);
		return true;
	} else if (username.toLowerCase() === 'frontdesk' && password.toLowerCase() === 'splash') {
		setCookie(res, 'accountType', accountType.FRONTDESK.name);
		return true;
	} else {
		clearCookie(res, 'accountType');
		return false;
	}
}

function logout(res) {
	clearCookie(res, 'accountType');
}

module.exports = {
	accountType: accountType,
	setRedirect : setRedirect,
	getAccountType: getAccountType,
	checkAuth : checkAuth,
	checkFrontDeskAuth : checkFrontDeskAuth,
	checkAdminAuth : checkAdminAuth,
	login : login,
	logout : logout,
	setCookie : setCookie,
	clearCookie : clearCookie,
	getCookie : getCookie
};
