<?php
/**
 * Template for displaying a Photo Carousel
 *
 * Used on single posts.
 *
 */

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
                <img src="<?php echo $image['sizes']['large']; ?>" alt="<?php echo $image['alt']; ?>" />
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