// Sends the one-time "6 months are up, begin impact evaluation" email to
// every resident in a cohort once their cycle crosses day 180. Invoked
// daily by pg_cron via pg_net (see the cron.schedule call at the bottom
// of patch_phase4_reminder.sql) — not meant to be called by residents or
// the app itself. Deploy with --no-verify-jwt (pg_net can't attach a user
// JWT) and protect it instead with the same shared-secret header pattern
// as send-reminders.
//
// Which cycles are due, and who's in them, lives in
// phase4_reminder_candidates() (patch_phase4_reminder.sql). This function
// only turns each candidate row into one Brevo email, then marks every
// cycle it attempted as reminded so it's never sent twice — a
// best-effort broadcast, not a per-resident guarantee, since the in-app
// note on the Cycle tab already covers anyone who misses the email.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")!;

interface Candidate {
  cycle_id: string;
  resident_id: string;
  email: string;
  full_name: string;
}

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: candidates, error } = await supabase.rpc("phase4_reminder_candidates");
  if (error) {
    console.error("phase4_reminder_candidates failed", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const rows = (candidates ?? []) as Candidate[];
  let sent = 0;

  for (const c of rows) {
    const firstName = c.full_name.split(" ")[0] || c.full_name;

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: "SoC-TEQ", email: "noreply@soc-teq.com" },
        to: [{ email: c.email, name: c.full_name }],
        subject: "6 months are up: begin impact evaluation",
        htmlContent: `
          <p>Hi ${firstName},</p>
          <p>Your cycle has reached the 6-month mark. Once every claimed topic is marked delivered, any
          resident in your cohort can open the Cycle tab and begin impact evaluation, the follow-up
          assessment that shows how much the group's confidence and knowledge changed since baseline.</p>
          <p><a href="https://www.soc-teq.com">Open SoC-TEQ</a> to check in.</p>
        `,
      }),
    });

    if (res.ok) sent++;
    else console.error("Brevo send failed", c.resident_id, await res.text());
  }

  const cycleIds = [...new Set(rows.map((c) => c.cycle_id))];
  for (const cycleId of cycleIds) {
    const { error: logError } = await supabase.rpc("record_phase4_reminder_sent", { p_cycle_id: cycleId });
    if (logError) console.error("record_phase4_reminder_sent failed", cycleId, logError);
  }

  return new Response(JSON.stringify({ candidates: rows.length, sent, cycles: cycleIds.length }), {
    headers: { "content-type": "application/json" },
  });
});
