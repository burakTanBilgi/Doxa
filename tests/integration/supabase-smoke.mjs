#!/usr/bin/env node
/**
 * Supabase round-trip smoke test.
 *
 * Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from .env (and optional
 * SUPABASE_TEST_EMAIL / SUPABASE_TEST_PASSWORD from the environment), then
 * exercises the full Projects flow against the real Supabase project:
 *
 *   1. Sign in
 *   2. List existing projects
 *   3. Insert a fresh project row
 *   4. Re-load it by id (verifies SELECT works post-insert)
 *   5. Update its title
 *   6. Update its payload
 *   7. Delete it
 *   8. Sign out
 *
 * Every step prints PASS or FAIL with the raw error body so we can see what
 * Supabase is actually rejecting. Designed to be safe to re-run — only
 * touches the row it created.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

// The exact schema Doxa expects. Printed verbatim when the table is missing
// so the user can paste it straight into the Supabase SQL editor.
const CREATE_TABLE_SQL = `-- doxa_charts: one row per saved project, owned by the signed-in user.
create table if not exists public.doxa_charts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  payload     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- Index for the common list query (user's rows newest first).
create index if not exists doxa_charts_user_updated_idx
  on public.doxa_charts (user_id, updated_at desc);

-- RLS: users can only see / change their own rows.
alter table public.doxa_charts enable row level security;

drop policy if exists doxa_charts_own on public.doxa_charts;
create policy doxa_charts_own
  on public.doxa_charts
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tell PostgREST to reload its schema cache so the new table is visible.
notify pgrst, 'reload schema';`;

// ---- env loading ----------------------------------------------------------
function loadDotEnv(path) {
  try {
    const text = readFileSync(path, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* ignore — file may not exist */
  }
}

loadDotEnv(resolve(REPO_ROOT, '.env.local'));
loadDotEnv(resolve(REPO_ROOT, '.env'));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const TEST_EMAIL = process.env.SUPABASE_TEST_EMAIL;
const TEST_PASSWORD = process.env.SUPABASE_TEST_PASSWORD;

// ---- console helpers ------------------------------------------------------
const c = (code) => (s) => `\x1b[${code}m${s}\x1b[0m`;
const green = c(32);
const red = c(31);
const gray = c(90);
const yellow = c(33);
const bold = c(1);

let passes = 0;
let failures = 0;

function pass(label, detail = '') {
  passes++;
  console.log(`${green('✓ PASS')}  ${label}${detail ? gray(' — ' + detail) : ''}`);
}

function fail(label, err) {
  failures++;
  console.log(`${red('✗ FAIL')}  ${label}`);
  if (err) {
    const msg = err.message || err.error_description || String(err);
    console.log(`         ${red('error:')} ${msg}`);
    if (err.code) console.log(`         ${gray('code:')}  ${err.code}`);
    if (err.details) console.log(`         ${gray('details:')} ${err.details}`);
    if (err.hint) console.log(`         ${gray('hint:')}  ${err.hint}`);
    if (err.status) console.log(`         ${gray('status:')} ${err.status}`);
  }
}

function section(title) {
  console.log('\n' + bold(title));
  console.log(gray('─'.repeat(60)));
}

async function main() {
  section('Environment');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    fail('Read VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env');
    console.log(gray('\nAdd both to .env (or .env.local) and try again.'));
    process.exit(1);
  }
  pass('Loaded VITE_SUPABASE_URL', new URL(SUPABASE_URL).host);
  pass('Loaded VITE_SUPABASE_ANON_KEY', `${SUPABASE_KEY.slice(0, 12)}…  (${SUPABASE_KEY.length} chars)`);
  const keyShape = SUPABASE_KEY.startsWith('sb_publishable_')
    ? 'new "publishable" format (sb_publishable_*)'
    : SUPABASE_KEY.startsWith('eyJ') ? 'legacy JWT anon key' : 'unknown shape';
  console.log(gray(`         key shape: ${keyShape}`));

  // ---- pre-auth: probe PostgREST with different header combos ------------
  // The new sb_publishable_* keys have different acceptance rules per endpoint
  // than legacy JWT anon keys. Try every common combination and report which
  // one (if any) PostgREST accepts. This often pinpoints the failure mode.
  section('PostgREST schema probe (no auth)');

  const probeVariants = [
    {
      label: 'apikey header only',
      headers: { apikey: SUPABASE_KEY, Accept: 'application/openapi+json' },
    },
    {
      label: 'apikey header + Authorization Bearer',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/openapi+json',
      },
    },
    {
      label: 'Authorization Bearer only',
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/openapi+json',
      },
    },
  ];

  let workingVariant = null;
  let openApiSpec = null;
  for (const variant of probeVariants) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers: variant.headers });
      const bodyText = await res.text();
      if (res.ok) {
        pass(`GET /rest/v1/ with ${variant.label}`, `HTTP ${res.status}`);
        workingVariant = variant.label;
        try { openApiSpec = JSON.parse(bodyText); } catch { /* ignore */ }
        break;
      } else {
        let body = bodyText;
        try { body = JSON.stringify(JSON.parse(bodyText)); } catch { /* keep text */ }
        fail(`GET /rest/v1/ with ${variant.label}`, {
          message: `HTTP ${res.status}`,
          status: res.status,
          details: body.slice(0, 200),
        });
      }
    } catch (err) {
      fail(`GET /rest/v1/ with ${variant.label}`, err);
    }
  }

  if (!workingVariant) {
    // The /rest/v1/ root endpoint is often restricted to secret keys — that's
    // expected and not actually a problem. What matters is whether the table
    // endpoints accept the publishable key. Probe the actual table:
    console.log(gray('\nThe schema endpoint is restricted (this is normal for publishable keys).'));
    console.log(gray('Probing the actual doxa_charts table endpoint instead…\n'));
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/doxa_charts?select=id&limit=1`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      const bodyText = await res.text();
      if (res.ok) {
        pass(`GET /rest/v1/doxa_charts?limit=1 (anon)`, `HTTP ${res.status} — table exists and is reachable`);
      } else {
        let body = bodyText;
        try { body = JSON.stringify(JSON.parse(bodyText)); } catch { /* keep text */ }
        fail(`GET /rest/v1/doxa_charts?limit=1 (anon)`, {
          message: `HTTP ${res.status}`,
          status: res.status,
          details: body.slice(0, 300),
        });
        if (res.status === 401 || res.status === 403) {
          console.log(yellow('         The publishable key is being rejected by table endpoints too.'));
          console.log(gray('         Check Supabase → Project settings → API → ensure the publishable'));
          console.log(gray('         key is enabled. You may also need to rotate it.'));
        } else if (res.status === 404 || /PGRST205|relation .* does not exist|find the table/i.test(body)) {
          console.log(yellow('         The doxa_charts table does not exist in this Supabase project.'));
          console.log(gray('\n         Fix: open Supabase → SQL editor → paste this and run it:'));
          console.log(gray('         ────────────────────────────────────────────────────────────────'));
          console.log(CREATE_TABLE_SQL.split('\n').map(l => gray('         ' + l)).join('\n'));
          console.log(gray('         ────────────────────────────────────────────────────────────────'));
          console.log(gray('         Then re-run `npm run test:smoke` to verify.'));
        }
      }
    } catch (err) {
      fail('GET /rest/v1/doxa_charts (anon)', err);
    }
  } else if (openApiSpec) {
    const tables = Object.keys(openApiSpec.definitions || openApiSpec.components?.schemas || {});
    pass(`OpenAPI spec parsed`, `${tables.length} exposed tables/views`);
    if (tables.includes('doxa_charts')) {
      pass('Table "doxa_charts" is exposed via the API');
    } else {
      fail('Table "doxa_charts" NOT exposed via the API');
      console.log(gray(`         Visible tables: ${tables.slice(0, 10).join(', ') || '(none)'}`));
      console.log(gray('         Likely: wrong schema, wrong name (case-sensitive), or not created.'));
    }
  }

  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.log(yellow('\nSet SUPABASE_TEST_EMAIL and SUPABASE_TEST_PASSWORD to run the authenticated round-trip:'));
    console.log(gray('  SUPABASE_TEST_EMAIL=you@example.com SUPABASE_TEST_PASSWORD=… npm run test:smoke'));
    console.log(yellow('Skipping authenticated tests.\n'));
    process.exit(failures > 0 ? 1 : 0);
  }
  pass('Test credentials supplied via environment');

  // ---- client + sign in ---------------------------------------------------
  section('Auth');

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (signInErr) {
    fail('signInWithPassword', signInErr);
    console.log(gray('\nWithout a session we cannot test RLS-protected calls. Stopping.'));
    process.exit(1);
  }
  pass('signInWithPassword', `user.id = ${signInData.user.id}`);
  const userId = signInData.user.id;

  // ---- list ---------------------------------------------------------------
  section('public.doxa_charts CRUD');

  const { data: existingList, error: listErr } = await supabase
    .from('doxa_charts')
    .select('id, title, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (listErr) {
    fail('SELECT id,title,updated_at WHERE user_id = $auth', listErr);
    console.log(gray('\nList failed — RLS probably denies SELECT, or the table/columns differ.'));
    process.exit(1);
  }
  pass('SELECT existing rows', `${existingList?.length ?? 0} rows`);

  // ---- insert -------------------------------------------------------------
  const seedPayload = {
    doxa_version: '1.0',
    title: 'smoke-test (safe to delete)',
    description: 'auto-created by tests/integration/supabase-smoke.mjs',
    charts: [
      {
        id: 1,
        title: 'Smoke chart',
        color: '#c73a3a',
        data: [
          { subject: 'A', value: 50, fullMark: 100 },
          { subject: 'B', value: 60, fullMark: 100 },
          { subject: 'C', value: 70, fullMark: 100 },
        ],
      },
    ],
    comparisons: [],
    compareSelection: [],
  };

  const { data: created, error: insertErr } = await supabase
    .from('doxa_charts')
    .insert({ user_id: userId, title: seedPayload.title, payload: seedPayload })
    .select('id, title, updated_at')
    .single();
  if (insertErr) {
    fail('INSERT row', insertErr);
    console.log(gray('\nInsert failed — most likely RLS WITH CHECK or a missing/required column.'));
    console.log(gray('Common fixes:'));
    console.log(gray('  • Confirm the RLS INSERT policy is exactly: WITH CHECK (auth.uid() = user_id)'));
    console.log(gray('  • Confirm the table is in the "public" schema and exposed via the API'));
    console.log(gray('  • Confirm "updated_at" allows NULL or has a default (or add it to the insert)'));
    await supabase.auth.signOut();
    process.exit(1);
  }
  pass('INSERT row', `id = ${created.id}`);
  const newId = created.id;

  // ---- load it back -------------------------------------------------------
  const { data: loaded, error: loadErr } = await supabase
    .from('doxa_charts')
    .select('id, title, payload, updated_at, user_id')
    .eq('id', newId)
    .single();
  if (loadErr) {
    fail('SELECT row back by id', loadErr);
  } else {
    const samePayloadTitle = loaded?.payload?.title === seedPayload.title;
    pass('SELECT row back by id', `payload.title preserved: ${samePayloadTitle}`);
    if (!samePayloadTitle) {
      console.log(yellow(`         expected ${seedPayload.title}, got ${loaded?.payload?.title}`));
    }
  }

  // ---- update title -------------------------------------------------------
  const newTitle = 'smoke-test (renamed)';
  const { error: renameErr } = await supabase
    .from('doxa_charts')
    .update({ title: newTitle, updated_at: new Date().toISOString() })
    .eq('id', newId)
    .eq('user_id', userId)
    .select('id, title, updated_at')
    .single();
  if (renameErr) fail('UPDATE title', renameErr);
  else pass('UPDATE title', `→ ${newTitle}`);

  // ---- update payload -----------------------------------------------------
  const mutatedPayload = { ...seedPayload, charts: [{ ...seedPayload.charts[0], title: 'mutated' }] };
  const { error: payloadErr } = await supabase
    .from('doxa_charts')
    .update({ payload: mutatedPayload, updated_at: new Date().toISOString() })
    .eq('id', newId)
    .eq('user_id', userId)
    .select('id')
    .single();
  if (payloadErr) fail('UPDATE payload (jsonb)', payloadErr);
  else pass('UPDATE payload (jsonb)');

  // ---- delete -------------------------------------------------------------
  const { error: deleteErr } = await supabase
    .from('doxa_charts')
    .delete()
    .eq('id', newId)
    .eq('user_id', userId);
  if (deleteErr) {
    fail('DELETE row', deleteErr);
    console.log(yellow(`         leaving row ${newId} behind — please delete manually if needed.`));
  } else {
    pass('DELETE row', `id = ${newId}`);
  }

  // ---- sign out -----------------------------------------------------------
  section('Auth (cleanup)');
  const { error: signOutErr } = await supabase.auth.signOut();
  if (signOutErr) fail('signOut', signOutErr);
  else pass('signOut');

  // ---- summary ------------------------------------------------------------
  section('Summary');
  console.log(`${green(`${passes} passed`)}, ${failures ? red(`${failures} failed`) : gray('0 failed')}`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(red('\nUnhandled exception:'), err);
  process.exit(2);
});
