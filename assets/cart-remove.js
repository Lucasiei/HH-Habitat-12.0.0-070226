/**
 *  @class
 *  @function CartRemove
 */
if (!customElements.get('cart-remove')) {
  class CartRemove extends HTMLElement {
    connectedCallback() {
      this.abortController = new AbortController();
      this.addEventListener('click', (event) => {
        event.preventDefault();
        this.dispatchEvent(new CustomEvent('cart:remove', {
          bubbles: true,
          detail: { index: this.dataset.index }
        }));
      }, { signal: this.abortController.signal });
    }
    disconnectedCallback() {
      this.abortController?.abort();
    }
  }
  customElements.define('cart-remove', CartRemove);
}