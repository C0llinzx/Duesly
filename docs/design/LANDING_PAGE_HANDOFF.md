# Duesly Landing Page — Implementation Handoff

**For:** the coding agent porting the landing page into the Next.js app.
**Source of truth:** `duesly-landing.html` (the reference implementation). Every exact color, size, and animation lives there. This document explains the *system* so you port it correctly instead of copying pixels.

Do not invent new copy, colors, or spacing. If a value isn't in this doc, read it from `duesly-landing.html`.

---

## 1. What this is

A single-page marketing landing for Duesly, styled in a Linear-inspired aesthetic: near-black dark theme with a `#717CE2` purple accent, continuous background (no section-band alternation), floating product-shot cards on a photo backdrop, and full light/dark support. Dark is the default.

Work screen-by-screen and pause for review between phases, per the usual Duesly build rhythm. Suggested phases at the bottom.

---

## 2. Theming model (read this first — it's the part most likely to go wrong)

Theme is driven by a single attribute on `<html>`: `data-theme="light"` or `data-theme="dark"`. All colors are CSS variables that switch on that attribute. There is **no** `prefers-color-scheme` media block in the final design — a media query fights a manual toggle, so the attribute is the single authority.

### 2a. Token layers

There are two layers, both already present in the reference file:

1. **MD3 role tokens** — `--color-primary`, `--color-surface`, `--color-outline-variant`, etc. These use the same names as the existing `tokens.css`, but the **values are Duesly's Linear palette**, defined once under `:root` (light) and once under `[data-theme="dark"]` (dark).
2. **Semantic bridge** — landing-specific aliases (`--ink`, `--card`, `--primary`, `--line`, `--paid-*`, `--owing-*`, `--stage-photo`, etc.) that map onto the MD3 roles. Components only reference the bridge, never raw hex. This is why re-theming is a values-only change.

> ⚠️ **Do not overwrite the shared SellSnap `tokens.css`.** Duesly's landing uses Linear values that differ from SellSnap's. Give Duesly its own theme scope — either a `duesly-theme.css` imported by the landing route, or a `.duesly-landing` wrapper class — so you don't recolor the rest of the app. Confirm the approach before touching global tokens.

### 2b. No-flash theme script (required)

Inline base64 and client `useEffect` will cause a flash of the wrong theme on load. Set the attribute **before** paint. In the App Router, add a blocking inline script at the top of `<body>` in `app/layout.tsx`:

```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `(function(){try{
      var t = localStorage.getItem('duesly-theme');
      if(!t){ t = 'dark'; } // Duesly defaults to dark
      document.documentElement.setAttribute('data-theme', t);
    }catch(e){ document.documentElement.setAttribute('data-theme','dark'); }})();`,
  }}
/>
```

The toggle button then reads/writes `localStorage['duesly-theme']` and flips the attribute. (The reference file uses in-memory only because artifacts can't use localStorage — in the real app, persist it.)

### 2c. Toggle behavior

Default dark. Toggle swaps `data-theme` and persists to `localStorage`. Update the button's `aria-label` to name the *destination* ("Switch to light mode" / "Switch to dark mode"). The sun/moon icon crossfade is pure CSS keyed off `[data-theme="dark"]`.

---

## 3. Suggested file structure

Mirror the existing landing module conventions. A reasonable split:

- `app/(marketing)/page.tsx` — composes the sections.
- `components/landing/` — one component per section: `Nav`, `Hero`, `TrustStrip`, `Features` (bento), `FeatureDeepDive` (reused ×3), `HowItWorks`, `Security`, `FAQ`, `CtaBand`, `Footer`, `ThemeToggle`.
- `duesly-theme.css` — the two token layers from §2a.
- `*.module.css` per component — the component CSS from the reference, verbatim.

Keep CSS Modules for scoping, but the **theme tokens must be global** (a plain imported `.css`, not a module) so `data-theme` on `<html>` reaches them.

---

## 4. Section inventory

Port these in order. Copy is final; don't rewrite it.

1. **Nav** — fixed, blur background, `.scrolled` border appears after 8px scroll. Contains logo, anchor links, theme toggle, "Get started" CTA, mobile menu button. Mobile menu is a separate dropdown toggled by `aria-expanded`.
2. **Hero** — badge, headline with the hand-drawn underline SVG on "who hasn't", subhead, two CTAs, a note line. Below it: the **hero mockup** (browser chrome + progress ring + stat tiles + unit list) with two floating notification cards. The ring animates and the "31" counts up on scroll into view.
3. **Trust strip** — mono label + four checkmark items. Same bg as page, hairline top/bottom borders only.
4. **Features (bento)** — 6-col grid, 7 cards with stroke icons (no emoji). Card A spans 3×2 and contains a mini ring dashboard; card B contains a copyable link demo.
5. **Feature deep-dives ×3** — the alternating text/visual rows. Each visual sits inside a `.feature-stage` (photo backdrop) — see §5.
6. **How it works** — 3 numbered step cards. **Dark mode: stroke-only, transparent fill** (see §6).
7. **Security** — 3 cards. Same dark stroke-only treatment.
8. **FAQ** — accordion, single-open, animated via `grid-template-rows: 0fr → 1fr`.
9. **CTA band** — purple→cornflower gradient panel with grid texture, white button.
10. **Footer** — logo, links, copyright, "Made in Nigeria".

---

## 5. The product-shot stage + photo

Each deep-dive visual is wrapped in `.feature-stage`, which layers, bottom to top:

1. **Photo backdrop** — currently the street image, embedded once as `--stage-photo` and shared by all three stages via `background: var(--stage-photo) center/cover`.
2. `::before` — per-step color wash (`stage-a` purple / `stage-b` cornflower / `stage-c` green) + a dark scrim so the floating card reads.
3. `::after` — fine film grain.
4. The `.feature-visual` card floats in front (`z-index:3`) with a strong shadow.

> ⚠️ **Replace the inline base64 with `next/image`.** The reference embeds the photo as a data-URI so the file is self-contained; in the app that bloats HTML and defeats caching. Move the image to `/public`, and render it as an absolutely-positioned layer inside each stage:

```tsx
<div className={`${s.stage} ${s['stage-a']}`}>
  <Image src="/landing/street.jpg" alt="" fill priority={false}
         className={s.stagePhoto} sizes="(max-width: 960px) 100vw, 50vw" />
  <div className={s.featureVisual}>{/* dashboard card */}</div>
</div>
```

```css
.stagePhoto { position:absolute; inset:0; object-fit:cover; z-index:0; }
/* keep ::before (tint+scrim) at z-index:1, ::after (grain) at z-index:2, card at z-index:3 */
```

The tint/scrim/grain layers stay exactly as in the reference — only the image *source* changes from data-URI to file. Ship a web-optimized JPEG (~1400px wide, progressive, quality ~82); the source PNG is oversized.

---

## 6. Dark-mode stroke-only cards

From "How it works" onward (the `.step` and `.security-item` cards), dark mode removes the fill and shows border only:

```css
[data-theme="dark"] .step,
[data-theme="dark"] .securityItem { background: transparent; }
```

Light mode keeps the subtle `--card` fill so cards stay legible on the near-white background. The bento cards and the deep-dive visuals keep their fills in both themes — do **not** apply stroke-only to those.

---

## 7. Animations & JS

All interaction is vanilla in the reference. In Next.js, the pieces that touch `window`/`IntersectionObserver` must live in a client component (`'use client'`):

- **Scroll reveal** — `IntersectionObserver` adds `.in` to `.reveal` elements. One observer, unobserve after firing.
- **Progress rings** — animate `stroke-dashoffset` to the 31/40 ratio on reveal.
- **Hero counter** — counts 0→31 with an eased tick on scroll into view.
- **Stat bars** — animate `width` from 0 to the `data-w` value on reveal.
- **FAQ** — single-open accordion.
- **Nav** — `.scrolled` toggle on scroll.

**Respect `prefers-reduced-motion`:** the reference disables transitions/animations and jumps rings/bars/counter straight to their final values under that query. Keep this — it's part of the quality floor.

---

## 8. Accessibility floor (don't regress)

Keyboard-visible focus rings, `aria-expanded` on the mobile menu and FAQ buttons, `aria-label` on the theme toggle naming the destination, decorative SVGs marked `aria-hidden`, and the reduced-motion handling above. The layout is responsive down to mobile — verify the deep-dive stages, bento grid, and nav collapse correctly (breakpoints are in the reference).

---

## 9. Acceptance checklist

- [ ] `data-theme` on `<html>`, set by the no-flash inline script, default dark, persisted to `localStorage`.
- [ ] Toggle flips theme with no flash on reload; `aria-label` updates.
- [ ] Duesly's Linear tokens are scoped so they don't overwrite shared SellSnap tokens.
- [ ] Page background is continuous top→bottom (no section-band color change).
- [ ] Deep-dive photo served via `next/image` from `/public`, not inline base64; tint/scrim/grain intact; card floats in front.
- [ ] How-it-works + Security cards are stroke-only in dark, filled in light.
- [ ] Rings, counter, bars, reveals animate on scroll; all frozen under reduced-motion.
- [ ] Keyboard focus visible; FAQ/menu/toggle have correct ARIA.
- [ ] Matches `duesly-landing.html` in both themes at desktop and mobile widths.

---

## 10. Suggested phases (pause for review between each)

- **A — Theme foundation:** token layers + no-flash script + toggle. Verify switching works on a blank page before building sections.
- **B — Structure:** Nav, Hero (static), Footer. Get the shell + theming right.
- **C — Content sections:** Trust, Bento, How it works, Security, FAQ, CTA.
- **D — Deep-dive stages:** the photo/tint/scrim pattern with `next/image`.
- **E — Motion:** reveals, rings, counter, bars, reduced-motion.
- **F — Polish:** responsive pass, a11y pass, acceptance checklist.
