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
	<article <?php post_class('main-content') ?> id="post-<?php the_ID(); ?>">
		<header>
			<h1 class="entry-title"><?php the_title(); ?></h1>
			<?php foundationpress_entry_meta(); ?>
		</header>
		<?php do_action( 'foundationpress_post_before_entry_content' ); ?>
		<div class="entry-content">

		<?php
			/*
			if ( has_post_thumbnail() ) :
				the_post_thumbnail();
			endif;
			*/
		?>


		<?php 
		/********************* PHOTO CAROUSEL *********************/
		?>
		<?php 
			$images = get_field('photo_gallery');
			if( $images ): 
		?>
		<div class="photo-carousel">
		    <ul class="photo-carousel-slides">
		        <?php foreach( $images as $image ): ?>
		            <li>
		                <?php
		                /*
		                <a href="<?php echo $image['url']; ?>">
		                	<p><?php echo $image['caption']; ?></p>
		            	</a>
		            	*/
		            	?>
		                <img src="<?php echo $image['sizes']['thumbnail']; ?>" alt="<?php echo $image['alt']; ?>" />
		                
		            </li>
		        <?php endforeach; ?>
		    </ul>

		    <ul class="photo-carousel-controls">
		        <?php foreach( $images as $image ): ?>
		            <li>
		             	<img src="<?php echo $image['sizes']['thumbnail']; ?>" alt="<?php echo $image['alt']; ?>" />
		             	<div class="dot"></div>
		            </li>
		        <?php endforeach; ?>
		    </ul>
		</div>
		<?php endif; ?>


		<?php the_content(); ?>

		
		<?php edit_post_link( __( 'Edit', 'foundationpress' ), '<span class="edit-link">', '</span>' ); ?>
		</div>
		<footer>
			<?php wp_link_pages( array('before' => '<nav id="page-nav"><p>' . __( 'Pages:', 'foundationpress' ), 'after' => '</p></nav>' ) ); ?>
			<p><?php the_tags(); ?></p>
		</footer>
		<?php the_post_navigation(); ?>
		<?php do_action( 'foundationpress_post_before_comments' ); ?>
		<?php comments_template(); ?>
		<?php do_action( 'foundationpress_post_after_comments' ); ?>
	</article>
<?php endwhile;?>

<?php do_action( 'foundationpress_after_content' ); ?>
<?php get_sidebar(); ?>
</div>
<?php get_footer();
