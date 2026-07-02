if (!customElements.get('variant-selects')) {

  /**
   *  @class
   *  @function VariantSelects
   */
  class VariantSelects extends HTMLElement {
    constructor() {
      super();
      this.sticky = this.dataset.sticky;
      this.isDisabledFeature = this.dataset.isDisabled;
      this.updateUrl = this.dataset.updateUrl === 'true';
      this.addEventListener('change', this.onVariantChange);
      this.other = Array.from(document.querySelectorAll('variant-selects')).filter((selector) => {
        return selector != this;
      });
      this.productWrapper = this.closest('.thb-product-detail');
      this.productSlider = this.productWrapper.querySelector('.product-images');
      this.hideVariants = this.productSlider.dataset.hideVariants === 'true';
      this.prefetchCache = new Map();

      this.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'LABEL') {
          const scrollY = window.scrollY;
          requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'instant' }));
        }
      });
    }

    connectedCallback() {
      this.updateOptions();
      this.updateMasterId();
      this.setDisabled();
      this.setImageSet();
      this.prefetchProductUrls();
    }

    onVariantChange() {
      this.updateOptions();
      this.toggleAddButton(true, '', false);
      this.removeErrorMessage();
      this.updateVariantText();

      this.renderVariantInfo();

      this.updateOther();
      dispatchCustomEvent('product:variant-change', {
        variant: this.currentVariant,
        sectionId: this.dataset.section
      });
    }

    updateOptions() {
      this.fieldsets = Array.from(this.querySelectorAll('fieldset'));
      this.options = [];
      this.fieldsets.forEach((fieldset, i) => {
        if (fieldset.querySelector('select')) {
          this.options.push(fieldset.querySelector('select').value);
        } else if (fieldset.querySelectorAll('input').length) {
          this.options.push(fieldset.querySelector('input:checked').value);
        }
      });
    }
    updateVariantText() {
      const fieldsets = Array.from(this.querySelectorAll('fieldset'));
      fieldsets.forEach((item, i) => {
        let label = item.querySelector('.form__label__value');
        if (label) {
          label.innerHTML = this.options[i];
        }
      });
    }
    updateMasterId() {
      const span = this.querySelector(`#SelectedVariant-${this.dataset.section}`);
      if (!span) return;
      this.currentVariant = {
        id: parseInt(span.dataset.variantId, 10) || null,
        available: span.dataset.available === 'true',
        featured_media: span.dataset.featuredMediaId ? { id: parseInt(span.dataset.featuredMediaId, 10) } : null
      };
    }

    updateOther() {
      if (this.dataset.updateUrl === 'false') {
        return;
      }
      if (this.other.length) {
        let fieldsets = this.other[0].querySelectorAll('fieldset'),
          fieldsets_array = Array.from(fieldsets);
        console.log(fieldsets);
        this.options.forEach((option, i) => {
          if (fieldsets_array[i].querySelector('select')) {
            fieldsets_array[i].querySelector(`select`).value = option;
          } else if (fieldsets_array[i].querySelectorAll('input').length) {
            fieldsets_array[i].querySelector(`input[value="${option}"]`).checked = true;
          }
        });
        this.other[0].updateOptions();
        this.other[0].updateMasterId();
        this.other[0].updateVariantText();
        this.other[0].setDisabled();
      }
    }

    updateMedia() {
      if (!this.currentVariant) return;
      if (!this.currentVariant.featured_media) return;
      if (!this.productSlider) return;
      let mediaId = `#Slide-${this.dataset.section}-${this.currentVariant.featured_media.id}`;
      let activeMedia = this.productSlider.querySelector(mediaId);

      this.setActiveMedia(mediaId, `#Thumb-${this.dataset.section}-${this.currentVariant.featured_media.id}`, this.productSlider);
    }
    setActiveMedia(mediaId, thumbId, productSlider, thumbnails) {
      let flkty = Flickity.data(productSlider),
        activeMedia = productSlider.querySelector(mediaId);

      if (flkty && this.hideVariants) {
        if (productSlider.querySelector('.product-images__slide.is-initial-selected')) {
          productSlider.querySelector('.product-images__slide.is-initial-selected').classList.remove('is-initial-selected');
        }
        [].forEach.call(productSlider.querySelectorAll('.product-images__slide-item--variant'), function (el) {
          el.classList.remove('is-active');
        });
        if (this.thumbnails) {
          if (this.thumbnails.querySelector('.product-thumbnail.is-initial-selected')) {
            this.thumbnails.querySelector('.product-thumbnail.is-initial-selected').classList.remove('is-initial-selected');
          }
          [].forEach.call(this.thumbnails.querySelectorAll('.product-images__slide-item--variant'), function (el) {
            el.classList.remove('is-active');
          });
        }

        activeMedia.classList.add('is-active');
        activeMedia.classList.add('is-initial-selected');

        this.setImageSetMedia();

        if (this.thumbnails) {
          let activeThumb = this.thumbnails.querySelector(thumbId);

          activeThumb.classList.add('is-active');
          activeThumb.classList.add('is-initial-selected');
        }

        productSlider.reInit(this.imageSetIndex);
        productSlider.selectCell(mediaId);

      } else if (flkty) {
        if (this.thumbnails) {
          let currentThumb = this.thumbnails.querySelector('.product-thumbnail.is-initial-selected');
          if (currentThumb) {
            currentThumb.classList.remove('is-initial-selected');
          }
          let activeThumb = this.thumbnails.querySelector(thumbId);
          if (activeThumb) {
            activeThumb.classList.add('is-initial-selected');
          }
        }
        productSlider.selectCell(mediaId);
      }

    }

    updateURL() {
      if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
      window.history.replaceState({}, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
    }

    updateShareUrl() {
      const shareButton = document.getElementById(`Share-${this.dataset.section}`);
      if (!shareButton) return;
      shareButton.updateUrl(`${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`);
    }

    updateVariantInput() {
      const productForms = document.querySelectorAll(`#product-form-${this.dataset.section}, #product-form-installment`);
      productForms.forEach((productForm) => {
        const input = productForm.querySelector('input[name="id"]');
        input.value = this.currentVariant.id;
        input.dispatchEvent(new Event('change', {
          bubbles: true
        }));
      });
    }

    updatePickupAvailability() {
      const pickUpAvailability = document.querySelector('.pickup-availability-wrapper');
      if (!pickUpAvailability) return;
      pickUpAvailability.update(this.currentVariant);
    }

    removeErrorMessage() {
      const section = this.closest('section');
      if (!section) return;

      const productForm = section.querySelector('product-form');
      if (productForm) productForm.handleErrorMessage();
    }

    getSectionsToRender() {
      return [`price-${this.dataset.section}`, `price-${this.dataset.section}--sticky`, `product-image-${this.dataset.section}--sticky`, `inventory-${this.dataset.section}`, `sku-${this.dataset.section}`];
    }

    getSelectedValueIds() {
      return this.fieldsets.map((fieldset) => {
        if (fieldset.querySelector('select')) {
          return fieldset.querySelector('select').selectedOptions[0]?.dataset.valueId;
        }
        return fieldset.querySelector('input:checked')?.dataset.valueId;
      }).filter(Boolean);
    }

    prefetchProductUrls() {
      const sectionId = this.dataset.section;
      const seen = new Set();

      this.querySelectorAll('[data-product-url]').forEach((el) => {
        const url = el.dataset.productUrl;
        if (!url || url === this.dataset.url || seen.has(url)) return;
        seen.add(url);

        const hoverTarget = el.tagName === 'OPTION' ? el.closest('select') : this.querySelector('label[for="' + el.id + '"]');
        if (!hoverTarget) return;

        hoverTarget.addEventListener('mouseenter', () => {
          if (!this.prefetchCache.has(url)) {
            this.prefetchCache.set(url, fetch(url + '?section_id=' + sectionId).then(function (r) { return r.text(); }));
          }
        }, { once: true });
      });
    }

    getProductUrl() {
      for (let i = 0; i < this.fieldsets.length; i++) {
        const fieldset = this.fieldsets[i];
        const select = fieldset.querySelector('select');
        let productUrl;
        if (select && select.selectedOptions[0]) {
          productUrl = select.selectedOptions[0].dataset.productUrl;
        } else {
          const checked = fieldset.querySelector('input:checked');
          productUrl = checked ? checked.dataset.productUrl : null;
        }
        if (productUrl && productUrl !== this.dataset.url) {
          return productUrl;
        }
      }
      return null;
    }

    switchProduct(productUrl) {
      const sectionId = this.dataset.section;
      const fetchUrl = productUrl + '?section_id=' + sectionId;

      const responsePromise = this.prefetchCache.has(productUrl) ? this.prefetchCache.get(productUrl) : fetch(fetchUrl).then(function (r) { return r.text(); });

      const scrollY = window.scrollY;

      return responsePromise.then(function (responseText) {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const newSection = html.querySelector('#shopify-section-' + sectionId);
        const currentSection = document.getElementById('shopify-section-' + sectionId);

        if (newSection && currentSection) {
          currentSection.style.visibility = 'hidden';
          currentSection.innerHTML = newSection.innerHTML;
          requestAnimationFrame(function () {
            currentSection.style.visibility = '';
          });

          const slider = currentSection.querySelector('product-slider');
          if (slider) {
            const images = slider.querySelectorAll('.product-images__slide img');
            let loaded = 0;
            const total = images.length;
            const onLoad = function () {
              loaded++;
              if (loaded >= total) {
                const flkty = Flickity.data(slider);
                if (flkty) {
                  flkty.resize();
                }
              }
            };
            images.forEach(function (img) {
              if (img.complete) {
                onLoad();
              } else {
                img.addEventListener('load', onLoad, { once: true });
                img.addEventListener('error', onLoad, { once: true });
              }
            });
          }
        }

        window.history.replaceState({}, '', productUrl);
        requestAnimationFrame(function () {
          window.scrollTo({ top: scrollY, behavior: 'instant' });
        });
      });
    }

    renderVariantInfo() {
      // Combined listings: check if selected option links to a different product
      const productUrl = this.getProductUrl();
      if (productUrl) {
        this.switchProduct(productUrl);
        return;
      }

      const ids = this.getSelectedValueIds();
      if (!ids.length) return;

      const scrollY = window.scrollY;

      fetch(`${this.dataset.url}?option_values=${ids.join(',')}&section_id=${this.dataset.section}`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');

          // 1. Resolve variant from hidden span
          const span = html.getElementById(`SelectedVariant-${this.dataset.section}`);

          // Combined listings fallback: response resolved to a different product
          if (span && span.dataset.productUrl && span.dataset.productUrl !== this.dataset.url) {
            this.switchProduct(span.dataset.productUrl);
            return;
          }
          if (span && parseInt(span.dataset.variantId, 10)) {
            this.currentVariant = {
              id: parseInt(span.dataset.variantId, 10),
              available: span.dataset.available === 'true',
              featured_media: span.dataset.featuredMediaId ? { id: parseInt(span.dataset.featuredMediaId, 10) } : null
            };
          } else {
            this.currentVariant = null;
          }

          // 2. Sync data-available onto current DOM inputs (drives setDisabled)
          const sourceSelects = html.getElementById(`variant-selects-${this.dataset.section}`);
          if (sourceSelects) {
            sourceSelects.querySelectorAll('[data-value-id]').forEach((sourceEl) => {
              const vid = sourceEl.dataset.valueId;
              const avail = sourceEl.dataset.available;
              [this, ...this.other].forEach((el) => {
                const localEl = el.querySelector(`[data-value-id="${vid}"]`);
                if (localEl) localEl.dataset.available = avail;
              });
            });
          }

          // 3. Update price, inventory, sku sections
          this.getSectionsToRender().forEach((id) => {
            const destination = document.getElementById(id);
            const source = html.getElementById(id);
            if (source && destination) destination.innerHTML = source.innerHTML;
            if (id.includes('price') && destination) destination.classList.remove('visibility-hidden');
          });

          // 4. Apply updated state
          if (!this.currentVariant) {
            this.toggleAddButton(true, '', true);
            this.setUnavailable();
            this.updatePickupAvailability();
            window.scrollTo({ top: scrollY, behavior: 'instant' });
            return;
          }
          this.setDisabled();
          this.updateVariantInput();
          if (this.updateUrl) this.updateURL();
          this.toggleAddButton(!this.currentVariant.available, window.theme.variantStrings.soldOut);
          this.updateMedia();
          this.updatePickupAvailability();
          window.scrollTo({ top: scrollY, behavior: 'instant' });
        });
    }

    toggleAddButton(disable = true, text = false, modifyClass = true) {
      const productForm = document.getElementById(`product-form-${this.dataset.section}`);
      if (!productForm) return;

      const productTemplate = productForm.closest('.product-form').getAttribute('template');
      const addButton = productForm.querySelector('[name="add"]');
      const addButtonText = productForm.querySelector('[name="add"] > span');

      if (!addButton) return;

      if (disable) {
        addButton.setAttribute('disabled', 'disabled');
        if (text) addButtonText.textContent = text;
      } else {
        addButton.removeAttribute('disabled');
        addButton.classList.remove('loading');
        addButtonText.textContent = window.theme.variantStrings.addToCart;

        if (productTemplate?.includes('pre-order')) {
          addButtonText.textContent = window.theme.variantStrings.preOrder;
        } else {
          addButtonText.textContent = window.theme.variantStrings.addToCart;
        }
      }
      if (!modifyClass) return;
    }

    setUnavailable() {
      const button = document.getElementById(`product-form-${this.dataset.section}`);
      const addButton = button.querySelector('[name="add"]');
      const addButtonText = button.querySelector('[name="add"] > span');
      const price = document.getElementById(`price-${this.dataset.section}`);
      if (!addButton) return;
      addButtonText.textContent = window.theme.variantStrings.unavailable;
      addButton.classList.add('sold-out');
      if (price) price.classList.add('visibility-hidden');
    }

    setDisabled() {
      if (this.isDisabledFeature != 'true') return;

      this.fieldsets.forEach((fieldset) => {
        if (fieldset.querySelector('select')) {
          fieldset.querySelectorAll('option').forEach((opt) => {
            opt.disabled = opt.dataset.available === 'false';
          });
        } else {
          fieldset.querySelectorAll('input').forEach((input) => {
            input.classList.toggle('is-disabled', input.dataset.available === 'false');
          });
        }
      });
      return true;
    }

    setImageSet() {
      if (!this.productSlider) return;

      let dataSetEl = this.productSlider.querySelector('[data-set-name]');
      if (dataSetEl) {
        this.imageSetName = dataSetEl.dataset.setName;
        this.imageSetIndex = this.querySelector('.product-form__input[data-handle="' + this.imageSetName + '"]').dataset.index;
        this.dataset.imageSetIndex = this.imageSetIndex;
        this.setImageSetMedia();
      }
    }
    setImageSetMedia() {
      if (!this.imageSetIndex) {
        return;
      }

      const optionPosition = parseInt(this.imageSetIndex.replace('option', ''), 10) - 1;
      const fieldset = this.fieldsets[optionPosition];
      if (!fieldset) return;
      const select = fieldset.querySelector('select');
      const checked = fieldset.querySelector('input:checked');
      let setValue;
      if (select && select.selectedOptions[0]) {
        setValue = select.selectedOptions[0].dataset.handle;
      } else if (checked) {
        setValue = checked.dataset.handle;
      }
      if (!setValue) return;
      let group = this.imageSetName + '_' + setValue;
      let selected_set_images = this.productWrapper.querySelectorAll(`.product-images__slide[data-set-name="${this.imageSetName}"]`),
        selected_set_thumbs = this.productWrapper.querySelectorAll(`.product-thumbnail[data-set-name="${this.imageSetName}"]`);

      if (this.hideVariants) {
        // Product images
        this.productWrapper.querySelectorAll('.product-images__slide').forEach(thumb => {
          if (thumb.dataset.group && thumb.dataset.group !== group) {
            thumb.classList.remove('is-active');
          }
        });
        selected_set_images.forEach(thumb => {
          thumb.classList.toggle('is-active', thumb.dataset.group === group);
        });

        // Product thumbnails
        this.productWrapper.querySelectorAll('.product-thumbnail').forEach(thumb => {
          if (thumb.dataset.group && thumb.dataset.group !== group) {
            thumb.classList.remove('is-active');
            thumb.classList.remove('is-initial-selected');
          }
        });
        let firstGroupThumb = null;
        selected_set_thumbs.forEach(thumb => {
          const inGroup = thumb.dataset.group === group;
          thumb.classList.toggle('is-active', inGroup);
          if (inGroup && !firstGroupThumb) {
            firstGroupThumb = thumb;
          }
        });
        if (firstGroupThumb) {
          firstGroupThumb.classList.add('is-initial-selected');
        }
      }

    }
  }
  customElements.define('variant-selects', VariantSelects);

  /**
   *  @class
   *  @function VariantRadios
   */
  class VariantRadios extends VariantSelects {
    constructor() {
      super();
    }

    updateOptions() {
      const fieldsets = Array.from(this.querySelectorAll('fieldset'));
      this.options = fieldsets.map((fieldset) => {
        return Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked).value;
      });
    }
    updateVariantText() {


    }
  }

  customElements.define('variant-radios', VariantRadios);
}
if (!customElements.get('product-slider')) {
  /**
   *  @class
   *  @function ProductSlider
   */
  class ProductSlider extends HTMLElement {
    constructor() {
      super();
    }
    connectedCallback() {
      this.product_container = this.closest('.thb-product-detail');
      this.thumbnail_container = this.product_container.querySelector('.product-thumbnail-container');
      this.video_containers = this.querySelectorAll('.product-single__media-external-video--play');

      this.setOptions();
      // Start Slider
      this.init();
    }
    setOptions() {
      this.hide_variants = this.dataset.hideVariants == 'true';
      if (this.thumbnail_container) {
        this.thumbnails = this.thumbnail_container.querySelectorAll('.product-thumbnail');
      }
      this.prev_button = this.querySelector('.flickity-prev');
      this.next_button = this.querySelector('.flickity-next');
      this.options = {
        wrapAround: true,
        pageDots: false,
        contain: true,
        adaptiveHeight: true,
        initialIndex: '.is-initial-selected',
        prevNextButtons: false,
        fade: false,
        cellSelector: '.product-images__slide.is-active'
      };

      if (this.classList.contains('product-quick-images')) {
        this.options.cellAlign = 'left';
        this.options.pageDots = false;
        this.options.freeScroll = true;
        this.options.wrapAround = false;
      }
    }
    init() {
      this.flkty = new Flickity(this, this.options);

      this.selectedIndex = this.flkty.selectedIndex;

      // Setup Events
      this.setupEvents();

      // Start Gallery
      this.setupZoomListeners();
    }
    reInit() {
      if (this.eventController) {
        this.eventController.abort();
      }

      this.flkty.destroy();
      this.setOptions();
      this.flkty = new Flickity(this, this.options);
      this.setupEvents();
      this.selectedIndex = this.flkty.selectedIndex;
      this.setupZoomListeners();
    }
    setupEvents() {
      this.eventController = new AbortController();
      const signal = this.eventController.signal;

      if (this.prev_button) {
        this.prev_button.addEventListener('click', () => {
          this.flkty.previous();
        }, { signal });
        this.prev_button.addEventListener('keyup', (event) => {
          this.flkty.previous();
          event.preventDefault();
        }, { signal });
      }
      if (this.next_button) {
        this.next_button.addEventListener('click', () => {
          this.flkty.next();
        }, { signal });
        this.next_button.addEventListener('keyup', (event) => {
          this.flkty.next();
          event.preventDefault();
        }, { signal });
      }

      // Video play button overlay click handlers
      this.querySelectorAll('.product-single__media-external-video--play button').forEach((btn) => {
        btn.addEventListener('click', () => {
          btn.closest('.product-single__media-external-video--play').setAttribute('hidden', '');
        }, { signal });
      });

      this.flkty.on('settle', (index) => {
        this.selectedIndex = index;
      });
      this.flkty.on('change', (index) => {

        let previous_slide = this.flkty.cells[this.selectedIndex].element,
          previous_media = previous_slide.querySelector('.product-single__media'),
          slide = this.flkty.cells[index].element,
          media = slide.querySelector('.product-single__media');

        if (this.thumbnail_container) {
          let mediaId = slide.dataset.mediaId,
            active_thumb = mediaId ? this.thumbnail_container.querySelector(`#Thumb-${mediaId}`) : null;

          this.thumbnails.forEach((item) => {
            item.classList.remove('is-initial-selected');
          });
          if (active_thumb) {
            active_thumb.classList.add('is-initial-selected');
            this.scrollToThumbnail(active_thumb);
          }
        }

        // Stop previous video
        this.pauseMedia(previous_media);

        // Draggable.
        if (media.classList.contains('product-single__media-model')) {
          this.setDraggable(false);
        } else {
          this.setDraggable(true);
        }

      });

      let scrollbar = document.querySelector('.product-quick-images__scrollbar>div');

      if (scrollbar) {
        this.flkty.on('scroll', function (progress) {
          progress = Math.max(0, Math.min(1, progress));
          scrollbar.style.transform = 'scaleX(' + progress + ')';
        });
      }
      if (this.thumbnail_container) {
        this.thumbnails.forEach((thumbnail) => {
          thumbnail.addEventListener('click', () => {
            this.thumbnailClick(thumbnail);
          }, { signal });
        });
      }
    }
    scrollToThumbnail(thumb) {
      requestAnimationFrame(() => {
        if (!thumb || thumb.offsetParent === null) {
          return;
        }
        const windowHalfHeight = thumb.offsetParent.clientHeight / 2,
          windowHalfWidth = thumb.offsetParent.clientWidth / 2;
        thumb.parentElement.scrollTo({
          left: thumb.offsetLeft - windowHalfWidth + thumb.clientWidth / 2,
          top: thumb.offsetTop - windowHalfHeight + thumb.clientHeight / 2,
          behavior: 'smooth'
        });
      });
    }
    pauseMedia(media) {
      if (!media) return;
      if (media.classList.contains('product-single__media-external-video')) {
        if (media.dataset.provider === 'youtube') {
          media.querySelector('iframe').contentWindow.postMessage(JSON.stringify({
            event: "command",
            func: "pauseVideo",
            args: ""
          }), "*");
        } else if (media.dataset.provider === 'vimeo') {
          media.querySelector('iframe').contentWindow.postMessage(JSON.stringify({
            method: "pause"
          }), "*");
        }
        let playBtn = media.querySelector('.product-single__media-external-video--play');
        if (playBtn) {
          playBtn.removeAttribute('hidden');
        }
      } else if (media.classList.contains('product-single__media-native-video')) {
        media.querySelector("video").pause();
      }
    }
    thumbnailClick(thumbnail) {
      this.thumbnails.forEach(el => {
        el.classList.remove('is-initial-selected');
      });
      thumbnail.classList.add('is-initial-selected');

      let mediaId = thumbnail.id ? thumbnail.id.replace('Thumb-', '') : null;
      if (mediaId) {
        let cellIndex = this.flkty.cells.findIndex(cell => cell.element.dataset.mediaId === mediaId);
        if (cellIndex > -1) {
          this.flkty.select(cellIndex);
        }
      }
    }
    setDraggable(draggable) {
      this.flkty.options.draggable = draggable;
      this.flkty.updateDraggable();
    }
    selectCell(mediaId) {
      this.flkty.selectCell(mediaId);
    }
    setupZoomListeners() {
      if (!this.querySelectorAll('.product-single__media-zoom').length) {
        return;
      }
      this.setEventListeners();
    }
    buildItems() {
      this.activeImages = Array.from(this.querySelectorAll('.product-images__slide.is-active .product-single__media-image'));

      return this.activeImages.map((item) => {
        let index = Array.from(item.parentNode.parentNode.children).indexOf(item.parentNode);

        let activelink = item.querySelector('.product-single__media-zoom');

        activelink.dataset.index = index;
        return {
          src: activelink.getAttribute('href'),
          msrc: activelink.dataset.msrc,
          w: activelink.dataset.w,
          h: activelink.dataset.h
        };
      });
    }
    setEventListeners() {
      if (this.zoomController) {
        this.zoomController.abort();
      }
      this.zoomController = new AbortController();
      const zoomSignal = this.zoomController.signal;

      this.links = this.querySelectorAll('.product-single__media-zoom');
      this.pswpElement = document.querySelectorAll('.pswp')[0];
      this.pswpOptions = {
        maxSpreadZoom: 2,
        loop: false,
        allowPanToNext: false,
        closeOnScroll: false,
        showHideOpacity: false,
        arrowKeys: true,
        history: false,
        captionEl: false,
        fullscreenEl: false,
        zoomEl: false,
        shareEl: false,
        counterEl: false,
        arrowEl: true,
        preloaderEl: true,
        getThumbBoundsFn: () => {
          const thumbnail = this.querySelector('.product-images__slide.is-selected'),
            pageYScroll = window.pageYOffset || document.documentElement.scrollTop,
            rect = thumbnail.getBoundingClientRect();
          return {
            x: rect.left,
            y: rect.top + pageYScroll,
            w: rect.width
          };
        }
      };

      this.links.forEach((link) => {
        link.addEventListener('click', (e) => this.zoomClick(e, link), { signal: zoomSignal });
      });
    }
    zoomClick(e, link) {
      this.items = this.buildItems();
      this.pswpOptions.index = parseInt(link.dataset.index, 10);
      if (typeof PhotoSwipe !== 'undefined') {
        let pswp = new PhotoSwipe(this.pswpElement, PhotoSwipeUI_Default, this.items, this.pswpOptions);
        pswp.listen('firstUpdate', function () {
          pswp.listen('parseVerticalMargin', function (item) {
            item.vGap = {
              top: 50,
              bottom: 50
            };
          });
        });
        pswp.init();
      }
      e.preventDefault();
    }
    disconnectedCallback() {
      if (this.eventController) {
        this.eventController.abort();
      }
      if (this.zoomController) {
        this.zoomController.abort();
      }
      if (this.flkty) {
        this.flkty.destroy();
        this.flkty = null;
      }
    }
  }
  customElements.define('product-slider', ProductSlider);
}

/**
 *  @class
 *  @function ProductForm
 */
if (!customElements.get('product-form')) {
  customElements.define('product-form', class ProductForm extends HTMLElement {
    constructor() {
      super();
    }
    connectedCallback() {
      this.sticky = this.dataset.sticky;
      this.form = document.getElementById(`product-form-${this.dataset.section}`);
      this.form.querySelector('[name=id]').disabled = false;
      if (!this.sticky) {
        this._onSubmit = this.onSubmitHandler.bind(this);
        this.form.addEventListener('submit', this._onSubmit);
      }
      this.cartNotification = document.querySelector('cart-notification');
      this.body = document.body;

      this.hideErrors = this.dataset.hideErrors === 'true';
    }
    disconnectedCallback() {
      if (this._onSubmit && this.form) {
        this.form.removeEventListener('submit', this._onSubmit);
      }
    }
    onSubmitHandler(evt) {
      evt.preventDefault();
      if (!this.form.reportValidity()) {
        return;
      }
      const submitButtons = document.querySelectorAll('.single-add-to-cart-button');

      submitButtons.forEach((submitButton) => {
        if (submitButton.classList.contains('loading')) return;
        submitButton.setAttribute('aria-disabled', true);
        submitButton.classList.add('loading');
      });

      this.handleErrorMessage();


      const config = {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/javascript'
        }
      };
      let formData = new FormData(this.form);

      formData.append('sections', this.getSectionsToRender().map((section) => section.section));
      formData.append('sections_url', window.location.pathname);
      config.body = formData;

      fetch(`${theme.routes.cart_add_url}`, config)
        .then((response) => response.json())
        .then((response) => {
          if (response.status) {
            dispatchCustomEvent('product:variant-error', {
              source: 'product-form',
              productVariantId: formData.get('id'),
              errors: response.description,
              message: response.message
            });
            if (response.status === 422) {
              document.documentElement.dispatchEvent(new CustomEvent('cart:refresh', {
                bubbles: true
              }));
            }
            this.handleErrorMessage(response.description);
            return;
          }

          this.renderContents(response);

          dispatchCustomEvent('cart:item-added', {
            product: response.hasOwnProperty('items') ? response.items[0] : response
          });
        })
        .catch((e) => {
          console.error(e);
        })
        .finally(() => {
          submitButtons.forEach((submitButton) => {
            submitButton.classList.remove('loading');
            submitButton.removeAttribute('aria-disabled');
          });
        });
    }

    getSectionsToRender() {
      return [{
        id: 'Cart',
        section: 'main-cart',
        selector: '.thb-cart-form'
      },
      {
        id: 'Cart-Drawer',
        section: 'cart-drawer',
        selector: '.cart-drawer'
      },
      {
        id: 'cart-drawer-toggle',
        section: 'cart-bubble',
        selector: '.thb-item-count'
      }];
    }
    renderContents(parsedState) {
      this.getSectionsToRender().forEach((section => {
        if (!document.getElementById(section.id)) {
          return;
        }
        const elementToReplace = document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);
        elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
        const cartEl = document.getElementById('Cart');
        if (cartEl && cartEl.renderContents) {
          cartEl.renderContents(parsedState);
        }
      }));


      if (document.getElementById('Cart-Drawer')) {
        document.getElementById('Cart-Drawer').open();
      }

      let product_drawer = document.getElementById('Product-Drawer');
      if (product_drawer && product_drawer.contains(this)) {
        OverlayManager.close(product_drawer);
      }
    }
    getSectionInnerHTML(html, selector = '.shopify-section') {
      return new DOMParser()
        .parseFromString(html, 'text/html')
        .querySelector(selector).innerHTML;
    }
    handleErrorMessage(errorMessage = false) {
      if (this.hideErrors) return;
      this.errorMessageWrapper = this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
      this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

      this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

      if (errorMessage) {
        this.errorMessage.textContent = errorMessage;
      }
    }
  });
}

/**
 *  @class
 *  @function ProductAddToCartSticky
 */
if (!customElements.get('product-add-to-cart-sticky')) {
  class ProductAddToCartSticky extends HTMLElement {
    constructor() {
      super();

      this.animations_enabled = document.body.classList.contains('animations-true') && typeof gsap !== 'undefined';
    }
    connectedCallback() {
      this.setupObservers();
      this.setupToggle();
    }
    setupToggle() {
      const button = this.querySelector('.product-add-to-cart-sticky--inner'),
        content = this.querySelector('.product-add-to-cart-sticky--content');

      if (this.animations_enabled) {
        const tl = gsap.timeline({
          reversed: true,
          paused: true,
          onStart: () => {
            button.classList.add('sticky-open');
          },
          onReverseComplete: () => {
            button.classList.remove('sticky-open');
          }
        });

        tl
          .set(content, {
            display: 'block',
            height: 'auto'
          }, 'start')
          .from(content, {
            height: 0,
            duration: 0.25
          }, 'start+=0.001');

        button.addEventListener('click', function () {
          if (tl.reversed()) { tl.play(); } else { tl.reverse(); }

          return false;
        });
      } else {
        button.addEventListener('click', function () {
          content.classList.toggle('active');
          return false;
        });
      }


    }
    disconnectedCallback() {
      if (this._observer) {
        this._observer.disconnect();
        this._observer = null;
      }
    }
    setupObservers() {
      let _this = this,
        observer = new IntersectionObserver(function (entries) {
          entries.forEach((entry) => {
            if (entry.target === footer) {
              if (entry.intersectionRatio > 0) {
                _this.classList.remove('sticky--visible');
              } else if (entry.intersectionRatio == 0 && _this.formPassed) {
                _this.classList.add('sticky--visible');
              }
            }
            if (entry.target === form) {
              let boundingRect = form.getBoundingClientRect();

              if (entry.intersectionRatio === 0 && window.scrollY > (boundingRect.top + boundingRect.height)) {
                _this.formPassed = true;
                _this.classList.add('sticky--visible');
              } else if (entry.intersectionRatio === 1) {
                _this.formPassed = false;
                _this.classList.remove('sticky--visible');
              }
            }
          });
        }, {
          threshold: [0, 1]
        }),
        form = document.getElementById(`product-form-${this.dataset.section}`),
        footer = document.getElementById('footer');
      _this.formPassed = false;
      this._observer = observer;
      observer.observe(form);
      observer.observe(footer);
    }
  }

  customElements.define('product-add-to-cart-sticky', ProductAddToCartSticky);
}

if (typeof addIdToRecentlyViewed !== "undefined") {
  addIdToRecentlyViewed();
}