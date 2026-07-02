/**
 *  @class
 *  @function ModalDialog
 */
if (!customElements.get('modal-dialog')) {
  class ModalDialog extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      // Move to body first, then initialize once in final position
      if (!this.moved) {
        this.moved = true;
        document.body.appendChild(this);
        return; // appendChild triggers connectedCallback again
      }
      if (this.initialized) return;
      this.initialized = true;

      this.age_verification = this.classList.contains('age-verification-modal');
      this.id = this.getAttribute('id');
      this.delay = parseInt(this.dataset.delay, 10) * 1000;
      this.popup = this.dataset.popup;
      this.section_id = this.dataset.sectionId;
      this.disabled = this.getAttribute('disabled') != undefined;
      this.button = this.querySelector('[id^="ModalClose-"]');

      this.button.addEventListener('click', this.hide.bind(this));

      if (!this.disabled) {
        this.addEventListener('keyup', (event) => {
          if (event.code.toUpperCase() === 'ESCAPE') {
            this.hide();
            this.setCookie();
          }
        });
        this.addEventListener('click', (event) => {
          if (event.target.nodeName === 'MODAL-DIALOG') {
            this.hide();
            this.setCookie();
          }
        });
      }
      if (this.delay && this.delay > 0) {
        if (!this.getCookie()) {
          setTimeout(() => {
            this.show();
            this.button.addEventListener('click', this.setCookie.bind(this));
          }, this.delay);
        }
      } else if (parseInt(this.dataset.delay, 10) === 0) {
        if (!this.getCookie()) {
          this.show();
          this.button.addEventListener('click', this.setCookie.bind(this));
        }
      }
      if (this.age_verification) {
        if (!this.getCookie()) {
          this.show();
        }
        this.button.addEventListener('click', this.setCookie.bind(this));
      }
      if (Shopify.designMode) {
        this._onSectionSelect = (event) => {
          if (event.detail.sectionId === this.section_id) {
            this.show();
          }
        };
        this._onSectionDeselect = (event) => {
          if (event.detail.sectionId === this.section_id) {
            this.hide();
          }
        };
        document.addEventListener('shopify:section:select', this._onSectionSelect);
        document.addEventListener('shopify:section:deselect', this._onSectionDeselect);
      }
    }

    show(opener) {
      this.openedBy = opener;
      document.body.classList.add('overflow-hidden');
      this.setAttribute('open', '');

      setTimeout(() => {
        this.querySelector('[role="dialog"]').focus();
      }, 100);
    }

    hide() {
      document.body.classList.remove('overflow-hidden');
      this.removeAttribute('open');
      this.querySelectorAll('.js-youtube').forEach((video) => {
        video.contentWindow.postMessage('{"event":"command","func":"' + 'pauseVideo' + '","args":""}', '*');
      });
      this.querySelectorAll('.js-vimeo').forEach((video) => {
        video.contentWindow.postMessage('{"method":"pause"}', '*');
      });
      this.querySelectorAll('video').forEach((video) => video.pause());

      if (this.popup) {

      }
    }

    getCookie() {
      return window.localStorage.getItem(this.id);
    }
    setCookie() {
      window.localStorage.setItem(this.id, JSON.stringify(new Date()));
    }
    disconnectedCallback() {
      if (this._onSectionSelect) {
        document.removeEventListener('shopify:section:select', this._onSectionSelect);
      }
      if (this._onSectionDeselect) {
        document.removeEventListener('shopify:section:deselect', this._onSectionDeselect);
      }
    }
  }
  customElements.define('modal-dialog', ModalDialog);
}
if (!customElements.get('modal-opener')) {
  class ModalOpener extends HTMLElement {
    constructor() {
      super();

      const button = this.querySelector('button');

      if (!button) return;
      button.addEventListener('click', () => {
        const modal = document.querySelector(this.getAttribute('data-modal'));
        if (modal) modal.show(button);
      });
    }
  }
  customElements.define('modal-opener', ModalOpener);
}
