/**
 *  @class
 *  @function SocialShare
 */
if (!customElements.get('social-share')) {
  class SocialShare extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      this.abortController = new AbortController();
      this.links = this.querySelectorAll('.social:not(.clipboard):not(.whatsapp)');

      this.setupEventListeners();
    }

    disconnectedCallback() {
      this.abortController?.abort();
    }

    setupEventListeners() {
      this.links.forEach((link) => {
        link.addEventListener('click', (event) => {
          let left = (screen.width / 2) - (640 / 2),
            top = (screen.height / 2) - (440 / 2) - 100;
          window.open(link.getAttribute('href'), 'mywin', 'left=' + left + ',top=' + top + ',width=640,height=440,toolbar=0');
          event.preventDefault();
        }, { signal: this.abortController.signal });
      });
    }
  }
  customElements.define('social-share', SocialShare);
}