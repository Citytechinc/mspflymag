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

//Auto submit search form when selecting solr suggestions
$( "#s" ).change(function() {
  $( ".ac_results li" ).click(function() {
    $( "#searchsubmit" ).click();
  });
});


//Validate comment forms
if ( $( '#commentform' ).length ) {
  $('#commentform').validate({
      rules: {
        author: {
          required: true,
          minlength: 2
        },		 
        email: {
          required: true,
          email: true
        },
        comment: {
          required: true,
          minlength: 2
        }
      },		 
      messages: {
        author: "Please enter your name",
        email: "Please enter a valid email address",
        comment: "Please type your comment"
      },		 
      errorElement: "div",
      errorPlacement: function(error, element) {
        element.after(error);
      }	 
  });
}