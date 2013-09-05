'use strict';

var tools = require('./tools');
var moment = require('moment');

var joindb;

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

function importJoin(db) {
	joindb = db;
}

function augComment(comment) {
	var time = moment(comment.ts);
	comment.time = 'Posted at ' + time.format('h:mm:ss a') +
		' on ' + time.format('dddd, MMMM Do YYYY');
	comment.shorttime = time.format('dddd, MMM DD, HH:mm');
}
 
/**
 * Joins the comments onto rushees and brothers under rushee.comments
 * and brother.comments.
 */
function makeComments(rushees, brothers, jaunts, comments) {
	for (var i = 0, l = comments.length; i < l; i++) {
		comments[i].type = CommentType[comments[i].typeID];
	}
	
	joindb.joinAssoc(comments, 'comments',
		rushees, 'rusheeID', 'rushee',
		brothers, 'brotherID', 'brother');
	joindb.joinPropertyIf(comments, 'comments', jaunts, 'jauntID', 'jaunt');
}

function insertComment(rusheeID, brotherID, typeID, text, jauntID) {
	var comment = {
		brotherID: brotherID,
		rusheeID: rusheeID,
		typeID: typeID,
		text: text
	};
	if (jauntID !== undefined) comment.jauntID = jauntID;
	joindb.insert('comments', comment);
}

function updateComment(commentID, typeID, text, jauntID, callback) {
	var comment = {
		typeID: typeID,
		text: text
	};
	if (jauntID !== undefined) comment.jauntID = jauntID;
	joindb.update('comments', {_id : commentID}, {$set : comment}, {}, callback);
}


module.exports = {
	CommentType : CommentType,
	SORTED_COMMENT_TYPES : SORTED_COMMENT_TYPES,
	
	importJoin : importJoin,
	
	augComment : augComment,
	makeComments : makeComments,
	insertComment : insertComment,
	updateComment : updateComment
};
