'use strict';

var tools = require('./tools');
var moment = require('moment');

var joindb;

function importJoin(db) {
	joindb = db;
}

function filterVans(rushees, brothers, vans) {
	return joindb.filterGroup(vans, [[rushees, 'rIDs'], [brothers, 'bIDs']]);
}

function augJaunt(jaunt) {
	var time = moment(jaunt.time);
	jaunt.timehuman = time.format('dddd, MMM DD, HH:mm');
}

/**
 * Joins the vans onto rushees and brothers under rushee.vans
 * and vans.comments.
 */
function makeVans(rushees, brothers, vans) {
	joindb.joinGroup(vans, 'vans',
		[[rushees, 'rIDs', 'rushees'],
		[brothers, 'bIDs', 'brothers']]);
}

function filterJaunts(vans, jaunts) {
	return joindb.filterGroup(jaunts, [[vans, 'vIDs']]);
}

/**
 * Joins the jaunts onto vans under van.jaunts
 */
function makeJaunts(vans, jaunts) {
	joindb.joinGroup(jaunts, 'jaunts',
		[[vans, 'vIDs', 'vans']]);
}

function makeVansNameList(rushees) {
	var vanToName = function(v) {
		return tools.map(v.jaunts, function(j) {
			return j.name;
		}).join(',') + ': ' + v.name;
	};
	
	for (var i = 0, l = rushees.length; i < l; i++) {
		var r = rushees[i];
		r.vansNameList = tools.map(r.vans, vanToName);
	}
}

//bit of a misnomer but w/e.
function pushBrotherToVan(brotherID, vanID, callback) {
	joindb.update('vans', {_id : vanID}, {$addToSet : {'bIDs' : brotherID}}, {}, callback);
}

function pushRusheeToVan(rusheeID, vanID, callback) {
	joindb.update('vans', {_id : vanID}, {$addToSet : {'rIDs' : rusheeID}}, {}, callback);
}

function pushVanToJaunt(vanID, jauntID, callback) {
	joindb.update('jaunts', {_id : jauntID}, {$addToSet : {'vIDs' : vanID}}, {}, callback);
}

function pullBrotherFromVan(brotherID, vanID, callback) {
	joindb.update('vans', {_id : vanID}, {$pull : {'bIDs' : brotherID}}, {}, callback);
}

function pullRusheeFromVan(rusheeID, vanID, callback) {
	joindb.update('vans', {_id : vanID}, {$pull : {'rIDs' : rusheeID}}, {}, callback);
}

function pullVanFromJaunt(vanID, jauntID, callback) {
	joindb.update('jaunts', {_id : jauntID}, {$pull : {'vIDs' : vanID}}, {}, callback);
}

function insertVan(van, callback) {
	van.sname = van.name.toLowerCase();
	joindb.insert('vans', van, callback);
}

function updateVan(vanID, van, callback) {
	joindb.update('vans', {_id : vanID}, {$set : van}, {}, callback);
}

function removeVan(vanID, callback) {
	joindb.remove('vans', {_id : vanID}, false, callback);
}

function insertJaunt(jaunt, callback) {
	joindb.insert('jaunts', jaunt, callback);
}

function updateJaunt(jauntID, jaunt, callback) {
	joindb.update('jaunts', {_id : jauntID}, {$set : jaunt}, {}, callback);
}

function removeJaunt(jauntID, callback) {
	joindb.remove('jaunts', {_id : jauntID}, false, callback);
}

module.exports = {
	importJoin : importJoin,
	
	filterVans : filterVans,
	filterJaunts : filterJaunts,
	
	augJaunt : augJaunt,
	
	makeVans : makeVans,
	makeJaunts : makeJaunts,
	makeVansNameList : makeVansNameList,
	
	pushBrotherToVan : pushBrotherToVan,
	pushRusheeToVan : pushRusheeToVan,
	pushVanToJaunt : pushVanToJaunt,
	
	pullBrotherFromVan : pullBrotherFromVan,
	pullRusheeFromVan : pullRusheeFromVan,
	pullVanFromJaunt : pullVanFromJaunt,
	
	insertVan : insertVan,
	updateVan : updateVan,
	removeVan : removeVan,
	
	insertJaunt : insertJaunt,
	updateJaunt : updateJaunt,
	removeJaunt : removeJaunt
};
