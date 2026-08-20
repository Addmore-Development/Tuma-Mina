import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SERVICE_ROLE_KEY")!
);

// Without these headers the browser's preflight OPTIONS request fails
// before the real POST is ever sent — every call from the frontend gets
// blocked client-side with a CORS error, regardless of what this function
// actually does. Adjust Access-Control-Allow-Origin to your real domain(s)
// instead of "*" once you're past local dev, if you want to lock this down.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** A random, readable temporary password — the admin shares this with the
 *  new supervisor, who should change it after their first login. */
function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pw = "";
  for (let i = 0; i < 12; i++) {
    pw += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return pw;
}

Deno.serve(async (req) => {
  // Handle the browser's CORS preflight request.
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify the caller is an authenticated admin.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const { data: callerProfile } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();
    if (callerProfile?.role !== "admin") return json({ error: "Forbidden — admin only" }, 403);

    // 2. Create the supervisor's auth user with a generated temporary
    // password, pre-confirmed so they can log in immediately (no email
    // step required — the admin relays the password directly).
    const body = await req.json();
    const { name, surname, email, town, canViewFinancials } = body;
    if (!name || !surname || !email) return json({ error: "Name, surname, and email are required" }, 400);

    const tempPassword = generateTempPassword();

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: "supervisor", name, surname },
    });
    if (createErr) throw createErr;
    const newUserId = created.user.id;

    // 3. Provision profiles + supervisor_profiles rows.
    // Upsert (not insert): handle_new_user already inserted a profiles row
    // for this id as part of creating the auth user above (see "schema
    // fixes.sql"), so a plain insert here always fails on the primary key.
    // Upsert makes this idempotent and also covers the case where the
    // trigger's metadata read ever falls out of sync with this.
    const { error: profileErr } = await supabaseAdmin.from("profiles").upsert(
      { id: newUserId, role: "supervisor", name, surname, email },
      { onConflict: "id" }
    );
    if (profileErr) throw profileErr;

    const { error: supError } = await supabaseAdmin.from("supervisor_profiles").insert({
      id: newUserId,
      town: town, // null = "All towns"
      can_view_financials: canViewFinancials,
      created_by: userData.user.id,
    });
    if (supError) throw supError;

    return json({ ok: true, userId: newUserId, email, temporaryPassword: tempPassword });
  } catch (e) {
    return json({ error: e.message ?? "Something went wrong creating this supervisor." }, 400);
  }
});