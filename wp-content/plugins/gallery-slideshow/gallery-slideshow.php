<?php
/*
Plugin Name: Gallery <-> Slideshow
Description: Turn any WordPress gallery into a slideshow using the "gss" shortcode.
Version: 1.3.2
Author: Jethin
Author URI: http://s89693915.onlinehome.us/wp/?page_id=4
License: GPL2
*/

class gallery_ss{
    static function init() {
        add_shortcode( 'gss', array(__CLASS__, 'gss_shortcode') );
        add_action( 'wp_enqueue_scripts', array(__CLASS__, 'gss_register_scripts') );
    }

    static function gss_shortcode($atts) { 
		wp_enqueue_script( 'cycle2' );
		wp_enqueue_script( 'cycle2_center' );
		wp_enqueue_script( 'cycle2_carousel' );
		wp_enqueue_script( 'gss_js' );
		wp_enqueue_style( 'gss_css' );
		$custom_js = plugin_dir_path( __FILE__ ) . 'gss-custom.js';
		if ( file_exists($custom_js) ) {
			wp_register_script( 'gss-custom-js', plugins_url( 'gss-custom.js' , __FILE__ ) );
			wp_enqueue_script( 'gss-custom-js' );
		}
		extract( shortcode_atts( array( 'ids' => '', 'name' => 'gslideshow', 'style' => '', 'options' => '', 'carousel' => '' ), $atts ) );
        if ( !function_exists('gss_html_output') ) {
			require 'gss_html.php';
		}
		$output = gss_html_output($ids,$name,$style,$options,$carousel);
        return $output;
    }

    static function gss_register_scripts() {
        wp_register_script( 'cycle2', plugins_url( 'jquery.cycle2.min.js' , __FILE__ ), array('jquery'), '2.1.3' );
		wp_register_script( 'cycle2_center', plugins_url( 'jquery.cycle2.center.min.js' , __FILE__ ), array('cycle2'), 'v20140128' );
		wp_register_script( 'cycle2_carousel', plugins_url( 'jquery.cycle2.carousel.min.js' , __FILE__ ), array('cycle2'), 'v20140114' );
		wp_register_script( 'gss_js', plugins_url( 'gss.js', __FILE__ ) );
		wp_register_style( 'gss_css', plugins_url( 'gss.css', __FILE__ ) );
    }
}

gallery_ss::init();

function gss_embed_metadata( $post_id ){
	if ( wp_is_post_revision( $post_id ) ){ return; }
	$post_object = get_post( $post_id );
	$pattern = get_shortcode_regex();
    if ( preg_match_all( '/'. $pattern .'/s', $post_object->post_content, $matches )
	  && array_key_exists( 2, $matches )
	  && in_array( 'gss', $matches[2] ) ){
		// print_r($matches);
		foreach( $matches[2] as $k => $sc_name ){ 
			if( $sc_name == 'gss' ){
				$atts_string =  $matches[3][$k];
				$atts_string = trim( $atts_string );
				$atts = shortcode_parse_atts( $atts_string );
				$name = 'gss_' . $post_id;
				$name .= empty($atts['name']) ? '' : '_' . $atts['name'];
				// extract( shortcode_atts( array( 'ids' => '', 'name' => 'gslideshow', 'style' => '', 'options' => '', $carousel ), $atts ) );
				update_post_meta($post_id, $name, $atts_string);
			}
		}
    }
	// if( has_shortcode( $post_object->post_content, 'gss' ) ) { }
}
add_action( 'save_post', 'gss_embed_metadata' );


function gss_gallery_sc_filter( $output = '', $atts ) {
	$return = $output; // fallback
	
	if( !empty($atts['gss']) ){

		// retrieve content of your own gallery function
		$gss_output = gallery_ss::gss_shortcode($atts);
	
		if( !empty( $gss_output ) ) {
			$return = $gss_output;
		}
	
	}

	return $return;
}

add_filter( 'post_gallery', 'gss_gallery_sc_filter', 10, 3 );


function gss_gallery_setting(){
  // define your backbone template;
  // the "tmpl-" prefix is required,
  // and your input field should have a data-setting attribute
  // matching the shortcode name
  ?>
  <script type="text/html" id="tmpl-gss-setting">
    <label class="setting">
      <span><?php _e('GSS Slideshow'); ?></span>
      <select data-setting="gss">
        <option value="0">No</option>
        <option value="1">Yes</option>
      </select>
    </label>
  </script>

  <script>

    jQuery(document).ready(function(){

      // add your shortcode attribute and its default value to the
      // gallery settings list; $.extend should work as well...
      _.extend(wp.media.gallery.defaults, {
        gss: '0'
      });

      // merge default gallery settings template with yours
      wp.media.view.Settings.Gallery = wp.media.view.Settings.Gallery.extend({
        template: function(view){
          return wp.media.template('gallery-settings')(view)
               + wp.media.template('gss-setting')(view);
        }
      });

    });

  </script>
<?php

}

add_action( 'print_media_templates', 'gss_gallery_setting' );

?>