<?php
/**
 * The template for displaying archive pages
 *
 * Used to display archive-type pages if nothing more specific matches a query.
 * For example, puts together date-based pages if no date.php file exists.
 *
 * If you'd like to further customize these archive views, you may create a
 * new template file for each one. For example, tag.php (Tag archives),
 * category.php (Category archives), author.php (Author archives), etc.
 *
 * @link https://codex.wordpress.org/Template_Hierarchy
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

get_header(); ?>

<div id="page" role="main">
	<article class="main-content">
        <header>
            <h1 class="entry-title text-center"><?php _e( 'Search Results for', 'foundationpress' ); ?> "<?php echo get_search_query(); ?>"</h1>
        </header>
	<?php if ( have_posts() ) : ?>
        <div class="row small-up-1 medium-up-2 large-up-3 content-grid-container" id="content-grid-container" data-equalizer data-equalize-on="medium" data-equalize-by-row="true">
            <?php /* Start the Loop */ ?>
            <?php while ( have_posts() ) : the_post(); ?>
                <div class="column">
                    <?php get_template_part( 'template-parts/content', get_post_format() ); ?>
                </div>
            <?php endwhile; ?>

            <?php else : ?>
                <?php get_template_part( 'template-parts/content', 'none' ); ?>

            <?php endif; // End have_posts() check. ?>

        </div>
        <?php /* Display navigation to next/previous pages when applicable */ ?>
		<?php if ( function_exists( 'foundationpress_pagination' ) ) { foundationpress_pagination(); } else if ( is_paged() ) { ?>
			<nav id="post-nav">
				<div class="post-previous"><?php next_posts_link( __( '&larr; Older posts', 'foundationpress' ) ); ?></div>
				<div class="post-next"><?php previous_posts_link( __( 'Newer posts &rarr;', 'foundationpress' ) ); ?></div>
			</nav>
		<?php } ?>
	</article>
	<?php get_sidebar(); ?>

</div>

<?php get_footer();

