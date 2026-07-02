/**
 *  @class
 *  @function LayeredImages
 */

if (!customElements.get('layered-images')) {
 	class LayeredImages extends HTMLElement {
	  constructor() {
			super();
	  }
		connectedCallback() {
			this.scrollTriggers = [];
			if ( document.body.classList.contains('animations-true') && typeof gsap !== 'undefined') {
				this.prepareAnimations();
			}
		}
		disconnectedCallback() {
			this.scrollTriggers.forEach(st => st.kill());
			this.scrollTriggers = [];
		}
		prepareAnimations() {
			let section = this.closest('.shopify-section'),
					image_1 = section.querySelector('.layered-image-1'),
					image_2 = section.querySelector('.layered-image-2'),
					image_3 = section.querySelector('.layered-image-3');

			let property = () => {
		  	return gsap.getProperty("html", "--header-height", "px");
			};
			let tween1 = gsap.to(image_1, {
        y: '-8%',
				ease: "power1.out",
        scrollTrigger: {
					trigger: this,
          scrub: 1,
          start: () => `top 90%`,
          end: () => `bottom top+=${property()}`
        }
      });
			this.scrollTriggers.push(tween1.scrollTrigger);

			let tween2 = gsap.to(image_2, {
        y: '30%',
				ease: "power1.out",
        scrollTrigger: {
					trigger: this,
          scrub: 1,
          start: () => `top 90%`,
          end: () => `bottom top+=${property()}`
        }
      });
			this.scrollTriggers.push(tween2.scrollTrigger);

			let tween3 = gsap.to(image_3, {
        y: '-30%',
				ease: "power1.out",
        scrollTrigger: {
					trigger: this,
          scrub: 1,
          start: () => `top 90%`,
          end: () => `bottom top+=${property()}`
        }
      });
			this.scrollTriggers.push(tween3.scrollTrigger);

		}
	}
	customElements.define('layered-images', LayeredImages);
}
