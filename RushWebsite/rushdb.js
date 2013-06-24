'use strict';

var mongojs = require('mongojs');
var joindb = require('./joindb');
var tools = require('./tools');
var moment = require('moment');
var async = require('async');

var COLLECTIONS = ['brothers', 'rushees', 'comments', 'sponsors',
'votes', 'statuses', 'jaunts', 'vans'];

var VoteType = {
	DEF : {_id : 'DEF', name: 'Definite Yes', value : 2, index : 0},
	YES : {_id : 'YES', name: 'Yes', value : 1, index: 1},
	MET : {_id : 'MET', name: 'Met', value : 0, index: 2},
	NO : {_id : 'NO', name: 'No', value : -1, index: 3},
	VETO : {_id : 'VETO', name: 'Veto', value : -8, index: 4},
	NULL : {_id : 'NULL', name: 'None', value : 0, index: 5}
};

var SORTED_VOTE_TYPES = [
	VoteType.DEF,
	VoteType.YES,
	VoteType.MET,
	VoteType.NO,
	VoteType.VETO,
	VoteType.NULL
];

var CommentType = {
	GENERAL : {_id : 'GENERAL', name: 'General', color: '#000000'},
	CONTACT : {_id : 'CONTACT', name: 'Contact', color: '#FDD017'},
	INTEREST : {_id : 'INTEREST', name: 'Hobbies/Interest', color: '#000000'},
	EVENT : {_id : 'EVENT', name: 'Event/Jaunt Interest', color: '#347C17'},
	URGENT : {_id : 'URGENT', name: 'Urgent', color: '#FF0000'}
};

var SORTED_COMMENT_TYPES = [
	CommentType.GENERAL,
	CommentType.CONTACT,
	CommentType.INTEREST,
	CommentType.EVENT,
	CommentType.URGENT
];

var StatusType = {
	IN : {_id: 'IN', name: 'In House'},
	JAUNT : {_id: 'JAUNT', name: 'On a Jaunt'},
	OUT : {_id: 'OUT', name: 'Out of House'},
	NULL : {_id: 'NULL', name: 'Never seen'}
};

function getNullStatus(rushee) {
	var status = {
		type: StatusType.NULL,
		rushee : rushee,
		rusheeID : rushee._id
	};
	
	return status;
}

function getNullVote(rushee, brother) {
	var vote = {
		type : VoteType.NULL,
		rushee: rushee,
		rusheeID : rushee._id,
		brother : brother,
		brotherID : brother._id
	};
	
	return vote;
}

function getNullStatus(rushee) {
	var status = {
		type : StatusType.NULL,
		rushee : rushee,
		rusheeID : rushee._id
	};
	return status;
}

function getNullSponsor(rushee, brother) {
	var sponsor = {
		sponsor : false,
		rushee : rushee,
		rusheeID : rushee._id,
		brother : brother,
		brotherID : brother._id
	};
	return sponsor;
}

/**
 * Connect to databaseURL and initialize the database.
 * @param {Object} databaseURL
 */
function connect(databaseURL) {
	joindb.connect(databaseURL, COLLECTIONS);
	
	//to ensure that you can sort fast
	joindb.ensureIndex('rushees', {sfirst: 1, slast: 1});
	joindb.ensureIndex('rushees', {slast: 1, sfirst: 1});
	joindb.ensureIndex('brothers', {sfirst: 1, slast: 1});
	joindb.ensureIndex('brothers', {slast: 1, sfirst: 1});
}

function augRushee(rushee) {
	rushee.name = tools.name(rushee.first, rushee.nick, rushee.last);
	rushee.lastfirst = tools.lastfirst(rushee.first, rushee.nick, rushee.last);
}

function augBrother(brother) {
	brother.name = tools.name(brother.first, brother.nick, brother.last);
	brother.lastfirst = tools.lastfirst(brother.first, brother.nick, brother.last);
}

function augComment(comment) {
	var time = moment(comment._id.getTimestamp());
	comment.time = 'Posted at ' + time.format('h:mm:ss a') +
		' on ' + time.format('dddd, MMMM Do YYYY');
}

/**
 * Joins the statuses onto rushees under rushees.statuses.
 * 
 */
function makeStatuses(rushees, statuses) {
	for (var i = 0; i < statuses.length; i++) {
		statuses[i].type = StatusType[statuses[i].typeID];
	}
	
	joindb.joinProperty(statuses, 'statuses', rushees, 'rusheeID');
}

/**
 * Gets the default status from rushee.statuses and puts it onto
 * rushee.status.
 */
function makeStatus(rushees) {
	for (var i = 0; i < rushees.length; i++) {
		var r = rushees[i];
		r.status = r.statuses[0] || getNullStatus(r);
	}
}

function makeInHouseRushees(info, rushees) {
	info.inHouseRushees = [];
	for (var i = 0; i < rushees.length; i++) {
		if (rushees[i].status.type._id === 'IN') {
			info.inHouseRushees.push(rushees[i]);
		}
	}
}

/**
 * Joins the sponsors onto rushees and brothers under rushee.sponsors
 * and sponsor.comments.
 */
function makeSponsors(rushees, brothers, sponsors) {
	joindb.joinAssoc(sponsors, 'sponsors',
		rushees, 'rusheeID', 'rushee',
		brothers, 'brotherID', 'brother');
}

/**
 * Joins the sponsors onto rushees and brothers under rushee.sponsorsBy
 * and sponsor.comments.
 */
function makeSponsorsBy(rushees, brothers, sponsors) {
	joindb.joinAssocIndexed(sponsors, 'sponsorsBy',
		rushees, 'rusheeID', 'rushee',
		brothers, 'brotherID', 'brother');
}

/**
 * Gets the default sponsorship from rushees.sponsorsBy[brother._id]
 * and puts it in rushees.sponsorBy[brother._id]
 * USE SPARINGLY
 */
function makeSponsorBy(rushees, brothers, sponsors) {
	for (var i = 0; i < rushees.length; i++) {
		var r = rushees[i];
		r.sponsorBy = {};
		for (var j = 0; j < brothers.length; j++) {
			var b = brothers[j];
			r.sponsorBy[b._id] = r.sponsorsBy[b._id][0] || getNullSponsor(r, b);
		}
	}
}

/**
 * 
 */
function makeSponsorsList(rushees, fieldName) {
	for (var i = 0; i < rushees.length; i++) {
		var r = rushees[i];
		r.sponsorsList = [];
		for (var b in r.sponsorsBy) {
			if (r.sponsorsBy[b][0].sponsor) {
				r.sponsorsList.push(r.sponsorsBy[b][0][fieldName]);
			}
		}
	}
}

/**
 * Joins the comments onto rushees and brothers under rushee.comments
 * and brother.comments.
 */
function makeComments(rushees, brothers, comments) {
	for (var i = 0; i < comments.length; i++) {
		comments[i].type = CommentType[comments[i].typeID];
	}
	
	joindb.joinAssoc(comments, 'comments',
		rushees, 'rusheeID', 'rushee',
		brothers, 'brotherID', 'brother');
}

/**
 * Joins the votes onto rushees and brothers under rushee.votesBy
 * and brother.votesBy.
 */
function makeVotesBy(rushees, brothers, votes) {
	for (var i = 0; i < votes.length; i++) {
		votes[i].type = VoteType[votes[i].typeID];
	}
	
	joindb.joinAssocIndexed(votes, 'votesBy',
		rushees, 'rusheeID', 'rushee',
		brothers, 'brotherID', 'brother');
}

/**
 * Gets the default vote from rushee.votesBy[brother._id] and puts it into
 * rushee.voteBy[brother._id]. USE SPARINGLY (this loops through rushees*brothers)
 * @param {Object} rushees
 * @param {Object} brothers
 * @param {Object} votes
 */
function makeVoteBy(rushees, brothers) {
	for (var i = 0; i < rushees.length; i++) {
		var r = rushees[i];
		r.voteBy = {};
		for (var j = 0; j < brothers.length; j++) {
			var b = brothers[j];
			if (r.votesBy[b._id] === undefined) {
				r.voteBy[b._id] = getNullVote(r, b);
			} else {
				r.voteBy[b._id] = r.votesBy[b._id][0];
			}
		}
	}
}

/**
 * Gets the vote score for each rushee from rushee.votesBy[brother._id]
 * and puts it into rushee.voteScore.
 * @param {Object} rushees
 */
function makeVoteScore(rushees) {
	for (var i = 0; i < rushees.length; i++) {
		var r = rushees[i];
		r.voteScore = 0;
		for (var b in r.votesBy) {
			var vote = r.votesBy[b][0];
			r.voteScore += vote.type.value;
			//TODO Disregard hidden rushees when calculating
		}
	}
}

/**
 * Aggregates the votes in rushee.voteBy by type into
 * rushee.votesByType[type._id].
 * @param {Object} rushees
 */
function makeVotesByType(rushees) {
	for (var i = 0; i < rushees.length; i++) {
		var r = rushees[i];
		r.votesByType = {};
		for (var j in VoteType) {
			r.votesByType[j] = [];
		}
		for (var b in r.votesBy) {
			var vote = r.votesBy[b][0];
			r.votesByType[vote.type._id].push(vote);
		}
	}
}

function countVotesByType(rushees, brothers) {
	for (var i = 0; i < rushees.length; i++) {
		var r = rushees[i];
		var total = brothers.length;
		r.countVotesByType = {};
		for (var j in VoteType) {
			r.countVotesByType[j] = r.votesByType[j].length;
			total -= r.votesByType[j].length;
		}
		r.countVotesByType.NULL += total;
	}
}

function getRushee(rusheeID, render) {
	if (rusheeID === null) {
		render(new Error('no rusheeID'));
	}
	
	var query = {_id : rusheeID};
	joindb.findOne('rushees', query, augRushee, function(err, rushee) {
		if (err !== null && err !== undefined) {
			render(err);
			return;
		}
		
		var info = {
			rushee : rushee
		};
		
		render(null, info);
	});
}

function findOne(col, query, augment, callback) {
	joindb.findOne(col, query, augment, callback);
}

function get(arrange, options, render) {
	var firstStep = getFirstBrothersLast;
	var secondStep = getSecond;
	var thirdStep = getThird;
	if (options.brothersFirst === true) {
		firstStep = getFirstBrothersFirst;
	}

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

function getFirstBrothersFirst(nextStep) {
	var options = {
		brothers : {sort : {sfirst : 1, slast : 1}},
		rushees : {sort : {sfirst: 1, slast : 1}}
	};
	
	getFirst(options, nextStep);
}

function getFirstBrothersLast(nextStep) {
	var options = {
		brothers : {sort : {slast : 1, sfirst : 1}},
		rushees : {sort : {sfirst: 1, slast : 1}}
	};
	
	getFirst(options, nextStep);
}

function getFirst(options, nextStep) {
	async.parallel({
		brothers : function(cb) {
			joindb.find('brothers', {}, options.brothers.sort, augBrother, cb);
		},
		rushees : function(cb) {
			joindb.find('rushees', {}, options.rushees.sort, augRushee, cb);
		}
	}, nextStep);
}

function getSecond(info, nextStep) {
	var rushees = info.rushees;
	var brothers = info.brothers;
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
		statuses : function(cb) {
			joindb.find('statuses', queryRushees, {_id:-1}, function(){}, cb);
		},
		votes : function(cb) {
			joindb.find('votes', queryBoth, {_id:-1}, function(){}, cb);
		},
		comments : function(cb) {
			joindb.find('comments', queryBoth, {_id:-1}, augComment, cb);
		},
		sponsors : function (cb) {
			joindb.find('sponsors', queryBoth, {_id: -1}, function(){}, cb);
		}
	}, nextStep);
}

function getThird(info, nextStep) {
	var rushees = info.rushees;
	var brothers = info.brothers;
	var statuses = info.statuses;
	var votes = info.votes;
	var sponsors = info.sponsors;
	var comments = info.comments;
	
	makeStatuses(rushees, statuses);
	makeStatus(rushees);
	makeInHouseRushees(info, rushees);
	
	makeSponsors(rushees, brothers, sponsors);
	makeSponsorsBy(rushees, brothers, sponsors);
	makeSponsorsList(rushees, 'brother');
	
	makeComments(rushees, brothers, comments);
	
	makeVotesBy(rushees, brothers, votes);
	makeVoteScore(brothers);
	makeVoteScore(rushees);
	makeVotesByType(brothers);
	makeVotesByType(rushees);
	countVotesByType(rushees, brothers);
	countVotesByType(brothers, rushees);
	
	nextStep(null, info);
}

function arrange(info, render) {
	render(null, info);
}

function arrangeVote(rusheeID, brotherID, info, render) {
	if (rusheeID === null) {
		render(new Error('no rusheeID'));
		return;
	}
	var rushees = info.rushees;
	for (var r = 0; r < rushees.length; r++) {
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
		for (var b = 0; b < brothers.length; b++) {
			if (brothers[b]._id.equals(brotherID)) {
				info.brother = brothers[b];
			}
		}
	}
	if (info.brother === undefined) {
		info.brother = null;
	} else {
		makeSponsorBy([info.brother], [info.rushee]);
	}
	
	info.rushee.sponsorsNameList = tools.map(info.rushee.sponsorsList, function(s) {
		return s.name;
	});
	makeVoteBy([info.rushee], brothers);
	
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
	makeVoteBy(info.inHouseRushees, info.brothers);
	
	arrangeVoteScore(info, render);
}

function insertStatus(rusheeID, typeID) {
	var entry = {
		rusheeID: rusheeID,
		typeID : typeID
	};
	joindb.insert('statuses', entry);
}

function insertSponsor(rusheeID, brotherID, sponsor) {
	var entry = {
		brotherID: brotherID,
		rusheeID: rusheeID,
		sponsor : sponsor
	};
	joindb.insert('sponsors', entry);
}

function insertVote(rusheeID, brotherID, typeID) {
	var entry = {
		brotherID: brotherID,
		rusheeID: rusheeID,
		typeID: typeID
	};
	joindb.insert('votes', entry);
}

function insertComment(rusheeID, brotherID, typeID, text) {
	var comment = {
		brotherID: brotherID,
		rusheeID: rusheeID,
		typeID: typeID,
		text: text
	};
	joindb.insert('comments', comment);
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

function update(col, query, commands, options, callback) {
	joindb.update(col, query, commands, options, callback);	
}

function insert(col, doc, callback) {
	joindb.insert(col, doc, callback);
}

module.exports = {
	VoteType: VoteType,
	CommentType : CommentType,
	StatusType : StatusType,
	
	SORTED_VOTE_TYPES : SORTED_VOTE_TYPES,
	SORTED_COMMENT_TYPES : SORTED_COMMENT_TYPES,
	
	getNullStatus: getNullStatus,
	getNullVote: getNullVote,
	getNullSponsor : getNullSponsor,
	
	getRushee : getRushee,
	
	connect : connect,
	
	augRushee : augRushee, 
	augBrother : augBrother,
	augComment : augComment,
		
	get : get,
	
	arrange : arrange,
	arrangeVote : arrangeVote,
	arrangeVoteScore: arrangeVoteScore,
	arrangeInHouseVotes : arrangeInHouseVotes,
	
	loadTestInsertRushees : loadTestInsertRushees,
	loadTestInsertBrothers : loadTestInsertBrothers,
	
	insertStatus : insertStatus,
	insertSponsor: insertSponsor,
	insertVote : insertVote,
	insertComment : insertComment,
	insertRushee : insertRushee,
	insertBrother : insertBrother,
	
	update : update,
	insert : insert
};
