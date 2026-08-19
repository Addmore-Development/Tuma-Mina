
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  try {
    // 1. Verify the caller is an authenticated admin.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Missing auth", { status: 401 });

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });

    const { data: callerProfile } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();
    if (callerProfile?.role !== "admin") return new Response("Forbidden — admin only", { status: 403 });

    // 2. Create the supervisor's auth user via a magic-link invite (they set
    // their own password on first login — admin never sees/sets it).
    const body = await req.json();
    const { name, surname, email, town, canViewFinancials } = body;

    const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
    if (inviteErr) throw inviteErr;
    const newUserId = invited.user.id;

    // 3. Provision profiles + supervisor_profiles rows.
    const { error: profileErr } = await supabaseAdmin.from("profiles").insert({
      id: newUserId, role: "supervisor", name, surname, email,
    });
    if (profileErr) throw profileErr;

    const { error: supError } = await supabaseAdmin.from("supervisor_profiles").insert({
      id: newUserId,
      town: town, // null = "All towns"
      can_view_financials: canViewFinancials,
      created_by: userData.user.id,
    });
    if (supError) throw supError;

    return new Response(JSON.stringify({ ok: true, userId: newUserId }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
});