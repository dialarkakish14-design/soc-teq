// Sends the optional "you still have a topic to rate" reminder email.
// Invoked every 15 minutes by pg_cron via pg_net (see the cron.schedule
// call at the bottom of patch_reminders.sql) — not meant to be called by
// residents or the app itself. Deploy with --no-verify-jwt (pg_net can't
// attach a user JWT) and protect it instead with a shared-secret header
// checked against the CRON_SECRET function secret.
//
// All the "who's due a reminder right now" logic — timezone-aware close
// time, the 1h/3h offset window, dedup, and whether they still have an
// unrated covered topic — lives in the reminder_candidates() Postgres
// function (patch_reminders.sql), since Postgres already does that
// timezone math correctly for is_day_open() elsewhere in this app. This
// function only turns each candidate row into one Brevo email.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")!;

interface Candidate {
  day_id: string;
  resident_id: string;
  email: string;
  full_name: string;
  minutes_until_close: number;
}

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: candidates, error } = await supabase.rpc("reminder_candidates");
  if (error) {
    console.error("reminder_candidates failed", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const rows = (candidates ?? []) as Candidate[];
  let sent = 0;

  for (const c of rows) {
    const hoursLeft = Math.max(1, Math.round(c.minutes_until_close / 60));
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
        subject: "You still have a topic to rate today",
        htmlContent: `
          <p>Hi ${firstName},</p>
          <p>You still have at least one topic today waiting on your rating, and today's ratings close in
          about ${hoursLeft} hour${hoursLeft === 1 ? "" : "s"}.</p>
          <p><a href="https://www.soc-teq.com">Open SoC-TEQ</a> to rate it before it closes.</p>
          <p style="color:#888;font-size:12px;">You're getting this because you turned on rating reminders in
          My Profile. You can turn them off there any time.</p>
        `,
      }),
    });

    if (!res.ok) {
      console.error("Brevo send failed", c.resident_id, await res.text());
      continue;
    }

    const { error: logError } = await supabase.rpc("record_reminder_sent", {
      p_day_id: c.day_id,
      p_resident_id: c.resident_id,
    });
    if (logError) console.error("record_reminder_sent failed", c.resident_id, logError);
    else sent++;
  }

  return new Response(JSON.stringify({ candidates: rows.length, sent }), {
    headers: { "content-type": "application/json" },
  });
});
