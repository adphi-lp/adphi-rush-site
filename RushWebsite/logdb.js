'use strict';

var tools = require('./tools');

var joindb;

function importJoin(db) {
	joindb = db;
}

function log(entry, callback) {
	joindb.insert('logs', {entry : entry}, callback);
}

function clearLog(callback) {
	joindb.remove('logs', {}, false, callback);
}

function getLog(callback) {
	joindb.find('logs', {}, {ts : -1}, function() {}, callback);
}

function delLog(entryID, callback) {
	joindb.remove('logs', {_id : entryID}, false, callback);
}

module.exports = {
	importJoin : importJoin,
	log : log,
	clearLog : clearLog,
	getLog : getLog,
	delLog : delLog,	
};
