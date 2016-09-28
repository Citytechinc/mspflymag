<?php
/**
 * Template part for utility bar
 */

?>

<div id="follow-search-bar--wrapper" class="show-for-tablet dark-form">
	<section id="follow-search-bar" class="row tablet-12 small-centered">
		<div id="follow-fly--wrapper" class="medium-6 large-5 medium-offset-3 large-offset-4 columns">
			<button id="follow-fly--button" data-toggle="follow-fly-form--wrapper follow-fly--button" data-toggler=".hide"><img class="follow-flyicon" src="<?php echo get_template_directory_uri(); ?>/assets/images/icons/follow-fly-icon-white.png" width="22" height="22"><span class="follow-fly-icon">Follow Fly</span></button>
			<div id="follow-fly-form--wrapper" class="hide" data-toggler=".hide">
				<?php mailchimpSF_signup_form(); ?>
			</div>
		</div>

		<div id="search-form--wrapper" class="medium-3 columns">
			<?php get_search_form(); ?>
		</div>
	</section>
</div>
