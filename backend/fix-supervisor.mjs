// One-off fix for a supervisor account stuck mid-provisioning.
// Uses your app's own anon key + an admin login — no Supabase dashboard
// or service_role key needed, because RLS already grants admins full
// access to `profiles` and `supervisor_profiles` (see schema.sql).
//
// Usage:
//   npm install @supabase/supabase-js   (if not already installed)
//   node fix-supervisor.mjs

import { createClient } from "@supabase/supabase-js";

// --- fill these in ---------------------------------------------------
const SUPABASE_URL = "https://iorfvqmhcoydgvpphqln.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_bbOUHTNv9-MWbcKFJ27q5Q_6K5y79pG";

const ADMIN_EMAIL = "PUT_YOUR_ADMIN_EMAIL_HERE";
const ADMIN_PASSWORD = "PUT_YOUR_ADMIN_PASSWORD_HERE";

const BROKEN_USER_ID = "6b206b80-f367-4504-893c-3a452357b0c9";
const SUPERVISOR_NAME = "Supervisor";     // adjust if you know the real name
const SUPERVISOR_SURNAME = "";
const SUPERVISOR_EMAIL = "PUT_THE_SUPERVISOR_EMAIL_HERE";
const SUPERVISOR_TOWN = null;             // null = "All towns", or e.g. "Johannesburg"
const CAN_VIEW_FINANCIALS = true;
// -----------------------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log("Signing in as admin...");
  const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (signInErr) throw signInErr;
  console.log("Signed in as:", signIn.user.id);

  console.log("\nBefore fix — current state:");
  const { data: beforeProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", BROKEN_USER_ID)
    .maybeSingle();
  console.log("profiles row:", beforeProfile);

  const { data: beforeSup } = await supabase
    .from("supervisor_profiles")
    .select("*")
    .eq("id", BROKEN_USER_ID)
    .maybeSingle();
  console.log("supervisor_profiles row:", beforeSup);

  console.log("\nApplying fix...");

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      role: "supervisor",
      name: SUPERVISOR_NAME,
      surname: SUPERVISOR_SURNAME,
      email: SUPERVISOR_EMAIL,
    })
    .eq("id", BROKEN_USER_ID);
  if (profileErr) throw profileErr;
  console.log("profiles row updated (role = supervisor).");

  const { error: supErr } = await supabase
    .from("supervisor_profiles")
    .upsert(
      {
        id: BROKEN_USER_ID,
        town: SUPERVISOR_TOWN,
        can_view_financials: CAN_VIEW_FINANCIALS,
        created_by: signIn.user.id,
      },
      { onConflict: "id" }
    );
  if (supErr) throw supErr;
  console.log("supervisor_profiles row created/updated.");

  console.log("\nAfter fix — verifying:");
  const { data: afterProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", BROKEN_USER_ID)
    .single();
  console.log("profiles row:", afterProfile);

  const { data: afterSup } = await supabase
    .from("supervisor_profiles")
    .select("*, profiles!supervisor_profiles_id_fkey(name, surname, email)")
    .eq("id", BROKEN_USER_ID)
    .single();
  console.log("supervisor_profiles row:", afterSup);

  console.log("\nDone. The supervisor dashboard should now load for this account.");
}

main().catch((err) => {
  console.error("\nFailed:", err.message || err);
  process.exit(1);
});
