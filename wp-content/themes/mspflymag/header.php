<?php
/**
 * The template for displaying the header
 *
 * Displays all of the head element and everything up until the "container" div.
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

?>
<!doctype html>
<html class="no-js" <?php language_attributes(); ?> >
	<head>
		<meta charset="<?php bloginfo( 'charset' ); ?>" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://fonts.googleapis.com/css?family=Oswald" rel="stylesheet">
		<?php wp_head(); ?>
	</head>
	<body <?php body_class(); ?>>
	<?php do_action( 'foundationpress_after_body' ); ?>

	<?php if ( get_theme_mod( 'wpt_mobile_menu_layout' ) == 'offcanvas' ) : ?>
	<div class="off-canvas-wrapper">
		<div class="off-canvas-wrapper-inner" data-off-canvas-wrapper>
		<?php get_template_part( 'template-parts/mobile-off-canvas' ); ?>
	<?php endif; ?>

	<?php do_action( 'foundationpress_layout_start' ); ?>

	<header id="masthead" class="site-header" role="banner">
<!--      Mobile menu-->
        <div class="title-bar-container hide-for-tablet" data-sticky-container>
            <div class="sticky" data-sticky data-options="anchor-top: page; marginTop: 0; stickyOn: small;" style="width:100%; z-index:2">
                <div class="title-bar" data-responsive-toggle="site-navigation" data-hide-for="tablet">
                    <button class="menu-icon" type="button" data-toggle="mobile-menu--container main-content--container"></button>
                    <div class="title-bar-title">
                        <a href="<?php echo esc_url( home_url( '/' ) ); ?>" alt="MSP Fly Mag Home" rel="home"><img class="mobile-logo" src="<?php echo get_template_directory_uri(); ?>/assets/images/logo-mobile.png" width="67" height="37"></a>
                    </div>
                </div>
            </div>
            <div class="mobile-menu--container" id="mobile-menu--container" data-toggler=".is-open" >
                <?php get_search_form(); ?>
                <?php get_template_part( 'template-parts/mobile-top-bar' ); //pull in nav class=vertical menu ?>
                <?php //follow fly placeholder ?>
                <?php mailchimpSF_signup_form(); ?>
            </div>
        </div>
        
        
<!--      Full size menu-->
		<nav id="site-navigation" class="main-navigation top-bar" role="navigation">
			<div class="top-bar-left text-center">
				<ul class="menu">
					<?php the_custom_logo(); ?>
				</ul>
			</div>
			<div class="top-bar-right">
				<?php foundationpress_top_bar_r(); ?>

				
			</div>
		</nav>
           
	</header>

	<section class="container" id="main-content--container" data-toggler=".show-for-sr">
		<?php do_action( 'foundationpress_after_header' );
