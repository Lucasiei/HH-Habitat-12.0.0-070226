/**
 *  @class
 *  @function PredictiveSearch
 */
class PredictiveSearch {
  constructor() {
    this.container = document.querySelector('.thb-quick-search');
    this.button = document.getElementById('quick-search');
    this.close_button = this.container.querySelector('.thb-search-close');
    this.input = this.container.querySelector('input[type="search"]');
    this.predictiveSearchResults = this.container.querySelector('.thb-quick-search--results');
    this.cache = new Map();
    this.controller = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    const form = this.container.querySelector('form.searchform');
    form.addEventListener('submit', this.onFormSubmit.bind(this));

    this.input.addEventListener('input', debounce((event) => {
      this.onChange(event);
    }, 300).bind(this));

    this.button.addEventListener('click', (event) => {
      event.preventDefault();
      document.querySelector('.header-section').classList.toggle('search-open');

      if (document.querySelector('.header-section').classList.contains('search-open')) {
        setTimeout(() => {
          this.input.focus({
            preventScroll: true
          });
        }, 100);
        dispatchCustomEvent('search:open');
      }
    });

    // Close.
    this.close_button.addEventListener('click', (event) => {
      this.close();
      event.preventDefault();
    });
    document.addEventListener('keyup', (event) => {
      if (event.key === 'Escape') {
        this.close();
      }
    });
  }

  categoryToggle() {
    this.category_toggle = this.container.querySelectorAll('.search-categories a');

    this.category_toggle.forEach((link) => {
      link.addEventListener('click', (event) => {
        [].forEach.call(this.category_toggle, function (el) {
          el.classList.remove('active');
        });
        link.classList.add('active');
        let target = link.getAttribute('href');
        this.container.querySelectorAll('.search-results').forEach((section) => {
          section.classList.remove('active');
        });
        this.container.querySelector(target).classList.add('active');

        event.preventDefault();
      });
    });
  }

  getQuery() {
    return this.input.value.trim();
  }

  onChange() {
    const searchTerm = this.getQuery();

    if (!searchTerm.length) {
      this.predictiveSearchResults.classList.remove('active');
      return;
    }

    this.getSearchResults(searchTerm);
  }

  onFormSubmit(event) {
    if (!this.getQuery().length) {
      event.preventDefault();
    }
  }

  onFocus() {
    const searchTerm = this.getQuery();

    if (!searchTerm.length) {
      return;
    }

    this.getSearchResults(searchTerm);
  }

  getSearchResults(searchTerm) {
    if (this.controller) {
      this.controller.abort();
    }
    this.controller = new AbortController();

    // Serve from cache if available
    if (this.cache.has(searchTerm)) {
      this.renderSearchResults(this.cache.get(searchTerm));
      return;
    }

    this.predictiveSearchResults.classList.add('loading');

    const params = new URLSearchParams({
      q: searchTerm,
      'resources[type]': 'product,article,query,page',
      'resources[limit]': '10',
      'resources[options][fields]': 'title,product_type,vendor,variants.title,variants.sku',
      section_id: 'predictive-search'
    });

    fetch(`${theme.routes.predictive_search_url}?${params.toString()}`, { signal: this.controller.signal })
      .then((response) => {
        this.predictiveSearchResults.classList.remove('loading');
        if (!response.ok) {
          throw new Error(response.status);
        }
        return response.text();
      })
      .then((text) => {
        const resultsMarkup = new DOMParser().parseFromString(text, 'text/html').querySelector('#shopify-section-predictive-search').innerHTML;

        // Cap cache size
        if (this.cache.size >= 50) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
        this.cache.set(searchTerm, resultsMarkup);

        this.renderSearchResults(resultsMarkup);
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          return;
        }
        this.predictiveSearchResults.classList.remove('loading');
        this.predictiveSearchResults.classList.remove('active');
      });
  }

  renderSearchResults(resultsMarkup) {
    this.predictiveSearchResults.innerHTML = resultsMarkup;

    this.predictiveSearchResults.classList.add('active');

    this.categoryToggle();
  }

  open() {
    document.querySelector('.header-section').classList.add('search-open');
  }

  close() {
    document.querySelector('.header-section').classList.remove('search-open');
  }
}
window.addEventListener('load', () => {
  if (typeof PredictiveSearch !== 'undefined') {
    new PredictiveSearch();
  }
});
