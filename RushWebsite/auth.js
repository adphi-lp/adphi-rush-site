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

function getAccountType(req, res) {
	if (req.cookies.accountType === accountType.ADMIN.name) {
		return accountType.ADMIN;
	} else if (req.cookies.accountType === accountType.BROTHER.name){
		return accountType.BROTHER;
	} else if (req.cookies.accountType === accountType.FRONTDESK.name){
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
		res.cookie('accountType', accountType.ADMIN.name);
		return true;
	} else if (username.toLowerCase() === 'brother' && password.toLowerCase() === 'leebhenry') {
		res.cookie('accountType', accountType.BROTHER.name);
		return true;
	} else if (username.toLowerCase() === 'frontdesk' && password.toLowerCase() === 'splash') {
		res.cookie('accountType', accountType.FRONTDESK.name);
		return true;
	} else {
		res.clearCookie('accountType');
		return false;
	}
}

function logout(res) {
	res.clearCookie('accountType');
}

module.exports = {
	accountType: accountType,
	setRedirect : setRedirect,
	getAccountType: getAccountType,
	checkAuth : checkAuth,
	checkFrontDeskAuth : checkFrontDeskAuth,
	checkAdminAuth : checkAdminAuth,
	login : login,
	logout : logout
};
