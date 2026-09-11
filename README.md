# The Cantu Collective — invitation

A single-page, three-screen invitation for the Cantu Collective event. A guest
signs their name on the gate, the invitation unfolds, and the assessment page
carries the four-step journey, the hair cocktail products, and the way into the
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

To test the deep link: `index.html?name=Jasmine`. (The name must be on the
guest list — see below.) To return to the gate after
entering a name, close the tab (the name lives in `sessionStorage`, key
`cantu.guestName`).

## Files

```
index.html        three <section> screens, all copy, inline SVG (corner sprigs, journey icons)
css/style.css     tokens, reset, type roles, screens, content, motion
js/app.js         PRODUCTS / EVENT config, screen toggle, guest-list gate, motion
js/guests.js      the invite list (window.CANTU_GUESTS) — loaded before app.js
assets/           supplied artwork (see below)
```

## Assets still to drop in

Everything below renders with a fallback until the file exists, so the site is
never broken without them.

| Path | What | Fallback today |
| --- | --- | --- |
| `assets/logo-cantu.svg` | The cantu® wordmark | Text wordmark set in Jost |
| `assets/products/curl-cream.png` | Cantu Ultra Moisture Nourishing Curl Cream | CSS jar silhouette |
| `assets/products/mask.png` | Cantu Ultra Moisture Nourishing Mask | CSS jar silhouette |
| `assets/products/shampoo.png` | Cantu Ultra Moisture Nourishing Shampoo | CSS bottle silhouette |
| `assets/products/leave-in-conditioner.png` | Cantu Ultra Moisture Nourishing Leave-In Conditioner | CSS bottle silhouette |

Product PNGs: transparent background, 1000 × 1000px. They sit in a fixed-height
box (110px beside the text below 640px, 140px above it) with `object-fit:
contain`, so nothing shifts when a file lands. Filenames are lowercase slugs —
the deploy filesystem is case-sensitive and spaces would need encoding.

The corner leaf border is inline SVG in `index.html` (one `<symbol id="sprig">`,
four rotated `<use>` references); there is no `leaf-border.svg` file.

## Where the content lives

All editable content is at the top of `js/app.js`:

- `PRODUCTS` — full product name (the label, also used as `alt`), blurb,
  image path, and `shape` (`bottle` | `jar` | `jar-wide` | `tube`) for the
  CSS fallback. The previous Ultra Moisture line sits commented out directly
  above it. The one-line intro under the strip heading is a `TODO` in
  `index.html` — the old Batana Oil line was Ultra Moisture copy and does
  not apply to the Shea Butter range.
- `EVENT` — `date`, `time`, `location`. The time uses a true em dash.
  The date is still the deck's **June 21, 2024**, marked with a `TODO` —
  it has not been replaced with an invented one.
- `ASSESSMENT_URL` — the Tally form URL. The guest's name is appended as
  `?name=` (URL-encoded) to the "Open the assessment" link on Page 3.

Everything else — the Page 2 card copy, the four journey steps, the panel,
the footer bar — is plain text in `index.html`.

The invite list is deliberately separate: `js/guests.js` (see "The guest
list" below).

## The QR code

The QR square on the assessment panel is a labelled placeholder. Once the site
has a deploy URL it should encode `https://tally.so/r/GxGARj?name={encoded}` —
the same URL the "Open the assessment" link beneath it already carries — so a
phone scan and a desktop click land on the same pre-filled form.

The Tally form is deliberately not embedded: as an iframe on the rust panel it
rendered its own dark type, its own cover and heading, asked for the name a
second time, and showed a required-field error before the guest had typed.
An iframe's internals are not ours to style, so it opens in a new tab instead.

## The guest list

Page 1 only admits names on the invite list in `js/guests.js`:

```js
window.CANTU_GUESTS = [
  'Jasmine Reyes',
  'Tasha Williams',
  'Maria Cristina Santos'
];
```

A plain array of strings in canonical spelling and casing — that is what the
invitation displays, not what the guest typed (`jasmine reyes` renders as
**Jasmine Reyes**).

**Matching.** Both sides are compared on a key that ignores case, accents
(NFD with combining marks stripped), apostrophes, hyphens, periods and
spacing, so `maria-cristina santos`, `MARÍA CRISTINA SANTOS` and
`Maria   Cristina Santos` all hit the same entry. A first name alone is
accepted when exactly one guest has it; if two or more share it the guest is
asked for their full name rather than guessed at.

**Messages** (in the `aria-live` line under the input):

| State | Message |
| --- | --- |
| Empty, or fails the character rule | Enter the name on your invitation. |
| Valid characters, not on the list | Your name is not on the guest list. |
| First name shared by several guests | Enter your full name as it appears on your invitation. |

After three consecutive misses a quieter second line is added: *Check the
spelling on your invitation.* The counter resets on a successful match.

**The gate applies everywhere a name can come from.** `?name=` in the URL is
checked against the list on load — a miss lands on Page 1 with the message
showing, not on Page 2. The `sessionStorage` value is re-checked on every
load, so editing `guests.js` takes effect immediately: a stored name that no
longer matches is cleared and the visit starts at Page 1. Only the canonical
name is ever stored.

**If the list fails to load** — `js/guests.js` missing, `window.CANTU_GUESTS`
not an array, or the array empty — the gate **fails open**: every name that
passes the character rule is admitted (title-cased), and a `console.warn`
says so. A broken deploy should not lock out every guest on the night.

### This is a soft gate, not access control

- Every name on the list is readable in View Source and in this repository.
- Anyone can edit the array in devtools and walk straight through.

If the list will hold real guests' names, publishing them in a public repo is
a privacy problem in its own right. Three options:

1. **Accept it.** Fine for a demo or a pitch; not for a live event with real
   names. *This is what is implemented now.*
2. **Keep names out of the repo.** Add `js/guests.js` to `.gitignore`, commit a
   `js/guests.example.js` showing the shape, and drop the real file in at
   deploy time. No code changes — `app.js` already fails open if the file is
   absent, so a forgotten deploy step is loud (console warning) rather than a
   dead site.
3. **Store SHA-256 hashes instead of names.** Hash the same comparison key
   (`keyFor()` in `app.js`) with `crypto.subtle.digest('SHA-256', …)` at
   submit time and compare to a list of hex digests. The list becomes
   unreadable and matching still works, including first-name-only (hash the
   first-name keys separately). Trade-off: there is no canonical spelling to
   display, so Page 2 falls back to title-casing whatever the guest typed.
   Still bypassable by anyone who reads the code — it hides the list, it
   does not enforce the gate. Also note `crypto.subtle` requires HTTPS or
   `localhost`.

Switching to 2 or 3 later is a small change; the lookup is built in one place
(`buildGuestLookup()`), and one function (`resolveGuest()`) answers for typed
input, `?name=` and storage alike.

## Behaviour notes

- **Character rule.** 1–40 characters of letters (any script), combining
  marks, spaces, hyphens, apostrophes and periods. Input is trimmed, internal
  whitespace is collapsed and curly apostrophes are straightened before the
  guest-list check. The same rule applies to `?name=`.
- **Reduced motion.** Every animation sits behind
  `@media (prefers-reduced-motion: no-preference)`. With reduced motion on,
  screens change instantly and everything is visible.
- **Storage.** `sessionStorage` only; access is wrapped in `try/catch` for
  private-mode Safari.
