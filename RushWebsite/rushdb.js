/*jslint node: true */
'use strict';

var mongojs = require('mongojs');
var joindb = require('./joindb');
var logdb = require('./logdb');
var tools = require('./tools');
var moment = require('moment');
var async = require('async');
var sponsordb = require('./sponsordb');
var votedb = require('./votedb');
var jauntdb = require('./jauntdb');
var commentdb = require('./commentdb');
var candidatedb = require('./candidatedb');
var photodb = require('./photodb');
var chdb = require('./clearinghousedb');
var stats = require('./stats');

var COLLECTIONS = ['brothers', 'rushees', 'comments', 'sponsors',
    'votes', 'statuses', 'jaunts', 'vans', 'candidates', 'ids', 'import', 'logs'];

var StatusType = {
    IN: {_id: 'IN', name: 'In House', color: '#228b22'},
    JAUNT: {_id: 'JAUNT', name: 'On a Jaunt', color: '#0000FF'},
    OUT: {_id: 'OUT', name: 'Out of House', color: '#000000'},
    NULL: {_id: 'NULL', name: 'Never seen', color: '#000000'}
};

// current time
var timestamp = null;
//global announcement (stored in memory)
var announcement = '';

function getNullStatus(rushee) {
    var status = {
        type: StatusType.NULL,
        rushee: rushee,
        rusheeID: rushee._id
    };

    return status;
}

/**
 * Connect to databaseURL and initialize the database.
 * @param {Object} databaseURL
 */
function connect(databaseURL) {
    joindb.connect(databaseURL, COLLECTIONS);
    logdb.importJoin(joindb);
    sponsordb.importJoin(joindb);
    votedb.importJoin(joindb);
    jauntdb.importJoin(joindb);
    commentdb.importJoin(joindb);
    candidatedb.importJoin(joindb);
    chdb.importLog(logdb);

    //to ensure that you can sort fast
    joindb.ensureIndex('rushees', {sfirst: 1, slast: 1});
    joindb.ensureIndex('rushees', {slast: 1, sfirst: 1});
    joindb.ensureIndex('brothers', {sfirst: 1, slast: 1});
    joindb.ensureIndex('brothers', {slast: 1, sfirst: 1});
    joindb.ensureIndex('candidates', {sfirst: 1, slast: 1});
    joindb.ensureIndex('candidates', {slast: 1, sfirst: 1});
    joindb.ensureIndex('votes', {ts: -1});
    joindb.ensureIndex('sponsors', {ts: -1});
    joindb.ensureIndex('comments', {ts: -1});
    joindb.ensureIndex('statuses', {ts: -1});
    joindb.ensureIndex('vans', {ts: 1});
    joindb.ensureIndex('jaunts', {time: 1});
    joindb.ensureIndex('logs', {ts: -1});
}

function getTimestamp() {
    return timestamp;
}

function setTimestamp(ts) {
    timestamp = ts;
}

function augRushee(rushee) {
    rushee.name = tools.name(rushee.first, rushee.nick, rushee.last);
    rushee.lastfirst = tools.lastfirst(rushee.first, rushee.nick, rushee.last);
    rushee.cross1 = rushee.cross1 || 'None';
    rushee.cross2 = rushee.cross2 || 'None';
    var time = moment(rushee.ts);
    rushee.time = time.format('h:mm:ss a, dddd, MMMM Do YYYY');
}

function augBrother(brother) {
    brother.name = tools.name(brother.first, brother.nick, brother.last);
    brother.lastfirst = tools.lastfirst(brother.first, brother.nick, brother.last);
}

function augStatus(status) {
    var time = moment(status.ts);
    status.time = time.format('h:mm:ss a') +
        ' on ' + time.format('dddd, MMMM Do YYYY');
    status.shorttime = time.format('dddd, MMM DD, HH:mm');
}

/**
 * Joins the statuses onto rushees under rushees.statuses.
 *
 */
function makeStatuses(rushees, statuses) {
    for (var i = 0, l = statuses.length; i < l; i++) {
        statuses[i].type = StatusType[statuses[i].typeID];
    }

    joindb.joinProperty(statuses, 'statuses', rushees, 'rusheeID', 'rushee');
}

/**
 * Gets the default status from rushee.statuses and puts it onto
 * rushee.status.
 */
function makeStatus(rushees) {
    for (var i = 0, l = rushees.length; i < l; i++) {
        var r = rushees[i];
        r.status = r.statuses[0] || getNullStatus(r);
    }
}

function makeInHouseRushees(info, rushees) {
    makeCustomRushees(info, rushees, 'inHouseRushees', function (r) {
        return r.status.type._id === 'IN';
    });
}

function makeCustomRushees(info, rushees, name, func) {
    info[name] = [];
    for (var i = 0, l = rushees.length; i < l; i++) {
        if (func(rushees[i])) {
            info[name].push(rushees[i]);
        }
    }
}

function getRushee(rusheeID, render) {
    getSingle('rushees', 'rushee', rusheeID, augRushee, render);
}

function getBrother(brotherID, render) {
    getSingle('brothers', 'brother', brotherID, augBrother, render);
}

function getCandidate(cID, render) {
    getSingle('candidates', 'candidate', cID,
        candidatedb.augCandidate, render);
}

function getVan(vID, render) {
    getSingle('vans', 'van', vID, function () {
    }, render);
}

function getSingle(col, name, id, aug, render) {
    if (id === null) {
        render(new Error('no ' + name + 'ID given'));
        return;
    }

    var query = {_id: id};
    joindb.findOne(col, query, aug, function (err, doc) {
        if (err !== null && err !== undefined) {
            render(err);
            return;
        }
        if (doc === null) {
            render(new Error('no ' + name + ' found'));
            return;
        }

        var info = {};
        info[name] = doc;

        render(null, info);
    });
}


function get(arrange, options, render) {
    var defaultOptions = {
        brothers: {sort: {slast: 1, sfirst: 1}},
        rushees: {sort: {sfirst: 1, slast: 1}},
        candidates: {sort: {sfirst: 1, slast: 1}}
    };

    if (options.brothers !== undefined) {
        if (options.brothers.sort !== undefined) {
            defaultOptions.brothers.sort = options.brothers.sort;
        }
    }

    if (options.rushees !== undefined) {
        if (options.rushees.sort !== undefined) {
            defaultOptions.rushees.sort = options.rushees.sort;
        }
    }

    if (options.candidates !== undefined) {
        if (options.candidates.sort !== undefined) {
            defaultOptions.candidates.sort = options.candidates.sort;
        }
    }

    var firstStep = function (nextStep) {
        getFirst(defaultOptions, nextStep);
    };
    var secondStep = getSecond;
    var thirdStep = getThird;

    var time = process.hrtime();

    firstStep(function (err1, info1) {
        if (err1 !== undefined && err1 !== null) {
            render(err1);
            return;
        }//otherwise,

        time = stats.addDiff('get() - step1', time);

        secondStep(info1, function (err2, info2) {
            if (err2 !== undefined && err2 !== null) {
                render(err2);
                return;
            }//otherwise,

            time = stats.addDiff('get() - step2', time);

            thirdStep(info2, function (err3, info3) {
                if (err3 !== undefined && err3 !== null) {
                    render(err3);
                    return;
                }//otherwise

                time = stats.addDiff('get() - step3', time);
                arrange(info3, render);
            });
        });
    });
}

function getFirst(options, nextStep) {
    var ts = timestamp;
    var query = {};

    if (ts != null) {
        query.$where = "this.ts <= " + ts;
    }

    async.parallel({
        ts: function (cb) {
            cb(null, ts);
        },
        brothers: function (cb) {
            joindb.find('brothers', query, options.brothers.sort, augBrother, cb);
        },
        rushees: function (cb) {
            joindb.find('rushees', query, options.rushees.sort, augRushee, cb);
        },
        candidates: function (cb) {
            joindb.find('candidates', query,
                options.candidates.sort, candidatedb.augCandidate, cb);
        }
    }, nextStep);
}

function getSecond(info, nextStep) {
    var ts = info.ts;
    var rushees = info.rushees;
    var brothers = info.brothers;
    var candidates = info.candidates;
    var brotherIDs = tools.map(brothers, function (b) {
        return b._id;
    });
    var rusheeIDs = tools.map(rushees, function (r) {
        return r._id;
    });
    var queryRushees = {rusheeID: {$in: rusheeIDs}};
    var queryBrothers = {brotherID: {$in: brotherIDs}};
    var queryBoth = {rusheeID: {$in: rusheeIDs}, brotherID: {$in: brotherIDs}};
    var queryAll = {};

    if (ts != null) {
        var where = "this.ts <= " + ts;
        queryRushees.$where = where;
        queryBrothers.$where = where;
        queryBoth.$where = where;
        queryAll.$where = where
    }

    async.parallel({
        ts: function (cb) {
            cb(null, ts);
        },
        rushees: function (cb) {
            cb(null, rushees);
        },
        brothers: function (cb) {
            cb(null, brothers);
        },
        candidates: function (cb) {
            cb(null, candidates);
        },
        statuses: function (cb) {
            joindb.find('statuses', queryRushees, {ts: -1}, augStatus, cb);
        },
        votes: function (cb) {
            joindb.find('votes', queryBoth, {ts: -1}, votedb.augVote, cb);
        },
        comments: function (cb) {
            joindb.find('comments', queryBoth, {ts: -1}, commentdb.augComment, cb);
        },
        sponsors: function (cb) {
            joindb.find('sponsors', queryBoth, {ts: -1}, function () {}, cb);
        },
        vans: function (cb) {
            joindb.find('vans', queryAll, {ts: 1}, function () {}, cb);
        },
        jaunts: function (cb) {
            joindb.find('jaunts', queryAll, {time: 1}, jauntdb.augJaunt, cb);
        }
    }, nextStep);
}

function getThird(info, nextStep) {
    var candidates = info.candidates;
    var rushees = info.rushees;
    var brothers = info.brothers;
    var statuses = info.statuses;
    var votes = info.votes;
    var sponsors = info.sponsors;
    var comments = info.comments;
    info.vans = jauntdb.filterVans(rushees, brothers, info.vans);
    var vans = info.vans;
    info.jaunts = jauntdb.filterJaunts(vans, info.jaunts);
    var jaunts = info.jaunts;

    makeStatuses(candidates, []);
    makeStatus(candidates, []);
    makeStatuses(rushees, statuses);
    makeStatus(rushees);
    makeInHouseRushees(info, rushees);

    sponsordb.makeSponsors(rushees, brothers, sponsors);
    sponsordb.makeSponsorsBy(rushees, brothers, sponsors);
    sponsordb.makeSponsorsList(rushees, 'brother');
    sponsordb.makeSponsorsList(brothers, 'rushee');
    sponsordb.makeSponsorsNameList(rushees, 'brother');
    sponsordb.makeSponsorsNameList(brothers, 'rushee');

    commentdb.makeComments(rushees, brothers, jaunts, comments);

    votedb.makeVotesBy(rushees, brothers, votes);
    votedb.makeVoteScore(brothers);
    votedb.makeVoteScore(rushees);
    votedb.makeVoteTotal(brothers);
    votedb.makeVoteTotal(rushees);
    votedb.makeVotesByType(brothers);
    votedb.makeVotesByType(rushees);
    votedb.countVotesByType(rushees, brothers);
    votedb.countVotesByType(brothers, rushees);
    info.bidScore = votedb.getBidScore(brothers);

    info.activeBrothers = tools.filter(brothers, function (b) {
        return b.visible !== false; // undefined = true
    });
    votedb.makeBidworthiness(rushees, info.activeBrothers.length);

    jauntdb.makeVans(rushees, brothers, vans);
    jauntdb.makeJaunts(vans, jaunts);
    jauntdb.makeVansNameList(rushees);
    jauntdb.makeVansNameList(brothers);

    nextStep(null, info);
}

function arrange(info, render) {
    render(null, info);
}

function arrangeJaunt(jauntID, info, render) {
    if (jauntID === null) {
        render(new Error('no jauntID'));
        return;
    }

    var jaunts = info.jaunts;
    for (var j = 0, l = jaunts.length; j < l; j++) {
        if (jauntID === jaunts[j]._id) {
            info.jaunt = jaunts[j];
        }
    }

    if (info.jaunt === undefined) {
        render(new Error('no jaunt'));
        return;
    }
    render(null, info);
}

function arrangeVote(rusheeID, brotherID, info, render) {
    if (rusheeID === null) {
        render(new Error('no rusheeID'));
        return;
    }
    var rushees = info.rushees;
    for (var r = 0, l = rushees.length; r < l; r++) {
        if (rusheeID === rushees[r]._id) {
            info.rushee = rushees[r];
        }
    }
    if (info.rushee === undefined) {
        render(new Error('no rushee'));
        return;
    }

    var brothers = info.brothers;
    if (brotherID !== null) {
        for (var b = 0, lb = brothers.length; b < lb; b++) {
            if (brothers[b]._id === brotherID) {
                info.brother = brothers[b];
            }
        }
    }
    if (info.brother === undefined) {
        info.brother = null;
    } else {
        sponsordb.makeSponsorBy([info.brother], [info.rushee]);
    }

    votedb.makeVoteBy([info.rushee], brothers);

    var voteCmp = function (a, b) {
        return a.type.index - b.type.index ||
            tools.strCmpNoCase(a.brother.name, b.brother.name);
    };

    info.rushee.sortedVotes = tools.map(brothers, function (b) {
        return info.rushee.voteBy[b._id];
    });
    info.rushee.sortedVotes.sort(voteCmp);

    render(null, info);
}

function arrangeComment(commentID, info, render) {
    if (commentID === null) {
        render(new Error('no commentID'));
        return;
    }
    var comments = info.comments;
    if (commentID !== null) {
        for (var c = 0, lc = comments.length; c < lc; c++) {
            if (comments[c]._id === commentID) {
                info.comment = comments[c];
            }
        }
    }
    if (info.comment === undefined) {
        render(new Error('no comment'));
        return;
    }
    render(null, info);
}

function arrangeBrother(brotherID, info, render) {
    if (brotherID === null) {
        render(new Error('no brotherID'));
        return;
    }

    var brothers = info.brothers;
    if (brotherID !== null) {
        for (var b = 0, lb = brothers.length; b < lb; b++) {
            if (brothers[b]._id === brotherID) {
                info.brother = brothers[b];
            }
        }
    }

    if (info.brother === undefined) {
        render(new Error('no brother'));
        return;
    }

    var rushees = info.rushees;
    votedb.makeVoteBy(rushees, brothers);

    var voteCmp = function (a, b) {
        return a.type.index - b.type.index ||
            tools.strCmpNoCase(a.rushee.name, b.rushee.name);
    };
    info.brother.sortedVotes = tools.map(rushees, function (r) {
        return r.voteBy[info.brother._id];
    });
    info.brother.sortedVotes.sort(voteCmp);


    render(null, info);
}

function arrangeVoteScore(info, render) {
    var rushees = info.rushees;
    rushees.sort(function (a, b) {
        return b.voteScore - a.voteScore;
    });

    if (!info.brothersortoff) { //TODO make this cleaner
        var brothers = info.brothers;
        brothers.sort(function (a, b) {
            return b.voteTotal - a.voteTotal;
        });
    }
    render(null, info);
}

function arrangeVoteTotal(info, render) {
    var rushees = info.rushees;
    rushees.sort(function (a, b) {
        return b.voteTotal - a.voteTotal;
    });

    if (!info.brothersortoff) { //TODO make this cleaner
        var brothers = info.brothers;
        brothers.sort(function (a, b) {
            return b.voteTotal - a.voteTotal;
        });
    }
    render(null, info);
}

function arrangeInHouseVotes(info, render) {
    arrangeCustomVotes(info, render, 'inHouseRushees', 'brothers');
}

function arrangeCustomVotes(info, render, nameR, nameB) {
    votedb.makeVoteBy(info[nameR], info[nameB]);
    arrangeVoteScore(info, render);
}

function insertStatus(rusheeID, typeID, callback) {
    var entry = {
        rusheeID: rusheeID,
        typeID: typeID
    };
    joindb.insert('statuses', entry, callback);
}

function loadTestInsertRushees() {
    for (var i = 0; i < 1000; i++) {
        var rushee = {
            first: 'first' + i,
            last: 'last' + i,
            nick: 'nick' + i,
            dorm: 'dorm' + i,
            phone: 'phone' + i,
            email: 'email' + i,
            year: 'year' + i,
            photo: photodb.DEFAULT_PHOTO_PATH,
            visible: true,
            priority: false
        };
        insertRushee(rushee);
    }
}

function loadTestInsertBrothers() {
    for (var i = 0; i < 64; i++) {
        var brother = {
            first: 'first' + i,
            last: 'last' + i,
            'class': 'class' + i,
            phone: 'phone' + i,
            email: 'email' + i
        };
        insertBrother(brother);
    }
}

function insertRushee(rushee, callback) {
    rushee.sfirst = rushee.first.toLowerCase();
    rushee.slast = rushee.last.toLowerCase();
    joindb.insert('rushees', rushee, callback);
}

function insertBrother(brother, callback) {
    brother.sfirst = brother.first.toLowerCase();
    brother.slast = brother.last.toLowerCase();
    joindb.insert('brothers', brother, callback);
}

function updateRushee(rusheeID, rushee, callback) {
    if (rushee.first !== undefined) {
        rushee.sfirst = rushee.first.toLowerCase();
    }
    if (rushee.last !== undefined) {
        rushee.slast = rushee.last.toLowerCase();
    }
    joindb.update('rushees', {_id: rusheeID}, {$set: rushee}, {}, callback);
}

function updateBrother(brotherID, brother, callback) {
    if (brother.first !== undefined) {
        brother.sfirst = brother.first.toLowerCase();
    }
    if (brother.last !== undefined) {
        brother.slast = brother.last.toLowerCase();
    }
    joindb.update('brothers', {_id: brotherID}, {$set: brother}, {}, callback);
}

function copyCol(col1, col2) {
    joindb.find(col1, {}, {}, function () {
    }, function (err, docs) {
        for (var i = 0; i < docs.length; i++) {
            joindb.insert(col2, docs[i]);
        }
    });
}

function importCand(candText) {
    var regexp = /[\n\r]+/;
    var lines = candText.split(regexp);
    var page = -1;
    for (var l = 0; l < lines.length; l++) {
        var line = lines[l];
        if (line === 'Page' + (page + 1)) {
            page++;
        } else {
            var male = false;
            if (line.indexOf('.') === 0) {
                male = true;
                line = line.substring(1);
            }
            var name = line.split(' ', 2);
            if (name.length !== 2) {
                console.log('asdfasdf');
            }
            var metamale = male ? 'XXMALE' : 'XXFEMALE';
            var metapage = 'XXPAGE' + (page + 1);
            var cand = {
                first: name[0],
                last: name[1],
                nick: '',
                dorm: '',
                phone: '',
                email: '',
                year: 'Freshman',
                photo: photodb.DEFAULT_PHOTO_PATH,
                visible: true,
                priority: false,
                metadata: metamale + ' ' + metapage
            };
            candidatedb.insertCandidate(cand);
        }
    }
}

function getAnnouncement() {
    return announcement;
}

function setAnnouncement(text) {
    announcement = text;
}

module.exports = {
    VoteType: votedb.VoteType,
    CommentType: commentdb.CommentType,
    StatusType: StatusType,

    SORTED_VOTE_TYPES: votedb.SORTED_VOTE_TYPES,
    SORTED_COMMENT_TYPES: commentdb.SORTED_COMMENT_TYPES,

    getNullStatus: getNullStatus,

    getRushee: getRushee,
    getCandidate: getCandidate,
    getBrother: getBrother,
    getVan: getVan,

    getAnnouncement: getAnnouncement,
    setAnnouncement: setAnnouncement,

    connect: connect,

    toObjectID: joindb.toObjectID,

    augRushee: augRushee,
    augBrother: augBrother,
    augComment: commentdb.augComment,
    augCandidate: candidatedb.augCandidate,

    get: get,

    makeCustomRushees: makeCustomRushees,

    arrange: arrange,
    arrangeVote: arrangeVote,
    arrangeComment: arrangeComment,
    arrangeBrother: arrangeBrother,
    arrangeVoteScore: arrangeVoteScore,
    arrangeVoteTotal: arrangeVoteTotal,
    arrangeInHouseVotes: arrangeInHouseVotes,
    arrangeCustomVotes: arrangeCustomVotes,
    arrangeJaunt: arrangeJaunt,

    loadTestInsertRushees: loadTestInsertRushees,
    loadTestInsertBrothers: loadTestInsertBrothers,

    insertStatus: insertStatus,
    insertSponsor: sponsordb.insertSponsor,
    insertVote: votedb.insertVote,
    insertComment: commentdb.insertComment,
    insertRushee: insertRushee,
    insertBrother: insertBrother,
    insertCandidate: candidatedb.insertCandidate,

    updateCandidate: candidatedb.updateCandidate,
    updateRushee: updateRushee,
    updateBrother: updateBrother,
    updateComment: commentdb.updateComment,

    transferCandidate: candidatedb.transferCandidate,

    pushBrotherToVan: jauntdb.pushBrotherToVan,
    pushRusheeToVan: jauntdb.pushRusheeToVan,
    pushVanToJaunt: jauntdb.pushVanToJaunt,
    pullBrotherFromVan: jauntdb.pullBrotherFromVan,
    pullRusheeFromVan: jauntdb.pullRusheeFromVan,
    pullVanFromJaunt: jauntdb.pullVanFromJaunt,
    insertVan: jauntdb.insertVan,
    updateVan: jauntdb.updateVan,
    removeVan: jauntdb.removeVan,
    insertJaunt: jauntdb.insertJaunt,
    updateJaunt: jauntdb.updateJaunt,
    removeJaunt: jauntdb.removeJaunt,


    PHOTO_DIR: photodb.PHOTO_DIR,
    DEFAULT_PHOTO: photodb.DEFAULT_PHOTO,
    DEFAULT_PHOTO_PATH: photodb.DEFAULT_PHOTO_PATH,
    PHOTO_NAME_LENGTH: photodb.PHOTO_NAME_LENGTH,
    uploadPhoto: photodb.uploadPhoto,
    uploadPhotoIf: photodb.uploadPhotoIf,

    copyCol: copyCol,
    importCand: importCand,
    setTimestamp: setTimestamp,
    getTimestamp: getTimestamp,

    getCHCookies: chdb.getCHCookies,
    setCHCookie: chdb.setCHCookie,
    delCHCookie: chdb.delCHCookie,

    getCHRusheeData: chdb.getCHRusheeData,

    setCHLogin: chdb.setCHLogin,
    getCHLogin: chdb.getCHLogin,

    getLog: logdb.getLog,

    inhouse: chdb.inhouse,
    outhouse: chdb.outhouse,
    onjaunt: chdb.onjaunt
};
