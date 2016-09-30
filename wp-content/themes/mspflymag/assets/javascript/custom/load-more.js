jQuery(function($){
	Foundation.reInit('equalizer');
    if ($('#content-grid-container').length) { //are we even on a page with infinite scroll?
        //hide existing pager
        $(".pagination-centered").hide();
        $('#content-grid-container').append( '<span class="load-more"></span>' );
        //$( '#content-grid-container' ).foundation(); //initialize equalizer the first time

        //Reinitialize equalizer on every ajax call
        $( document ).ajaxComplete( function() {
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
                            //We need to recalculate the height of the element the stickied item is stuck to. Without this the menu unsticks prematurely because we've increased the height of the page.
                            $('.sticky').foundation('_calc', true);
                            //$( '#content-grid-container' ).foundation();
                            if( !res.data ) {
                                allDone = true;
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
    }	
});