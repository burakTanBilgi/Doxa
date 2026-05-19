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

  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.log(yellow('\nSet SUPABASE_TEST_EMAIL and SUPABASE_TEST_PASSWORD to run the authenticated round-trip:'));
    console.log(gray('  SUPABASE_TEST_EMAIL=you@example.com SUPABASE_TEST_PASSWORD=… npm run test:smoke'));
    console.log(yellow('Skipping authenticated tests.\n'));
    process.exit(0);
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
