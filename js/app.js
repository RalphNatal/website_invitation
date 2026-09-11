/* ==========================================================================
   The Cantu Collective — invitation
   Vanilla JS, no build step. The three screens are <section>s in index.html;
   this file toggles them. Nothing is routed and nothing reloads.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     Editable content — product names, blurbs, image paths and event details
     live here and nowhere else. `name` is both the label and the alt text.
     `shape` picks the CSS silhouette used if an image cannot load:
     'bottle' | 'jar' | 'jar-wide' | 'tube'.
     ------------------------------------------------------------------------ */

  const PRODUCTS = [
    { name: 'Cantu Ultra Moisture Nourishing Curl Cream',
      blurb: 'Defines and hydrates curls while smoothing frizz, boosting shine, and providing a soft, flexible hold.',
      src: 'assets/products/curl-cream.png', shape: 'jar' },
    { name: 'Cantu Ultra Moisture Nourishing Mask',
      blurb: 'Deeply nourishes dry curls while restoring softness, strengthening strands, and reducing breakage.',
      src: 'assets/products/mask.png', shape: 'jar' },
    { name: 'Cantu Ultra Moisture Nourishing Shampoo',
      blurb: 'Gently cleanses without stripping moisture while strengthening strands and leaving curls soft and hydrated.',
      src: 'assets/products/shampoo.png', shape: 'bottle' },
    { name: 'Cantu Ultra Moisture Nourishing Leave-In Conditioner',
      blurb: 'Provides lightweight, lasting hydration while smoothing frizz, strengthening strands, and enhancing shine.',
      src: 'assets/products/leave-in-conditioner.png', shape: 'bottle' }
  ];

  const EVENT = {
    /* TODO: September 28, 2026 has passed — value kept verbatim from the deck until the client confirms the new date. */
    date:     'September 28, 2026',
    time:     '3:00 — 7:00 PM',   /* true em dash (U+2014), never a hyphen */
    location: 'Damian West Salon 237 W 4th St, New York, NY 10014'
  };

  /* The assessment form. The guest's name is appended as ?name= (encoded). */
  const ASSESSMENT_URL = 'https://tally.so/r/GxGARj';
  const STORAGE_KEY = 'cantu.guestName';

  /* Letters (any script), combining marks, apostrophes, periods, spaces and
     hyphens; 1–40. Periods are allowed so "St. John" reaches the list check. */
  const NAME_PATTERN = /^[\p{L}\p{M}'. -]{1,40}$/u;
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
    /* At the foot of the page nothing can scroll further in, so the 8%
       bottom margin is dropped there — otherwise the last block (the footer)
       can sit inside it forever, out of the observer's reach. */
    const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;
    const limit = window.innerHeight * (atBottom ? 1 : 0.92);
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

      /* Media, name and blurb are direct children, placed by grid areas */
      item.appendChild(media);
      item.appendChild(el('p', 'product__name', product.name));
      item.appendChild(el('p', 'product__blurb', product.blurb));
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

  function clearStoredName() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      /* nothing to clear */
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


  /* ------------------------------------------------------------------------
     Guest list — window.CANTU_GUESTS from js/guests.js. A soft gate: the
     list is readable in the source and editable in devtools (see README).
     ------------------------------------------------------------------------ */

  const MESSAGES = {
    invalid:   'Enter the name on your invitation.',
    unknown:   'Your name is not on the guest list.',
    ambiguous: 'Enter your full name as it appears on your invitation.',
    spelling:  'Check the spelling on your invitation.'
  };
  const MISSES_BEFORE_HELP = 3;

  const fullLookup = new Map();    /* key → canonical name */
  const firstLookup = new Map();   /* key of first name → [canonical names] */
  let gateOpen = false;          /* list failed to load: admit everyone */

  /* Comparison key: trim, collapse whitespace, strip accents (NFD, marks
     removed), lowercase, drop apostrophes, hyphens and periods — and then
     drop the spaces too, so "maria-cristina santos", "MARÍA CRISTINA SANTOS"
     and "Maria   Cristina Santos" are all "mariacristinasantos". */
  function keyFor(value) {
    return String(value || '')
      .trim()
      .replace(/\s+/g, ' ')
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[.'’‘-]/g, '')
      .replace(/ /g, '');
  }

  function buildGuestLookup() {
    const raw = window.CANTU_GUESTS;
    const names = Array.isArray(raw)
      ? raw.filter(function (n) { return typeof n === 'string' && n.trim(); }).map(function (n) { return n.trim(); })
      : [];

    if (!names.length) {
      gateOpen = true;
      console.warn(
        '[Cantu] Guest list did not load: js/guests.js is missing or window.CANTU_GUESTS is not a non-empty array. ' +
        'Failing open — every valid name is admitted.'
      );
      return;
    }

    names.forEach(function (canonical) {
      fullLookup.set(keyFor(canonical), canonical);
      const first = keyFor(canonical.split(/\s+/)[0]);
      if (!firstLookup.has(first)) firstLookup.set(first, []);
      if (firstLookup.get(first).indexOf(canonical) === -1) firstLookup.get(first).push(canonical);
    });
  }

  /* One rule for typed input, ?name= and sessionStorage alike.
     Returns { name } on a match or { error: 'invalid' | 'unknown' | 'ambiguous' }. */
  function resolveGuest(raw) {
    const candidate = normalizeName(raw);
    if (!candidate || !isValidName(candidate)) return { error: 'invalid' };
    if (gateOpen) return { name: titleCase(candidate) };

    const key = keyFor(candidate);
    if (fullLookup.has(key)) return { name: fullLookup.get(key) };

    const byFirst = firstLookup.get(key);
    if (byFirst && byFirst.length === 1) return { name: byFirst[0] };
    if (byFirst && byFirst.length > 1) return { error: 'ambiguous' };

    return { error: 'unknown' };
  }


  /* ------------------------------------------------------------------------
     Page 1 form: resolve, store the canonical name, advance.
     ------------------------------------------------------------------------ */

  const gate = {};   /* elements, filled by initGate */
  let misses = 0;    /* consecutive guest-list misses */

  function clearGateMessage() {
    gate.hintMain.textContent = '';
    gate.hintMore.textContent = '';
    gate.hintMore.hidden = true;
    gate.hint.classList.remove('gate__hint--miss');
    gate.field.classList.remove('is-invalid', 'is-miss');
    gate.input.removeAttribute('aria-invalid');
  }

  /* Show one of the three states. Typed text and focus stay in the input. */
  function showGateError(kind) {
    clearGateMessage();
    gate.hintMain.textContent = MESSAGES[kind];
    gate.input.setAttribute('aria-invalid', 'true');

    if (kind === 'invalid') {
      gate.field.classList.add('is-invalid');
    } else {
      gate.field.classList.add('is-miss');
      gate.hint.classList.add('gate__hint--miss');
      misses += 1;
      if (misses >= MISSES_BEFORE_HELP) {
        gate.hintMore.textContent = MESSAGES.spelling;
        gate.hintMore.hidden = false;
      }
    }

    gate.input.focus();
  }

  function admit(name, options) {
    misses = 0;
    storeName(name);
    setGuestName(name);
    showScreen('invite', options);
  }

  function initGate() {
    gate.form = document.getElementById('gate-form');
    gate.field = document.getElementById('gate-field');
    gate.input = document.getElementById('guest-input');
    gate.hint = document.getElementById('gate-hint');
    gate.hintMain = document.getElementById('gate-hint-main');
    gate.hintMore = document.getElementById('gate-hint-more');

    gate.input.addEventListener('input', clearGateMessage);

    /* The logo lifts while the input has focus (section 7b) */
    gate.input.addEventListener('focus', function () { screenEl.gate.classList.add('is-focused'); });
    gate.input.addEventListener('blur', function () { screenEl.gate.classList.remove('is-focused'); });

    gate.form.addEventListener('submit', function (event) {
      event.preventDefault();

      const result = resolveGuest(gate.input.value);
      if (result.error) {
        showGateError(result.error);
        return;
      }

      /* Clone the gate while it is still visible (and still focused, so the
         lifted logo carries over), then dismiss the soft keyboard. */
      if (motionOK) foldGate(screenEl.gate, gate.input.value);
      gate.input.blur();
      admit(result.name);
    });
  }

  /* Decide the opening screen. ?name= is checked against the list first and
     a miss lands on Page 1 with the message showing; otherwise the stored
     name is re-checked every load, so an edited guests.js takes effect. */
  function openingScreen() {
    let fromUrl = null;
    try {
      fromUrl = new URLSearchParams(window.location.search).get('name');
    } catch (error) {
      fromUrl = null;
    }

    if (fromUrl !== null) {
      const linked = resolveGuest(fromUrl);
      if (linked.name) {
        admit(linked.name, { focus: false });
        return;
      }
      gate.input.value = normalizeName(fromUrl);
      showScreen('gate', { focus: false });
      showGateError(linked.error);
      return;
    }

    const stored = readStoredName();
    if (stored !== null) {
      const known = resolveGuest(stored);
      if (known.name) {
        admit(known.name, { focus: false });
        return;
      }
      clearStoredName();
    }

    showScreen('gate', { focus: false });
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

    buildGuestLookup();
    initGate();

    /* Any [data-goto] control advances to the named screen. */
    document.querySelectorAll('[data-goto]').forEach(function (control) {
      control.addEventListener('click', function (event) {
        event.preventDefault();
        showScreen(control.dataset.goto);
      });
    });

    openingScreen();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
