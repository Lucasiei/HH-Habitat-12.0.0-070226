/**
 *  @class
 *  @function CartNotes
 */
if (!customElements.get('cart-notes')) {
  class CartNotes extends HTMLElement {
    constructor() {
      super();
    }
    connectedCallback() {
      this.abortController = new AbortController();
      this.content = this.querySelector('#mini-cart-note');
      this.notes = this.querySelector('#mini-cart__notes');

      if (!this.content || !this.notes) return;

      this.content.querySelectorAll('.button, .order-note-toggle__content-overlay').forEach((el) => {
        el.addEventListener('click', (event) => {
          this.content.classList.remove('active');
          const toggle = document.getElementById('order-note-toggle');
          if (toggle) toggle.setAttribute('aria-expanded', 'false');
          this.saveNotes();
        }, { signal: this.abortController.signal });
      });
    }
    disconnectedCallback() {
      this.abortController?.abort();
    }
    saveNotes() {
      fetch(`${theme.routes.cart_update_url}.js`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': `application/json`
        },
        body: JSON.stringify({
          'note': this.notes.value
        })
      });
    }
  }
  customElements.define('cart-notes', CartNotes);
}

document.addEventListener('click', (event) => {
  if (event.target.closest('#order-note-toggle')) {
    const content = document.getElementById('mini-cart-note');
    const toggle = document.getElementById('order-note-toggle');
    if (content) {
      content.classList.add('active');
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
    }
  }
});