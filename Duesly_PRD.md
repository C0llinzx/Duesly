# Duesly — Product Requirements Document

**Version:** 2.0 (MVP) · **Prepared by:** Collins (CE Design Studio) · **For:** Build + Pitch

---

## 1. Product Overview *(Compulsory)*

Duesly is a web app that lets a residential estate collect its service charge and dues through a single shareable link, and see in real time which units have paid and which are still owing — without anyone downloading an app.

The treasurer sets up the estate's zones and units once, creates a collection, and shares one link. Residents open it, select their zone and unit, and pay. The dashboard reconciles itself: paid vs. owing, filterable by zone, with one-tap reminders. If someone read only this section, they should understand Duesly completely: **set up once, share one link, watch the dashboard reconcile itself.**

---

## 2. Objectives *(Compulsory)*

- **Kill manual reconciliation.** End the cycle of treasurers matching bank-alert screenshots to flats by hand.
- **Make "who is owing" instant and zone-level.** Give the treasurer and zone reps a live, filterable owing list instead of a contested spreadsheet.
- **Raise the collection rate.** Remove payment friction (no app, no account) and make chasing defaulters a one-tap action.
- **Rebuild trust through transparency.** In Nigerian estates the recurring fight is "where did the money go?" Duesly produces a clean, shared record of who paid what and when.
- **Never hold the estate's money.** Funds settle directly to the estate; Duesly sits in the flow, not on the balance.
- **Be usable by a non-technical treasurer and a first-time resident, on a phone.** Mobile-first, WhatsApp-native, zero learning curve.

---

## 3. Target Users *(Compulsory)*

**Primary — the Treasurer / Financial Secretary (admin).** The Exco member who owns collections and currently does the manual reconciliation. Often a volunteer resident, not an accountant. Feels the pain most acutely and is the buyer.

**Secondary — the Estate Chairman / RA Exco.** Cares about transparency, collection rate, and being able to show residents a credible account at the AGM.

**Operational — the Facility / Estate Manager.** In larger or professionally-managed estates, the person who runs day-to-day operations and chases dues.

**Field — Zone Coordinators (sub-admins).** Exco members responsible for chasing payment within one zone; need a zone-filtered owing list on their phone. *(Role-based access is a light post-MVP addition.)*

**End payer — the Resident.** Three real-world variants the product must respect:
- *Owner-occupiers* — pay their own unit's dues.
- *Tenants* — may pay on behalf of an absentee landlord; the unit is what's billed, not the person.
- *Absentee landlords* — own a unit, rarely on the estate WhatsApp group, hardest to reach.

**Shared characteristics:** non-technical, mobile-first, WhatsApp-native, and — critically — **resistant to downloading yet another estate app**. This is why the resident never logs in or installs anything: they tap a link, pick their unit, and pay.

---

## 4. Core Features *(Compulsory)*

The engine — remove any of these and Duesly stops working:

- **Admin authentication** — treasurer sign-up / login (only the admin authenticates).
- **Estate setup** — create the estate; add zones; add units. Three roster-entry paths: **CSV/spreadsheet import** (primary — estates already keep their roster in Excel), manual entry, and paste-a-list.
- **CSV roster import** — upload the estate's existing spreadsheet (`Zone, Unit, ResidentName, Phone1, Phone2, Email?`) to populate units, resident names, and contact details in one step. Most estates already hold exactly this data, so this is the fastest path to a live roster. (Email is optional — include it only if the estate keeps resident emails.)
- **Roster management** — after the initial import, the treasurer can keep the roster current: **add** units (single, paste, or another CSV), **edit** an existing unit (fix a name, update a phone, correct a code), **fill in blanks** left by a messy import, and **deactivate** a unit (demolished, merged, permanently vacant). A **re-import upserts** — it updates units that already exist and inserts only genuinely new ones, matched on zone + unit code, so a second upload never duplicates the roster or corrupts the owing count.
- **Collections** — create a collection (title, amount, due date); auto-generate a unique shareable link.
- **Public payment page** — cascading self-identify: select zone → select unit → **see the unit code *and* the resident's name (when on file) to confirm before paying** → pay. No resident account.
- **Payment + verification** — gateway checkout, webhook verification, server-side amount validation, idempotency.
- **Manual / offline payment recording** — the treasurer can mark a unit as paid for residents who paid by cash or direct transfer. *(Essential in Nigerian estates — a real share of dues still comes in offline, and the owing list is worthless if it can't reflect that.)*
- **Reconciliation dashboard** — paid vs. total, amount collected, owing list filterable by zone.
- **Reminders & enforcement support** — reminders to owing residents via **one-tap WhatsApp deep link** (primary) and an **optional email reminder** (sent automatically, in bulk, to owing units that have an email on file). Plus an exportable **defaulters list** the estate can use to suspend perks (e.g. the gate visitor-call service) until a unit clears. *(See Section 8.)*
- **Notifications** — payment receipt to the resident, payment alert to the treasurer, welcome on signup.

---

## 5. User Flow *(Recommended)*

**Treasurer Flow:** Sign up → create estate → add zones & units → create a collection → get a shareable link → broadcast it (WhatsApp group, gate notice with QR).

**Resident Flow:** Open link → select zone → select unit → **confirm it's the right unit by the code *and* the resident name shown** → see the amount → pay on the gateway → get a confirmation + receipt.

**Post-Payment Flow:** Gateway webhook verifies the payment → the unit is marked paid → the resident receives a receipt and the treasurer a notification → the dashboard's owing list updates → owing units can be reminded with one tap.

Writing these out surfaces gaps early — e.g. the need for offline-payment recording (above) and the "I can't find my unit" fallback (Section 9).

---

## 6. Data Model & Schema *(Useful)*

- **User** (admin) — name, email, phone, passwordHash *(Bcrypt)*
- **Estate** — name, adminId
- **Zone** — estateId, name, coordinatorId? *(reserved for post-MVP sub-admins)*
- **Unit** — zoneId, label/code (e.g. "3B"), residentName?, phone1?, phone2?, residentEmail?, occupancyType? (owner / renter), status (active / exempt / inactive) — **the billable entity**
  - *Resident name* is shown at payment time so a payer can confirm they picked the right unit. *Two phone numbers* mirror what estates already register per household for the gate/visitor-call service; both are reachable for reminders. *Resident email* is optional and only used if the estate has it — it enables the optional email reminder channel. All of this maps directly to the columns estates already hold in Excel, so a CSV import populates it in one pass.
  - **Unique constraint on (zoneId, label):** a unit code is unique within its zone. This is what makes re-imports safe — it lets the system *upsert* (match-and-update existing units, insert only new ones) instead of duplicating, and it must be set from the start because it's painful to retrofit once data exists.
- **Collection** — estateId, slug (unique), title, amountKobo, dueDate, status
- **Payment** — collectionId, unitId, amountKobo, method (online/offline), status (pending/success/failed), gatewayTxRef (unique), gatewayTxId, paidAt
- **PaymentLog** — a dedicated table recording every payment event independently of the Payment row (the "cash register").

**Reconciliation:** for a collection, left-join Units against successful Payments — any Unit without one is *owing*, filterable by Zone. This one query powers the dashboard.

*Note on time:* timestamps store the full date string (year, month, day, hours, minutes, seconds), not just a clock time — normal, not a bug.

---

## 7. System Behavior *(Useful)*

- Every collection generates a **unique, readable slug link** (e.g. `/pay/lekki-gardens-jan-service-charge`).
- Pages load fast; the public payment page is lightweight for low-end phones and weak data.
- The system **validates payment server-side before marking a unit paid** — the gateway redirect is a hint, not proof.
- **Duplicate payments are blocked** via unique transaction-reference checks (a unit can't be marked paid twice; landlord *and* tenant can't both be charged for one unit-collection).
- **Amounts always come from the server (database)**, never the client.
- **Unit identity is confirmed before payment** — the public page shows the unit code alongside the resident name on file, so a payer self-corrects before money moves rather than paying against the wrong flat.
- The **owing list is computed, not stored** — always derived live from units minus successful payments, so it can never drift out of sync.

---

## 8. Notifications, Reminders & Enforcement Logic *(Custom)*

| Trigger | Recipient | Channel |
|---|---|---|
| Successful payment | Resident (receipt) + Treasurer (alert) | Email + dashboard |
| Failed payment | Resident | Dashboard (email optional) |
| New collection created | Residents | Shareable link (manual WhatsApp broadcast) |
| Unit still owing | Owing resident | One-tap WhatsApp deep link from the owing list (both registered numbers reachable); **optional email reminder** when an email is on file |

SMS broadcast reminders exist but cost money per message, so they are **deferred to post-MVP**. WhatsApp deep links cost nothing and match how estates already chase payment. **Email reminders** are an optional, no-cost channel that reuses the same email setup as receipts (Section 9 of the build) — they send automatically to owing units with an email on file, so they're useful as a bulk nudge that doesn't need tapping one contact at a time. They depend on the estate actually having resident emails, which many won't, so WhatsApp stays primary.

**Enforcement (estate-driven, Duesly-supported).** Reminders alone don't move chronic defaulters; estates need a lever. Many Nigerian estates already register two phone numbers per household for the **gate/driveway visitor-call service** — a genuine perk residents value. Duesly supports enforcement by producing a **defaulters list** (owing units, filterable by zone, with their registered numbers) that the estate can act on — for example, **suspending the visitor-call perk for a unit until its dues clear**, then restoring it once Duesly shows the payment.

For the MVP this is a *list Duesly surfaces and the estate enforces operationally* — Duesly does not itself control the gate. Direct integration with an estate's access/gate system to **automate** suspend-and-restore is a deliberate post-MVP path (and the point where Duesly would start to overlap the heavier platforms, so it's a considered step, not a default).

---

## 9. Edge Cases *(Recommended)*

| Scenario | Response |
|---|---|
| Resident selects the wrong unit | Unit code **and resident name** shown before payment so the payer confirms (or self-corrects); receipt names the unit so any mismatch is caught early |
| Resident paid by cash / direct transfer (offline) | Treasurer records it manually so the unit shows paid and the owing list stays accurate |
| Landlord and tenant both try to pay one unit | Duplicate blocked; show "this unit is already paid for this collection" |
| Payment fails | Retry, then mark failed; the unit remains owing |
| Unit is vacant / between tenants | Treasurer can mark the unit exempt or inactive for that collection |
| Resident can't find their unit (new resident, not on roster) | "Can't find your unit?" fallback prompts them to contact the treasurer / request to be added |
| Absentee landlord with no phone on record | Owing list flags it; reminder can't auto-send, so it surfaces for manual follow-up |
| Collection is closed or past due | "This collection is closed" — checkout disabled even with the link |
| Invalid / tampered link | Graceful "collection not found" page |
| CSV import has messy or incomplete rows (missing name/phone, blank zone) | Import previews parsed rows, flags problems, and lets the treasurer fix or skip before committing — units can still be created with names/phones added later |
| Treasurer re-imports an updated roster (next year, new residents) | Upsert on (zone + unit code): existing units are **updated**, genuinely new ones are **inserted**, nothing is duplicated; the import preview shows a "will update / will add" count before committing |

These are the guardrails — and why a payment may occasionally take a few extra seconds (a verification retry running quietly in the background).

---

## 10. Security & Compliance *(Compulsory)*

- **Validate all inputs** before they touch the database or business logic.
- **Use a trusted, popular Nigerian payment gateway** — Duesly uses **Paystack** (behind a pluggable gateway layer, so the provider can be swapped without touching the rest of the app). In payments, trust is the product.
- **Prevent duplicate transactions** via reference checks and idempotency.
- **Encrypt sensitive data** — passwords stored with Bcrypt, never plain text.
- **Secrets live server-side only**, in environment variables, never committed to the repo; the gateway *secret* key never reaches the browser.
- **Webhook verification is mandatory** — never bypassed.
- **Money is stored in Kobo** (₦1 = 100 kobo), converted to Naira only at display. This prevents rounding and calculation errors on amounts like ₦15,000.50.
- **Data protection (NDPA 2023):** residents' names and phone numbers are personal data — collected only as needed, not exposed publicly, and handled in line with Nigeria's Data Protection Act.
- **Non-deposit-taking by design:** Duesly never pools or holds estate funds; money settles directly to the estate, keeping it clear of deposit-taking regulation.

---

## 11. Market Intelligence *(Compulsory)*

**Trends.** Residential estate associations in Nigeria increasingly run like mini-governments, levying and spending real money on security, water, power, and roads. A wave of estate-management apps has emerged, and residents are more comfortable paying online — but adoption is still gated by how heavy these systems are.

**Opportunities.** The existing tools are nearly all **heavy, all-in-one platforms** — access control + visitor management + wallets + a resident app that everyone must download and link a profile to. That weight is itself the gap: many estates (especially mid-tier and self-managed ones) won't migrate their whole operation or force an app on every resident just to collect a levy. There is room for a **single-purpose, zero-onboarding** tool, and for **transparency** as a wedge in estates where residents distrust opaque collection.

**Competitors.**
- *All-in-one estate platforms:* Gate Africa, Clannit, WHARI, Luchismart Prop+, Estility, Venco — full systems (access control, wallets, visitor management) with dues as one module; require estate-wide adoption and a resident app.
- *Association-dues tools:* PayUrDues — closest in spirit, focused on association dues/elections/members.
- *Generic payment links:* Paystack / Flutterwave payment links — flexible but not estate-aware; no roster, no per-unit owing reconciliation.
- *The status quo:* bank transfers + WhatsApp + a treasurer's spreadsheet.

**Positioning.** Duesly is **not** another all-in-one estate OS. It does one job better than the heavy platforms: collect a dues run and reconcile it, with **no app to download, no system to migrate to, no wallet to fund** — just a link, a unit, and a payment, plus a self-updating owing list. The estate keeps its own bank account and its money settles directly. Speed and simplicity are the whole pitch.

**SWOT — Duesly**

| | |
|---|---|
| **Strengths** | Zero resident onboarding (no app/account); minutes to set up via CSV from the estate's existing Excel; name shown at payment to prevent wrong-unit errors; unit-based reconciliation; transparent record; estate keeps its funds |
| **Weaknesses** | Single-purpose (no access control / wallet); depends on a payment gateway; offline payments still need manual entry; gate-perk enforcement is operational, not automated, in the MVP |
| **Opportunities** | Mid-tier & self-managed estates underserved by heavy platforms; an enforcement lever (defaulters list → suspend visitor-call perk) that pure payment-link tools lack; co-ops, schools, religious bodies as later verticals; transparency as a differentiator |
| **Threats** | Incumbents can bundle a "simple link" mode; gateways could ship an estate template; trust barrier for a new platform handling money |

---

## 12. Technical Recommendations *(Optional)*

Next.js, Prisma, and PostgreSQL, deployed on Vercel, with **Paystack** for checkout, webhooks, and verification — integrated behind a gateway-agnostic layer that keeps the provider swappable. *(Stack detail is intentionally omitted from pitch-facing summaries.)*

---

## 13. Success Metrics *(Compulsory)*

- **Collection rate** — share of units that move from owing to paid within a collection cycle (the headline number for an estate).
- **Reconciliation accuracy** — dashboard paid/owing matches reality with zero manual matching.
- **Link-to-payment conversion** — of residents who open the link, how many complete payment.
- **Time-to-collect** — drop in the time between issuing a collection and knowing who has paid.
- **Payment success rate** — share of attempted payments that go through.
- **Checkout completion time** — how fast a resident goes from opening the link to a confirmed payment.
- **Adoption signal** — at least one real estate runs one real collection end-to-end through Duesly.

---

## Appendix — Roadmap Beyond the MVP

The engine — **a roster of payers, a collection, and automatic reconciliation** — is not estate-specific. It extends to **mid-sized private schools** (bill the student; one parent pays for several children; per-class fees), **cooperatives & associations** (member dues), and **religious organisations** (pledges, recurring giving). A separate, considered path is **access-system integration** — automating the suspend/restore of the gate visitor-call perk based on payment status, rather than the estate doing it off a defaulters list. These are deliberately out of MVP scope: estates first, proven, then the rest.
