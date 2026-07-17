# Duesly — Landing Page Design Brief

> Built **last**, after the engine (per the build plan). This brief captures the design intent; hand it to the agent when you reach the landing-page step.
>
> **Must conform to `.agent/rules/design-system.md`:** colors and type from `tokens.css` via CSS variables only (no raw values), CSS Modules (no Tailwind, no inline styles except truly dynamic ones), spacing in multiples of 4px, radius 4/8/12px, **mobile-first**, 44px minimum touch targets. This is a public page, so keep it **light and fast** — no heavy third-party scripts.

---

## Aesthetic direction

Modern SaaS, in the spirit of the polished pages on Saaspo: generous whitespace, large confident headings (the Material Design 3 type scale already in your tokens), a hero that shows a real glimpse of the product, an **asymmetric bento grid** as the visual centerpiece, and alternating feature sections that build conviction. Soft shadows, 12px-radius cards, restrained palette pulled from your tokens with a single accent for CTAs. Everything collapses gracefully to a single column on mobile.

The emotional job of the page: make an estate treasurer feel *"this ends the WhatsApp-screenshot chaos, and I can set it up today."*

---

## Page structure (top to bottom)

1. **Nav bar** — Duesly wordmark left; anchor links (Features, How it works, FAQ) center/right; a primary "Get started" button right. Sticky, condensing slightly on scroll. Collapses to a menu on mobile.
2. **Hero** — see below.
3. **Trust strip** — a slim honest band ("Built for Nigerian estates" + 3–4 short proof points: *No app for residents · Funds settle to your estate · Set up in minutes*). Do **not** fabricate customer logos or testimonials for the MVP; use honest framing or leave real ones for later.
4. **Bento grid** — the centerpiece. See the cell map below.
5. **Feature sections** — three deeper "pillar" blocks, alternating image/text left-right.
6. **How it works** — three numbered steps.
7. **Security & trust** — funds settle directly to the estate (never held), Paystack-secured, resident data handled per the NDPA.
8. **FAQ** — accordion of the real objections.
9. **Final CTA** — one strong closing call to action.
10. **Footer** — wordmark, minimal links, contact.

---

## Hero

- **Layout:** left-aligned text column + right-side product visual on desktop; stacked (text then visual) on mobile.
- **Headline (pick/refine one):**
  - "Estate dues, collected and reconciled — from one link."
  - "Know exactly who's paid. And who hasn't."
  - "Service-charge collection without the WhatsApp chaos."
- **Subhead:** "Duesly lets your estate share one payment link and watch a live paid-vs-owing dashboard fill in by zone — no app for residents, and your money settles straight to the estate."
- **Primary CTA:** "Get started" · **Secondary:** "See how it works" (scrolls to the steps).
- **Visual:** a clean mock of the collection dashboard — a progress ring (e.g. *31 of 40 paid*) and a short owing list with zone tags. This is your hero shot; make it the most polished element on the page.

---

## Bento grid (the centerpiece)

An asymmetric CSS Grid of cards in mixed sizes — the modern "bento" look. Each card states one value prop with a small icon, a short title, and a line of copy. On desktop use a 4-column grid with varied spans; on mobile collapse to a single column in this priority order.

Suggested cells (size in desktop columns × rows):

| Cell | Size | Title | Copy |
|---|---|---|---|
| A | 2×2 (large, top-left) | **Live paid-vs-owing** | A dashboard that reconciles itself — see who's paid and who's owing, filtered by zone. *(Show a mini dashboard visual here.)* |
| B | 2×1 | **One link, no app** | Residents tap a link, pick their unit, and pay. No downloads, no accounts. |
| C | 1×1 | **Import your roster** | Upload your existing Excel/CSV — zones, units, names, phones — in one step. |
| D | 1×1 | **Reminders that land** | One-tap WhatsApp nudges, plus optional email, to everyone still owing. |
| E | 2×1 | **Your money, your account** | Funds settle straight to the estate. Duesly never holds your money. |
| F | 1×1 | **Confirm the right unit** | Payers see the unit code *and* resident name before paying — no mistakes. |
| G | 1×1 | **Offline payments too** | Record cash and transfer payments so the owing list always reflects reality. |

Card styling: `var(--color-surface)` background, 12px radius, 4px-grid padding, subtle shadow, hover lift. Icons monochrome from your token colors. Keep copy to one tight line each.

---

## Feature sections (three pillars)

Alternating rows (text left / visual right, then flip), each expanding one promise:

1. **Set up once.** "Bring the roster you already have." — CSV import with zones, units, names, and phone numbers; a live preview that flags messy rows; re-imports that update, never duplicate.
2. **Share one link.** "Collecting is just a link in the group chat." — the cascading select (zone → unit → confirm by name → pay), built mobile-first for any phone.
3. **See who's owing.** "Reconciliation, done for you." — the zone-filterable dashboard, progress ring, and one-tap reminders; offline payments folded in.

Each row: a short heading, 2–3 sentences, and a clean visual/mock. Keep visuals consistent with the hero's style.

---

## How it works (3 steps)

A simple numbered band:
1. **Add your estate** — import zones and units from your spreadsheet.
2. **Create a collection** — name it, set the amount, get a shareable link.
3. **Share and track** — drop the link in your group; watch the dashboard fill in.

---

## Security & trust

A reassurance block (this audience is handing over money on a new platform):
- "Your money settles directly to your estate — Duesly never holds it."
- "Payments processed securely by Paystack."
- "Resident details are kept private and handled in line with Nigeria's Data Protection Act."

---

## FAQ (real objections)

- Do residents need to download an app or create an account? *(No.)*
- How does the money reach the estate? *(Settles directly to the estate's account.)*
- We collect cash and transfers too — can Duesly track those? *(Yes, record them manually.)*
- What if a resident pays for the wrong unit? *(They confirm by unit code and name before paying.)*
- Can we import our existing resident list? *(Yes, via CSV.)*

---

## Final CTA + footer

- **CTA band:** "Ready to end the screenshot chaos? — Get started with Duesly." + button. Full-width, accent background from tokens.
- **Footer:** wordmark, links (Features, How it works, FAQ, Privacy), a contact line.

---

## Styling & build constraints (repeat for the agent)

- **Tokens only:** every color and font value via `var(--…)` from `tokens.css`. If a needed token doesn't exist, ask before inventing.
- **CSS Modules** per section; no Tailwind, no inline styles except dynamic values (e.g. the progress-ring fill).
- **Spacing** in multiples of 4px; **radius** 4px (small), 8px (buttons/inputs), 12px (cards/sections).
- **Mobile-first:** default styles for small screens, `@media (min-width: 768px)` for desktop; bento and feature rows collapse to one column. The page must work cleanly at 375px.
- **Touch targets** ≥ 44px. Semantic HTML and accessible headings/landmarks.
- **Performance:** no heavy scripts; lazy-load below-the-fold visuals; keep it fast on low-end phones.
- **Honesty:** no fabricated testimonials, logos, or stats. Use real ones or honest placeholders.

---

## Prompt to give Antigravity (when you reach the landing-page step)

> *"Build the Duesly landing page following `@Duesly_Landing_Page_Brief.md`. Strictly follow `.agent/rules/design-system.md` — use only CSS variables from `tokens.css`, CSS Modules, mobile-first, spacing in 4px multiples, radius 4/8/12px, 44px touch targets, no Tailwind. Build it section by section: nav, hero, trust strip, bento grid, three feature sections, how-it-works, security, FAQ, final CTA, footer. Reuse existing UI components where they exist. Do not fabricate testimonials or logos."*
