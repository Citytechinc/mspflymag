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

<div class="column">
    <div id="post-<?php the_ID(); ?>" <?php post_class('blogpost-entry'); ?> data-equalizer-watch>
        <a href="<?php the_permalink(); ?>">     
            <div class="thumbnail-container">
            <?php the_post_thumbnail(); ?>
        </div>

            <header>
                <h2><?php the_title(); ?></h2>
            </header>
            <div class="entry-content">
                <?php echo get_excerpt(100); ?>
            </div>
        </a>
    </div>
</div>