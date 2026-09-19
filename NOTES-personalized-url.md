# Personalized URLs — what's actually possible

Scratch note, not part of the site. Nothing here is implemented; this is the
investigation asked for before picking an approach.

Everything marked **verified** was checked against the real page in headless
Edge on 2026-09-19, not inferred from reading the code.

---

## 1. What the hosting is today

**I could not confirm where — or whether — this is deployed.** The repo has no
deploy manifest of any kind: no `vercel.json`, `netlify.toml`, `_redirects`,
`CNAME`, `.github/workflows/`, and no `package.json`. The only statement of
intent is one line in the README:

> Deploys as a static folder (Vercel: framework preset "Other", no build
> command, output directory `.`).

That is an instruction to a future deployer, not evidence of a live site. **Please
confirm the actual host before acting on the recommendation** — it is the one
thing below that changes the answer materially.

What is certain: the site is five files and a folder of images, entirely
client-side, with no server code. Any static host serves it as-is. That also
means **there is no server-side rendering available** — which turns out to be
the deciding constraint for link previews (§5).

URL shapes, by likely host:

| Host | Default URL | Root or subpath | Rewrites to `/index.html` |
| --- | --- | --- | --- |
| Vercel | `<project>.vercel.app` | root | yes, 4 lines of `vercel.json` |
| Netlify / Cloudflare Pages | `<project>.netlify.app` | root | yes, 1 line of `_redirects` |
| GitHub Pages (project site) | `ralphnatal.github.io/website_invitation/` | **subpath** | **no** |
| Any + custom domain | `invite.example.com` | root | depends on host |

The GitHub Pages subpath is worth noting: because every asset path in
`index.html` is relative (**verified**), the site would work unmodified under
`/website_invitation/`. That same relativity becomes a problem in §3.

---

## 2. Query-string personalization — already built

**This is the finding that matters: the feature the client is asking about
mostly exists already.**

`openingScreen()` in [js/app.js](js/app.js) reads `?name=` on load and resolves
it through the same guest-list check the typed form uses. Verified behaviour:

| URL | What happens |
| --- | --- |
| `/` | Gate, as normal |
| `/?name=Jasmine` | **Skips the gate entirely** — lands on the invitation, card reads "Jasmine Reyes," |
| `/?name=Nobody%20Here` | Held at the gate, input pre-filled, "Your name is not on the guest list." |
| `/?guest=Jasmine` | **Ignored** — the param is `name`, not `guest`. Falls through to the gate |

Note the first row: a bare first name resolves to the full canonical spelling,
because `resolveGuest()` accepts a first name when exactly one guest has it.
Casing, accents, hyphens and spacing are all normalised, so
`?name=maria-cristina%20santos` finds `Maria Cristina Santos`.

**How the flow changes: it doesn't.** The three steps are unchanged; step 1 is
simply skipped for a guest arriving on a personalized link. The gate still
exists for anyone arriving bare.

**What the address bar shows:** the full query string, percent-encoded —
`https://host/?name=Jasmine%20Reyes`. Spaces become `%20`. That is the honest
cost of this option: it is functional rather than elegant.

**If the client wants `?guest=`** instead of `?name=`, that is a one-line
change, or accept both with a two-line fallback. No other consequence.

**Privacy note, minor:** the name in the URL lands in the host's access logs.
It is *not* leaked to Google Fonts — browsers default to
`strict-origin-when-cross-origin`, so only the origin is sent cross-site.

---

## 3. Path-style personalization (`/jasmine`)

On a static host, `/jasmine` is a 404 by default — there is no such file. Two
ways around it.

### (a) Pre-generate a page per guest

`/jasmine/index.html`, `/tasha/index.html`, and so on. With three guests this
is trivial; with two hundred it needs a generator script, which means a build
step — and the brief says keep there from being one.

The real advantage is §5: it is the **only** option that gives per-guest link
previews, because each page can carry its own OG tags.

### (b) SPA rewrite — serve `index.html` for everything

The host is told to return `index.html` for any unmatched path, and the JS
reads `location.pathname` instead of the query string.

- **Vercel** — `vercel.json`: `{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}`
- **Netlify / Cloudflare Pages** — `_redirects`: `/*  /index.html  200`
- **GitHub Pages** — **not supported.** The workaround is a `404.html` that
  duplicates the page; GitHub serves it for unmatched paths but **with an HTTP
  404 status**, which suppresses link previews on most platforms and looks
  wrong to anything that checks. Avoid this route on Pages.

So: **a different host does make it trivial** — four lines on Vercel, one on
Netlify. The blocker is GitHub Pages specifically.

Two things to get right if you go this way:

1. **`keyFor()` is already a slug function.** It lowercases, strips accents,
   apostrophes, hyphens, periods and spaces. So `/jasmine-reyes`,
   `/JasmineReyes` and `/jasmine%20reyes` all reduce to `jasminereyes` and
   match. Path matching needs almost no new logic — read `location.pathname`,
   strip the leading slash, hand it to the existing `resolveGuest()`.

2. **Trailing slashes will break every asset.** Verified: all asset paths are
   relative (`css/style.css`, `assets/qr.png`) and there is no `<base>` tag. At
   `/jasmine` they resolve to `/css/style.css` — fine. At `/jasmine/` they
   resolve to `/jasmine/css/style.css` — 404, unstyled page. Fix with
   `<base href="/">` or root-absolute paths **before** shipping any path-style
   URL. This is the single most likely way to break the site in production.

---

## 4. Cleaning the URL after load (History API)

`history.replaceState({}, '', '/')` after reading the name. The address bar goes
clean, no reload, no history entry added. Caveats, in order of how much they
matter:

- **It breaks forwarding, which is probably the point of the link.** Once
  cleaned, a guest who copies the URL from their address bar shares the
  *un*-personalized link. Whether that is a bug or a privacy feature is a
  product decision (see §5).
- **Reload and bookmark lose the personalization.** The app currently survives a
  reload via `sessionStorage` (`cantu.guestName`) — but that dies with the tab.
  A bookmark opened tomorrow lands on the gate.
- **It buys nothing against the server.** The original URL was already in the
  access logs before any JS ran.
- Use `replaceState`, never `pushState` — the latter adds a history entry and
  makes the back button feel broken.

**My read: don't.** It fights the main use case and the tidiness gain is small.

---

## 5. Sharing — and the thing worth flagging

**A forwarded personalized link works, and shows the original guest's name.**
There is no per-guest secret. `?name=Jasmine` is not a token; anyone who opens
it sees Jasmine's invitation with Jasmine's name on the card. The README is
already explicit that the guest list is a soft gate, not access control — the
URL inherits exactly that property.

For a real event that is a decision, not a bug: if Jasmine forwards her invite
to a friend, the friend sees a card addressed to Jasmine. Worth putting to the
client.

**Link previews are the bigger gap.** Verified: **the page has no OG or Twitter
meta tags at all.** When this link is pasted into iMessage, WhatsApp or Slack,
the preview falls back to `<title>` and `<meta name="description">`, with no
image. For an invitation that is largely how it will be seen first.

And critically — **previews can never be personalized on the current
architecture.** Preview bots scrape the static HTML; they do not run the JS that
reads `?name=`. Every guest's link will preview identically as "You're Invited
To An Evening with Cantu", never "Jasmine, you're invited". Personalized
previews would need per-guest static pages (§3a) or a server. If the client's
mental picture of a "personalized URL" includes a personalized preview card,
this is the constraint to tell them about first.

Adding OG tags is worth doing regardless of which option is picked. It needs an
image and preview copy, which I have not invented.

---

## 6. Recommendation

**Short term: keep `?name=` and ship nothing new.** It already works end to end,
it costs zero, and it carries no risk. Confirm with the client whether the
param should be renamed to `?guest=` — a one-line change if so.

**If they specifically want `/jasmine`**, it is a small, contained job, but only
after two things: confirm the host (Vercel or Netlify — *not* GitHub Pages), and
fix the relative asset paths. Budget roughly a rewrite config, a `<base>` tag,
and ~15 lines of JS reusing `keyFor()`. Still no build step.

**Don't clean the URL with the History API.** It breaks the forwarding case for
a cosmetic gain.

**Do add OG tags**, whatever else is decided — but that needs an image and copy
from the client.

| Option | Effort | URL shown | Per-guest preview | Risk |
| --- | --- | --- | --- | --- |
| `?name=` (today) | none — already works | `/?name=Jasmine%20Reyes` | no | none |
| `?guest=` rename | one line | `/?guest=Jasmine` | no | none |
| `/jasmine` via rewrite | config + `<base>` + ~15 lines | `/jasmine` | no | asset paths; wrong host |
| `/jasmine` pre-generated | needs a generator = build step | `/jasmine` | **yes** | breaks the no-build rule |
| History API cleanup | ~3 lines | `/` | no | breaks forwarding |

### Open questions for the client

1. Where is this actually hosted right now?
2. Should a forwarded link show the original guest's name, or fall back to the gate?
3. Does "personalized URL" include a personalized link preview? (If yes, that
   forces pre-generated pages.)
4. How many guests? Three today makes pre-generation viable; two hundred does not.
