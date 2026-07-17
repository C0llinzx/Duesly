# Agent Prompts — Duesly Landing Page Build (OpenCode)

These prompts reference files by **repo path**. Put the four reference files here before you start:

```
docs/design/
├─ duesly-landing.html      ← visual source of truth (open in your browser to review)
├─ LANDING_PAGE_HANDOFF.md  ← the spec
├─ duesly-theme.css         ← ready-to-use global stylesheet
└─ landing.module.css       ← ready-to-use scoped CSS Module
```

Send these to OpenCode **one phase at a time**. Stop and review after each — don't paste them all at once. OpenCode reads workspace files by path, so no attachments are needed.

> **Note:** OpenCode reads `duesly-landing.html` as text (markup + CSS), not as a rendered image — it can't *see* the page. That's fine: the real spec is the handoff doc plus the two CSS files. **You** are the one comparing the rendered result to the reference, so keep `docs/design/duesly-landing.html` open in a browser as you review each phase.

---

## Kickoff message (send first, before Phase A)

> You're helping me build the Duesly marketing landing page in my existing Next.js App Router project. Four reference files are in the repo at `docs/design/`: `duesly-landing.html` (the exact visual target), `LANDING_PAGE_HANDOFF.md` (the spec), and `duesly-theme.css` + `landing.module.css` (stylesheets I've already extracted — use them as-is, don't rewrite the CSS, just wire them up).
>
> Rules for this whole build:
> - Match `docs/design/duesly-landing.html` exactly in both light and dark mode, desktop and mobile.
> - Don't change any copy, colors, spacing, or animations. If a value isn't in the files, ask me — don't guess.
> - Work in the phases I give you. After each phase, stop, show me the diff, and wait for my go-ahead before continuing.
> - Read `docs/design/LANDING_PAGE_HANDOFF.md` fully before writing code. Confirm you've read it and tell me, in 3–4 bullets, how you plan to scope Duesly's theme so it does NOT overwrite my shared SellSnap `tokens.css`. Wait for my approval of that plan before Phase A.

*(Approve or correct its theming-scope plan before continuing. This is the one decision that can quietly break the rest of your app.)*

---

## Phase A — Theme foundation

> Phase A: theme only, no page content yet.
>
> 1. Move/import `docs/design/duesly-theme.css` as a global stylesheet at the app root (a plain global import, NOT a CSS Module).
> 2. Add the no-flash inline theme script from `docs/design/LANDING_PAGE_HANDOFF.md` §2b to `app/layout.tsx` so `data-theme` is set on `<html>` before paint. Default dark. Persist to `localStorage['duesly-theme']`.
> 3. Build a `ThemeToggle` client component: reads/writes `localStorage['duesly-theme']`, flips the `data-theme` attribute, and updates its `aria-label` to name the destination theme. Use the sun/moon markup and `.theme-toggle` styles from `duesly-landing.html`.
> 4. Drop the toggle onto an otherwise blank test page.
>
> Then stop. Show me the layout script, the toggle component, and confirm toggling flips theme with no flash on reload. Don't build any sections yet.

---

## Phase B — Shell (nav, hero, footer)

> Phase B: the page shell. Move/import `docs/design/landing.module.css` as a CSS Module.
>
> Build three components using the exact markup and classes from `docs/design/duesly-landing.html`: `Nav` (with the scroll `.scrolled` border toggle, mobile menu with `aria-expanded`, and the ThemeToggle from Phase A), `Hero` (headline + underline SVG, subhead, CTAs, note — the mockup can be a static placeholder box for now), and `Footer`.
>
> Apply shared primitives (`btn`, `container`, `eyebrow`, `mono-chip`, `reveal`) as plain global class strings, and section classes via `styles['...']`. Compose them in the marketing route's `page.tsx`.
>
> Stop and show me the shell in both themes before we fill in content.

---

## Phase C — Content sections

> Phase C: build these sections from the markup in `docs/design/duesly-landing.html`, in order — Trust strip, Features (bento grid, all 7 cards incl. the mini-dashboard card A and the link-demo card B), How it works, Security, FAQ (single-open accordion, `grid-template-rows` animation, `aria-expanded`), CTA band. Static only — no scroll animation yet.
>
> Confirm the page background stays continuous top-to-bottom (no section-band color change) and that How-it-works + Security cards are stroke-only in dark, filled in light. Stop and show me.

---

## Phase D — Hero mockup + product-shot stages

> Phase D: the visuals.
>
> 1. Build the hero dashboard mockup (browser chrome, progress ring, stat tiles, unit list, two floating notification cards) from `docs/design/duesly-landing.html`.
> 2. Build the `FeatureDeepDive` component, reused for all three steps (STEP 01/02/03), each wrapping its dashboard card in a `.feature-stage`.
> 3. For the stage backdrop: put my image in `public/landing/`, and in each stage render it as `<Image fill className={styles.stagePhoto} sizes="(max-width: 960px) 100vw, 50vw" alt="" />` behind the card, per handoff §5. Keep the `::before` tint+scrim and `::after` grain exactly as in `landing.module.css`; the card floats in front at `z-index:3`. Do NOT inline the image as base64.
>
> Stop and show me all three stages plus the hero mockup in both themes.

---

## Phase E — Motion

> Phase E: animations, in a client component using `IntersectionObserver`.
>
> Implement, matching the timing in `docs/design/duesly-landing.html`: scroll-reveal (`.reveal` → `.in`), progress rings animating `stroke-dashoffset` to the 31/40 ratio, the hero counter easing 0→31, and stat bars animating `width` to their `data-w` values — all firing when the element scrolls into view, each firing once.
>
> Critical: under `prefers-reduced-motion: reduce`, skip all of it and jump rings/bars/counter straight to final values. Verify with reduced motion enabled. Stop and show me.

---

## Phase F — Polish & acceptance

> Phase F: final pass. Run through the acceptance checklist in `docs/design/LANDING_PAGE_HANDOFF.md` §9 and report each item pass/fail. Specifically verify: no theme flash on reload, Duesly theme didn't leak into the rest of the app, responsive behavior of the bento grid / deep-dive stages / nav at mobile widths, visible keyboard focus, and correct ARIA on menu/FAQ/toggle. Fix anything failing, then give me the final diff summary.

---

## If something looks off

Point the agent back at the source by path:

> This doesn't match. Compare against `docs/design/duesly-landing.html` — the `.feature-stage` scrim/tint values and layer z-order are in `docs/design/landing.module.css`. Don't redesign it; make it match. Tell me which value was wrong before you change it.

## Guardrails to repeat if it drifts

- "Use my CSS as-is — you're wiring it up, not restyling."
- "Match the reference; don't improve it."
- "One phase at a time. Stop and show me the diff."
- "If it's not in the files, ask — don't guess."
