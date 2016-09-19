jQuery(function($){
    //hide existing pager
    $(".pagination-centered").hide();
	$('#content-grid-container').append( '<span class="load-more"></span>' );
    $( '#content-grid-container' ).foundation(); //initialize equalizer the first time
    
    //Reinitialize equalizer on every ajax call
    $( document ).ajaxComplete( function() {
        //$( '#content-grid-container' ).html(data).foundation().foundation("open"); //Uncaught ReferenceError: data is not defined. And nothing happens.
        
        //$( this ).foundation( 'equalizer', 'reflow' ); //Error: foundation.core.js:281 Uncaught ReferenceError: We're sorry, 'equalizer' is not an available method for this element.
        
        //$( '#content-grid-container' ).foundation(); //Error: Tried to initialize equalizer on an element that already has a Foundation plugin. It equalizes the first time, but subsequent calls error out.
        
        //$( '#content-grid-container' ).html(data).foundation().foundation("open");
        //Foundation.reInit('equalizer'); //error: foundation.core.js:126 ReferenceError: We're sorry, '_init' is not an available method for this element.(…)
        
        //Finally one that works:
        Foundation.reInit('equalizer'); //http://foundation.zurb.com/forum/posts/39363-reflow-equaliser
    });
    
	var button = $('#content-grid-container .load-more');
	var page = 2;
	var loading = false;
    var allDone = false;
	var scrollHandling = {
	    allow: true,
	    reallow: function() {
	        scrollHandling.allow = true;
	    },
	    delay: 400 //(milliseconds) adjust to the highest acceptable value
	};

	$(window).scroll(function(){
		if( ! loading && scrollHandling.allow ) {
            if ( allDone ) {
                return;
            }
            scrollHandling.allow = false;
			setTimeout(scrollHandling.reallow, scrollHandling.delay);
			var offset = $(button).offset().top - $(window).scrollTop();
            if( 4000 > offset ) {
				loading = true;
				var data = {
					action: 'be_ajax_load_more',
					nonce: beloadmore.nonce,
					page: page,
					query: beloadmore.query,
				};
				$.post(beloadmore.url, data, function(res) {
					if( res.success) {
						$('.content-grid-container').append( res.data );
						$('.content-grid-container').append( button );
						page = page + 1;
						loading = false;
                        //$( '#content-grid-container' ).foundation();
                        if( !res.data ) {
                            allDone = true;
                            $('#content-grid-container').after( '<div class="party-over text-center">This is the end of the line</div>' );
                        }
					} else {
                        //console.log(res);
					}
				}).fail(function(xhr, textStatus, e) {
				    //console.log(xhr.responseText);
				});

			}
		}
	});
});