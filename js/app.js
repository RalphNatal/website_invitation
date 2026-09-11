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

  /* The assessment form. The guest's name is appended as ?name= (encoded). */
  const ASSESSMENT_URL = 'https://tally.so/r/GxGARj';
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
    if (name !== 'gate') enterScreen(screenEl[name]);
  }


  /* ------------------------------------------------------------------------
     Motion. Every visual state below is also defined in CSS behind
     prefers-reduced-motion; with reduced motion on, none of this runs and
     everything is simply visible.
     ------------------------------------------------------------------------ */

  const motionOK = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: no-preference)').matches);

  const REVEAL_STAGGER = 200;   /* ms between blocks revealed together */
  const REVEAL_SAFETY = 3000;   /* ms before anything still hidden in view is forced visible */

  function domOrder(a, b) {
    return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
  }

  function pendingReveals(section) {
    return Array.prototype.filter.call(section.querySelectorAll('[data-reveal]'), function (node) {
      return !node.classList.contains('is-visible');
    });
  }

  /* Blocks revealed in the same batch cascade 200ms apart, in DOM order. */
  function revealBatch(nodes) {
    nodes.sort(domOrder).forEach(function (node, index) {
      node.style.setProperty('--reveal-delay', (index * REVEAL_STAGGER) + 'ms');
      node.classList.add('is-visible');
    });
  }

  function revealInView(section) {
    const limit = window.innerHeight * 0.92;
    revealBatch(pendingReveals(section).filter(function (node) {
      return node.getBoundingClientRect().top < limit;
    }));
  }

  /* Elements inside a hidden section never intersect, so the observer is
     created here — after the section is unhidden — not at init. */
  function observeReveals(section) {
    const pending = pendingReveals(section);
    if (!pending.length) return;

    if (!('IntersectionObserver' in window)) {
      revealBatch(pending);
      return;
    }

    const observer = new IntersectionObserver(function (entries) {
      const batch = entries
        .filter(function (entry) { return entry.isIntersecting; })
        .map(function (entry) { return entry.target; })
        .filter(function (node) { return !node.classList.contains('is-visible'); });

      revealBatch(batch);
      batch.forEach(function (node) { observer.unobserve(node); });
      if (!pendingReveals(section).length) observer.disconnect();
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });

    pending.forEach(function (node) { observer.observe(node); });

    /* Belt and braces: if the observer never fires, scrolling still reveals. */
    let queued = false;
    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        revealInView(section);
        if (!pendingReveals(section).length) window.removeEventListener('scroll', onScroll);
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Entrance for Pages 2 and 3. Runs once per screen. */
  function enterScreen(section) {
    if (!motionOK || !section || section.dataset.entered) return;
    section.dataset.entered = 'true';

    /* Applied synchronously so the first paint already holds the start state. */
    section.classList.add('is-entering');

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        section.classList.add('is-open');
        observeReveals(section);
      });
    });

    /* Safety: nothing in view may stay hidden because a callback never fired. */
    setTimeout(function () { revealInView(section); }, REVEAL_SAFETY);
  }

  /* The gate-fold: two clipped clones of Page 1 swing open over Page 2.
     The clone is inert and pointer-events: none, and is removed on
     transitionend or after 1500ms, whichever comes first. */
  function foldGate(gate, typedValue) {
    const wrap = el('div', 'gate-fold');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.setAttribute('inert', '');

    ['left', 'right'].forEach(function (side) {
      const half = el('div', 'gate-fold__half gate-fold__half--' + side);
      const clone = gate.cloneNode(true);
      clone.hidden = false;
      clone.classList.add('gate-fold__clone');
      clone.removeAttribute('id');
      clone.removeAttribute('aria-labelledby');
      clone.querySelectorAll('[id]').forEach(function (node) { node.removeAttribute('id'); });

      /* cloneNode copies attributes, not the typed value */
      const input = clone.querySelector('input');
      if (input) input.value = typedValue;

      half.appendChild(clone);
      wrap.appendChild(half);
    });

    document.body.appendChild(wrap);

    let done = false;
    function finish() {
      if (done) return;
      done = true;
      wrap.remove();
    }

    wrap.addEventListener('transitionend', function (event) {
      if (event.propertyName === 'transform' && event.target.classList.contains('gate-fold__half')) finish();
    });
    setTimeout(finish, 1500);

    void wrap.offsetWidth;   /* commit the closed state before opening */
    requestAnimationFrame(function () { wrap.classList.add('is-open'); });
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
     and the assessment URL only via encodeURIComponent.
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

    /* The desktop link to the assessment carries the same name the QR will. */
    const link = document.getElementById('assessment-link');
    if (link) link.href = ASSESSMENT_URL + '?name=' + encodeURIComponent(name);
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

    /* The logo lifts while the input has focus (section 7b) */
    input.addEventListener('focus', function () { screenEl.gate.classList.add('is-focused'); });
    input.addEventListener('blur', function () { screenEl.gate.classList.remove('is-focused'); });

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

      /* Clone the gate while it is still visible (and still focused, so the
         lifted logo carries over), then dismiss the soft keyboard. */
      if (motionOK) foldGate(screenEl.gate, input.value);
      input.blur();
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
