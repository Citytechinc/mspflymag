<?php
/**
 * The main template file
 *
 * This is the most generic template file in a WordPress theme
 * and one of the two required files for a theme (the other being style.css).
 * It is used to display a page when nothing more specific matches a query.
 * e.g., it puts together the home page when no home.php file exists.
 *
 * Learn more: {@link https://codex.wordpress.org/Template_Hierarchy}
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

get_header(); ?>


<img width="214" height="100" src="<?php echo get_template_directory_uri(); ?>/assets/images/logo.svgz" class="float-center hide-for-tablet" id="home-page-logo" alt="MSP Fly Mag Logo">

<div id="page" role="main">
	<article class="main-content">
	<?php if ( have_posts() ) : ?>
        <div class="row small-up-1 medium-up-2 large-up-3 content-grid-container" id="content-grid-container" data-equalizer data-equalize-on="medium" data-equalize-by-row="true">
            <?php /* Start the Loop */ ?>
            <?php while ( have_posts() ) : the_post(); ?>
                <?php get_template_part( 'template-parts/content', get_post_format() ); ?>
            <?php endwhile; ?> 
            <?php else : ?>
                <?php get_template_part( 'template-parts/content', 'none' ); ?>
        </div>
    <?php endif; // End have_posts() check. ?>
	</article>
	<?php //get_sidebar(); ?>

</div>

<?php get_footer(); 
