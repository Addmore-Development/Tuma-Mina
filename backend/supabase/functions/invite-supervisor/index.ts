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

Deno.serve(async (req) => {
  // Handle the browser's CORS preflight request.
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify the caller is an authenticated admin.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Missing auth", { status: 401, headers: corsHeaders });

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData.user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const { data: callerProfile } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();
    if (callerProfile?.role !== "admin") return new Response("Forbidden — admin only", { status: 403, headers: corsHeaders });

    // 2. Create the supervisor's auth user via a magic-link invite (they set
    // their own password on first login — admin never sees/sets it).
    const body = await req.json();
    const { name, surname, email, town, canViewFinancials } = body;

    // Passing role/name/surname as invite metadata means the handle_new_user
    // trigger (schema fixes.sql) inserts the profiles row itself, correctly
    // tagged as "supervisor", the moment the auth user is created — same
    // pattern create-supervisor.ps1 uses.
    const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { role: "supervisor", name, surname },
    });
    if (inviteErr) throw inviteErr;
    const newUserId = invited.user.id;

    // 3. Provision profiles + supervisor_profiles rows.
    // Upsert (not insert): handle_new_user already inserted a profiles row
    // for this id as part of creating the auth user above, so a plain
    // insert here always fails on the primary key and the whole invite
    // errors out. Upsert makes this idempotent and also covers the case
    // where the trigger's metadata read ever falls out of sync with this.
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

    return new Response(JSON.stringify({ ok: true, userId: newUserId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});