'use strict';

var tools = require('./tools');

var joindb;

function importJoin(db) {
	joindb = db;
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
	for (var i = 0, l = rushees.length; i < l; i++) {
		var r = rushees[i];
		r.sponsorBy = {};
		for (var j = 0, m = brothers.length; j < m; j++) {
			var b = brothers[j];
			if (r.sponsorsBy[b._id] === undefined) {
				r.sponsorBy[b._id] = getNullSponsor(r, b);
			} else {
				r.sponsorBy[b._id] = r.sponsorsBy[b._id][0];
			}
		}
	}
}

/**
 * 
 */
function makeSponsorsList(rushees, fieldName) {
	for (var i = 0, l = rushees.length; i < l; i++) {
		var r = rushees[i];
		r.sponsorsList = [];
		for (var b in r.sponsorsBy) {
			if (r.sponsorsBy[b][0].sponsor) {
				r.sponsorsList.push(r.sponsorsBy[b][0][fieldName]);
			}
		}
	}
}

function makeSponsorsNameList(rushees) {
	var broToName = function(s) {
		return s.name;
	};
	for (var i = 0, l = rushees.length; i < l; i++) {
		var r = rushees[i];
		r.sponsorsNameList = tools.map(r.sponsorsList, broToName);
	}
}

function insertSponsor(rusheeID, brotherID, sponsor) {
	var entry = {
		brotherID: brotherID,
		rusheeID: rusheeID,
		sponsor : sponsor
	};
	joindb.insert('sponsors', entry);
}

module.exports = {
	getNullSponsor : getNullSponsor,
	importJoin : importJoin,
	makeSponsors : makeSponsors,
	makeSponsorsBy : makeSponsorsBy,
	makeSponsorBy : makeSponsorBy,
	makeSponsorsList : makeSponsorsList,
	makeSponsorsNameList : makeSponsorsNameList,
	insertSponsor : insertSponsor
};
