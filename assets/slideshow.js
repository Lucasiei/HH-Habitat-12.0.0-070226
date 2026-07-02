/**
 *  @class
 *  @function SlideShow
 */

if (!customElements.get('slide-show')) {
  class SlideShow extends HTMLElement {
    connectedCallback() {
      requestAnimationFrame(() => this.init());
    }

    disconnectedCallback() {
      // Cancel pending rAFs
      if (this._scrollRAF) cancelAnimationFrame(this._scrollRAF);
      if (this._arrowRAF) cancelAnimationFrame(this._arrowRAF);

      // Remove resize listener
      if (this._resizeHandler) {
        window.removeEventListener('resize', this._resizeHandler);
        this._resizeHandler = null;
      }

      // Kill GSAP timelines
      if (this._animations) {
        this._animations.forEach(tl => { if (tl) tl.kill(); });
        this._animations = null;
      }

      // Revert SplitText
      if (this._splitTexts) {
        this._splitTexts.forEach(st => { if (st) st.revert(); });
        this._splitTexts = null;
      }

      // Destroy Flickity
      if (this._flkty) {
        this._flkty.destroy();
        this._flkty = null;
      }

      delete this.dataset.initiated;
    }

    init() {
      if (this._flkty) return;

      const slideshow = this;
      const rightToLeft = document.dir === 'rtl';

      let dots = slideshow.dataset.dots === 'true',
        slideshow_slides = Array.from(slideshow.querySelectorAll('.carousel__slide')),
        autoplay = slideshow.dataset.autoplay == 'false' ? false : parseInt(slideshow.dataset.autoplay, 10),
        align = slideshow.dataset.align == 'center' ? 'center' : 'left',
        fade = slideshow.dataset.fade == 'true',
        prev_button = slideshow.querySelector('.flickity-prev'),
        next_button = slideshow.querySelector('.flickity-next');

      // Fix RTL cellAlign
      let cell_align = align;
      if (align === 'left' && rightToLeft) {
        cell_align = 'right';
      } else if (align === 'right' && !rightToLeft) {
        cell_align = 'left';
      }

      // Cache classList checks
      const isImageTextImage = slideshow.classList.contains('image-with-text-slideshow__image');
      const isImageTextContent = slideshow.classList.contains('image-with-text-slideshow__content');
      const isMainSlideshow = slideshow.classList.contains('main-slideshow');
      const isProducts = slideshow.classList.contains('products');
      const isCollectionGrid = slideshow.classList.contains('collection-grid__carousel');
      const isTestimonials = slideshow.classList.contains('testimonials__carousel');

      const args = {
        wrapAround: true,
        cellAlign: cell_align,
        pageDots: dots,
        contain: true,
        fade: fade,
        autoPlay: autoplay,
        rightToLeft: rightToLeft,
        prevNextButtons: false,
        cellSelector: '.carousel__slide',
        on: {}
      };

      // Section-specific configs
      if (isImageTextImage) {
        let main_slideshow = slideshow.parentNode.querySelector('.image-with-text-slideshow__content');
        args.draggable = false;
        args.asNavFor = main_slideshow;
      }

      if (isImageTextContent) {
        args.adaptiveHeight = true;
      }

      if (isTestimonials) {
        args.adaptiveHeight = true;
        args.on.ready = function () {
          window.dispatchEvent(new Event('resize'));
        };
      }

      if (isCollectionGrid) {
        args.wrapAround = true;

        if (document.body.classList.contains('animations-true') && typeof gsap !== 'undefined') {
          // Cache DOM references once
          let gridSlides = [];
          args.on.ready = (function (existingReady) {
            return function () {
              this.slides.forEach(function (the_slide) {
                let slide = the_slide.cells[0].element;
                gridSlides.push({
                  slide: slide,
                  inner: slide.querySelector('.collection-card--inner'),
                  link: slide.querySelector('.collection-card__link')
                });
              });
              if (existingReady) existingReady.call(this);
            };
          })(args.on.ready);

          args.on.scroll = function (progress) {
            if (slideshow._scrollRAF) cancelAnimationFrame(slideshow._scrollRAF);
            slideshow._scrollRAF = requestAnimationFrame(function () {
              let extra_window_space = slideshow.getBoundingClientRect().left;

              for (let i = 0; i < gridSlides.length; i++) {
                let data = gridSlides[i],
                  slide_offset = data.slide.getBoundingClientRect().left,
                  diff = slide_offset - extra_window_space;

                if (diff < 0) {
                  let scale_amount = Math.max(0, 1 + (diff / 1200)),
                    opacity_amount = Math.max(0, 1 + (diff / 200)),
                    translateX_amount = -diff,
                    rotate_amount = -(diff / 10),
                    zindex = (diff + 5 < 0) ? 5 : 10;

                  data.slide.style.zIndex = zindex;
                  if (data.inner) {
                    data.inner.style.transform = 'perspective(1000px) translateX(' + translateX_amount + 'px) rotateY(' + rotate_amount + 'deg)';
                    data.inner.style.opacity = opacity_amount;
                  }
                  if (data.link) {
                    data.link.style.transform = 'scale(' + scale_amount + ')';
                  }
                } else {
                  data.slide.style.zIndex = 10;
                  if (data.inner) {
                    data.inner.style.transform = '';
                    data.inner.style.opacity = '';
                  }
                  if (data.link) {
                    data.link.style.transform = '';
                  }
                }
              }
            });
          };
        }
      }

      if (isMainSlideshow) {
        if (slideshow.classList.contains('desktop-height-image') || slideshow.classList.contains('mobile-height-image')) {
          args.adaptiveHeight = true;
        }

        this._animations = [];
        this._splitTexts = [];

        if (document.body.classList.contains('animations-true') && typeof gsap !== 'undefined') {
          slideshow.prepareAnimations(slideshow);
          args.on.ready = function () {
            slideshow.animateSlides(0, slideshow);
          };
          args.on.change = function (index) {
            let previousIndex = fizzyUIUtils.modulo(this.selectedIndex - 1, this.slides.length);
            slideshow.animateReverse(previousIndex);
            slideshow.animateSlides(index, slideshow);
          };
        }
      }

      if (isProducts) {
        args.wrapAround = false;

        args.on.ready = function () {
          var flickity = this;
          slideshow._resizeHandler = function () {
            if (slideshow._arrowRAF) cancelAnimationFrame(slideshow._arrowRAF);
            slideshow._arrowRAF = requestAnimationFrame(() => {
              slideshow.centerArrows(flickity, prev_button, next_button);
            });
          };
          window.addEventListener('resize', slideshow._resizeHandler);
          slideshow.centerArrows(flickity, prev_button, next_button);
          slideshow.updateArrowVisibility(prev_button, next_button, 0);
        };

        args.on.scroll = function (progress) {
          slideshow.updateArrowVisibility(prev_button, next_button, progress);
        };
      }

      // Non-wrapping carousels: hide arrows at bounds
      if (!args.wrapAround && !isProducts) {
        args.on.scroll = (function (existingScroll) {
          return function (progress) {
            slideshow.updateArrowVisibility(prev_button, next_button, progress);
            if (existingScroll) existingScroll.call(this, progress);
          };
        })(args.on.scroll);

        args.on.ready = (function (existingReady) {
          return function () {
            slideshow.updateArrowVisibility(prev_button, next_button, 0);
            if (existingReady) existingReady.call(this);
          };
        })(args.on.ready);
      }

      this._flkty = new Flickity(slideshow, args);
      slideshow.dataset.initiated = true;

      if (prev_button) {
        prev_button.addEventListener('click', () => { this._flkty.previous(); });
        prev_button.addEventListener('keyup', () => { this._flkty.previous(); });
        next_button.addEventListener('click', () => { this._flkty.next(); });
        next_button.addEventListener('keyup', () => { this._flkty.next(); });
      }

      if (Shopify.designMode) {
        slideshow.addEventListener('shopify:block:select', (event) => {
          let index = slideshow_slides.indexOf(event.target);
          this._flkty.select(index);
        });
      }
    }

    updateArrowVisibility(prev_button, next_button, progress) {
      if (!prev_button || !next_button) return;

      prev_button.classList.toggle('hide-arrow', progress <= 0);
      next_button.classList.toggle('hide-arrow', progress >= 1);
    }

    prepareAnimations(slideshow) {
      if (slideshow.dataset.animationsReady) return;

      document.fonts.ready.then(() => {
        let splitText = new SplitText(slideshow.querySelectorAll('h1, p:not(.subheading)'), {
          type: 'lines, words',
          linesClass: 'line-child'
        });
        this._splitTexts.push(splitText);

        slideshow.querySelectorAll('.slideshow__slide').forEach((item, i) => {
          let tl = gsap.timeline({ paused: true }),
            button_offset = 0;

          this._animations[i] = tl;

          tl.to(item.querySelector('.slideshow__slide-content'), {
            duration: 0,
            autoAlpha: 1
          });

          if (item.querySelector('.subheading')) {
            tl.fromTo(item.querySelector('.subheading'), {
              opacity: 0
            }, {
              duration: 0.5,
              opacity: 0.6
            }, 0);
            button_offset += 0.5;
          }

          if (item.querySelector('h1')) {
            let h1_duration = 0.5 + ((item.querySelectorAll('h1 .line-child div').length - 1) * 0.05);
            tl.from(item.querySelectorAll('h1 .line-child div'), {
              duration: h1_duration,
              yPercent: '100',
              stagger: 0.05
            }, 0);
            button_offset += h1_duration;
          }

          if (item.querySelector('p:not(.subheading)')) {
            let p_duration = 0.5 + ((item.querySelectorAll('p:not(.subheading) .line-child div').length - 1) * 0.02);
            tl.from(item.querySelectorAll('p:not(.subheading) .line-child div'), {
              duration: p_duration,
              yPercent: '100',
              stagger: 0.02
            }, 0);
            button_offset += p_duration;
          }

          if (item.querySelectorAll('.button').length) {
            tl.fromTo(item.querySelectorAll('.button'), {
              opacity: 0
            }, {
              duration: 0.5,
              opacity: 1,
              stagger: 0.05
            }, '-=0.4');
          }
        });
      });

      slideshow.dataset.animationsReady = true;
    }

    animateSlides(i, slideshow) {
      let flkty = Flickity.data(slideshow);
      document.fonts.ready.then(() => {
        if (this._animations && this._animations[i]) {
          this._animations[i].restart();
        }
      });
    }

    animateReverse(i) {
      if (this._animations && this._animations[i]) {
        this._animations[i].reverse();
      }
    }

    centerArrows(flickity, prev_button, next_button) {
      if (!flickity.cells || !flickity.cells.length) return;

      let first_cell = flickity.cells[0],
        featured_image = first_cell.element.querySelector('.product-featured-image');

      if (!featured_image) return;

      let max_height = 0,
        image_height = featured_image.clientHeight;

      flickity.cells.forEach((item) => {
        if (item.size.height > max_height) {
          max_height = item.size.height;
        }
      });

      if (max_height > image_height) {
        let difference = (max_height - image_height) / -2;

        if (prev_button) {
          prev_button.style.transform = 'translateY(' + difference + 'px)';
        }
        if (next_button) {
          next_button.style.transform = 'translateY(' + difference + 'px)';
        }
      }
    }
  }
  customElements.define('slide-show', SlideShow);
}
