'use strict';

var mongojs = require('mongojs');
var db = null;
var tools = require('./tools');
var moment = require('moment');

var voteType = {
	DEF : {_id : 'DEF', name: 'Definite Yes', value : 2},
	YES : {_id : 'YES', name: 'Yes', value : 1},
	MET : {_id : 'MET', name: 'Met', value : 0},
	NO : {_id : 'NO', name: 'No', value : -1},
	VETO : {_id : 'VETO', name: 'Veto', value : -8},
	NULL : {_id : 'NULL', name: 'None', value : 0}
};

var commentType = {
	GENERAL : {_id : 'GENERAL', name: 'General', color: '#000000'},
	CONTACT : {_id : 'CONTACT', name: 'Contact', color: '#FDD017'},
	INTEREST : {_id : 'INTEREST', name: 'Hobbies/Interest', color: '#000000'},
	EVENT : {_id : 'EVENT', name: 'Event/Jaunt Interest', color: '#347C17'},
	URGENT : {_id : 'URGENT', name: 'Urgent', color: '#FF0000'}
};

var statusType = {
	IN : {_id: 'IN', name: 'In House'},
	JAUNT : {_id: 'JAUNT', name: 'On a Jaunt'},
	OUT : {_id: 'OUT', name: 'Out of House'},
	NULL : {_id: 'NULL', name: 'Never seen'}
};

function getNullStatus(rushee) {
	var status = {
		type: statusType.NULL,
		rushee : rushee,
		rusheeID : rushee._id
	};
	
	return status;
}

function getNullVote(rushee, brother) {
	var vote = {
		type : voteType.NULL,
		rushee: rushee,
		rusheeID : rushee._id,
		brother : brother,
		brotherID : brother._id
	};
	
	return vote;
}

function connect(databaseURL, collections) {
	db = mongojs.connect(databaseURL, collections);
}

function ensureIndex(col, index) {
	db[col].ensureIndex(index);
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
 * Joins properties (e.g. time-stamped status) to elements in a list (e.g. rushees or brothers).
 * The joined properties are added under a list with a given name for each element. 
 * Joining is guaranteed to preserve order.
 * @param {Object} props the properties to join
 * @param {Object} propName the name of the property collection
 * @param {Object} list the list of elements to be joined to. Must have an _id field.
 * @param {Object} elIDName the name of the id field in a property
 */
function joinProperty(props, propName, list, idName) {
	//Create hash and initialize
	var listHash = {};
	for (var i = 0; i < list.length; i++) {
		var el = list[i];
		listHash[el._id] = el;
		el[propName] = [];
	}
	
	for (var i = 0; i < props.length; i++) {
		var prop = props[i];
		//get element, push property
		listHash[prop[idName]][propName].push(prop);
	}
} 


/**
 * Joins associations between members of two lists to the elements of these lists.
 * Joining is guaranteed to preserve order.
 */
function joinAssoc(assocs, assocsName, listA, idNameA, elNameA, listB, idNameB, elNameB) {
	//create list A hash and initialize
	var listAHash = {};
	for (var i = 0; i < listA.length; i++) {
		var elA = listA[i];
		listAHash[elA._id] = elA;
		elA[assocsName] = [];
	}
	
	//create list B hash and initialize
	var listBHash = {};
	for (var i = 0; i < listB.length; i++) {
		var elB = listB[i];
		listBHash[elB._id] = elB;
		elB[assocsName] = [];
	}
	
	for (var i = 0; i < assocs.length; i++) {
		var assoc = assocs[i];
		var elA = listAHash[assoc[idNameA]];
		var elB = listBHash[assoc[idNameB]];
		//put elements into assoc
		assoc[elNameA] = elA;
		assoc[elNameB] = elB;
		//push assoc onto element A and element B
		elA[assocsName].push(assoc);
		elB[assocsName].push(assoc);
	}
}

/**
 * Joins associations between members of two lists to the elements of these lists.
 * Associations for each element are indexed by members of the other list.
 * To get the associations, do elA[assocsIndexedName][elB._id]
 * Joining is guaranteed to preserve order.
 */
function joinAssocIndexed(assocs, assocsIndexedName,
	listA, idNameA, elNameA,
	listB, idNameB, elNameB) {
	//create list A hash and initialize
	var listAHash = {};
	for (var i = 0; i < listA.length; i++) {
		var elA = listA[i];
		listAHash[elA._id] = elA;
		elA[assocsIndexedName] = {};
		for (var j = 0; j < listB.length; j++) {
			var elB = listB[j];
			elA[assocsIndexedName][elB._id] = [];
		}
	}
	
	//create list B hash and initialize
	var listBHash = {};
	for (var i = 0; i < listB.length; i++) {
		var elB = listB[i];
		listBHash[elB._id] = elB;
		elB[assocsIndexedName] = {};
		for (var j = 0; j < listA.length; j++) {
			var elA = listA[j];
			elB[assocsIndexedName][elA._id] = [];
		}
	}
	
	for (var i = 0; i < assocs.length; i++) {
		var assoc = assocs[i];
		var elA = listAHash[assoc[idNameA]];
		var elB = listBHash[assoc[idNameB]];
		//put elements into assoc
		assoc[elNameA] = elA;
		assoc[elNameB] = elB;
		//push assoc onto element A and element B
		elA[assocsIndexedName][elB._id].push(assoc);
		elB[assocsIndexedName][elA._id].push(assoc);
	}
}



/**
 * 
 */
//TODO: JOIN GROUPS (JAUNTS)

function findOne(col, query, augment, callback) {
	db[col].findOne(query, function(err, doc) {
		if (err === undefined || err === null) {
			augment(doc);
			callback(null, doc);
		} else {
			callback(err, doc);
		}
	});
}

function find(col, query, sort, augment, callback) {
	var docs = [];
	db[col].find(query).sort(sort).forEach(function(err, doc) {
		if (err !== null && err !== undefined) {
			callback(err);
		} else if (doc === null) {
			callback(null, docs);
		} else {
			augment(doc);
			docs.push(doc);
		}
	});
}

function insert(col, doc, callback) {
	if (callback === undefined) {
		db[col].insert(doc);
	} else {
		db[col].insert(doc, callback);
	}
}

function update(col, query, commands, options, callback) {
	if (callback === undefined) {
		db[col].update(query, commands, options);
	} else {
		db[col].update(query, commands, options, callback);
	}
}

module.exports = {
	voteType: voteType,
	commentType : commentType,
	statusType : statusType,
	
	getNullStatus: getNullStatus,
	getNullVote: getNullVote,
	
	connect : connect,
	
	ensureIndex : ensureIndex,
	
	augRushee : augRushee, 
	augBrother : augBrother,
	augComment : augComment,
	
	joinProperty : joinProperty,
	joinAssoc : joinAssoc,
	joinAssocIndexed : joinAssocIndexed,
	
	findOne : findOne,
	find: find,
	insert: insert,
	update: update
};
