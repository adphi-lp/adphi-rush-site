var rushdb;
var stats;
var auth;

function setup(env) {
    rushdb = env.rushdb;
    stats = env.stats;
    auth = env.auth;
}

function uri() {
    return '/rushee/edit';
}

function authGet(auth) {
    return auth.checkAuth;
}

function authPost(auth) {
    return auth.checkAuth;
}

function get(req, res) {
    var rusheeID = req.query.rID === undefined ? null : rushdb.toObjectID(req.query.rID);

    rushdb.getRushee(rusheeID, function (err, info) {
        if (err !== null && err !== undefined) {
            console.log(err);
            res.redirect('/404');
            return;
        }

        res.render('rushee/edit.jade', info);
    });
}

function post(req, res) {
    var rusheeID = rushdb.toObjectID(req.body.rID);

    rushdb.uploadPhotoIf(req.files.photo, req.body.photoOld, function (err, photoPath) {
        // ignore error
        var rushee = {
            first: req.body.first,
            last: req.body.last,
            nick: req.body.nick,
            dorm: req.body.dorm,
            phone: req.body.phone,
            email: req.body.email,
            year: req.body.year,
            cross1: req.body.cross1,
            cross2: req.body.cross2,
            mitID: req.body.mitID,
            photo: photoPath
        };

        var accountType = auth.getAccountType(req, res);
        if (accountType.isAdmin()) {
            rushee.visible = req.body.visible === 'on';
            rushee.priority = req.body.priority === 'on';
            rushee.eligible = req.body.eligible === 'on';
            var chID = req.body.chID;
            if (chID !== undefined && chID !== null && chID.trim() !== '') {
                rushee.chID = rushdb.toObjectID(chID);
            }
        }

        rushdb.updateRushee(rusheeID, rushee, function (err) {
            if (err !== null && err !== undefined) {
                console.log(err);
                res.redirect('/rushee/edit'); //TODO error page
            } else {
                res.redirect('/rushee/view?rID=' + rusheeID);
            }
        });
    });

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
