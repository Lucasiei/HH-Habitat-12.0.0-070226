if (!customElements.get('more-from-vendor')) {
  class MoreFromVendor extends HTMLElement {
    constructor() {
      super();
      this.vendor = this.dataset.vendor;
      this.class = this.dataset.class;
      this.product = this.dataset.productHandle;
      this.url = `${theme.routes.collections_url}/vendors?view=vendor-ajax&q=${this.vendor}`;
      this.container = this.querySelector('.products');
    }
    connectedCallback() {
      this.abortController = new AbortController();
      fetch(this.url, { signal: this.abortController.signal })
        .then(response => response.text())
        .then(text => {
          const html = document.createElement('div');
          html.innerHTML = text;
          const columns = html.querySelector('.collection-vendor-ajax');

          if (columns) {
            this.container.innerHTML = columns.innerHTML;

            this.classList.add('product-recommendations--loaded');
          }

        })
        .catch(e => {
          if (e.name !== 'AbortError') console.error(e);
        });
    }
    disconnectedCallback() {
      this.abortController?.abort();
    }
  }
  customElements.define('more-from-vendor', MoreFromVendor);
}