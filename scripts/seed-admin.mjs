// One-off admin seeding script. Uses the service-role key (server-side only).
// Creates the auth user, confirms it, upserts the employee profile, and assigns the
// admin role. Safe to re-run: it updates the existing user instead of failing.
//
// Usage: node scripts/seed-admin.mjs <email> [password]
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

// Load .env.local manually (no dotenv dependency).
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/seed-admin.mjs <email> [password]');
  process.exit(1);
}
// Generate a strong password if none supplied.
const password = process.argv[3] || `Auda#${randomBytes(9).toString('base64url')}`;
const EMPLOYEE_ID = 'ADMIN-001';
const FULL_NAME = 'AUDA Admin';

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(target) {
  // Page through users (small project) to find an existing account.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === target.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 1000) break;
  }
  return null;
}

async function main() {
  let user = await findUserByEmail(email);

  if (user) {
    console.log(`User ${email} already exists (${user.id}) — updating password + confirming.`);
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
  } else {
    // Pass employee_id + name in user_metadata: the existing on_auth_user_created
    // trigger (handle_new_employee) reads these to create the employee_profiles row.
    // Omitting them makes employee_id NULL, which violates its CHECK and aborts creation.
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { employee_id: EMPLOYEE_ID, name: FULL_NAME },
    });
    if (error) throw error;
    user = data.user;
    console.log(`Created auth user ${email} (${user.id}).`);
  }

  // Ensure the profile exists/matches (the trigger creates it on insert; this upsert
  // keeps it correct on re-runs and when the user already existed).
  const { error: profileError } = await admin
    .from('employee_profiles')
    .upsert({ id: user.id, employee_id: EMPLOYEE_ID, full_name: FULL_NAME, email }, { onConflict: 'id' });
  if (profileError) throw profileError;

  // Assign admin role.
  const { error: roleError } = await admin
    .from('staff_roles')
    .upsert({ user_id: user.id, role: 'admin' }, { onConflict: 'user_id' });
  if (roleError) throw roleError;

  console.log('\n=== Admin account ready ===');
  console.log('Email:   ', email);
  console.log('Password:', password);
  console.log('User ID: ', user.id);
  console.log('Role:     admin');
  console.log('Login at: http://localhost:3000/login');
}

main().catch((e) => {
  console.error('Seeding failed:', e.message ?? e);
  process.exit(1);
});
