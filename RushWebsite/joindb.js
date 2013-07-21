'use strict';

var mongojs = require('mongojs');
var db = null;
var tools = require('./tools');
var moment = require('moment');

function connect(databaseURL, collections) {
	db = mongojs.connect(databaseURL, collections);
}

function ensureIndex(col, index) {
	db[col].ensureIndex(index);
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
	for (var i = 0, l = list.length; i < l; i++) {
		var el = list[i];
		listHash[el._id] = el;
		el[propName] = [];
	}
	
	for (var i = 0, l = props.length; i < l; i++) {
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
	for (var i = 0, l = listA.length; i < l; i++) {
		var elA = listA[i];
		listAHash[elA._id] = elA;
		elA[assocsName] = [];
	}
	
	//create list B hash and initialize
	var listBHash = {};
	for (var i = 0, l = listB.length; i < l; i++) {
		var elB = listB[i];
		listBHash[elB._id] = elB;
		elB[assocsName] = [];
	}
	
	for (var i = 0, l = assocs.length; i < l; i++) {
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
	for (var i = 0, l = listA.length; i < l; i++) {
		var elA = listA[i];
		listAHash[elA._id] = elA;
		elA[assocsIndexedName] = {};
	}
	
	//create list B hash and initialize
	var listBHash = {};
	for (var i = 0, l = listB.length; i < l; i++) {
		var elB = listB[i];
		listBHash[elB._id] = elB;
		elB[assocsIndexedName] = {};
	}
	
	for (var i = 0, l = assocs.length; i < l; i++) {
		var assoc = assocs[i];
		var elA = listAHash[assoc[idNameA]];
		var elB = listBHash[assoc[idNameB]];
		//put elements into assoc
		assoc[elNameA] = elA;
		assoc[elNameB] = elB;
		//push assoc onto element A and element B
		if (elA[assocsIndexedName][elB._id] === undefined) {
			elA[assocsIndexedName][elB._id] = [];
		}
		if (elB[assocsIndexedName][elA._id] === undefined) {
			elB[assocsIndexedName][elA._id] = [];
		}
		elA[assocsIndexedName][elB._id].push(assoc);
		elB[assocsIndexedName][elA._id].push(assoc);
	}
}

function filterGroup(groups, members) {
	//create hashes and initialize
	var hashes = [];
	for (var i = 0; i < members.length; i++) {
		var list = members[i][0];
		hashes.push({});
		for (var j = 0; j < list.length; j++) {
			var el = list[j];
			hashes[i][el._id] = el;
		}
	}
	var retGroups = [];
	//go through each group
	for (var i = 0; i < groups.length; i++) {
		var group = groups[i];
		//go through each member list
		var add = true;
		for (var j = 0; j < members.length; j++) {
			var idName = members[j][1];
			//get group list of ids
			var list = group[idName];
			//go through group list of ids
			for (var k = 0; k < list.length; k++) {
				var id = list[k];
				if (hashes[j][id] === undefined) {
					add = false;
				}
			}
		}
		if (add) {
			retGroups.push(group);
		}
	}
	return retGroups;
}

/**
 * Joins members to a group = (group attributes, lists of members).
 * Joining is guaranteed to preserve order.
 * Members: list of tuples (list, idName, elName) 
 */
function joinGroup(groups, groupsName, members) {
	//create hashes and initialize
	var hashes = [];
	for (var i = 0; i < members.length; i++) {
		var list = members[i][0];
		hashes.push({});
		for (var j = 0; j < list.length; j++) {
			var el = list[j];
			hashes[i][el._id] = el;
			el[groupsName] = [];
		}
	}
	
	//go through each group
	for (var i = 0; i < groups.length; i++) {
		var group = groups[i];
		//go through each member list
		for (var j = 0; j < members.length; j++) {
			var idName = members[j][1];
			var elName = members[j][2];
			//get group list of ids
			var list = group[idName];
			//make new element list for members
			group[elName] = [];
			//go through group list of ids
			for (var k = 0; k < list.length; k++) {
				var id = list[k];
				var el = hashes[j][id];
				group[elName].push(el);
				el[groupsName].push(group);
			}
		}
	}
}

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

function remove(col, query, justOne, callback) {
	if (callback === undefined) {
		db[col].remove(query, justOne);
	} else {
		db[col].remove(query, justOne, callback);
	}
}

module.exports = {
	connect : connect,
	
	ensureIndex : ensureIndex,

	joinProperty : joinProperty,
	joinAssoc : joinAssoc,
	joinAssocIndexed : joinAssocIndexed,
	joinGroup : joinGroup,
	filterGroup: filterGroup,
	
	findOne : findOne,
	find: find,
	insert: insert,
	update: update,
	remove : remove
};
