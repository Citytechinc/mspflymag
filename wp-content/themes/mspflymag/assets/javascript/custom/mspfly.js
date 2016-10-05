//General site-wide scripts for MSP Fly Mag

$('.mc_input').attr("placeholder", "Enter your email address");

if(window.location.href.indexOf("#mc_signup") > -1) {
	setTimeout(function(){ 
		var shareContainer = $('#share-follow');
		var sharePosition = shareContainer.offset().top;
		$("html, body").animate({ scrollTop: sharePosition-40}, 500);
	 }, 500);
}

//Hide mobile topbar logo until we scroll down page
$('.home .mobile-logo').addClass('hide'); //TODO move to template to avoid flashing
$('.sticky').on('sticky.zf.stuckto:top', function () {
    $('.home .mobile-logo').removeClass('hide');
}).on('sticky.zf.unstuckfrom:top', function () {
    $('.home .mobile-logo').addClass('hide');
});


//Move follow fly mobile form into view on focus
//$( '#follow-fly--container #mc_mv_EMAIL' ).focusin( function() {
//  $( this ).addClass( " bottom-margin " );
//});
//
//$( '#follow-fly--container #mc_mv_EMAIL' ).focusout( function() {
//  $( this ).removeClass( " bottom-margin " );
//});