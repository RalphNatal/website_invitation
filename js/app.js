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
     ------------------------------------------------------------------------ */

  const PRODUCTS = [
    { caption: 'Cleanse', name: 'Ultra Moisture Nourishing Shampoo',              src: 'assets/products/cleanse.png' },
    { caption: 'Restore', name: 'Ultra Moisture Nourishing Mask',                 src: 'assets/products/restore.png' },
    { caption: 'Define',  name: 'Ultra Moisture Nourishing Curling Cream',        src: 'assets/products/define.png' },
    { caption: 'Protect', name: 'Ultra Moisture Nourishing Leave-In Conditioner', src: 'assets/products/protect.png' }
  ];

  const EVENT = {
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
     Init
     ------------------------------------------------------------------------ */

  function init() {
    SCREENS.forEach(function (key) {
      screenEl[key] = document.getElementById('screen-' + key);
    });

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
