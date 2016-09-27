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

    <div class="carousel-container column row tablet-8 small-centered">  
        <?php  get_template_part( 'template-parts/carousel') ?>
    </div>
    
    <article <?php post_class('main-content column row tablet-8 small-centered') ?> id="post-<?php the_ID(); ?>">
      <section>
		<header class="text-center">
			<h1 class="entry-title"><?php the_title(); ?></h1>
			<?php foundationpress_entry_meta(); ?>
            <?php the_category(', ') ?>
            <hr class="text-center">
		</header>
		<?php do_action( 'foundationpress_post_before_entry_content' ); ?>
		<div class="entry-content">
		  <?php the_content(); ?>
		  <?php edit_post_link( __( 'Edit', 'foundationpress' ), '<span class="edit-link">', '</span>' ); ?>
		</div>
      </section>
      <section id="share-follow" class="row" data-equalizer data-equalize-on="tablet" data-equalize-by-row="true">
        <div class="columns tablet-6" id="follow-fly-post" data-equalizer-watch>
            <h3>Follow Fly:</h3>
            <?php mailchimpSF_signup_form(); ?>
        </div>
        <div class="columns tablet-6 text-center" id="share-article" data-equalizer-watch>
            <h3>Share this article:</h3>
            <?php if ( function_exists( 'ADDTOANY_SHARE_SAVE_KIT' ) ) { ADDTOANY_SHARE_SAVE_KIT(); } ?>
        </div>
      </section>
      <section id="related-posts">
				<?php wp_related_posts()?>
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