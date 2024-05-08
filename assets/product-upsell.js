if (!customElements.get('upsell-products')) {
  customElements.define(
    'upsell-products',
    class UpsellProducts extends HTMLElement {
      constructor() {
        super();
        this.addToCartButtons = this.querySelectorAll('.upsell__item .upsell__add-to-cart');
        this.sliderItems = this.querySelectorAll('.upsell__item');
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
      }

      initSlider () {
        this.slider = this.querySelector('.upsell__gallery');
        this.prevButton = this.querySelector('button[name="previous"]');
        this.nextButton = this.querySelector('button[name="next"]');
        this.sliderItemsToShow = Array.from(this.sliderItems).filter((element) => element.clientWidth > 0);
        this.sliderItemOffset = this.sliderItemsToShow[1].offsetLeft - this.sliderItemsToShow[0].offsetLeft;
        this.navUpdate();
      }

      isSlideVisible(element, offset = 0) {
        const lastVisibleSlide = this.slider.clientWidth + this.slider.scrollLeft - offset;
        return element.offsetLeft + element.clientWidth <= Math.round(lastVisibleSlide) && element.offsetLeft >= this.slider.scrollLeft;
      }

      navUpdate () {
        if (!this.nextButton) return;
        if (this.isSlideVisible(this.sliderItemsToShow[0]) && this.slider.scrollLeft === 0) {
          this.prevButton.setAttribute('disabled', 'disabled');
        } else {
          this.prevButton.removeAttribute('disabled');
        }
        if (this.isSlideVisible(this.sliderItemsToShow[this.sliderItemsToShow.length - 1])) {
          this.nextButton.setAttribute('disabled', 'disabled');
        } else {
          this.nextButton.removeAttribute('disabled');
        }
      }

      onNavButtonClick(event) {
        event.preventDefault();
        const step = event.currentTarget.dataset.step || 1;
        this.slideScrollPosition =
          event.currentTarget.name === 'next'
            ? this.slider.scrollLeft + step * this.sliderItemOffset
            : this.slider.scrollLeft - step * this.sliderItemOffset;
        this.setSlidePosition(this.slideScrollPosition);
      }

      setSlidePosition(position) {
        this.slider.scrollTo({
          left: position,
        });
      }

      async onAddToCartHandler(event) {
        event.preventDefault();

        const button = event.currentTarget
        const spinner = button.querySelector('.loading__spinner');
        const form = button.closest('form');
        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(form);
        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        button.classList.add('loading');
        spinner.classList.remove('hidden');

        fetch(`${routes.cart_add_url}`, config)
        .then((response) => response.json())
        .then((response) => {
          publish(PUB_SUB_EVENTS.cartUpdate, {
            source: 'product-form',
            productVariantId: formData.get('id'),
            cartData: response,
          });
          if (this.cart) {
            this.cart.renderContents(response);
          } else {
            window.location = window.routes.cart_url;
          }
        })
        .catch((error) => {
          console.error('Error:', error);
        })
        .finally(() => {
          button.classList.remove('loading');
          if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
          spinner.classList.add('hidden');
        });
      }

      connectedCallback() {
        this.addToCartButtons.forEach(button => {
          button.addEventListener('click', this.onAddToCartHandler.bind(this));
        })
        if (this.sliderItems.length > 3) {
          this.initSlider();
          this.slider.addEventListener('scroll', this.navUpdate.bind(this));
          this.prevButton.addEventListener('click', this.onNavButtonClick.bind(this));
          this.nextButton.addEventListener('click', this.onNavButtonClick.bind(this));
        }
      }
    }
  );
}
