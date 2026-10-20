# The Legends Camp by Valdesoto — site

## 2026-10-20 — now running Jeff's "v2" build

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
- **Price** — page shows $750 (+processing). Some earlier campaign material mentioned $850.
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
