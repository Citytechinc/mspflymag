<?php
/**
 * The default template for displaying content
 *
 * Used for both single and index/archive/search.
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

?>


<div id="post-<?php the_ID(); ?>" <?php post_class('blogpost-entry'); ?> data-equalizer-watch>
    <a href="<?php the_permalink(); ?>">
        <?php the_post_thumbnail(); ?>
        <header>
            <h2><?php the_title(); ?></h2>
            <?php //foundationpress_entry_meta(); Don't need author or date right now ?>
        </header>
        <div class="entry-content">

            <?php echo get_excerpt(100) //the_excerpt() //the_content( '', TRUE ); //get_excerpt(380); ?>
        </div>
        <footer>
            <?php $tag = get_the_tags(); if ( $tag ) { ?><p><?php the_tags(); ?></p><?php } ?>
        </footer>
        <hr />
    </a>
</div>


<?php// the_content( /*__( 'Continue reading...', 'foundationpress' )*/ ); ?>