# The Cantu Collective — invitation

A single-page, three-screen invitation for the Cantu Collective event. A guest
signs their name on the gate, the invitation unfolds, and the assessment page
carries the guest flow, the hair cocktail products, and the Tally survey
pre-filled with their name.

Vanilla HTML, CSS and JavaScript. No build step, no bundler, no npm install.
The only external resources are Google Fonts and Tally's embed script.

## Run it

Open the folder in VS Code and use the **Live Server** extension on
`index.html`, or from a terminal:

```
npx serve .
```

Deploys as a static folder (Vercel: framework preset "Other", no build command,
output directory `.`).

To test the deep link: `index.html?name=Jasmine`. To return to the gate after
entering a name, close the tab (the name lives in `sessionStorage`, key
`cantu.guestName`).

## Files

```
index.html        three <section> screens, all copy, inline SVG (corner sprigs, flow icons)
css/style.css     tokens, reset, type roles, screens, content, motion
js/app.js         PRODUCTS / EVENT config, screen toggle, name handling, Tally, motion
assets/           supplied artwork (see below)
```

## Assets still to drop in

Everything below renders with a fallback until the file exists, so the site is
never broken without them.

| Path | What | Fallback today |
| --- | --- | --- |
| `assets/logo-cantu.svg` | The cantu® wordmark | Text wordmark set in Jost |
| `assets/products/cleanse.png` | Ultra Moisture Nourishing Shampoo | CSS bottle silhouette |
| `assets/products/restore.png` | Ultra Moisture Nourishing Mask | CSS jar silhouette |
| `assets/products/define.png` | Ultra Moisture Nourishing Curling Cream | CSS jar silhouette |
| `assets/products/protect.png` | Ultra Moisture Nourishing Leave-In Conditioner | CSS tube silhouette |

Product PNGs: transparent background, roughly 800px tall. They are displayed at
a maximum height of 180px with `object-fit: contain`.

The corner leaf border is inline SVG in `index.html` (one `<symbol id="sprig">`,
four rotated `<use>` references); there is no `leaf-border.svg` file.

## Where the content lives

All editable content is at the top of `js/app.js`:

- `PRODUCTS` — caption, full product name (used as `alt`), image path, and
  `shape` (`bottle` | `jar` | `tube`) for the CSS fallback.
- `EVENT` — `date`, `time`, `location`. The time uses a true em dash.
  The date is still the deck's **June 21, 2024**, marked with a `TODO` —
  it has not been replaced with an invented one.
- `TALLY_EMBED` — the Tally form URL. The guest's name is appended as
  `?name=` (URL-encoded) before the widget script loads.

Everything else — the Page 2 card copy, the five guest-flow steps, the panel —
is plain text in `index.html`.

## The QR code

The QR square on the assessment panel is a labelled placeholder. Once the site
has a deploy URL, the QR should encode that URL with the guest's name as a
query parameter, e.g. `https://<deploy-url>/?name=Jasmine`, which skips the
gate and opens straight onto the invitation.

## Behaviour notes

- **Name rule.** 1–40 characters of letters (any script), combining marks,
  spaces, hyphens and apostrophes. Input is trimmed, internal whitespace is
  collapsed, curly apostrophes are straightened, and the result is
  title-cased. The same rule validates `?name=`.
- **Tally height.** The embed uses `dynamicHeight=1`. If the frame has not been
  resized 3s after it loads (or the widget script is blocked), a
  `min-height: 640px` fallback is applied so there is never a nested
  scrollbar.
- **Reduced motion.** Every animation sits behind
  `@media (prefers-reduced-motion: no-preference)`. With reduced motion on,
  screens change instantly and everything is visible.
- **Storage.** `sessionStorage` only; access is wrapped in `try/catch` for
  private-mode Safari.
