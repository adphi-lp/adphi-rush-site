var rushdb;
var stats;
var tools;

function setup(env) {
	rushdb = env.rushdb;
	stats = env.stats;
	tools = env.tools;
}

function uri() {
	return '/rushee/history';
}

function authGet(auth) {
	return auth.checkAdminAuth;
}

function get(req, res) {
	var rID = req.query.rID === undefined ? null : rushdb.toObjectID(req.query.rID);
	var bID = req.query.bID === undefined ? null : rushdb.toObjectID(req.query.bID);

	rushdb.get(rushdb.arrange, {}, function(err, info) {
		if (err !== undefined && err !== null) {
			console.log(err);
			res.redirect('/404');
			return;
		}
		// combine the comments, votes, and status histories into one list and sort by time.
		markHistoryType(info.comments, 'comment');
		markHistoryType(info.statuses, 'status');
		markHistoryType(info.votes, 'vote');
		info.fullHistory = mergeLists([info.comments, info.statuses, info.votes]);
		info.fullHistory = tools.filter(info.fullHistory, function(elm){
			return (rID === null || rID === elm.rusheeID) && (bID === null || bID === elm.brotherID);
		});
		res.render('rushee/history.jade', info);
	});
}

function markHistoryType(objects, marker){
	// goes through list of objects objs and marks historyType as string marker
	for(var i = 0; i < objects.length; i++){
		var obj = objects[i];
		obj.historyType = marker;
	}
	return;
}

function mergeLists(lists){
	// takes in list of lists
	// this is inefficient for many lists
	var ret = lists[0];
	for(var i = 1; i < lists.length; i++){
		ret = mergeSort(ret, lists[i]);
	}

	return ret;
}

function mergeSort(list1, list2){
	//assumes a ts prop on each list
	var ret = [];
	var i = 0;
	var j = 0;
	while (i < list1.length && j < list2.length){
		if(list1[i].ts > list2[j].ts){
			ret.push(list1[i]);
			i++;
		}
		else{
			ret.push(list2[j]);
			j++;
		}
	}
	while(i < list1.length){
		ret.push(list1[i]);
		i++;
	}
	while(j < list2.length){
		ret.push(list2[j]);
		j++;
	}
	return ret;
}

module.exports = {
	setup : setup,
	uri : uri(),
	auth : {
		get : authGet,
	},
	get : get,
};
