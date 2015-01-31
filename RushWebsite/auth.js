/*jslint node: true */
'use strict';

var loginPage = null;

var accountType = {
	NULL: {
		name :'none',
		isFrontDesk : function() {return false;},
		isBrother : function() {return false;},
		isMeeting : function() {return false;},
		isAdmin : function() {return false;}
	},

	FRONTDESK: {
		name: 'frontdesk',
		isFrontDesk : function() {return true;},
		isBrother : function() {return false;},
		isMeeting : function() {return false;},
		isAdmin : function() {return false;}
	},

	BROTHER: {
		name: 'brother',
		isFrontDesk : function() {return true;},
		isBrother : function() {return true;},
		isMeeting : function() {return false;},
		isAdmin : function() {return false;}
	},


	MEETING: {
		name: 'meeting',
		isFrontDesk : function() {return true;},
		isBrother : function() {return true;},
		isMeeting : function() {return true;},
		isAdmin : function() {return false;}
	},

	ADMIN: {
		name :'admin',
		isFrontDesk : function() {return true;},
		isBrother : function() {return true;},
		isMeeting : function() {return true;},
		isAdmin : function() {return true;}
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
	for (var type in accountType) {
		if (name === accountType[type].name) {
			return accountType[type];
		}
	}
	return accountType.NULL;
}

function setRedirect(page) {
	loginPage = page;
}

function passAuth(req, res, next) {
	next();
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
	} else if (username.toLowerCase() === 'meeting' && password.toLowerCase() === 'sameells') {
		setCookie(res, 'accountType', accountType.MEETING.name);
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
	passAuth : passAuth,
	checkAuth : checkAuth,
	checkFrontDeskAuth : checkFrontDeskAuth,
	checkAdminAuth : checkAdminAuth,
	login : login,
	logout : logout,
	setCookie : setCookie,
	clearCookie : clearCookie,
	getCookie : getCookie
};
