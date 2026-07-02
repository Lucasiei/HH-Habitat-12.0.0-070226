function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

var dispatchCustomEvent = function dispatchCustomEvent(eventName) {
  var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var detail = {
    detail: data
  };
  var event = new CustomEvent(eventName, data ? detail : null);
  document.dispatchEvent(event);
};

window.recentlyViewedIds = [];

const OverlayManager = {
  stack: [],
  beforeCloseHandlers: new Map(),

  open(panel) {
    if (!panel || this.stack.includes(panel)) return;
    this.stack.push(panel);
    panel.classList.add('active');
    panel.inert = false;
    document.body.classList.add('open-cc');
    panel.querySelector('.side-panel-close')?.focus();
    dispatchCustomEvent('panel:open', { panel });
  },

  close(panel) {
    if (!panel) return;
    const handler = this.beforeCloseHandlers.get(panel);
    if (handler) {
      handler(() => this._close(panel));
    } else {
      this._close(panel);
    }
  },

  _close(panel) {
    const index = this.stack.indexOf(panel);
    if (index > -1) this.stack.splice(index, 1);
    panel.classList.remove('active');
    panel.inert = true;
    if (!this.stack.length) {
      document.body.classList.remove('open-cc');
    }
    dispatchCustomEvent('panel:closed', { panel });
  },

  closeLast() {
    const panel = this.stack[this.stack.length - 1];
    if (panel) this.close(panel);
  },

  registerBeforeClose(panel, handler) {
    this.beforeCloseHandlers.set(panel, handler);
  },

  isOpen(panel) {
    return this.stack.includes(panel);
  },

  hasOpen() {
    return this.stack.length > 0;
  }
};

/**
 *  @class
 *  @function Quantity
 */
if (!customElements.get('quantity-selector')) {
  class QuantityInput extends HTMLElement {
    constructor() {
      super();
      this.input = this.querySelector('.qty');
      this.step = this.input.getAttribute('step');
      this.changeEvent = new Event('change', {
        bubbles: true
      });
      // Create buttons
      this.subtract = this.querySelector('.minus');
      this.add = this.querySelector('.plus');

      // Add functionality to buttons
      this.subtract.addEventListener('click', () => this.change_quantity(-1 * this.step));
      this.add.addEventListener('click', () => this.change_quantity(1 * this.step));

    }
    connectedCallback() {
      this.classList.add('buttons_added');
    }
    change_quantity(change) {
      // Get current value
      let quantity = Number(this.input.value);

      // Ensure quantity is a valid number
      if (isNaN(quantity)) quantity = 1;

      // Check for min & max
      if (this.input.getAttribute('min') > (quantity + change)) {
        return;
      }
      if (this.input.getAttribute('max')) {
        if (this.input.getAttribute('max') < (quantity + change)) {
          return;
        }
      }
      // Change quantity
      quantity += change;

      // Ensure quantity is always a number
      quantity = Math.max(quantity, 1);

      // Output number
      this.input.value = quantity;

      this.input.dispatchEvent(this.changeEvent);
    }
  }
  customElements.define('quantity-selector', QuantityInput);
}



/**
 *  @class
 *  @function ProductCard
 */
if (!customElements.get('product-card')) {
  class ProductCard extends HTMLElement {
    constructor() {
      super();
      this.swatches = this.querySelector('.product-card-swatches');
      this.image = this.querySelector('.product-featured-image-link .product-primary-image');
      this.secondary = this.querySelector('.product-featured-image-link .product-secondary-image');
      this.quick_add = this.querySelector('.product-card--add-to-cart-button-simple');
    }
    connectedCallback() {
      if (this.swatches) {
        this.enableSwatches();
      }
      if (this.quick_add) {
        this.enableQuickView();
      }
      if (this.secondary) {
        window.addEventListener('load', (event) => {
          lazySizes.loader.unveil(this.secondary);
        });
      }
    }
    enableSwatches() {
      let swatch_list = this.swatches.querySelectorAll('.product-card-swatch'),
        org_srcset = this.image ? this.image.dataset.srcset : '';


      swatch_list.forEach((swatch, index) => {
        window.addEventListener('load', (event) => {
          let image = new Image();
          image.srcset = swatch.dataset.srcset;
          lazySizes.loader.unveil(image);
        });
        swatch.addEventListener('mouseover', () => {

          [].forEach.call(swatch_list, function (el) {
            el.classList.remove('active');
          });
          if (this.image) {
            if (swatch.dataset.srcset) {
              this.image.setAttribute('srcset', swatch.dataset.srcset);
            } else {
              this.image.setAttribute('srcset', org_srcset);
            }
          }

          swatch.classList.add('active');
        });
        swatch.addEventListener('click', function (evt) {
          window.location.href = this.dataset.href;
          evt.preventDefault();
        });
      });
    }
    enableQuickView() {
      this.quick_add.addEventListener('click', this.quickAdd.bind(this));
    }

    quickAdd(evt) {
      evt.preventDefault();
      if (this.quick_add.disabled) {
        return;
      }
      this.quick_add.classList.add('loading');
      this.quick_add.setAttribute('aria-disabled', true);

      const config = {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/javascript'
        }
      };

      let formData = new FormData(this.form);

      formData.append('id', this.quick_add.dataset.productId);
      formData.append('quantity', 1);
      formData.append('sections', this.getSectionsToRender().map((section) => section.section));
      formData.append('sections_url', window.location.pathname);

      config.body = formData;

      fetch(`${theme.routes.cart_add_url}`, config)
        .then((response) => response.json())
        .then((response) => {
          if (response.status) {
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
          this.quick_add.classList.remove('loading');
          this.quick_add.removeAttribute('aria-disabled');
        });

      return false;
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

    }
    getSectionInnerHTML(html, selector = '.shopify-section') {
      return new DOMParser()
        .parseFromString(html, 'text/html')
        .querySelector(selector).innerHTML;
    }
  }
  customElements.define('product-card', ProductCard);
}

/**
 *  @class
 *  @function PanelClose
 */
class PanelClose extends HTMLElement {

  constructor() {
    super();
    let cc = document.querySelector('.click-capture');

    this.addEventListener('click', (e) => {
      e.preventDefault();
      let panel = e.target.closest('.side-panel');
      OverlayManager.close(panel);
    });
    document.addEventListener('keyup', (e) => {
      if (e.code && e.code.toUpperCase() === 'ESCAPE') {
        OverlayManager.closeLast();
      }
    });
    cc.addEventListener('click', () => {
      OverlayManager.closeLast();
    });
  }
}
customElements.define('side-panel-close', PanelClose);

/**
 *  @class
 *  @function CartDrawer
 */
if (!customElements.get('cart-drawer')) {
  class CartDrawer extends HTMLElement {

    constructor() {
      super();
    }
    connectedCallback() {
      let button = document.getElementById('cart-drawer-toggle');

      if (!button) {
        return;
      }
      button.addEventListener('click', (e) => {
        e.preventDefault();
        this.open();
      });

      this.debouncedOnChange = debounce((event) => {
        this.onChange(event);
      }, 300);

      this._onCartRefresh = () => this.refresh();
      document.addEventListener('cart:refresh', this._onCartRefresh);

      this.addEventListener('change', this.debouncedOnChange.bind(this));
      this.addEventListener('cart:remove', (event) => {
        this.updateQuantity(event.detail.index, '0');
      });
    }
    disconnectedCallback() {
      if (this._onCartRefresh) {
        document.removeEventListener('cart:refresh', this._onCartRefresh);
      }
    }
    open() {
      OverlayManager.open(this);
      dispatchCustomEvent('cart-drawer:open');
    }
    close() {
      OverlayManager.close(this);
    }
    onChange(event) {
      if (event.target.classList.contains('qty')) {
        this.updateQuantity(event.target.dataset.index, event.target.value);
      }
    }
    getSectionsToRender() {
      return [{
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
    getSectionInnerHTML(html, selector) {
      return new DOMParser()
        .parseFromString(html, 'text/html')
        .querySelector(selector).innerHTML;
    }

    updateQuantity(line, quantity) {
      this.querySelector(`#CartDrawerItem-${line}`).classList.add('thb-loading');
      const body = JSON.stringify({
        line,
        quantity,
        sections: this.getSectionsToRender().map((section) => section.section),
        sections_url: window.location.pathname
      });
      dispatchCustomEvent('line-item:change:start', {
        quantity: quantity
      });
      fetch(`${theme.routes.cart_change_url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': `application/json`
        },
        ...{
          body
        }
      })
        .then((response) => {
          return response.text();
        })
        .then((state) => {
          const parsedState = JSON.parse(state);


          this.getSectionsToRender().forEach((section => {
            const elementToReplace = document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);

            elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);

          }));

          dispatchCustomEvent('line-item:change:end', {
            quantity: quantity,
            cart: parsedState
          });
          if (this.querySelector(`#CartDrawerItem-${line}`).length) {
            this.querySelector(`#CartDrawerItem-${line}`).classList.remove('thb-loading');
          }
        });
    }
    refresh() {
      let sections = 'cart-drawer,cart-bubble';
      fetch(`${window.location.pathname}?sections=${sections}`)
        .then((response) => {
          return response.text();
        })
        .then((state) => {
          const parsedState = JSON.parse(state);

          this.getSectionsToRender().forEach((section => {
            const elementToReplace = document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);

            elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState[section.section], section.selector);
          }));
        });
    }
  }
  customElements.define('cart-drawer', CartDrawer);
}

/**
 *  @class
 *  @function QuickView
 */
if (!customElements.get('quick-view')) {
  const quickViewCache = new Map();

  class QuickView extends HTMLElement {
    constructor() {
      super();
    }
    connectedCallback() {
      this.drawer = document.getElementById('Product-Drawer');
      this.addEventListener('click', this.handleClick.bind(this));

      OverlayManager.registerBeforeClose(this.drawer, (proceed) => {
        this.drawer.querySelector('#Product-Drawer-Content').innerHTML = '';
        proceed();
      });
    }
    handleClick(e) {
      e.preventDefault();
      let productHandle = this.dataset.productHandle;
      if (!productHandle) {
        return;
      }
      let rootUrl = theme.routes.root_url.replace(/\/+$/, '');
      let href = `${rootUrl}/products/${productHandle}?view=quick-view`;

      if (this.classList.contains('loading')) {
        return;
      }
      this.classList.add('loading');

      if (QuickView.activeController) {
        QuickView.activeController.abort();
      }
      let controller = new AbortController();
      QuickView.activeController = controller;

      if (quickViewCache.has(productHandle)) {
        this.classList.remove('loading');
        this.renderQuickView(quickViewCache.get(productHandle), href, productHandle);
        return;
      }

      fetch(href, {
        method: 'GET',
        signal: controller.signal
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Quick view fetch failed: ${response.status}`);
          }
          return response.text();
        })
        .then(text => {
          let parsed = new DOMParser()
            .parseFromString(text, 'text/html')
            .querySelector('#Product-Drawer-Content');

          if (!parsed) {
            throw new Error('Quick view content not found in response');
          }
          let sectionInnerHTML = parsed.innerHTML;
          quickViewCache.set(productHandle, sectionInnerHTML);
          this.renderQuickView(sectionInnerHTML, href, productHandle);
        })
        .catch((error) => {
          if (error.name !== 'AbortError') {
            console.error(error);
          }
        })
        .finally(() => {
          this.classList.remove('loading');
        });
    }
    _reloadScripts(container) {
      let scripts = container.querySelectorAll('script');
      let head = document.head;
      scripts.forEach((oldScript) => {
        let newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });
        if (oldScript.src) {
          if (document.querySelector(`script[src="${oldScript.src}"]`)) {
            return;
          }
        } else {
          newScript.textContent = oldScript.textContent;
        }
        if (oldScript.parentNode) {
          oldScript.parentNode.replaceChild(newScript, oldScript);
        } else {
          head.appendChild(newScript);
        }
      });
    }
    renderQuickView(sectionInnerHTML, href, productHandle) {
      if (!sectionInnerHTML) {
        return;
      }
      let drawerContent = this.drawer.querySelector('#Product-Drawer-Content');
      drawerContent.innerHTML = sectionInnerHTML;

      this._reloadScripts(drawerContent);

      requestAnimationFrame(() => {
        if (typeof Shopify !== 'undefined' && Shopify.PaymentButton) {
          Shopify.PaymentButton.init();
        }
        if (window.ProductModel) {
          window.ProductModel.loadShopifyXR();
        }
      });

      OverlayManager.open(this.drawer);

      dispatchCustomEvent('quick-view:open', {
        productUrl: href,
        productHandle: productHandle
      });
      addIdToRecentlyViewed(productHandle);
    }
  }
  QuickView.activeController = null;
  customElements.define('quick-view', QuickView);
}

/**
 *  @class
 *  @function ProductRecommendations
 */
class ProductRecommendations extends HTMLElement {
  constructor() {
    super();

  }
  fetchProducts() {
    fetch(this.dataset.url)
      .then(response => response.text())
      .then(text => {
        const html = document.createElement('div');
        html.innerHTML = text;
        const recommendations = html.querySelector('product-recommendations');

        if (recommendations && recommendations.innerHTML.trim().length) {
          this.innerHTML = recommendations.innerHTML;
        }

        this.classList.add('product-recommendations--loaded');
      })
      .catch(e => {
        console.error(e);
      });
  }
  connectedCallback() {
    this.fetchProducts();
  }
}

customElements.define('product-recommendations', ProductRecommendations);

/**
 *  @class
 *  @function ResizeSelect
 */
if (!customElements.get('resize-select')) {
  class ResizeSelect extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      this.select = this.querySelector('select');
      if (!this.select) return;
      this.addEventListener('change', this.resizeSelect.bind(this));
      const details = this.closest('details');
      if (details) {
        details.addEventListener('toggle', () => {
          if (details.open) this.resizeSelect();
        });
      }
      this.resizeSelect();
    }

    resizeSelect() {
      let computed = window.getComputedStyle(this.select);
      let span = document.createElement('span');
      span.style.cssText = 'visibility:hidden;position:absolute;white-space:nowrap;pointer-events:none;font-size:' + computed.fontSize + ';font-family:' + computed.fontFamily + ';font-weight:' + computed.fontWeight + ';letter-spacing:' + computed.letterSpacing;
      span.textContent = this.select.selectedOptions[0].textContent;
      this.appendChild(span);

      requestAnimationFrame(() => {
        let paddingLeft = parseFloat(computed.paddingLeft) || 0;
        let paddingRight = parseFloat(computed.paddingRight) || 0;
        let border = (parseFloat(computed.borderLeftWidth) || 0) + (parseFloat(computed.borderRightWidth) || 0);
        this.select.style.width = Math.ceil(span.offsetWidth + paddingLeft + paddingRight + border + 15) + 'px';
        span.remove();
      });
    }
  }
  customElements.define('resize-select', ResizeSelect);
}

/**
 *  @class
 *  @function CollapsibleRow
 */
if (!customElements.get('collapsible-row')) {
  // https://css-tricks.com/how-to-animate-the-details-element/
  class CollapsibleRow extends HTMLElement {
    constructor() {
      super();

      this.details = this.querySelector('details');
      this.summary = this.querySelector('summary');
      this.content = this.querySelector('.collapsible__content');

      // Store the animation object (so we can cancel it if needed)
      this.animation = null;
      // Store if the element is closing
      this.isClosing = false;
      // Store if the element is expanding
      this.isExpanding = false;
    }
    connectedCallback() {
      this.setListeners();
    }
    setListeners() {
      this.querySelector('summary').addEventListener('click', (e) => this.onClick(e));
    }
    prepareAnimations() {
      let _this = this,
        summary_height = this.querySelector('summary').offsetHeight,
        content_height = this.querySelector('.collapsible__content').offsetHeight,
        initial_height = summary_height,
        final_height = summary_height + content_height;

      this.tl = false;
      this.tl = gsap.timeline({
        reversed: !_this.details.open,
        paused: true,
        inherit: false,
        ease: 'none',
        onStart: function () {
          _this.details.open = true;
          _this.details.style.overflow = 'hidden';
        },
        onReverseComplete: function () {
          _this.details.open = false;
          _this.details.style.overflow = '';
        }
      });

      this.tl
        .fromTo(_this.details, {
          height: function () {
            let h = Math.max(Math.max(initial_height, 0), 24);
            return h;
          },
          clearProps: 'height'
        }, {
          duration: 0.4,
          height: final_height,
          clearProps: 'height'
        });

      if (this.details.open) {
        this.tl.progress(1);
      }
    }
    instantClose() {
      this.tl.timeScale(10).reverse();
    }
    animateClose() {
      this.tl.timeScale(3).reverse();
    }
    animateOpen() {
      this.tl.timeScale(1).play();
    }
    onClick(e) {
      // Stop default behaviour from the browser
      e.preventDefault();
      // Add an overflow on the <details> to avoid content overflowing
      this.details.style.overflow = 'hidden';
      // Check if the element is being closed or is already closed
      if (this.isClosing || !this.details.open) {
        this.open();
        // Check if the element is being openned or is already open
      } else if (this.isExpanding || this.details.open) {
        this.shrink();
      }
    }
    shrink() {
      // Set the element as "being closed"
      this.isClosing = true;

      // Store the current height of the element
      const startHeight = `${this.details.offsetHeight}px`;
      // Calculate the height of the summary
      const endHeight = `${this.summary.offsetHeight}px`;

      // If there is already an animation running
      if (this.animation) {
        // Cancel the current animation
        this.animation.cancel();
      }

      // Start a WAAPI animation
      this.animation = this.details.animate({
        // Set the keyframes from the startHeight to endHeight
        height: [startHeight, endHeight]
      }, {
        duration: 250,
        easing: 'ease'
      });

      // When the animation is complete, call onAnimationFinish()
      this.animation.onfinish = () => this.onAnimationFinish(false);
      // If the animation is cancelled, isClosing variable is set to false
      this.animation.oncancel = () => this.isClosing = false;
    }

    open() {
      // Apply a fixed height on the element
      this.details.style.height = `${this.details.offsetHeight}px`;
      // Force the [open] attribute on the details element
      this.details.open = true;
      // Wait for the next frame to call the expand function
      window.requestAnimationFrame(() => this.expand());
    }

    expand() {
      // Set the element as "being expanding"
      this.isExpanding = true;
      // Get the current fixed height of the element
      const startHeight = `${this.details.offsetHeight}px`;
      // Calculate the open height of the element (summary height + content height)
      const endHeight = `${this.summary.offsetHeight + this.content.offsetHeight}px`;

      // If there is already an animation running
      if (this.animation) {
        // Cancel the current animation
        this.animation.cancel();
      }

      // Start a WAAPI animation
      this.animation = this.details.animate({
        // Set the keyframes from the startHeight to endHeight
        height: [startHeight, endHeight]
      }, {
        duration: 400,
        easing: 'ease-out'
      });
      // When the animation is complete, call onAnimationFinish()
      this.animation.onfinish = () => this.onAnimationFinish(true);
      // If the animation is cancelled, isExpanding variable is set to false
      this.animation.oncancel = () => this.isExpanding = false;
    }

    onAnimationFinish(open) {
      // Set the open attribute based on the parameter
      this.details.open = open;
      // Clear the stored animation
      this.animation = null;
      // Reset isClosing & isExpanding
      this.isClosing = false;
      this.isExpanding = false;
      // Remove the overflow hidden and the fixed height
      this.details.style.height = this.details.style.overflow = '';
    }
  }
  customElements.define('collapsible-row', CollapsibleRow);
}

/**
 *  @function addIdToRecentlyViewed
 */
function addIdToRecentlyViewed(handle) {

  if (!handle) {
    let product = document.querySelector('.thb-product-detail');

    if (product) {
      handle = product.dataset.handle;
    }
  }
  if (!handle) {
    return;
  }
  if (window.localStorage) {
    let recentIds = window.localStorage.getItem('recently-viewed');
    if (recentIds != 'undefined' && recentIds != null) {
      window.recentlyViewedIds = JSON.parse(recentIds);
    }
  }
  // Remove current product if already in recently viewed array
  var i = window.recentlyViewedIds.indexOf(handle);

  if (i > -1) {
    window.recentlyViewedIds.splice(i, 1);
  }

  // Add id to array
  window.recentlyViewedIds.unshift(handle);

  if (window.localStorage) {
    window.localStorage.setItem('recently-viewed', JSON.stringify(window.recentlyViewedIds));
  }
}

document.addEventListener('DOMContentLoaded', () => {
});