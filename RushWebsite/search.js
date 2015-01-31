'use strict';

var tools = require("./tools");

function filterRushee(rushee, options) {
	return (options.inhouse !== true || rushee.status.type._id === 'IN') &&
		(options.outhouse !== true || rushee.status.type._id === 'OUT') &&
		(options.onjaunt !== true || rushee.status.type._id === 'JAUNT') &&
		(options.priority !== true || rushee.priority === true) && //undefined = false
		(options.visible !== true || rushee.visible !== false) && //undefined = true
		(options.bidworthy !== true || rushee.bidworthy) &&
			//hidden xor visible
		((options.hidden === true) !== (rushee.visible !== false)) &&
		((options.candidate !== true) || (rushee.candidate === true)); //undefined = false;
}

function get(rushees, query) {
	var words = split(query);
	var ranking = [];
	for (var i = 0, l = rushees.length; i < l; i++) {
		var rushee = rushees[i];
		ranking[i] = [rushee, rank(rushee, words), i];
	}

	ranking.sort(function(a, b) {
		if (b[1] != a[1]) {
			return b[1] - a[1];
		} else {
			return a[2] - b[2];
		}
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
			if (typeof value === "string") {
				if (value.toUpperCase().indexOf(word.toUpperCase()) !== -1) {
					count += 5;
				}
			} else if (tools.isArray(value)) {
				for (var j = 0, m = value.length; j < m; j++) {
					if (typeof value[j] === "string") {
						if (value[j].toUpperCase().indexOf(word.toUpperCase()) !== -1) {
							count += 5;
						}
					}
				}
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

module.exports = {
	get : get,
	filterRushee : filterRushee
};
