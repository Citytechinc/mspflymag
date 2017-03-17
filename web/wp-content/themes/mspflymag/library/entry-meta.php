<?php
/**
 * Entry meta information for posts
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

if ( ! function_exists( 'foundationpress_entry_meta' ) ) :
	function foundationpress_entry_meta() {
		echo '<time class="updated" datetime="' . get_the_time( 'c' ) . '"><h4>' . sprintf( __( '%1$s', 'foundationpress' ), get_the_date(), get_the_time() ) . '</h4></time>';
	}
endif;
