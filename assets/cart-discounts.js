/**
 *  @class
 *  @function CartDiscounts
 */
if (!customElements.get('cart-discounts')) {
	class CartDiscounts extends HTMLElement {

		constructor() {
			super();
		}

		connectedCallback() {
			this.abortController = new AbortController();
			this.discounts();
		}

		disconnectedCallback() {
			this.abortController?.abort();
		}

		getSectionsToRender() {
			return [{
				id: 'Cart',
				section: 'main-cart',
				selector: '.thb-cart-form'
			}, {
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

		discounts() {
			const button = this.querySelector('.cart-discounts--button');
			const input = this.querySelector('.cart-discounts--input');
			const remove_discount_buttons = this.querySelectorAll('.cart-discounts--remove');

			if (button) {
				button.addEventListener('click', (event) => {
					event.preventDefault();
					button.classList.add('loading');
					this.updateDiscount();
				}, { signal: this.abortController.signal });
			}

			if (input) {
				input.addEventListener('keydown', (event) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						if (button) {
							button.classList.add('loading');
						}
						this.updateDiscount();
					}
				}, { signal: this.abortController.signal });
			}

			remove_discount_buttons.forEach((btn) => {
				btn.addEventListener('click', this.removeDiscount.bind(this), { signal: this.abortController.signal });
			});
		}

		updateDiscount() {
			const discountCode = this.querySelector('.cart-discounts--input');
			const discountCodeValue = discountCode.value.trim();

			if (!discountCodeValue) return;

			const existingDiscounts = this.existingDiscounts();

			if (existingDiscounts.includes(discountCodeValue)) return;
			existingDiscounts.push(discountCodeValue);

			this.renderDiscounts(existingDiscounts, discountCodeValue);
		}

		removeDiscount(event) {
			const row = event.target.closest('.cart-discounts--row');
			const pill = row.querySelector('.cart-discounts--name');
			const discountCode = pill.textContent.trim();
			const existingDiscounts = this.existingDiscounts();
			const index = existingDiscounts.indexOf(discountCode);
			if (index === -1) return;

			existingDiscounts.splice(index, 1);

			this.renderDiscounts(existingDiscounts);
		}

		existingDiscounts() {
			const discountCodes = [];
			const discountPills = this.querySelectorAll('.cart-discounts--name');
			for (const pill of discountPills) {
				discountCodes.push(pill.textContent.trim());
			}
			return discountCodes;
		}

		renderDiscounts(existingDiscounts, discountCodeValue) {
			const body = JSON.stringify({
				discount: existingDiscounts.join(','),
				sections: this.getSectionsToRender().map((section) => section.section),
				sections_url: window.location.pathname
			});

			this.querySelectorAll('.cart-discounts--error').forEach((el) => {
				el.setAttribute('hidden', '');
			});

			fetch(`${theme.routes.cart_update_url}.js`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				},
				body: body
			})
				.then((response) => response.text())
				.then((state) => {
					const parsedState = JSON.parse(state);

					const discountPanel = document.getElementById('mini-cart-discount');
					const wasDiscountOpen = discountPanel && discountPanel.classList.contains('active');

					this.getSectionsToRender().forEach((section) => {
						const elementToReplace = document.getElementById(section.id)?.querySelector(section.selector) || document.getElementById(section.id);

						if (parsedState.sections && elementToReplace) {
							elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
						}
					});

					if (wasDiscountOpen) {
						const panel = document.getElementById('mini-cart-discount');
						const toggle = document.getElementById('discount-toggle');
						if (panel) panel.classList.add('active');
						if (toggle) toggle.setAttribute('aria-expanded', 'true');
					}

					if (discountCodeValue && parsedState.discount_codes && parsedState.discount_codes.find((discount) => {
						return discount.code === discountCodeValue && discount.applicable === false;
					})) {
						setTimeout(() => {
							document.querySelectorAll('.cart-discounts--error').forEach((el) => {
								el.removeAttribute('hidden');
							});
						}, 300);
					}
				});
		}
	}
	customElements.define('cart-discounts', CartDiscounts);
}

/**
 *  Discount toggle overlay for cart drawer (event delegation)
 */
document.addEventListener('click', (event) => {
	const toggle = document.getElementById('discount-toggle');
	if (event.target.closest('#discount-toggle')) {
		const content = document.getElementById('mini-cart-discount');
		if (content) {
			content.classList.add('active');
			if (toggle) toggle.setAttribute('aria-expanded', 'true');
		}
	}
	if (event.target.closest('.discount-toggle__close') || event.target.closest('.discount-toggle__content-overlay')) {
		const content = document.getElementById('mini-cart-discount');
		if (content) {
			content.classList.remove('active');
			if (toggle) toggle.setAttribute('aria-expanded', 'false');
		}
	}
});
