$(document).ready(() => {
  $('[data-bs-hover-animate]')
    .mouseenter(function () { const elem = $(this); elem.addClass(`animated ${elem.attr('data-bs-hover-animate')}`); })
    .mouseleave(function () { const elem = $(this); elem.removeClass(`animated ${elem.attr('data-bs-hover-animate')}`); });
});
