'use strict';

var loginPage = null;

var accountType = {
	USER: {
		name: 'user',
		isUser : function() {return true;},
		isAdmin : function() {return false;}
	},
	
	ADMIN: {
		name :'admin',
		isUser : function() {return true;},
		isAdmin : function() {return true;}
	}
};

function getAccountType(req, res) {
	if (res.cookies.accountType === accountType.ADMIN) {
		return accountType.ADMIN;
	} else if (res.cookies.accountType === accountType.USER){
		return accountType.USER;
	} else {
		return null;
	}
}

function setRedirect(page) {
	loginPage = page;
}

function checkAuth(res, req, next) {
	if (!getAccountType(req, res).isUser()) {
		res.redirect(loginPage);
		return;
	}
	
	next();
}

function checkAdminAuth(res, req, next) {
	if (!getAccountType(req,res).isAdmin()) {
		res.redirect(loginPage);
		return;
	}
	
	next();
}
function login(username, password, res) {
	if (username.toLowerCase() === 'admin' && password.toLowerCase() === 'jeffshen') {
		res.cookie('accountType', accountType.ADMIN);
		return true;
	} else if (username.toLowerCase() === 'brother' && password.toLowerCase() === 'henryleeb') {
		res.cookie('accountType', accountType.USER);
		return true;
	} else {
		res.clearCookie('accountType');
		return false;
	}
}

function logout(res) {
	res.clearCookie('accountType');
}

