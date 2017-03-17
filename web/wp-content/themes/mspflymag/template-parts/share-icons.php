<?php
/**
 * Template part for share icons
 */

?>
<?php
$mspurl = get_permalink();
$msptitle = get_the_title();

$twitterURL = 'https://twitter.com/intent/tweet?text='.$msptitle.'&amp;url='.$mspurl;

$facebookURL = 'https://www.facebook.com/sharer/sharer.php?u='.$mspurl;

$linkedInURL = 'https://www.linkedin.com/shareArticle?mini=true&url='.$mspurl.'&amp;title='.$msptitle;
?>

<a class="share-icon" href="<?php echo $facebookURL ?>" title="Facebook" rel="nofollow" target="_blank">
 <svg xmlns="http://www.w3.org/2000/svg" data-name="Facebook" viewBox="0 0 113.6 218.8"><title>Facebook</title><path d="M73.7 218.8V119h33.5l5-38.9H73.7V55.3C73.7 44 76.8 36.4 93 36.4h20.6V1.5A272.2 272.2 0 0 0 83.6 0c-29.7 0-50 18.1-50 51.4V80.1H0V119H33.6v99.8Z"/></svg>
</a>

<a class="share-icon" href="<?php echo $twitterURL ?>" title="Twitter" rel="nofollow" target="_blank">
  <svg xmlns="http://www.w3.org/2000/svg" id="svg3626" viewBox="0 0 300 244.2"><title>  Twitter</title><g id="layer1"><path id="path3611" d="M94.7 243.2c112.5 0 174-93.2 174-174q0-4-0.2-7.9A124.3 124.3 0 0 0 299 29.7a121.9 121.9 0 0 1-35.1 9.6A61.4 61.4 0 0 0 290.8 5.5 122.6 122.6 0 0 1 252 20.3 61.2 61.2 0 0 0 147.8 76.1a173.6 173.6 0 0 1-126-63.9A61.2 61.2 0 0 0 40.7 93.8 60.7 60.7 0 0 1 13 86.2c0 0.3 0 0.5 0 0.8A61.2 61.2 0 0 0 62 146.9a61 61 0 0 1-27.6 1A61.2 61.2 0 0 0 91.5 190.4a122.7 122.7 0 0 1-75.9 26.2A124.2 124.2 0 0 1 1 215.7a173.1 173.1 0 0 0 93.7 27.5"/></g></svg>
</a>

<a class="share-icon" href="<?php echo $linkedInURL ?>" title="LinkedIn" rel="nofollow" target="_blank">
  <svg id="LinkedIn" data-name="LinkedIn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 19"><title>LinkedIn</title><rect y="5" width="4" height="14"/><path d="M13.5,5C10.7,5,10.2,6,10,7V5H6V19h4V11a1.8,1.8,0,0,1,2-2,1.8,1.8,0,0,1,2,2v8h4V12C18,8,17.5,5,13.5,5Z"/><circle cx="2" cy="2" r="2"/></svg>
</a>
