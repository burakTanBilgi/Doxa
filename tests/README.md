# Tests

Two layers:

- **`tests/unit/`** — Vitest, jsdom, mocked Supabase. Runs offline, fast, on every
  change. Use these to lock down pure logic and the cloud-storage query shapes.
- **`tests/integration/`** — Node scripts that hit a real Supabase project.
  Excluded from `npm test` so they never run accidentally; invoked
  manually via `npm run test:smoke` when you want to diagnose what
  Supabase is actually rejecting.

## Running

```bash
npm test           # unit suite (one-shot)
npm run test:watch # unit suite in watch mode
npm run test:smoke # supabase round-trip — needs creds (see below)
```

## Supabase smoke test

The smoke script reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from
`.env`, then exercises the entire round-trip — sign in, list, create, update,
load, delete, sign out — printing PASS/FAIL with full error bodies for each
step.

```bash
# Quickest path: supply test creds inline
SUPABASE_TEST_EMAIL=you@example.com \
SUPABASE_TEST_PASSWORD=yourpassword \
npm run test:smoke

# Or stash them in .env.local so you can re-run without retyping:
#   SUPABASE_TEST_EMAIL=...
#   SUPABASE_TEST_PASSWORD=...
```

The script creates one row, mutates it, then deletes it. It never touches
any other row.

## Adding tests

- **New pure utility** → add `tests/unit/<name>.test.js` next to its sibling tests.
- **New cloud function** → add a case to `tests/unit/cloud-storage.test.js`.
  All Supabase client calls in unit tests must use the mock — never import
  `supabaseClient.js` directly.
- **New end-to-end concern that touches the database** → either extend the
  smoke script or add a new script under `tests/integration/`.

## When the smoke test fails

The error message printed under each FAIL step usually maps to one of:

- **`permission denied for table doxa_charts`** — the user's JWT is reaching
  PostgREST but no RLS policy applies. Confirm the policies in Supabase
  Studio → Authentication → Policies. You usually want a single FOR ALL
  policy: `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`.
- **`new row violates row-level security policy ...`** — auth.uid() and the
  user_id you're inserting don't match. Make sure the INSERT path sends
  `user_id = <the auth user's id>` (it does — but double-check the policy
  expression isn't comparing to `email` or some other column).
- **`relation "public.doxa_charts" does not exist`** — the table is in a
  different schema, or wasn't created. Supabase only exposes the `public`
  schema by default (Settings → API → "Exposed schemas").
- **`null value in column "updated_at" violates not-null constraint`** —
  someone added a NOT NULL constraint without a default. The client now
  stamps `updated_at` on insert too (defense in depth), but if you still
  see this, also add `DEFAULT now()` to the column.
- **`column "..." of relation "doxa_charts" does not exist`** — schema
  drift. The table must have exactly: `id uuid PK`, `user_id uuid`,
  `title text`, `payload jsonb`, `updated_at timestamptz`.
- **`Invalid login credentials`** at the signInWithPassword step — the
  email/password don't match a real Supabase user. Sign up in the app
  first, then re-run the smoke with that account.
