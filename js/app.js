/* ==========================================================================
   The Cantu Collective — invitation
   Vanilla JS, no build step. The three screens are <section>s in index.html;
   this file toggles them. Nothing is routed and nothing reloads.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     Editable content — product names, image paths and event details live
     here and nowhere else. Captions are shown uppercase by CSS.
     `shape` picks the CSS silhouette used if an image cannot load:
     'bottle' | 'jar' | 'tube'.
     ------------------------------------------------------------------------ */

  const PRODUCTS = [
    { caption: 'Cleanse', name: 'Ultra Moisture Nourishing Shampoo',              src: 'assets/products/cleanse.png', shape: 'bottle' },
    { caption: 'Restore', name: 'Ultra Moisture Nourishing Mask',                 src: 'assets/products/restore.png', shape: 'jar' },
    { caption: 'Define',  name: 'Ultra Moisture Nourishing Curling Cream',        src: 'assets/products/define.png',  shape: 'jar' },
    { caption: 'Protect', name: 'Ultra Moisture Nourishing Leave-In Conditioner', src: 'assets/products/protect.png', shape: 'tube' }
  ];

  const EVENT = {
    /* TODO: June 21, 2024 has passed — value kept verbatim from the deck until the client confirms the new date. */
    date:     'June 21, 2024',
    time:     '6:00 — 9:00 PM',   /* true em dash (U+2014), never a hyphen */
    location: 'New York City'
  };

  const TALLY_EMBED = 'https://tally.so/embed/GxGARj';
  const STORAGE_KEY = 'cantu.guestName';


  /* ------------------------------------------------------------------------
     Screens
     ------------------------------------------------------------------------ */

  const SCREENS = ['gate', 'invite', 'assess'];
  const screenEl = {};
  let currentScreen = null;

  const themeMeta = document.querySelector('meta[name="theme-color"]');

  /* Read a colour token from CSS so the palette has one source of truth. */
  function token(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function showScreen(name, options) {
    const opts = Object.assign({ focus: true }, options);
    const next = screenEl[name];
    if (!next || name === currentScreen) return;

    SCREENS.forEach(function (key) {
      screenEl[key].hidden = key !== name;
    });
    currentScreen = name;
    document.body.dataset.screen = name;

    if (themeMeta) {
      themeMeta.setAttribute('content', token(name === 'gate' ? '--rust-deep' : '--sand'));
    }

    window.scrollTo(0, 0);

    /* Move focus to the new screen's heading so screen readers follow along. */
    if (opts.focus) {
      const heading = next.querySelector('[tabindex="-1"]');
      if (heading) heading.focus({ preventScroll: true });
    }
  }


  /* ------------------------------------------------------------------------
     Images — never leave a broken image icon. An <img data-guard> whose
     sibling carries [data-fallback] swaps to that sibling if it fails.
     ------------------------------------------------------------------------ */

  function guardImage(img) {
    const fallback = img.parentElement.querySelector('[data-fallback]');

    function fail() {
      img.hidden = true;
      if (fallback) fallback.hidden = false;
    }

    img.addEventListener('error', fail, { once: true });

    /* It may already have failed before this script ran. decode() rejects on
       a failed load and does not depend on intrinsic size (SVG-safe). */
    if (img.complete) {
      if (typeof img.decode === 'function') {
        img.decode().catch(fail);
      } else if (img.naturalWidth === 0) {
        fail();
      }
    }
  }


  /* ------------------------------------------------------------------------
     Rendering — content from the config objects above. Text goes in through
     textContent only.
     ------------------------------------------------------------------------ */

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderEvent() {
    const list = document.getElementById('event-details');
    if (!list) return;

    [['Date', EVENT.date], ['Time', EVENT.time], ['Location', EVENT.location]].forEach(function (pair) {
      const item = el('div', 'event__item');
      item.appendChild(el('dt', 'label event__key', pair[0]));
      item.appendChild(el('dd', 'event__value', pair[1]));
      list.appendChild(item);
    });
  }

  function renderProducts() {
    const list = document.getElementById('products');
    if (!list) return;

    PRODUCTS.forEach(function (product) {
      const item = el('li', 'product');
      const figure = el('figure', 'product__figure');
      const media = el('div', 'product__media');

      const img = document.createElement('img');
      img.src = product.src;
      img.alt = product.name;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.setAttribute('data-guard', '');

      const fallback = el('div', 'product__fallback');
      fallback.hidden = true;
      fallback.setAttribute('data-fallback', '');
      fallback.setAttribute('aria-hidden', 'true');
      fallback.appendChild(el('span', 'bottle bottle--' + product.shape));

      media.appendChild(img);
      media.appendChild(fallback);
      figure.appendChild(media);
      figure.appendChild(el('figcaption', 'label product__caption', product.caption));
      item.appendChild(figure);
      list.appendChild(item);
    });
  }


  /* ------------------------------------------------------------------------
     Init
     ------------------------------------------------------------------------ */

  function init() {
    SCREENS.forEach(function (key) {
      screenEl[key] = document.getElementById('screen-' + key);
    });

    renderEvent();
    renderProducts();
    document.querySelectorAll('img[data-guard]').forEach(guardImage);

    /* Page 1: Enter in the input or the Reveal link both submit this form.
       Validation and name handling arrive in checkpoint 3. */
    const gateForm = document.getElementById('gate-form');
    gateForm.addEventListener('submit', function (event) {
      event.preventDefault();
      showScreen('invite');
    });

    /* Any [data-goto] control advances to the named screen. */
    document.querySelectorAll('[data-goto]').forEach(function (control) {
      control.addEventListener('click', function (event) {
        event.preventDefault();
        showScreen(control.dataset.goto);
      });
    });

    showScreen('gate', { focus: false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
