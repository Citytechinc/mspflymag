$('.photo-carousel-slides').slick({
  slide: 'li',
  slidesToShow: 1,
  slidesToScroll: 1,
  arrows: false,
  fade: true,
  asNavFor: '.photo-carousel-controls'
});

$('.photo-carousel-controls').slick({
  slide: 'li',
  slidesToShow: 7,
  slidesToScroll: 1,
  asNavFor: '.photo-carousel-slides',
  arrows: false,
  dots: false,
  centerMode: false,
  focusOnSelect: true
});