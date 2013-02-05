
randomString = function(len, charSet) {
    charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var randomString = '';
    for (var i = 0; i < len; i++) {
        var randomPoz = Math.floor(Math.random() * charSet.length);
        randomString += charSet.substring(randomPoz,randomPoz+1);
    }
    return randomString;
}

name = function(first, nick, last) {
	if (nick != '') {
		return first+' \"'+ nick +'\" '+ last;
	} else {
		return first + ' ' + last;
	}
}

module.exports = {
	randomString : randomString,
	name : name
};
