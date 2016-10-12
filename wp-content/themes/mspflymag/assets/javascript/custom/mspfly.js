/* General site-wide scripts for MSP Fly Mag */

$('.mc_input').attr("placeholder", "Enter your email address");

//Some pages don't get equalized, so make sure they do
Foundation.reInit('equalizer');

//Activate polyfill for Object Fit on IE/Edge
objectFitImages();

//Hide mobile topbar logo until we scroll down page
if ( $( '.home' ).length ) {
  $(window).scroll(function(){
		if ($(this).scrollTop() > 148) {
			$('.title-bar-title').fadeIn();
		} else {
			$('.title-bar-title').fadeOut();
		}
	});
}
