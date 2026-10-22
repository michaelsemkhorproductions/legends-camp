# The Legends Camp — site

## 2026-10-21 — registration form page (layout done; Alex wires Stripe + API)

New files: `register.html`, `css/register.css`, `js/register.js`. Every Register / Sign up
button now goes to `register.html` (`REGISTER_URL` in `js/main.js`, plus the no-JS `href`s
in `index.html`). Jeff's original files are otherwise untouched.

The form collects exactly the fields Jeff listed, in three steps: parent or guardian, player,
then payment. Validation runs in the browser: required fields, email, 5-digit ZIP, a
10-digit US mobile number, and a real birthdate. Per Jeff (2026-10-22), nobody is blocked by
age: the birthdate only catches typos (years 2006–2021), and parents also pick a "Current team
age group" (U9–U17), because of the Aug 1 cutoff and kids who play up. There is no cap per group
for now.
There's an error summary with links to each problem field. The page sends nothing and
stores nothing in the browser.

The State and T-shirt dropdowns are styled listboxes (keyboard: arrows, Home/End, type-ahead,
Enter, Esc). Each one drives a hidden native `<select>` that keeps the same `name`, so
FormData and autofill still work. The 01/02/03 step chips in the hero jump to their sections.

**Alex — hook points:**
- `window.LegendsRegistration.submit = function (data) { return Promise }` in
  `js/register.js`. It is called with the validated object below. Resolve the promise when
  payment clears to show the success panel; reject it with an `Error` whose message is safe to
  show the parent. If no handler is set, the page says registration isn't connected yet.
- Mount Stripe's payment fields into `#payment-element`. Its contents are a placeholder.
- Data keys: `parent_first_name, parent_last_name, address, city, state (2-letter), zip,
  mobile_phone (10 digits), email (lowercased), player_first_name, player_last_name,
  player_birthdate (typed as DD/MM/YYYY, sent as YYYY-MM-DD), player_team_age_group (U9…U17, or NONE = not on a team), player_sex (M|F), player_tshirt_size
  (YS|YM|YL|YXL|AS|AM|AL|AXL)`.

**Not confirmed with Jeff yet:** the t-shirt size list (my default), the price ($750 +
3% credit card fee, as on the site), one player per registration (no "add a sibling"), and whether
he needs a waiver, medical or emergency-contact fields, or a parent-consent checkbox.

## 2026-10-21 — replaced the mirror with Jeff's real V2 export

Jeff sent the actual project export from the ChatGPT site builder
(`The-Legends-Camp-V2`, source commit `cae92a3`, exported 2026-10-21). This repo is now
byte-identical to that export's `dist/` folder (only this README is ours). Compared with the
2026-10-20 mirror, two things changed:

- **Removed a Cloudflare challenge script** that the HTTP mirror had picked up from the
  ChatGPT host. It was never part of Jeff's source and would have tried to load
  `/cdn-cgi/...` from whatever server hosts the page.
- **Added `images/soccer-turf.webp`**, the background of the "What your player gets" section.
  The CSS referenced it, but the mirror never fetched it, so that section had no turf.
  `experience-real.jpg` and `sponsor-valdesoto.png` were also added. They aren't referenced
  yet; Jeff's export keeps them as retained assets.

Entry point is still `index.html` at the repo root (the export's `dist/` contents sit here
directly). `REGISTER_URL` and `CAMP_START` are in `js/main.js`; the four no-JS fallback
links in `index.html` also point at the old register page.

**For Alex — registration moves onto this site.** Per Alex and David in Slack (2026-10-20),
registration will be a form on this site, processed by Semkhor with Stripe direct payments,
instead of linking to lakewoodranchfc.org. Alex is handling the Stripe and server
connections. Fields Jeff asked for: parent first and last name, address, city, state, zip
code, mobile phone, and email; player first and last name, birthdate, sex (M/F), and t-shirt
size. No form exists in this build yet; the Sign up buttons still link out. Nothing here
contains API keys or secrets.

**Performance note:** each of the five `coach-*.webp` images is 1.5–1.8 MB as exported. They
could be resized to their display size before going live. This hasn't been changed, to
keep the repo identical to Jeff's export.

## 2026-10-20 — now running Jeff's "v2" build (mirror; superseded above)

Jeff used ChatGPT's site-publishing tool to produce his own revision of this site, starting
from our code (confirmed with Michael — not an unrelated third party's work). Per his
direction, this repo/link has been updated to match it: SVG-clipped hero portraits instead of
a banner video, a justified-masonry gallery, native `<details>` FAQ, a new logo system
(`logo-emblem/wordmark/dark/light.svg`), and several new real (non-watermarked) CH4 training
photos. Mirrored straight from `https://the-legends-camp-v2.jbrandon7.chatgpt.site/` via plain
HTTP fetch — nothing hand-altered except what's noted below.

**Known open item — needs a real answer before this is "final":**
- The Chonto Herrera trophy photo (`images/gallery-herrera-trophy.jpg`, and the same photo
  baked into his coach poster) was flagged by John himself as `..._Identity_Unverified.png` in
  his own source files — he wasn't sure it was actually Chonto Herrera. Michael has confirmed
  it's the same photo Jeff originally supplied for this project (matches `IMG_5517.jpg` from the
  very first materials drop) and believes it's the same person, just decades older than the
  young official portrait (`Chonto_Herrera_Official_Atletico_Nacional.jpg`). Proceeding on that
  basis, but flagging it here in case it needs a firmer confirmation later.

**Still open, carried over from the previous build:**
- **Stripe** — Jeff said he'd send a Stripe link for the Sign Up / Register buttons "soon." Once
  you have it, see "The one thing you'll want to change" below — it's one line in `js/main.js`
  unless you want it wired into Semkhor's registration/reporting backend instead of a plain
  link, in which case that's new work, not a config change.
- **Price** — page shows $750 (+ 3% credit card fee). Some earlier campaign material mentioned $850.
  Worth a one-line confirmation from Jeff before this goes live for real.
- **Domain** — Alex is handling deployment to `thelegendscamp.com`; this repo on GitHub under
  Michael's account is the handoff point.

## Revision notes (v2 — design polish, same content)

Historical notes from the previous (Seun) revision — superseded by the above where they
conflict, kept for reference:

Same sections, same order, same copy. Visual and practical refinements only:

- **Brand colours** — the neon yellow-green accent is now the campaign's navy / gold / ivory
  (gold sampled from the crest: #F6BC17-ish; deeper gold used for text on light backgrounds).
- **Hero** — headline no longer sits on top of the banner's own baked-in text. The banner video
  now plays uncropped as a framed "billboard" under the headline; countdown and key facts
  (dates, ages, group size, price) sit in a panel beside the headline.
- **Typography** — self-hosted Plus Jakarta Sans + Instrument Serif italic accents (in `fonts/`,
  no external requests; still works opened from disk).
- **Crest** — transparent-background versions (`logo-crest.png`, `logo-badge*.png`) so it no longer
  shows as a cream square on navy.
- **Coaches** — name + credential under each poster; goalkeeper badge on Juan's card.
- **Archive section** — the 494px photo was replaced with a sharp still taken from the supplied
  archive video (same moment, ~1000px). Clip only loads when "Watch" is pressed.
- **Gallery** — bento grid instead of a sideways scroll strip.
- **Register** — one card with price, button, and the full logistics (dates, sessions, venue).
- **Details** — accordion; added venue, session times, birth years (2010–2018) and the text line
  (941-725-5881), all taken from the live lakewoodranchfc.org camp page.
- **Mobile** — sticky "Register" bar appears after the hero, hides at the register section.
- **Performance** — videos re-encoded (7.1MB → 1.7MB total), visually identical.
- **Countdown** — now targets 8:00 AM ET (first published session), was 9:00 AM.

Still to confirm with Jeff: final price ($750 on the live page; the campaign doc mentions $850 in
earlier materials), venue, and the registration URL (still one line in `js/main.js`).

Self-contained static site. No build step, no framework, no server-side code.

## Entry point

Open/upload `index.html`. It pulls in `css/styles.css`, `js/main.js`, and the
`images/` and `video/` folders — the whole `site/` folder is the deliverable.

Works both:
- opened directly from disk (double-click `index.html`), and
- served from a web root (e.g. `soccer.semkhor.com/` or `thelegendscamp.com/`).

## The one thing you'll want to change: the Register link

Open `js/main.js` and edit the single constant at the top:

```js
var REGISTER_URL = "https://www.lakewoodranchfc.org/the-legends-camp";
```

Every "Register" / "Sign Up Now" button on the page pulls its link from this
one place. Right now it points at Jeff's existing (GoDaddy-builder)
registration page, per the default in the project brief: link out unless/until
a Semkhor-hosted registration flow is confirmed. If that changes, this is the
only line that needs editing.

## What's a placeholder / needs a decision

- **Register destination** — see above. Not yet finalized in the Slack thread
  (Alex was still waiting on Jeff to open a Stripe account as of the last
  message I have).
- **Countdown timer** — counts down to November 21, 2026, 8:00 AM Eastern
  (first published session time). Adjust `CAMP_START` in `js/main.js` if that changes.
- **Hero background** — currently uses the animated `video/hero-banner.mp4`
  John sent, with the static `Day_01` poster as the fallback/poster image. If
  you'd rather launch with just the static image, remove the `<video>` block
  in the hero section of `index.html` — the poster image alone looks fine.
- **"Charity" framing** — the project brief called this a "Charity Soccer
  Camp," but nothing in the materials I received confirms registered-charity
  status or that proceeds benefit a cause. I did not add charity language to
  the copy. If that's intended, it needs real wording from Jeff/David before
  it goes on the page — claiming charity status isn't something to guess at.

## Images not used

Two of the supplied Juan Calatayud action photos
(`0b65704b-...jpg`, `31a468e2-...jpg`) are visibly watermarked Alamy stock
images — unlicensed previews, not safe to publish. I used the branded
"Train with Juan Calatayud" reveal poster instead. If you want real action
shots of him, they'll need to be sourced with a proper license or supplied
by Jeff directly.

## Performance notes

- All photos were resized/compressed for web and have `.webp` + `.jpg`
  versions in `images/`; `index.html` serves `.webp` via `<picture>` for the
  heaviest images (hero, coach cards, gallery) with jpg fallback.
- The two `.mp4` files in `video/` (4.7MB and 2.4MB) are used as-supplied —
  I didn't have a video encoder available to compress them further. If page
  load feels heavy on mobile data, re-encoding them (H.264, ~2–4 Mbps,
  720p) would help; not done here.
- Fonts are self-hosted in `fonts/`; no analytics, no cookie banner, no third-party
  scripts — the page has zero network dependencies beyond its own files.

## Not yet tested

- Only tested in Chromium via the in-app browser preview, at desktop width
  and ~375px mobile width. Not tested in Safari/iOS specifically, or with a
  screen reader.
- Not tested served from an actual subpath (e.g. `/the-legends-camp/`) —
  all paths are relative, so it should work, but hasn't been verified live.
