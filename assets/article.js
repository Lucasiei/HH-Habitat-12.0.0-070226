class ArticleNavigation extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    let _this = this;
    this._controller = new AbortController();
    const signal = this._controller.signal;
    setTimeout(() => {
      _this.progress_bar = document.getElementById('progress-bar');
      window.addEventListener('resize', function() {
        let h = document.querySelector('.header').offsetHeight - 1;
        if (window.innerWidth < 769) {
          document.documentElement.style.setProperty('--article-nav-offset-mobile', h + 'px');
        } else {
          document.documentElement.style.setProperty('--article-nav-offset-desktop', h + 'px');
        }
      }, { signal });
      window.dispatchEvent(new Event('resize'));

      _this._observer = new IntersectionObserver(function(entries) {
        if (entries[0].intersectionRatio === 0) {
          _this.classList.add("navigation--sticky");
        } else if (entries[0].intersectionRatio === 1) {
          _this.classList.remove("navigation--sticky");
        }
      }, {
        threshold: [0, 1]
      });

      _this._observer.observe(document.querySelector(".blog-post-detail--sticky"));

      function stretch() {
        const pixelScrolled = window.scrollY;
        const viewportHeight = window.innerHeight;
        const totalHeightScrollable = document.body.scrollHeight;
        const pixelsToPercentage = (pixelScrolled / (totalHeightScrollable - viewportHeight));
        _this.progress_bar.style.transform = 'scale(' + pixelsToPercentage + ', 1)';
      }

      window.addEventListener('scroll', stretch, { signal });
      window.dispatchEvent(new Event('scroll'));
    });
  }
  disconnectedCallback() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
  }
}
customElements.define('article-navigation', ArticleNavigation);