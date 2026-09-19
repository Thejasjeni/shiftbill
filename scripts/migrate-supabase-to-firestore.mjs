// ============================================================================
// One-off migration: copy the app's existing Supabase rows into Firestore.
//
// Run once, after Cloud Firestore has been enabled for the project and the
// rules are deployed:   npm run migrate:firestore
//
// Document ids are the original Supabase uuids, so re-running overwrites the
// same documents instead of duplicating them. Only counts are printed — no
// credential or record content ever leaves this process.
// ============================================================================

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch } from 'firebase/firestore';

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();

if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env — nothing to migrate from.');
  process.exit(1);
}
if (!env.VITE_FIREBASE_PROJECT_ID || !env.VITE_FIREBASE_API_KEY || !env.VITE_FIREBASE_APP_ID) {
  console.error('Missing VITE_FIREBASE_* values in .env — nothing to migrate into.');
  process.exit(1);
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
});
const db = getFirestore(app);

// Copy one table into the collection of the same name, in batches of 500
// (Firestore's limit per batch write).
async function copyTable(table) {
  const { data, error } = await supabase.from(table).select('*');
  if (error) throw new Error(`${table}: ${error.message}`);

  const rows = data || [];
  for (let i = 0; i < rows.length; i += 500) {
    const batch = writeBatch(db);
    for (const row of rows.slice(i, i + 500)) {
      const { id, ...fields } = row;
      batch.set(doc(db, table, id), fields);
    }
    await batch.commit();
  }
  return rows.length;
}

const collections = ['transactions', 'inventory', 'vendors'];

try {
  console.log(`Migrating ${env.VITE_SUPABASE_URL} → Firestore project "${env.VITE_FIREBASE_PROJECT_ID}"`);
  for (const table of collections) {
    const count = await copyTable(table);
    console.log(`  ${table.padEnd(13)} ${count} document(s) copied`);
  }
  console.log('Done. Reload the app — the collections above now come from Firestore.');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
}
