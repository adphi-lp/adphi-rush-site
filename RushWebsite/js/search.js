function search() {
	var query = document.getElementById('search-bar');
	window.location = buildURL('/search', {'q' : query.value});
}

function buildURL(url, parameters) {
	var qs = '';
	for (var key in parameters) {
		var value = parameters[key];
		qs += encodeURIComponent(key) + '=' + encodeURIComponent(value) + '&';
	}
	if (qs.length > 0) {
		qs = qs.substring(0, qs.length - 1);
		//chop off last '&'
		url = url + '?' + qs;
	}
	return url;
}

function validateForm(form) {
	return (form['search-text'].value != '');
}

$(document).on('submit', '.search-form', function(){
	return validateForm(this);
});