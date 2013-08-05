'use strict';

var tools = require("./tools");

function get(rushees, query) {
	var words = split(query);
	var ranking = [];
	for (var i = 0, l = rushees.length; i < l; i++) {
		var rushee = rushees[i];
		ranking[i] = [rushee, rank(rushee, words)];
	}
	
	ranking.sort(function(a, b) {
		return b[1] - a[1];
	});
	
	var results = ranking.slice(0,10);
	
	return tools.map(results, function(r) {
		return r[0];
	});
}

function split(query) {
	return query.split(' ');
}

function rank(rushee, words) {
	var count = 0;
	count += rankWords(rushee, words);
	count += rankStatus(rushee, words);
	return count;
}

function rankWords(rushee, words) {
	var count = 0;
	for (var i = 0, l = words.length; i < l; i++) {
		var word = words[i];
		for (var field in rushee) {
			var value = rushee[field];
			if (typeof value !== "string") {
				continue;
			}
			if (value.toUpperCase().indexOf(word.toUpperCase()) !== -1) {
				count += 5;
			}
		}
	}
	return count;
}

function rankStatus(rushee) {
	if (rushee.status === undefined || rushee.status === null) {
		return 0;
	}
	
	var count = 1;
	if (rushee.status.type._id === "IN") {
		count += 4;
	} else if (rushee.status.type._id === "JAUNT") {
		count += 3;
	} else if (rushee.status.type._id === "OUT") {
		count += 2;
	} else {
		count += 1;
	}
	return count;
}


function match(rushee, query) {
	return rushee.name.toUpperCase().indexOf(query.toUpperCase()) !== -1;
}

module.exports = {
	get : get
};
