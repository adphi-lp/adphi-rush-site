// execute script only when DOM has finished loading
$(document).ready(function() {
	$('.spoiler-content').hide();
	$('.spoiler-button').click(function() {
		var spoiler = this.parentNode.childNodes[2].style;
		if(spoiler.display=='none') {
			spoiler.display = ''; 
		} else {
			spoiler.display = 'none';
		}
		
		// stop browser from following the link
		return false;
	});
});