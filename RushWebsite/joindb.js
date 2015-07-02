'use strict';

var mongojs = require('mongojs');
var db = null;
var tools = require('./tools');
var moment = require('moment');
var _ = require('underscore');

function connect(databaseURL, collections) {
    //ids is a reserved collection
    var cols = collections.concat(['ids']);
    db = mongojs.connect(databaseURL, collections);

    //ensure id
    for (var i = 0; i < collections.length; i++) {
        db.ids.insert({_id: cols[i], value: 0});
    }
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
function joinProperty(props, propName, list, idName, elName) {
    //Create hash and initialize
    var listHash = {};
    for (var i = 0, l = list.length; i < l; i++) {
        var el = list[i];
        listHash[el._id] = el;
        el[propName] = [];
    }

    for (var i = 0, l = props.length; i < l; i++) {
        var prop = props[i];
        var el = listHash[prop[idName]];
        //put elements into property
        prop[elName] = el;
        //push property
        el[propName].push(prop);
    }
}

/**
 * Joins properties (e.g. time-stamped status) to elements in a list (e.g. rushees or brothers).
 * The joined properties are added under a list with a given name for each element.
 * The property is only joined if it contains idName.
 * Joining is guaranteed to preserve order.
 * @param {Object} props the properties to join
 * @param {Object} propName the name of the property collection
 * @param {Object} list the list of elements to be joined to. Must have an _id field.
 * @param {Object} idName the name of the id field in a property
 */
function joinPropertyIf(props, propName, list, idName, elName) {
    //Create hash and initialize
    var listHash = {};
    for (var i = 0, l = list.length; i < l; i++) {
        var el = list[i];
        listHash[el._id] = el;
        el[propName] = [];
    }

    for (var i = 0, l = props.length; i < l; i++) {
        var prop = props[i];
        if (prop[idName] === undefined) {
            continue;
        }
        var el = listHash[prop[idName]];
        //put elements into property
        prop[elName] = el;
        //push property
        el[propName].push(prop);
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

/**
 * Filters out people from the group who are not in members.
 * @param groups
 * @param members
 * @returns {Array}
 */
function filterGroup(groups, members) {
    //create hashes and initialize
    var hashes = [];
    for (var i = 0; i < members.length; i++) {
        hashes.push(_.indexBy(members[i][0], '_id'));
    }
    //go through each group
    for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        //go through each member list
        for (var j = 0; j < members.length; j++) {
            var idName = members[j][1];
            // filter group list of ids
            group[idName] = _.filter(group[idName], function(id) {
                return hashes[j][id] !== undefined;
            })
        }
    }
    return groups;
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
    db[col].findOne(query, function (err, doc) {
        if (err !== null && err !== undefined) {
            callback(err, doc);
        } else if (doc === null) {
            callback(null, null);
        } else {
            augment(doc);
            callback(null, doc);
        }
    });
}

function find(col, query, sort, augment, callback) {
    var docs = [];
    db[col].find(query).sort(sort).forEach(function (err, doc) {
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

function findAndModify(col, query, augment, callback) {
    db[col].findAndModify(query, function (err, doc) {
        if (err !== null && err !== undefined) {
            callback(err, doc);
        } else if (doc === null) {
            callback(null, null);
        } else {
            augment(doc);
            callback(null, doc);
        }
    });
}

function toObjectID(id) {
    return parseInt(id, 10);
}

function findID(col, callback) {
    var query = {
        query: {_id: col},
        update: {$inc: {value: 1}},
        'new': true
    };

    findAndModify('ids', query, function () {
    }, function (err, doc) {
        if (err !== undefined && err !== null) {
            callback(err);
        } else {
            callback(null, doc.value);
        }
    });
}

function insert(col, doc, callback) {
    findID(col, function (err, id) {
        if (err !== undefined && err !== null) {
            if (typeof callback === 'function') {
                callback(err);
            }
        } else {
            doc._id = id;
            doc.ts = new Date();
            if (callback === undefined) {
                db[col].insert(doc);
            } else {
                db[col].insert(doc, callback);
            }
        }
    });
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
    connect: connect,

    ensureIndex: ensureIndex,
    toObjectID: toObjectID,

    joinProperty: joinProperty,
    joinPropertyIf: joinPropertyIf,
    joinAssoc: joinAssoc,
    joinAssocIndexed: joinAssocIndexed,
    joinGroup: joinGroup,
    filterGroup: filterGroup,

    findOne: findOne,
    find: find,
    findAndModify: findAndModify,
    insert: insert,
    update: update,
    remove: remove
};
