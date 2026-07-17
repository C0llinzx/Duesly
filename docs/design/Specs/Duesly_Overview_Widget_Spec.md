# Duesly — Overview (Widget Redesign) — Agent Build Spec

**Target:** rebuild the Overview home dashboard as a modular widget grid.
**Design benchmark:** Linear / Resend. Flat, bordered, near-black. No shadows, no rounded white tiles.
**Skin rule:** borrow the *information architecture* from the reference dashboard; render it in Duesly's existing dark, hairline-bordered card style. Do not introduce new visual languages (no soft drop-shadows, no gradients, no elevated white cards).

**How to run this spec:** build one phase at a time. **At the end of every phase, STOP and show the result before continuing to the next phase.** Do not chain phases. Do not refactor unrelated screens.

---

## 0. Non-negotiable constraints (read before writing any code)

- **Spacing scale — use only:** `4, 8, 12, 16, 24, 32, 48` px. No other values anywhere (margins, padding, gaps).
- **Type tokens — use only these named roles** (map to `tokens.css`; sizes below are the target):
  | Token | Size / weight | Use |
  |---|---|---|
  | `page-title` | 28px / 600 | "Overview" heading |
  | `section-header` | 16px / 600 | "Active levies", "Recent activity", widget titles |
  | `card-label` | 12px / 600, uppercase, letter-spacing 0.04em | stat card labels (COLLECTED, OUTSTANDING) |
  | `stat-value` | 24px / 600 | big stat numbers (reduced from 32px) |
  | `body` | 14px / 400 | list rows, names |
  | `meta` | 13px / 400 | secondary/supporting text |
  | `micro` | 11–12px / 500 | pills, timestamps, badges |
- **Color rule:** data values render in neutral text (`on-surface`). Status (paid/owing, deltas, online/offline) appears **only as small signals** — dots, pills, thin bars. **Never a full-size colored number.**
- **Font:** Inter (existing identity). No change.
- **Tokens:** reuse existing `tokens.css` (MD3 naming). Do not hardcode hex. Where a role is missing, add it to `tokens.css` — do not inline. Reference values (dark theme) for anything new:
  - canvas / `surface`: `#08090a`
  - card / `surface-container`: one step up from canvas (hairline-separated, not shadow-separated)
  - elevated card / `surface-container-high`: one step above that
  - `outline` (hairline border): white @ ~8% opacity
  - `outline-variant` (stronger border): white @ ~12%
  - `primary`: `#717CE2`
  - tertiary: cornflower blue (existing)
  - `on-surface` (primary text), `on-surface-variant` (secondary), muted (tertiary text)
- **Drawer vs modal:** per-item actions use the right slide-out **drawer**; **modals are reserved for destructive/irreversible confirmations only.**
- **Preserve:** the collapsible "Getting started" checklist widget (bottom-right, Jira/Linear pattern). It must survive this rebuild untouched. Same for the "1 Issue" affordance (bottom-left) and the top bar (breadcrumb, theme toggle, avatar).

---

## 1. Layout contract

Content region sits to the right of the existing sidebar. Vertical stack, top to bottom:

```
[ header row ]        Overview + estate badge · right: "+ New levy"
[ stat grid ]         4 cards, equal width
[ active levies ]     full-width banner
[ row A ]             Collection over time (2fr)  |  Recent activity (1fr)
[ row B ]             Recent transactions (2fr)   |  Top owing houses (1fr)
```

### Grid CSS (exact)

```css
.overview {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 32px;
  max-width: 1440px;      /* prevents ultra-wide stretch; margin auto */
  margin: 0 auto;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

/* BOTH content rows use the SAME template so the right rail
   shares one continuous edge down the page. Do not vary this. */
.row-split {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}
```

**Organizing principle (enforce this):** left column = the two *wide surfaces* (chart, transactions table). Right rail = the two *digest lists* (activity feed, owing houses). The right rail must align: identical `2fr 1fr` on row A and row B.

### Card shell (shared)

```css
.card {
  background: var(--surface-container);
  border: 1px solid var(--outline);
  border-radius: 12px;
  padding: 24px;
}
```

No `box-shadow`. Border does the separation.

### Responsive

- `≤ 1024px`: `.stat-grid` → `repeat(2, 1fr)`; `.row-split` → single column (stack, chart above activity, transactions above owing).
- `≤ 640px`: `.stat-grid` → single column.
- Banner stays full-width at all breakpoints.

---

## 2. Data sources

Reference the existing model chain: `Estate → Zone → Unit (House) → Collection (levy) → Payment`.

| Widget | Query intent |
|---|---|
| Stat: Collected | `sum(Payment.amount)` for the estate's active levies |
| Stat: Outstanding | `(active houses in scope × per-house amount) − collected` |
| Stat: Houses paid | `count(units fully paid) / count(units in scope)` → `"0 / 15"` |
| Stat: Collection rate | `collected / (collected + outstanding)` → `0%` |
| Active levies | `Collection` where status = active, with per-house amount, due date, paid/owing counts |
| Collection chart | `Payment` grouped by day, **cumulative**, plotted against `target = total expected` |
| Recent activity | activity-log events (levy created, houses added, reminders sent) |
| Recent transactions | `Payment` rows, ordered `createdAt desc`, with `method` (online = Paystack / offline = manual) |
| Top owing houses | units with outstanding balance, ordered by amount desc, `limit 5` |

Fetch in the server component; pass typed data into presentational widgets. Every widget accepts an empty/loading state (see §11).

---

## PHASE 0 — Scaffold + token check

**Goal:** grid skeleton with stub widgets. No real data.

- Build `.overview`, `.stat-grid`, both `.row-split` rows, `.card` shell.
- Drop labelled placeholder boxes in each slot (just the `section-header` title inside each card).
- Keep the existing header row, top bar, sidebar, Getting-started widget, "1 Issue" wired and untouched.
- Confirm every spacing value used is on the scale; confirm no hardcoded hex.

**Acceptance:** correct proportions, right rail aligned across both rows, responsive breakpoints collapse as specified, dark theme intact.

**→ STOP. Show the skeleton before continuing.**

---

## PHASE 1 — Stat cards (4-up)

**Goal:** the four top cards with real data.

Cards, in order: **Collected · Outstanding · Houses paid · Collection rate.**

### Three-part anatomy (shared by all four)

Every stat card has the same three structural slots, in order:

```
┌─────────────────────┐
│ COLLECTED           │  ← label (card-label: uppercase, 11px, 0.04em tracking, muted)
│ ₦0                  │  ← value (stat-value: 24px / 600, neutral)
│ 0% of target        │  ← support line (micro: 12px, muted — always present)
└─────────────────────┘
```

- **Label slot:** `card-label` — uppercase, 11px, 0.04em letter-spacing, `text-secondary`
- **Value slot:** `stat-value` — 24px / 600, `text-primary`, neutral. Reduced from 32px for compact layout.
- **Support line slot:** `micro` — 12px / 500, `text-secondary`. Always present on all four cards. Some carry a small status signal (danger dot), others are neutral context.

Support line content (target-relative framing):
- Collected → `"0% of target"` (compute: collected / total expected)
- Outstanding → `"100% remaining"` (compute: outstanding / total expected)
- Houses paid → `"15 still owing"` (small danger dot before it when owing > 0)
- Collection rate → `"0 of 15 houses"` (keep the thin progress bar too)

All values compute from real data and update naturally (e.g. "32% of target", "8 still owing").

### Card spacing

- Card vertical padding: 16px top and bottom (horizontal as-is)
- No fixed height / min-height — cards hug their content
- Grid `align-items: stretch` so four cards match the tallest
- Internal gaps: label → value 8px, value → support line 8px
- Grid: `repeat(4, minmax(0, 1fr))`, gap 16px

- **No month-over-month deltas.** (No prior period at MVP; a permanent "—" is noise. Deltas are a post-history feature — leave a `trend?` prop stubbed but unused.)
- Any status signal (e.g. "15 owing" under Houses paid) is `micro` size with a small danger dot — never a large colored figure.

**Empty state:** ₦0 / 0 renders normally; these are valid zero values, not empty states.

**Acceptance:** four equal cards, neutral values, support lines always visible, status only as small signals, scale-compliant spacing.

**→ STOP. Show it.**

---

## PHASE 2 — Active levies banner

**Goal:** move active levies up to a full-width banner directly under the stat grid.

Single levy (MVP) renders as one row:

```
🛡  Security Levy   ₦7,500 per house · Due in 27 days        [0 paid][15 owing]  ▓▁▁▁▁▁▁▁▁▁
```

- Full-width `.card`, horizontal layout, `align-items: center`, `space-between`.
- Left: icon + levy name (`section-header`) + meta line (`meta`): `₦7,500 per house · Due in 27 days`.
- Right: paid/owing pills (`micro`, small signals — green/red tint, quiet) + a thin progress bar (max-width ~160px, `primary` fill).
- **Multiple levies:** stack rows inside the same banner card, hairline divider (`outline`) between rows. Do not spawn separate cards per levy.

**Empty state:** no active levy → banner shows "No active levies" + a `+ New levy` inline action, quiet.

**→ STOP. Show it.**

---

## PHASE 3 — Collection over time (chart)

**Goal:** left widget of row A. This is the treasurer's "am I on pace" view — **not** a calendar-month bar chart.

- **Chart type:** cumulative area/line. X = days since the levy launched (levy lifecycle, not Jan–Dec). Y = ₦ collected. Overlay a dashed horizontal **target line** at total expected (e.g. ₦112,500).
- Line/area uses `primary`. Target line is a dashed hairline (`outline-variant`) with a `micro` label.
- Library: recharts `AreaChart` (or an equivalent lightweight lib already in the stack). Keep it flat — no gradient fills; a low-opacity `primary` area is acceptable, no drop shadow.
- Header: `section-header` "Collection over time" + `meta` subtitle "cumulative ₦ toward target".
- **Leave a `view` prop stubbed** (`"cumulative" | "monthly"`) defaulting to `cumulative`. Monthly-received bars become useful once estates have run several levies — build that later, not now.

**Empty state (critical — this is the default for every new estate):** no payments yet → render the axis baseline and the dashed target line only, with centered `meta` text: "Collection will appear here once residents start paying." No broken flat-line-at-zero.

**→ STOP. Show it, including the empty state.**

---

## PHASE 4 — Recent activity (feed)

**Goal:** right widget of row A. Structural/system events — distinct from payments.

- Vertical list. Each item: small leading icon (`on-surface-variant`) + `meta` text + right-aligned `micro` timestamp.
- Event types: levy created, N houses added to Zone X, reminders sent, etc.
- Keep it quiet: no avatars, no colored rows. Icon + text + time.
- Header `section-header` "Recent activity" with a `View all →` link (`meta`, `primary` on hover).

**Empty state:** "No activity yet." — single quiet line.

**→ STOP. Show it.**

---

## PHASE 5 — Recent transactions

**Goal:** left widget of row B. Payment events. **Online (Paystack) and offline (manual) must be visually distinct** — but both stay quiet.

- Row layout: `House code · Name` (left) — `₦amount` + method signal (right).
- **Amount is neutral** (`on-surface`) always. The method is the only signal:
  - **online:** `micro` pill, `primary`-tinted text, ghost fill. Optional `ti-credit-card` icon.
  - **offline:** `micro` pill, outlined (`outline-variant`), muted text, label "offline". Optional `ti-cash` icon.
- Ordered `createdAt desc`, ~5 rows, `View all →`.
- No status column needed here (a transaction *is* a payment = paid); reserve status styling for other tables.

**Empty state (default for new estates):** turn absence into action. Show: "No payments yet — share your payment link to start collecting" with a quiet **Copy payment link** action (ghost button). This is more useful than a blank table.

**→ STOP. Show it, including the empty state.**

---

## PHASE 6 — Top owing houses (+ reminders)

**Goal:** right widget of row B. The most *actionable* widget — this is where "who do I chase" lives.

- Rows: `House code · Name` (left) — `₦owed` (right, neutral).
- Header: `section-header` "Top owing houses" + count badge (`micro`) + `View all →`.
- Footer: "+N more houses still owing →" link.
- **Per-row action (on hover / always on touch):** a quiet `Remind` control (`ti-bell`, `micro`) → sends one instant email reminder → toast confirmation. Rate-limit guard so the same house can't be spammed.
- **Bulk action:** header "Remind all owing" → because sending N emails is **irreversible and mass**, this is one of the few cases that warrants a confirmation **modal** ("Send 15 reminders?") consistent with the destructive-confirm rule. Single-house remind stays instant + toast (no modal).
- Uses the existing instant bulk-email path (no queue/cron).

**Empty state:** "No houses owing 🎉 everyone's paid." — quiet, `meta`.

**→ STOP. Show it.**

---

## PHASE 7 — Empty-state pass + polish

**Goal:** make the sparse state first-class and integrate onboarding. Do this deliberately — every estate starts at ₦0 / 0 paid / 0 transactions, so this state is the *default*, not the exception.

- Verify each widget's empty state (below) is implemented, quiet, and action-oriented — never a broken-looking blank.

  | Widget | Empty content | CTA |
  |---|---|---|
  | Stat cards | ₦0 / 0 (valid, not empty) | — |
  | Active levies | "No active levies" | + New levy |
  | Collection chart | baseline + target line + note | — |
  | Recent activity | "No activity yet." | — |
  | Recent transactions | "No payments yet — share your link" | Copy payment link |
  | Top owing houses | "No houses owing" | — |

- **Getting-started checklist:** confirm it still renders bottom-right, collapsible, `2 of 3` state preserved. When the dashboard has no data, onboarding is the real job — the checklist stays prominent; do not let the rebuild bury or break it.
- Final pass: every spacing value on the scale; every color from tokens; type roles applied correctly; no shadows introduced; right rail aligned; responsive breakpoints verified.

**→ STOP. Show the full dashboard in both populated and empty states.**

---

## Component inventory (for reference)

| Component | Type | Key props |
|---|---|---|
| `StatCard` | presentational | `label, value, trend?` (trend unused at MVP) |
| `StatGrid` | layout | `stats[]` |
| `ActiveLeviesBanner` | presentational | `levies[]` |
| `CollectionChart` | client | `data[], target, view` (`view` defaults `cumulative`) |
| `ActivityFeed` | presentational | `items[]` |
| `TransactionsWidget` | presentational | `transactions[]` (each has `method: online \| offline`) |
| `OwingHousesWidget` | presentational | `houses[], onRemind, onRemindAll` |

Each widget owns its own empty state.

---

## Guardrails checklist (agent self-check before each STOP)

- [ ] Only scale spacing values used (4/8/12/16/24/32/48)
- [ ] No hardcoded hex — all colors from `tokens.css`
- [ ] Correct named type roles applied
- [ ] No box-shadows / gradients / white elevated cards
- [ ] Data values neutral; status only as small signals
- [ ] Right rail aligned (identical `2fr 1fr` on both rows)
- [ ] Online vs offline payments visually distinct, both quiet
- [ ] Empty state present and action-oriented for this widget
- [ ] Getting-started checklist + top bar + sidebar untouched
- [ ] Stopped and showed result — did not chain into next phase
