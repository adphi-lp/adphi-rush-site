'use strict';

function get(rushees, query) {
	var results = [];
	for (var i = 0; i < rushees.length; i++) {
		var rushee = rushees[i];
		if (match(rushee, query)) {
			results.push(rushee);
		}
	}
	return results;
}

function split(query) {
	return query.split(' ');
}

function rank(rushee, query) {
	
}

function match(rushee, query) {
	return rushee.name.toUpperCase().indexOf(query.toUpperCase()) !== -1;
}

module.exports = {
	get : get
};
