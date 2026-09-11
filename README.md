# The Cantu Collective — invitation

A single-page, three-screen invitation for the Cantu Collective event. A guest
signs their name on the gate, the invitation unfolds, and the assessment page
carries the guest flow, the hair cocktail products, and the way into the
hair assessment — a QR code, plus a link for desktop — with their name
already in the URL.

Vanilla HTML, CSS and JavaScript. No build step, no bundler, no npm install.
The only external resource loaded is Google Fonts. The assessment itself is
a Tally form that opens in a new tab; nothing from Tally is embedded.

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
js/app.js         PRODUCTS / EVENT config, screen toggle, name handling, motion
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
- `ASSESSMENT_URL` — the Tally form URL. The guest's name is appended as
  `?name=` (URL-encoded) to the "Open the assessment" link on Page 3.

Everything else — the Page 2 card copy, the five guest-flow steps, the panel —
is plain text in `index.html`.

## The QR code

The QR square on the assessment panel is a labelled placeholder. Once the site
has a deploy URL it should encode `https://tally.so/r/GxGARj?name={encoded}` —
the same URL the "Open the assessment" link beneath it already carries — so a
phone scan and a desktop click land on the same pre-filled form.

The Tally form is deliberately not embedded: as an iframe on the rust panel it
rendered its own dark type, its own cover and heading, asked for the name a
second time, and showed a required-field error before the guest had typed.
An iframe's internals are not ours to style, so it opens in a new tab instead.

## Behaviour notes

- **Name rule.** 1–40 characters of letters (any script), combining marks,
  spaces, hyphens and apostrophes. Input is trimmed, internal whitespace is
  collapsed, curly apostrophes are straightened, and the result is
  title-cased. The same rule validates `?name=`.
- **Reduced motion.** Every animation sits behind
  `@media (prefers-reduced-motion: no-preference)`. With reduced motion on,
  screens change instantly and everything is visible.
- **Storage.** `sessionStorage` only; access is wrapped in `try/catch` for
  private-mode Safari.
