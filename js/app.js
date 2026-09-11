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
  const TALLY_WIDGET = 'https://tally.so/widgets/embed.js';
  const STORAGE_KEY = 'cantu.guestName';

  /* Letters (any script), combining marks, apostrophes, spaces and hyphens; 1–40. */
  const NAME_PATTERN = /^[\p{L}\p{M}' -]{1,40}$/u;
  const NAME_SCALE_FROM = 12;   /* names longer than this step the hero size down */


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

    afterShow(name);
  }

  /* Per-screen work that must wait until the section is actually visible. */
  function afterShow(name) {
    if (name === 'assess') initTally();
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
     Guest name — untrusted input. It reaches the DOM only via textContent
     and the Tally URL only via encodeURIComponent.
     ------------------------------------------------------------------------ */

  let guestName = '';

  /* Trim, collapse runs of whitespace, and straighten the curly apostrophes
     iOS types by default so "O’Neil" passes the same rule as "O'Neil". */
  function normalizeName(raw) {
    return String(raw || '')
      .replace(/[‘’]/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isValidName(value) {
    return NAME_PATTERN.test(value);
  }

  /* "maria cristina" → "Maria Cristina", "o'neil" → "O'Neil", "jean-luc" → "Jean-Luc" */
  function titleCase(value) {
    return value.toLowerCase().replace(/(^|[ '-])(\p{L})/gu, function (match, sep, letter) {
      return sep + letter.toUpperCase();
    });
  }

  function readStoredName() {
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;   /* private-mode Safari throws here */
    }
  }

  function storeName(name) {
    try {
      sessionStorage.setItem(STORAGE_KEY, name);
    } catch (error) {
      /* Storage unavailable — the name still lives in memory for this visit. */
    }
  }

  function setGuestName(name) {
    guestName = name;
    const target = document.getElementById('guest-name');
    if (!target) return;

    target.textContent = name + ',';

    /* Long names step the hero size down in proportion so the card never breaks. */
    const scale = name.length > NAME_SCALE_FROM ? NAME_SCALE_FROM / name.length : 1;
    target.style.setProperty('--name-scale', String(Math.max(scale, 0.55)));
  }

  /* Page 1 form: validate, store, advance. */
  function initGate() {
    const form = document.getElementById('gate-form');
    const field = document.getElementById('gate-field');
    const input = document.getElementById('guest-input');
    const hint = document.getElementById('gate-hint');

    function clearHint() {
      hint.textContent = '';
      field.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
    }

    input.addEventListener('input', clearHint);

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      const candidate = normalizeName(input.value);
      if (!isValidName(candidate)) {
        hint.textContent = 'Enter the name on your invitation.';
        field.classList.add('is-invalid');
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }

      const name = titleCase(candidate);
      storeName(name);
      setGuestName(name);
      showScreen('invite');
    });
  }

  /* Name from ?name= wins, then sessionStorage. Both go through the same rule. */
  function resolveInitialName() {
    let fromUrl = null;
    try {
      fromUrl = new URLSearchParams(window.location.search).get('name');
    } catch (error) {
      fromUrl = null;
    }

    const linked = normalizeName(fromUrl);
    if (linked && isValidName(linked)) return titleCase(linked);

    const stored = normalizeName(readStoredName());
    if (stored && isValidName(stored)) return stored;

    return '';
  }


  /* ------------------------------------------------------------------------
     Tally — the src is built here so the guest's name is in it before the
     widget script runs. Loaded once, the first time Page 3 is shown.
     ------------------------------------------------------------------------ */

  let tallyStarted = false;

  function initTally() {
    if (tallyStarted) return;
    tallyStarted = true;

    const frame = document.getElementById('tally-frame');
    if (!frame) return;

    let src = TALLY_EMBED + '?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1';
    if (guestName) src += '&name=' + encodeURIComponent(guestName);
    frame.setAttribute('data-tally-src', src);

    /* dynamicHeight arrives by postMessage once the form is up. If the frame
       is still at its initial height a while after loading, give it a fixed
       minimum rather than a nested scrollbar. */
    frame.addEventListener('load', function () {
      setTimeout(function () {
        if (frame.offsetHeight < 260) frame.classList.add('tally__frame--fixed');
      }, 3000);
    }, { once: true });

    const script = document.createElement('script');
    script.src = TALLY_WIDGET;
    script.async = true;
    script.onload = function () {
      if (window.Tally && typeof window.Tally.loadEmbeds === 'function') window.Tally.loadEmbeds();
    };
    script.onerror = function () {
      /* Widget blocked: load the form directly, at the fixed height. */
      frame.src = src;
      frame.classList.add('tally__frame--fixed');
    };
    document.body.appendChild(script);
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

    initGate();

    /* Any [data-goto] control advances to the named screen. */
    document.querySelectorAll('[data-goto]').forEach(function (control) {
      control.addEventListener('click', function (event) {
        event.preventDefault();
        showScreen(control.dataset.goto);
      });
    });

    const name = resolveInitialName();
    if (name) {
      storeName(name);
      setGuestName(name);
      showScreen('invite', { focus: false });
    } else {
      showScreen('gate', { focus: false });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
