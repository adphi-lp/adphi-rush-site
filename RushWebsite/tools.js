'use strict';

function randomString(len, charSet) {
    charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var rString = '';
    for (var i = 0; i < len; i++) {
        var randomPoz = Math.floor(Math.random() * charSet.length);
        rString += charSet.substring(randomPoz,randomPoz+1);
    }
    return rString;
}

function name(first, nick, last) {
	if (nick === '' || nick === null || nick === undefined) {
		return first + ' ' + last;
	} else {
		return first+' \"'+ nick +'\" '+ last;
	}
}

function lastfirst(first, nick, last) {
	if (nick === '' || nick === null || nick === undefined) {
		return last + ', ' + first;
	} else {
		return last + ', ' + first + ' "' + nick + '"';
	}
}

module.exports = {
	randomString : randomString,
	name : name,
	lastfirst : lastfirst
};
