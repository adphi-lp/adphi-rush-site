var rushdb;
var stats;
var auth;

function setup(env) {
    rushdb = env.rushdb;
    stats = env.stats;
    auth = env.auth;
}

function uri() {
    return '/rushee/view';
}

function authGet(auth) {
    return auth.checkAuth;
}

function authPost(auth) {
    return auth.checkAuth;
}

function get(req, res) {
    var rusheeID = req.query.rID === undefined ? null : rushdb.toObjectID(req.query.rID);
    var brotherID = req.query.bID === undefined ? null : rushdb.toObjectID(req.query.bID);
    if (brotherID !== null) {
        auth.setCookie(res, 'brotherID', brotherID + "");
    }

    var arrangeVote = function (info, render) {
        rushdb.arrangeVote(rusheeID, brotherID, info, render);
    };

    rushdb.get(arrangeVote, {}, function (err, info) {
        if (err !== undefined && err !== null) {
            console.log(err);
            res.redirect('/404');
            return;
        }

        if (brotherID === null) {
            info.brotherID = rushdb.toObjectID(auth.getCookie(req, 'brotherID'));
        }

        res.render('rushee/view.jade', info);
    });
}

function post(req, res) {
    var sponsor = (req.body.sponsor == 'Yes');
    var voteID = req.body.vote;
    var rusheeID = rushdb.toObjectID(req.body.rID);
    var brotherID = rushdb.toObjectID(req.body.bID);

    rushdb.insertSponsor(rusheeID, brotherID, sponsor);
    rushdb.insertVote(rusheeID, brotherID, voteID);

    for (var i = 0; i < 2; i++) {
        var commentText = req.body['comment' + i];
        var commentID = req.body['commentType' + i].toUpperCase();
        var commentJaunt = req.body['commentJaunt' + i];

        if (commentText !== '' || commentJaunt !== 'null') {
            if (commentJaunt === 'null') {
                rushdb.insertComment(rusheeID, brotherID, commentID, commentText);
            } else {
                var jauntID = rushdb.toObjectID(commentJaunt);
                rushdb.insertComment(rusheeID, brotherID, commentID, commentText, jauntID);
            }
        }
    }

    res.redirect('/rushee/view?rID=' + rusheeID);
}

module.exports = {
    setup: setup,
    uri: uri(),
    auth: {
        get: authGet,
        post: authPost
    },
    get: get,
    post: post
};
