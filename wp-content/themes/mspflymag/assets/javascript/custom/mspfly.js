//General site-wide scripts for MSP Fly Mag

$('.mc_input').attr("placeholder", "Enter your email address");

if(window.location.href.indexOf("#mc_signup") > -1) {
	setTimeout(function(){ 
		var shareContainer = $('#share-follow');
		var sharePosition = shareContainer.offset().top;
		$("html, body").animate({ scrollTop: sharePosition-40}, 500);
	 }, 500);

	
}