# Duesly — Levies Page (Card Grid) — Agent Build Spec

**Target:** rebuild the Levies page from a single stretched banner into a responsive grid of self-contained levy cards that scales as levies accumulate.

**Inherits from `docs/Duesly_Overview_Widget_Spec.md` — do not repeat, do not contradict:**
- §0 non-negotiable constraints (spacing scale, type tokens, color rule, font, tokens.css, drawer-vs-modal).
- The shared `.card` shell, hairline-border/no-shadow treatment, and the Linear/Resend restraint.
- Content region: 32px padding, `max-width: 1440px`, centered.

This doc defines only what's new: the grid, the levy card anatomy, the status system, list behaviors, and actions.

**Run rule:** one phase at a time. **At the end of every phase, STOP and show the result before continuing.**

---

## 1. What's wrong with the current page (context)

- One levy stretched full-width leaves dead space and doesn't scale — N levies = N giant banners.
- No type hierarchy applied, so everything sits small and floats (the "font too small" complaint).
- **Breaks the color rule:** "0/15 paid" in green and "₦112,500 outstanding" in red are full-size colored text. Values must be neutral; the progress bar + one status badge carry the color.

---

## 2. Layout

Header unchanged in content: `page-title` "Levies" + `meta` subtitle "Create a levy, share one link, and track who's paid." + `New levy` button (primary, top-right).

Grid below the header:

```css
.levies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}
```

`auto-fill` + `minmax(340px, 1fr)` yields ~3-up at 1440, 2-up on tablet, 1-up on mobile with no manual breakpoints. Do not hardcode column counts.

---

## 3. Levy card anatomy

Uses the inherited `.card` shell **with 16px padding** (intentionally denser than the 24px Overview stat cards — this is a documented density choice for the grid context, not an off-scale value; 16 is on the scale). Structure, top to bottom:

```
┌────────────────────────────────────┐
│ Security Levy               [Active]│   name (section-header) + status badge
│ ₦7,500 / house · Estate-wide · Due 12 Aug │   meta line (meta, muted)
│                                     │
│ ▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    │   progress bar (accent fill)
│ 0 / 15 paid                         │   count (meta)
│                                     │
│ Collected        Outstanding        │   mini-stat labels (micro, muted)
│ ₦0               ₦112,500           │   mini-stat values (body, NEUTRAL)
│ ─────────────────────────────────── │   hairline divider
│ 🔗 Copy link   ✎ Edit          ⋯   │   actions footer
└────────────────────────────────────┘
```

Exact treatment:

| Element | Token / value | Notes |
|---|---|---|
| Name | `section-header` (16/600), `on-surface` | |
| Status badge | `micro`, tinted — **the one colored signal per card** | see §4 |
| Meta line | `meta` (13), `on-surface-variant` / muted | `amount / house · scope · due` |
| Progress bar | 6px height, track `surface-container-high`, fill `primary` | full-width of card |
| Paid count | `meta` (13), `on-surface-variant` | `"0 / 15 paid"` |
| Mini-stat label | `micro` (11–12), muted | "Collected", "Outstanding" |
| Mini-stat value | `body` (14), **`on-surface` neutral** | **never red/green** — this is the fix |
| Footer | divided by hairline (`outline`), 12px padding-top | actions row |

Internal spacing (all on scale): name→meta 4px · header block→bar 16px · bar→count 8px · count→mini-stats 16px · mini-stats→divider 16px · gap between the two mini-stats 24px · label→value 4px.

---

## 4. Status system

Define the set explicitly. Status is the only colored signal on the card.

| Status | Badge | Card treatment |
|---|---|---|
| **Active** | `text-success` on `bg-success` tint, `micro` | full emphasis; bar in `primary` |
| **Closed** | `text-secondary` on neutral `fill-control` tint, `micro` | dimmed back (reduced container prominence); bar in `text-muted`, not accent |
| **Draft** *(only if you have this state)* | `text-warning` or neutral, `micro` | full emphasis; primary action becomes "Publish", no live link yet |

Closed cards recede so active ones lead the eye. Do not apply opacity to text; dim the card as a container / use muted bar + neutral badge.

---

## 5. Ordering + filtering

- **Order:** Active first (by due date ascending — soonest due leads), then Draft, then Closed (most recently closed first).
- **Filter:** a lightweight segmented control (All / Active / Closed) in the header. **Only add it once the list grows past ~3 levies** — not at MVP. Handle filtering client-side; no round-trip.

---

## 6. Scope tag

The scope segment in the meta line is load-bearing — it's what decides auto-add behavior when a house is added, so surface it: `Estate-wide` · `Zone A–C` · `Custom (N houses)`. A treasurer should see at a glance which levy a new house will or won't join.

---

## 7. Actions + drawer/modal mapping

- **Card click → levy detail route** ("track who's paid" — paid/owing houses for that levy). The card body is the click target; call `stopPropagation` on the footer controls so buttons don't trigger navigation.
- **Copy link** — primary quick action; copies the public payment link + toast. Keep prominent (the "share one link" loop).
- **Edit** — opens the **right drawer** (inherited drawer rule). Not a modal.
- **Overflow (⋯)** menu:
  - **Close levy** → confirmation **modal** (materially changes state — stops collection / affects residents' ability to pay).
  - **Delete levy** → confirmation **modal** (irreversible).
- **Closed cards:** footer reduces to `View` + overflow (Reopen / Delete).

Consistency guard: this card shares the Overview active-levies banner's visual language but is a **denser, fuller object** (progress + mini-stats + actions). The banner is a one-line glanceable strip; do not clone the banner into the grid or vice-versa.

---

## 8. Empty state

No levies yet → an invitation, not a blank page (per CDS content rules): headline "Create your first levy", one-line body echoing the subtitle, and the `New levy` CTA. Centered, quiet, single card-width block.

---

## PHASE 0 — Page scaffold + grid

```
Build: header (title, subtitle, New levy) + .levies-grid with auto-fill / minmax(340px, 1fr) / 16px gap.
Drop 3 stub cards using the inherited .card shell at 16px padding.
Verify: grid reflows 3→2→1 by width with no hardcoded breakpoints; spacing on scale; tokens only.
```
**→ STOP. Show the grid reflow.**

## PHASE 1 — Levy card anatomy (real data)

```
Implement the full card per §3 with real data: name + status badge, meta line (amount / scope / due),
progress bar + paid count, Collected/Outstanding mini-stats.
Enforce the color fix: mini-stat values NEUTRAL; bar + badge are the only color.
```
**→ STOP. Show it.**

## PHASE 2 — Status system + ordering

```
Implement §4 status treatments (Active / Closed [/ Draft if present]) and §5 ordering (active-first by due date).
Closed cards recede (muted bar, neutral badge, reduced prominence).
Filter control: stub it but hide until levy count > 3.
```
**→ STOP. Show active + closed cards together.**

## PHASE 3 — Actions + drawer/modal

```
Wire §7: card click → levy detail; Copy link (+toast); Edit → right drawer;
overflow menu with Close → confirm modal and Delete → confirm modal.
stopPropagation on footer controls. Closed cards show View + overflow only.
```
**→ STOP. Show the drawer and one confirm modal.**

## PHASE 4 — Empty state + polish

```
Implement §8 empty state. Final sweep: scale-only spacing, tokens-only color, correct type roles,
no shadows, status is the only color signal, banner-vs-card languages stay distinct.
```
**→ STOP. Show populated and empty states.**

---

## Guardrail checklist (delta from Overview — check before each STOP)

- [ ] Grid uses `auto-fill` / `minmax(340px,1fr)` — no hardcoded column counts
- [ ] Card padding 16px (documented density choice, on scale)
- [ ] Mini-stat values neutral — no red/green text anywhere (the fix)
- [ ] Status badge is the single colored signal per card
- [ ] Scope tag present in meta line
- [ ] Edit → drawer; Close / Delete → modal
- [ ] Card click navigates; footer controls stopPropagation
- [ ] Closed cards recede; active-first ordering
- [ ] Empty state is an invitation with the New levy CTA
- [ ] Inherited constraints from the Overview spec still hold
