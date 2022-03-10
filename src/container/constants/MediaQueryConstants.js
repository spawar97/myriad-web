// These values align with `_media-breakpoints.scss` and `util.isMobile`.
//
// To get this format I allow our sass breakpoint library to compile the definitions in the above .scss,
// I grabbed the compiled CSS from the page, and then manually adjusted it.
module.exports = {
  MQ_PHONE: {query: '(min-width: 0px) and (max-width: 767px)'},
  MQ_DESKTOP: {query: '(min-width: 768px)'}
};
