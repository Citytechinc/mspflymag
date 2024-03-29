<?php
/**
 * The template for displaying all single posts and attachments
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

get_header(); ?>

<div id="single-post" role="main">

<?php do_action( 'foundationpress_before_content' ); ?>
<?php while ( have_posts() ) : the_post(); ?>

    <div class="carousel-container column row tablet-8 large-7 small-centered">  
        <?php  get_template_part( 'template-parts/carousel') ?>
    </div>
    
    <article <?php post_class('main-content column row tablet-8 large-7 small-centered') ?> id="post-<?php the_ID(); ?>">
      <section>
				<header class="text-center">
					<h1 class="entry-title"><?php the_title(); ?></h1>
					<?php foundationpress_entry_meta(); ?>
								<?php the_category(', ') ?>
								<hr class="divider">
				</header>
				<?php do_action( 'foundationpress_post_before_entry_content' ); ?>
				<div class="entry-content">
					<?php the_content(); ?>
					<?php edit_post_link( __( 'Edit', 'foundationpress' ), '<span class="edit-link">', '</span>' ); ?>
				</div>
				<div id="related-posts">
					<hr class="divider">
					<?php wp_related_posts()?>
				</div>
      </section>
      <section id="share-follow" class="row text-center" data-equalizer data-equalize-on="tablet" data-equalize-by-row="true">
        <div class="columns tablet-6" id="follow-fly-post" data-equalizer-watch>
            <h3 class="follow-fly-icon">Follow Fly:</h3>
            <?php echo do_shortcode('[mc4wp_form id="2624"]'); ?>
        </div>
        <div class="columns tablet-6" id="share-article" data-equalizer-watch>
            <h3>Share this article:</h3>
            <?php get_template_part( 'template-parts/share-icons' ); ?>
        </div>
      </section>
      <?php do_action( 'foundationpress_post_before_comments' ); ?>
      <?php comments_template(); ?>
      <?php do_action( 'foundationpress_post_after_comments' ); ?>
	</article>
<?php endwhile;?>

<?php do_action( 'foundationpress_after_content' ); ?>
<?php get_sidebar(); ?>
</div>
<?php get_footer();