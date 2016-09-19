<?php
/**
 * Author: Ole Fredrik Lie
 * URL: http://olefredrik.com
 *
 * FoundationPress functions and definitions
 *
 * Set up the theme and provides some helper functions, which are used in the
 * theme as custom template tags. Others are attached to action and filter
 * hooks in WordPress to change core functionality.
 *
 * @link https://codex.wordpress.org/Theme_Development
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

/** Various clean up functions */
require_once( 'library/cleanup.php' );

/** Required for Foundation to work properly */
require_once( 'library/foundation.php' );

/** Register all navigation menus */
require_once( 'library/navigation.php' );

/** Add menu walkers for top-bar and off-canvas */
require_once( 'library/menu-walkers.php' );

/** Create widget areas in sidebar and footer */
require_once( 'library/widget-areas.php' );

/** Return entry meta information for posts */
require_once( 'library/entry-meta.php' );

/** Enqueue scripts */
require_once( 'library/enqueue-scripts.php' );

/** Add theme support */
require_once( 'library/theme-support.php' );

/** Add Nav Options to Customer */
require_once( 'library/custom-nav.php' );

/** Change WP's sticky post class */
require_once( 'library/sticky-posts.php' );

/** Configure responsive image sizes */
require_once( 'library/responsive-images.php' );

/** If your site requires protocol relative url's for theme assets, uncomment the line below */
// require_once( 'library/protocol-relative-theme-assets.php' );


/*Trim post excerpts*/

//function custom_excerpt_length( $length ) {
//        return 20;
//    }
//add_filter( 'excerpt_length', 'custom_excerpt_length', 999 );

function get_excerpt($limit, $source = null){

    if($source == "content" ? ($excerpt = get_the_content()) : ($excerpt = get_the_excerpt()));
    $excerpt = preg_replace(" (\[.*?\])",'',$excerpt);
    $excerpt = strip_shortcodes($excerpt);
    $excerpt = strip_tags($excerpt);
    $excerpt = substr($excerpt, 0, $limit);
    $excerpt = substr($excerpt, 0, strripos($excerpt, " "));
    $excerpt = trim(preg_replace( '/\s+/', ' ', $excerpt));
    $excerpt = $excerpt.'...';
    return $excerpt;
}

/*
Sample...  Lorem ipsum habitant morbi (26 characters total) 

Returns first three words which is exactly 21 characters including spaces
Example..  echo get_excerpt(21);  
Result...  Lorem ipsum habitant 

Returns same as above, not enough characters in limit to return last word
Example..  echo get_excerpt(24);    
Result...  Lorem ipsum habitant  

Returns all 26 chars of our content, 30 char limit given, only 26 characters needed. 
Example..  echo get_excerpt(30);    
Result...  Lorem ipsum habitant morbi
*/


//Infinite Scroll 

/**
 * Javascript for Load More
 *
 */
function be_load_more_js() {
    if ( is_home() || is_archive() || is_search() ) {
        global $wp_query;
        $args = array(
            'nonce' => wp_create_nonce( 'be-load-more-nonce' ),
            'url'   => admin_url( 'admin-ajax.php' ),
            'query' => $wp_query->query,
        );

        wp_localize_script( 'foundation', 'beloadmore', $args );
    }
}
add_action( 'wp_enqueue_scripts', 'be_load_more_js' );

/**
 * AJAX Load More 
 * @link http://www.billerickson.net/infinite-scroll-in-wordpress
 */
function be_ajax_load_more() {

	check_ajax_referer( 'be-load-more-nonce', 'nonce' );
    
	$args = isset( $_POST['query'] ) ? array_map( 'esc_attr', $_POST['query'] ) : array();
	$args['post_type'] = isset( $args['post_type'] ) ? esc_attr( $args['post_type'] ) : 'post';
	$args['paged'] = esc_attr( $_POST['page'] );
	$args['post_status'] = 'publish';

	ob_start();
	$loop = new WP_Query( $args );
	if( $loop->have_posts() ): while( $loop->have_posts() ): $loop->the_post();
        get_template_part( 'template-parts/content', get_post_format() );
	endwhile; endif; wp_reset_postdata();
	$data = ob_get_clean();
	wp_send_json_success( $data );
	wp_die();
}
add_action( 'wp_ajax_be_ajax_load_more', 'be_ajax_load_more' );
add_action( 'wp_ajax_nopriv_be_ajax_load_more', 'be_ajax_load_more' );

