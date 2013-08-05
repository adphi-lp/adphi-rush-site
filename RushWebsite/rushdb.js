'use strict';

var mongojs = require('mongojs');
var joindb = require('./joindb');
var tools = require('./tools');
var moment = require('moment');
var async = require('async');
var sponsordb = require('./sponsordb');
var votedb = require('./votedb');
var jauntdb = require('./jauntdb');
var commentdb = require('./commentdb');
var candidatedb = require('./candidatedb');

var COLLECTIONS = ['brothers', 'rushees', 'comments', 'sponsors',
'votes', 'statuses', 'jaunts', 'vans', 'candidates'];

var StatusType = {
	IN : {_id: 'IN', name: 'In House', color: '#00FF00'},
	JAUNT : {_id: 'JAUNT', name: 'On a Jaunt', color: '#0000FF'},
	OUT : {_id: 'OUT', name: 'Out of House', color: '#000000'},
	NULL : {_id: 'NULL', name: 'Never seen', color: '#000000'}
};

function getNullStatus(rushee) {
	var status = {
		type: StatusType.NULL,
		rushee : rushee,
		rusheeID : rushee._id
	};
	
	return status;
}

/**
 * Connect to databaseURL and initialize the database.
 * @param {Object} databaseURL
 */
function connect(databaseURL) {
	joindb.connect(databaseURL, COLLECTIONS);
	sponsordb.importJoin(joindb);
	votedb.importJoin(joindb);
	jauntdb.importJoin(joindb);
	commentdb.importJoin(joindb);
	candidatedb.importJoin(joindb);
	
	//to ensure that you can sort fast
	joindb.ensureIndex('rushees', {sfirst: 1, slast: 1});
	joindb.ensureIndex('rushees', {slast: 1, sfirst: 1});
	joindb.ensureIndex('brothers', {sfirst: 1, slast: 1});
	joindb.ensureIndex('brothers', {slast: 1, sfirst: 1});
	joindb.ensureIndex('candidates', {sfirst: 1, slast: 1});
	joindb.ensureIndex('candidates', {slast: 1, sfirst: 1});
}

function augRushee(rushee) {
	rushee.name = tools.name(rushee.first, rushee.nick, rushee.last);
	rushee.lastfirst = tools.lastfirst(rushee.first, rushee.nick, rushee.last);
}

function augBrother(brother) {
	brother.name = tools.name(brother.first, brother.nick, brother.last);
	brother.lastfirst = tools.lastfirst(brother.first, brother.nick, brother.last);
}

/**
 * Joins the statuses onto rushees under rushees.statuses.
 * 
 */
function makeStatuses(rushees, statuses) {
	for (var i = 0, l = statuses.length; i < l; i++) {
		statuses[i].type = StatusType[statuses[i].typeID];
	}
	
	joindb.joinProperty(statuses, 'statuses', rushees, 'rusheeID', 'rushee');
}

/**
 * Gets the default status from rushee.statuses and puts it onto
 * rushee.status.
 */
function makeStatus(rushees) {
	for (var i = 0, l = rushees.length; i < l; i++) {
		var r = rushees[i];
		r.status = r.statuses[0] || getNullStatus(r);
	}
}

function makeInHouseRushees(info, rushees) {
	info.inHouseRushees = [];
	for (var i = 0, l = rushees.length; i < l; i++) {
		if (rushees[i].status.type._id === 'IN') {
			info.inHouseRushees.push(rushees[i]);
		}
	}
}

function getRushee(rusheeID, render) {
	getSingle('rushees', 'rushee', rusheeID, augRushee, render);
}

function getCandidate(cID, render) {
	getSingle('candidates', 'candidate', cID,
				candidatedb.augCandidate, render);
}

function getSingle(col, name, id, aug, render) {
	if (id === null) {
		render(new Error('no ' + name + 'ID given'));
	}
	
	var query = {_id : id};
	joindb.findOne(col, query, aug, function(err, doc) {
		if (err !== null && err !== undefined) {
			render(err);
			return;
		}
		if (doc === null) {
			render(new Error('no ' + name + ' found'));
			return;
		}
		
		var info = {};
		info[name] = doc;
		
		render(null, info);
	});
}


function get(arrange, options, render) {
	var defaultOptions = {
		brothers : {sort : {slast : 1, sfirst : 1}},
		rushees : {sort : {sfirst: 1, slast : 1}},
		candidates : {sort : {sfirst: 1, slast : 1}}
	};
	
	if (options.brothers !== undefined) {
		if (options.brothers.sort !== undefined) {
			defaultOptions.brothers.sort = options.brothers.sort;
		}
	}
	
	if (options.rushees !== undefined) {
		if (options.rushees.sort !== undefined) {
			defaultOptions.rushees.sort = options.rushees.sort;
		}
	}
	
	if (options.candidates !== undefined) {
		if (options.candidates.sort !== undefined) {
			defaultOptions.candidates.sort = options.candidates.sort;
		}
	}
	
	var firstStep = function(nextStep) {
		getFirst(defaultOptions, nextStep);
	};
	var secondStep = getSecond;
	var thirdStep = getThird;
	
	
	var time = process.hrtime();
	
	firstStep(function(err1, info1) {
	if (err1 !== undefined && err1 !== null) {
		render(err1);
		return;
	}//otherwise,
	
	time = process.hrtime(time);
	console.log('step1 took %d seconds and %d nanoseconds', time[0], time[1]);
	time = process.hrtime();
	
	secondStep(info1, function(err2, info2){
	if (err2 !== undefined && err2 !== null) {
		render(err2);
		return;
	}//otherwise,
	
	time = process.hrtime(time);
	console.log('step2 took %d seconds and %d nanoseconds', time[0], time[1]);
	time = process.hrtime();
	
	thirdStep(info2, function(err3, info3) {
	if (err3 !== undefined && err3 !== null) {
		render(err3);
		return;
	}//otherwise
	time = process.hrtime(time);
	console.log('step3 took %d seconds and %d nanoseconds', time[0], time[1]);
	arrange(info3, render);
	});
	});
	});
}

function getFirst(options, nextStep) {
	async.parallel({
		brothers : function(cb) {
			joindb.find('brothers', {}, options.brothers.sort, augBrother, cb);
		},
		rushees : function(cb) {
			joindb.find('rushees', {}, options.rushees.sort, augRushee, cb);
		},
		candidates : function (cb) {
			joindb.find('candidates', {},
					options.candidates.sort, candidatedb.augCandidate, cb);
		}
	}, nextStep);
}

function getSecond(info, nextStep) {
	var rushees = info.rushees;
	var brothers = info.brothers;
	var candidates = info.candidates;
	var brotherIDs = tools.map(brothers, function(b) {return b._id;});
	var rusheeIDs = tools.map(rushees, function(r) {return r._id;});
	var queryRushees = {rusheeID: {$in : rusheeIDs}};
	var queryBrothers = {brotherID: {$in : brotherIDs}};
	var queryBoth = {rusheeID: {$in : rusheeIDs}, brotherID : {$in : brotherIDs}};
	
	async.parallel({
		rushees : function(cb) {
			cb(null, rushees);
		},
		brothers : function(cb) {
			cb(null, brothers);
		},
		candidates : function(cb) {
			cb(null, candidates);
		},
		statuses : function(cb) {
			joindb.find('statuses', queryRushees, {_id:-1}, function(){}, cb);
		},
		votes : function(cb) {
			joindb.find('votes', queryBoth, {_id:-1}, votedb.augVote, cb);
		},
		comments : function(cb) {
			joindb.find('comments', queryBoth, {_id:-1}, commentdb.augComment, cb);
		},
		sponsors : function (cb) {
			joindb.find('sponsors', queryBoth, {_id: -1}, function(){}, cb);
		},//TODO
		vans : function(cb) {
			joindb.find('vans', {}, {_id: -1}, function(){}, cb);
		},
		jaunts : function(cb) {
			joindb.find('jaunts', {}, {_id: -1}, function(){}, cb);
		}
	}, nextStep);
}

function getThird(info, nextStep) {
	var candidates = info.candidates;
	var rushees = info.rushees;
	var brothers = info.brothers;
	var statuses = info.statuses;
	var votes = info.votes;
	var sponsors = info.sponsors;
	var comments = info.comments;
	info.vans = jauntdb.filterVans(rushees, brothers, info.vans);
	var vans = info.vans;
	info.jaunts = jauntdb.filterJaunts(vans, info.jaunts);
	var jaunts = info.jaunts;
	
	makeStatuses(candidates, []);
	makeStatus(candidates, []);
	makeStatuses(rushees, statuses);
	makeStatus(rushees);
	makeInHouseRushees(info, rushees);
	
	sponsordb.makeSponsors(rushees, brothers, sponsors);
	sponsordb.makeSponsorsBy(rushees, brothers, sponsors);
	sponsordb.makeSponsorsList(rushees, 'brother');
	sponsordb.makeSponsorsList(brothers, 'rushee');
	sponsordb.makeSponsorsNameList(rushees, 'brother');
	sponsordb.makeSponsorsNameList(brothers, 'rushee');
	
	commentdb.makeComments(rushees, brothers, jaunts, comments);
	
	votedb.makeVotesBy(rushees, brothers, votes);
	votedb.makeVoteScore(brothers);
	votedb.makeVoteScore(rushees);
	votedb.makeVotesByType(brothers);
	votedb.makeVotesByType(rushees);
	votedb.countVotesByType(rushees, brothers);
	votedb.countVotesByType(brothers, rushees);
	
	jauntdb.makeVans(rushees, brothers, vans);
	jauntdb.makeJaunts(vans, jaunts);
	
	nextStep(null, info);
}

function arrange(info, render) {
	render(null, info);
}

function arrangeJaunt(jauntID, info, render) {
	if (jauntID === null) {
		render(new Error('no jauntID'));
		return;
	}
	
	var jaunts = info.jaunts;
	for (var j = 0, l = jaunts.length; j < l; j++) {
		if (jauntID.equals(jaunts[j]._id)) {
			info.jaunt = jaunts[j];
		}
	}
	
	if (info.jaunt === undefined) {
		render(new Error('no jaunt'));
		return;
	}
	render(null, info);
}

function arrangeVote(rusheeID, brotherID, info, render) {
	if (rusheeID === null) {
		render(new Error('no rusheeID'));
		return;
	}
	var rushees = info.rushees;
	for (var r = 0, l = rushees.length; r < l; r++) {
		if (rusheeID.equals(rushees[r]._id)) {
			info.rushee = rushees[r];
		}
	}
	if (info.rushee === undefined) {
		render(new Error('no rushee'));
		return;
	}
	
	var brothers = info.brothers;
	if (brotherID !== null) {
		for (var b = 0, lb = brothers.length; b < lb; b++) {
			if (brothers[b]._id.equals(brotherID)) {
				info.brother = brothers[b];
			}
		}
	}
	if (info.brother === undefined) {
		info.brother = null;
	} else {
		sponsordb.makeSponsorBy([info.brother], [info.rushee]);
	}
	
	votedb.makeVoteBy([info.rushee], brothers);
	
	var voteCmp = function (a, b) {
		return a.type.index - b.type.index ||
			tools.strCmpNoCase(a.brother.name, b.brother.name);
	};
	
	info.rushee.sortedVotes = tools.map(brothers, function(b) {
		return info.rushee.voteBy[b._id];
	});
	info.rushee.sortedVotes.sort(voteCmp);
	
	render(null, info);
}

function arrangeBrother(brotherID, info, render) {
	if (brotherID === null) {
		render(new Error('no brotherID'));
		return;
	}
	
	var brothers = info.brothers;
	if (brotherID !== null) {
		for (var b = 0, lb = brothers.length; b < lb; b++) {
			if (brothers[b]._id.equals(brotherID)) {
				info.brother = brothers[b];
			}
		}
	}
	
	if (info.brother === undefined) {
		render(new Error('no brother'));
		return;
	}
		
	render(null, info);
}

function arrangeVoteScore(info, render) {
	var rushees = info.rushees;
	rushees.sort(function(a, b) {
		return b.voteScore - a.voteScore;
	});
	
	var brothers = info.brothers;
	brothers.sort(function(a, b) {
		return b.voteScore - a.voteScore;
	});
	
	render(null, info);
}

function arrangeInHouseVotes(info, render) {
	votedb.makeVoteBy(info.inHouseRushees, info.brothers);
	
	arrangeVoteScore(info, render);
}

function insertStatus(rusheeID, typeID) {
	var entry = {
		rusheeID: rusheeID,
		typeID : typeID
	};
	joindb.insert('statuses', entry);
}

function loadTestInsertRushees() {
	for (var i = 0; i < 1000; i++) {
		var rushee = {
			first: 'first' + i,
			last: 'last' + i,
			nick: 'nick' + i,
			dorm: 'dorm' + i,
			phone: 'phone' + i,
			email: 'email' + i,
			year: 'year' + i,
			photo: '/public/img/no_photo.jpg',
			visible: true,
			priority: false
		};
		insertRushee(rushee);
	}
}

function loadTestInsertBrothers() {
	for (var i = 0; i < 64; i++) {
		var brother = {
			first: 'first' + i,
			last: 'last' + i,
			'class': 'class' + i,
			phone: 'phone' + i,
			email: 'email' + i
		};
		insertBrother(brother);
	}
}

function insertRushee(rushee, callback) {
	rushee.sfirst = rushee.first.toLowerCase();
	rushee.slast = rushee.last.toLowerCase();
	joindb.insert('rushees', rushee, callback);
}

function insertBrother(brother, callback) {
	brother.sfirst = brother.first.toLowerCase();
	brother.slast = brother.last.toLowerCase();
	joindb.insert('brothers', brother, callback);
}

function updateRushee(rusheeID, rushee, callback) {
	rushee.sfirst = rushee.first.toLowerCase();
	rushee.slast = rushee.last.toLowerCase();
	joindb.update('rushees', {_id : rusheeID}, {$set : rushee}, {}, callback);	
}

module.exports = {
	VoteType: votedb.VoteType,
	CommentType : commentdb.CommentType,
	StatusType : StatusType,
	
	SORTED_VOTE_TYPES : votedb.SORTED_VOTE_TYPES,
	SORTED_COMMENT_TYPES : commentdb.SORTED_COMMENT_TYPES,
	
	getNullStatus: getNullStatus,
	
	getRushee : getRushee,
	getCandidate : getCandidate,
	
	connect : connect,
	
	augRushee : augRushee, 
	augBrother : augBrother,
	augComment : commentdb.augComment,
	augCandidate : candidatedb.augCandidate,

	get : get,
	
	arrange : arrange,
	arrangeVote : arrangeVote,
	arrangeBrother : arrangeBrother,
	arrangeVoteScore: arrangeVoteScore,
	arrangeInHouseVotes : arrangeInHouseVotes,
	arrangeJaunt : arrangeJaunt,
	
	loadTestInsertRushees : loadTestInsertRushees,
	loadTestInsertBrothers : loadTestInsertBrothers,
	
	insertStatus : insertStatus,
	insertSponsor: sponsordb.insertSponsor,
	insertVote : votedb.insertVote,
	insertComment : commentdb.insertComment,
	insertRushee : insertRushee,
	insertBrother : insertBrother,
	insertCandidate : candidatedb.insertCandidate,
	
	updateCandidate : candidatedb.updateCandidate,
	updateRushee : updateRushee,
	
	transferCandidate : candidatedb.transferCandidate,
	
	pushBrotherToVan : jauntdb.pushBrotherToVan,
	pushRusheeToVan : jauntdb.pushRusheeToVan,
	pushVanToJaunt : jauntdb.pushVanToJaunt,
	pullBrotherFromVan : jauntdb.pullBrotherFromVan,
	pullRusheeFromVan : jauntdb.pullRusheeFromVan,
	pullVanFromJaunt : jauntdb.pullVanFromJaunt,
	insertVan : jauntdb.insertVan,
	updateVan : jauntdb.updateVan,
	insertJaunt : jauntdb.insertJaunt,
	updateJaunt : jauntdb.updateJaunt,
	removeJaunt : jauntdb.removeJaunt
};
