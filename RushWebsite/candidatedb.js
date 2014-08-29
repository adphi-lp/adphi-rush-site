'use strict';

var tools = require('./tools');

var joindb;

function importJoin(db) {
	joindb = db;
}

function insertCandidate(cand, callback) {
	cand.sfirst = cand.first.toLowerCase();
	cand.slast = cand.last.toLowerCase();
	joindb.insert('candidates', cand, callback);
}

function updateCandidate(cID, cand, callback) {
	if (cand.first !== undefined) {
		cand.sfirst = cand.first.toLowerCase();
	}
	if (cand.last !== undefined) {
		cand.slast = cand.last.toLowerCase();
	}
	joindb.update('candidates', {_id : cID}, {$set : cand}, {}, callback);	
}

function augCandidate(cand) {
	cand.name = tools.name(cand.first, cand.nick, cand.last);
	cand.lastfirst = tools.lastfirst(cand.first, cand.nick, cand.last);
	cand.candidate = true;
}

function transferCandidate(cID, insert, callback) {
	var query = {_id : cID};
	if (cID === null || cID === undefined) {
		callback(new Error('no candidateID'));
		return;
	}
	joindb.findOne('candidates', query, function(){}, function(err, doc) {
		if (err !== null && err !== undefined) {
			callback(err);
		} else if (doc === null) {
			callback(null, null);
		} else {
			updateCandidate(cID, {visible : false}, function(err1) {
				var rushee =  {
					first : doc.first,
					last : doc.last,
					nick : doc.nick,
					dorm : doc.dorm,
					phone : doc.phone,
					email : doc.email,
					year : doc.year,
					photo : doc.photo,
					visible : doc.visible,
					priority : doc.priority,
					chID : doc.chID,
				};
				insert(rushee, callback);
			});
		}
	});
}

module.exports = {
	importJoin : importJoin,
	insertCandidate : insertCandidate,
	updateCandidate : updateCandidate,
	augCandidate : augCandidate,
	transferCandidate : transferCandidate
};
