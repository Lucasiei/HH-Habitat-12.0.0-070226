/**
 *  @class
 *  @function BackgroundVideo
 */
if (!customElements.get('background-video')) {
	class BackgroundVideo extends HTMLElement {
		constructor() {
			super();
		}
		connectedCallback() {
			this.timeline = null;
			this.observer = null;
			if (document.body.classList.contains('animations-true') && typeof gsap !== 'undefined') {
				this.prepareAnimations();
			}
			// Deferred video loading via IntersectionObserver.
			let video_container = this.querySelector('.background-video__iframe');
			let template = video_container?.querySelector('.background-video__deferred');

			if (template) {
				this.observer = new IntersectionObserver((entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							this.observer.disconnect();
							this.observer = null;
							let clone = template.content.cloneNode(true);
							video_container.appendChild(clone);
							template.remove();

							let iframe = video_container.querySelector('iframe');
							if (iframe) {
								iframe.onload = () => {
									this.videoPlay(video_container);
								};
							}
						}
					});
				}, { rootMargin: '100px' });

				this.observer.observe(video_container);
			}
		}
		videoPlay(video_container) {
			setTimeout(() => {
				if (video_container.dataset.provider === 'youtube') {
					video_container.querySelector('iframe').contentWindow.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: "" }), "*");
				} else if (video_container.dataset.provider === 'vimeo') {
					video_container.querySelector('iframe').contentWindow.postMessage(JSON.stringify({ method: "play" }), "*");
				}
			}, 10);
		}
		disconnectedCallback() {
			if (this.observer) {
				this.observer.disconnect();
				this.observer = null;
			}
			if (this.timeline) {
				this.timeline.scrollTrigger?.kill();
				this.timeline.kill();
				this.timeline = null;
			}
		}
		prepareAnimations() {
			let section = this,
				tl = this.timeline = gsap.timeline({
					scrollTrigger: {
						trigger: section,
						start: "top center",
						end: "bottom bottom"
					}
				}),
				button_offset = 0;

			document.fonts.ready.then(function () {
				new SplitText(section.querySelectorAll('h3, p'), {
					type: 'lines, words',
					linesClass: 'line-child'
				}
				);

				if (section.querySelector('h3')) {
					let h3_duration = 0.7 + ((section.querySelectorAll('h3 .line-child div').length - 1) * 0.05);
					tl
						.from(section.querySelectorAll('h3 .line-child div'), {
							duration: h3_duration,
							yPercent: '100',
							stagger: 0.05
						}, 0);
					button_offset += h3_duration;
				}
				if (section.querySelector('p')) {
					let p_duration = 0.7 + ((section.querySelectorAll('p .line-child div').length - 1) * 0.02);
					tl
						.from(section.querySelectorAll('p .line-child div'), {
							duration: p_duration,
							yPercent: '100',
							stagger: 0.02
						}, 0);
					button_offset += p_duration;
				}
				if (section.querySelector('.video-lightbox-modal__button')) {
					tl.fromTo(section.querySelector('.video-lightbox-modal__button'), {
						autoAlpha: 0
					}, {
						duration: 0.5,
						autoAlpha: 1
					}, button_offset * 0.4);
				}

			});
		}
	}
	customElements.define('background-video', BackgroundVideo);
}
