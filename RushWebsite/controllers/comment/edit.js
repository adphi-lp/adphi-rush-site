var rushdb;
var stats;

function setup(env) {
    rushdb = env.rushdb;
    stats = env.stats;
}

function uri() {
    return '/comment/edit';
}

function authGet(auth) {
    return auth.checkAdminAuth;
}

function authPost(auth) {
    return auth.checkAdminAuth;
}

function get(req, res) {
    var cID = req.query.cID === undefined ? null : rushdb.toObjectID(req.query.cID);

    var arrangeComment = function (info, render) {
        rushdb.arrangeComment(cID, info, render);
    };

    rushdb.get(arrangeComment, {}, function (err, info) {
        if (err !== undefined && err !== null) {
            console.log(err);
            res.redirect('/404');
            return;
        }

        res.render('comment/edit.jade', info);
    });
}

function post(req, res) {
    var commentText = req.body.comment;
    var commentType = req.body.commentType.toUpperCase();
    var commentID = rushdb.toObjectID(req.body.commentID);
    var commentJaunt = req.body.commentJaunt;

    if (commentText !== '' || commentJaunt !== 'null') {
        if (commentJaunt === 'null') {
            rushdb.updateComment(commentID, commentType, commentText);
        } else {
            var jauntID = rushdb.toObjectID(commentJaunt);
            rushdb.updateComment(commentID, commentType, commentText, jauntID);
        }
    }

    res.redirect('/rushee/search');

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
