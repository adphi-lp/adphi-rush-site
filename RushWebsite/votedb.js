'use strict';

var tools = require('./tools');
var moment = require('moment');

var joindb;

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

function importJoin(db) {
	joindb = db;
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

function augVote(vote) {
	var time = moment(vote.ts);
	vote.time = time.format('h:mm:ss a') +
		' on ' + time.format('dddd, MMMM Do YYYY');
}

/**
 * Joins the votes onto rushees and brothers under rushee.votesBy
 * and brother.votesBy.
 */
function makeVotesBy(rushees, brothers, votes) {
	for (var i = 0, l = votes.length; i < l; i++) {
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
	for (var i = 0, l = rushees.length; i < l; i++) {
		var r = rushees[i];
		r.voteBy = {};
		for (var j = 0, m = brothers.length; j < m; j++) {
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
	for (var i = 0, l = rushees.length; i < l; i++) {
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
 * Gets the vote total for each rushee from rushee.votesBy[brother._id]
 * and puts it into rushee.voteTotal.
 * @param {Object} rushees
 */
function makeVoteTotal(rushees) {
	for (var i = 0, l = rushees.length; i < l; i++) {
		var r = rushees[i];
		r.voteTotal = 0;
		for (var b in r.votesBy) {
			var vote = r.votesBy[b][0];
			r.voteTotal += vote.type.value !== 0? 1 : 0;	
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
	for (var i = 0, l = rushees.length; i < l; i++) {
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
	for (var i = 0, l = rushees.length; i < l; i++) {
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

function insertVote(rusheeID, brotherID, typeID) {
	var entry = {
		brotherID: brotherID,
		rusheeID: rusheeID,
		typeID: typeID
	};
	joindb.insert('votes', entry);
}

function getBidScore(brothers) {
	return 3/4 * tools.count(brothers, function(b) {
		return b.visible !== false; //undefined = true
	});
}

module.exports = {
	VoteType : VoteType,
	SORTED_VOTE_TYPES : SORTED_VOTE_TYPES,
	
	importJoin : importJoin,
	getNullVote : getNullVote,
	augVote : augVote,
	makeVotesBy : makeVotesBy,
	makeVoteBy : makeVoteBy,
	makeVoteScore : makeVoteScore,
	makeVoteTotal : makeVoteTotal,
	makeVotesByType : makeVotesByType,
	countVotesByType : countVotesByType,
	insertVote : insertVote,
	getBidScore : getBidScore
};
