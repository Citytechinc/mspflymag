<?php
/**
 * Template part for utility bar
 */

?>

<div id="follow-search-bar--wrapper" class="show-for-tablet dark-form">
	<section id="follow-search-bar" class="row tablet-12 small-centered">
		<div id="follow-fly--wrapper" class="medium-6 large-5 medium-offset-3 large-offset-4 columns">
			<button id="follow-fly--button" data-toggle="follow-fly-form--wrapper follow-fly--button" data-toggler=".hide"><span class="follow-fly-icon">Follow Fly</span></button>
			<div id="follow-fly-form--wrapper" class="hide" data-toggler=".hide">
        <?php echo do_shortcode('[mc4wp_form id="2624"]'); ?>
			</div>
		</div>

		<div id="search-form--wrapper" class="medium-3 columns">
			<?php get_search_form(); ?>
		</div>
	</section>
</div>
