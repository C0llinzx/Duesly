---
trigger: always_on
---

# Rule: Code Style — Duesly

> Placement: `.agent/rules/`
> Conventions for all code in Duesly. Clarity over cleverness — a junior dev should be able to read it.
> Naming is the most critical part of this file — incorrect casing can break production builds.

## Language
- **TypeScript everywhere**, `strict: true`. No `any` unless justified with a comment.
- Prefer explicit return types on exported functions and server actions.
- Use `const` by default; `let` only when reassignment is real.

## Naming
- `camelCase` — variables, **utility functions**
- `PascalCase` — React **components**, types, interfaces, **and Prisma model names**
- **Hooks** must begin with `use` (e.g. `useOwingUnits`)
- `kebab-case` — route folders/files where idiomatic for Next.js
- `SCREAMING_SNAKE_CASE` — env vars and true constants
- **Database columns** use snake_case, mapped to camelCase in the Prisma client
- Boolean names read as predicates: `isPaid`, `hasEmail`, `canRemind`

## Components
- Small and single-purpose. If a component does two things, split it.
- **Server-first.** Add `"use client"` only when you need interactivity, state, or browser APIs.
- Props are typed with an explicit `interface`/`type`. No untyped prop bags.
- No inline business logic in JSX — extract to helpers/hooks.

## Validation
- Input-validation rules are defined in **security.md**. Structurally: keep **Zod** schemas in `/lib/validation` and reuse them on client and server.

## Error handling
- **Fail loudly in dev, gracefully for users.** Never surface stack traces to residents.
- Server actions / API routes return typed results, e.g. `{ ok: true, data }` or `{ ok: false, error }`.
- Wrap external calls (Paystack, email) in try/catch and log with context.
- Never swallow errors silently.

## Money
- The kobo storage rule is defined in **AGENTS.md**. Structurally: centralize money helpers in `/lib/money` (`toMajorUnits`, `formatNaira`) — don't scatter `/100` math.

## Async & data
- `async/await` only; no raw `.then()` chains.
- One Prisma client singleton from `/lib/db.ts` (avoid connection exhaustion in dev).
- All database access goes through Prisma; raw SQL only in migrations (Prisma QueryRaw).
- Keep DB queries close to where data is used (server components / actions).

## Imports & structure
- Absolute imports via a path alias (`@/lib`, `@/components`).
- Group imports: external → internal → relative.
- One component per file; colocate small helpers, extract shared ones to `/lib`.

## Secrets & config
- Secrets handling is defined in **security.md**. Structurally: validate required env vars at startup with a Zod schema, and maintain `.env.example` listing every required variable (no real values).

## Comments & commits
- Comment the *why*, not the *what*. Code should explain itself.
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`. Small, focused commits.

## Formatting
- Prettier + ESLint enforced. Run `npm run lint` before considering work done.
- 2-space indent, single quotes, trailing commas where valid.