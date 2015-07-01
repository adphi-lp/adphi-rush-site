'use strict';

var fs = require('fs');
var path = require('path');

function randomString(len, charSet) {
    charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var rString = '';
    for (var i = 0; i < len; i++) {
        var randomPoz = Math.floor(Math.random() * charSet.length);
        rString += charSet.substring(randomPoz, randomPoz + 1);
    }
    return rString;
}

function extension(filename) {
    return filename.substr(filename.lastIndexOf('.') + 1);
}

function name(first, nick, last) {
    if (nick === '' || nick === null || nick === undefined) {
        return first + ' ' + last;
    } else {
        return first + ' \"' + nick + '\" ' + last;
    }
}

function addStat(stats, name, time) {
    time = time[0] * 1e9 + time[1];
    stats.addStat(name, time);
}

function lastfirst(first, nick, last) {
    if (nick === '' || nick === null || nick === undefined) {
        return last + ', ' + first;
    } else {
        return last + ', ' + first + ' "' + nick + '"';
    }
}

function map(arr, func) {
    var len = arr.length;
    var ret = new Array(len);
    for (var i = 0; i < len; i++) {
        ret[i] = func(arr[i]);
    }

    return ret;
}

function filter(arr, filt) {
    var results = [];
    for (var i = 0, l = arr.length; i < l; i++) {
        var el = arr[i];
        if (filt(el)) {
            results.push(el);
        }
    }
    return results;
}

function count(arr, func) {
    var num = 0;
    for (var i = 0, l = arr.length; i < l; i++) {
        if (func(arr[i])) {
            num++;
        }
    }

    return num;
}

function strCmp(str1, str2) {
    if (str1 > str2) {
        return 1;
    } else if (str1 < str2) {
        return -1;
    } else {
        return 0;
    }
}

function startsWith(str, starts) {
    if (starts === '') return true;
    if (str == null || starts == null) return false;
    str = String(str);
    starts = String(starts);
    return str.length >= starts.length && str.slice(0, starts.length) === starts;
}

function endsWith(str, ends) {
    if (ends === '') return true;
    if (str == null || ends == null) return false;
    str = String(str);
    ends = String(ends);
    return str.length >= ends.length && str.slice(str.length - ends.length) === ends;
}

function strCmpNoCase(str1, str2) {
    return strCmp(str1.toLowerCase(), str2.toLowerCase());
}

function isArray(a) {
    return Array.isArray(a);
}

function isString(a) {
    return typeof a === 'string';
}

function walkSync(start, callback) {
    var stat = fs.statSync(start);

    if (stat.isDirectory()) {
        var names = fs.readdirSync(start);

        var files = [];
        var dirs = [];
        for (var i = 0, l = names.length; i < l; i++) {
            var name = names[i];
            var abspath = path.join(start, name);

            if (fs.statSync(abspath).isDirectory()) {
                dirs.push(abspath);
            } else {
                files.push(abspath);
            }
        }

        for (var i = 0, l = files.length; i < l; i++) {
            var file = files[i];
            callback(file);
        }

        dirs.forEach(function (dir) {
            walkSync(dir, callback);
        });
    } else {
        throw new Error("path: " + start + " is not a directory");
    }
}

module.exports = {
    randomString: randomString,
    extension: extension,
    name: name,
    lastfirst: lastfirst,
    strCmp: strCmp,
    strCmpNoCase: strCmpNoCase,
    filter: filter,
    map: map,
    count: count,
    isArray: isArray,
    str: {
        startsWith: startsWith,
        endsWith: endsWith,
    },
    file: {
        walkSync: walkSync,
    },
};
