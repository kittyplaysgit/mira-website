// getmira.gg waitlist — Supabase Edge Function
// Stores the signup and sends the welcome email via Resend.
// Deploy with: npx supabase functions deploy waitlist --no-verify-jwt
// Secrets:     npx supabase secrets set RESEND_API_KEY=re_xxx REPLY_TO=you@example.com

import { createClient } from "npm:@supabase/supabase-js@2";
import { SESv2Client, SendEmailCommand } from "npm:@aws-sdk/client-sesv2@3";

const ALLOWED_ORIGINS = new Set([
  "https://getmira.gg",
  "https://www.getmira.gg",
  "http://localhost:5194", // local dev preview
]);

const TWITCH_URL = Deno.env.get("TWITCH_URL") ?? "https://getmira.gg"; // set to the channel where mira is live
const FROM = Deno.env.get("FROM_EMAIL") ?? "mira <mira@getmira.gg>";
const REPLY_TO = Deno.env.get("REPLY_TO") ?? "";

type Interest = "free" | "dfy" | "pro";

const INTEREST_BLOCK: Record<Interest, { text: string; html: string }> = {
  free: { text: "", html: "" },
  dfy: {
    text:
      "\nyou asked about a done-for-you seat — reply to this email and a human will get back to you personally. seats are capped each month, so reply soon-ish.\n",
    html:
      `<p style="margin:0 0 16px;padding:12px 16px;background:#f5f3ff;border-radius:12px;"><strong>you asked about a done-for-you seat</strong> — reply to this email and a human will get back to you personally. seats are capped each month, so reply soon-ish.</p>`,
  },
  pro: {
    text:
      "\nyou're on the pro (hosted) waitlist — same deal, one email when it opens up. until then, the free self-hosted version is the whole product.\n",
    html:
      `<p style="margin:0 0 16px;padding:12px 16px;background:#f5f3ff;border-radius:12px;"><strong>you're on the pro (hosted) waitlist</strong> — same deal, one email when it opens up. until then, the free self-hosted version is the whole product.</p>`,
  },
};

function welcomeText(interest: Interest): string {
  return `hey — it's mira. well, it's the humans behind mira, but she insisted on saying hi.

you're on the list. here's how it works from here:

- the beta is small on purpose — every streamer we invite gets real support while we harden her
- we invite people in small batches
- you'll get exactly one more email from us: the one that says it's your turn
${INTEREST_BLOCK[interest].text}
while you wait:

- she's live most nights — come watch her work a real chat: ${TWITCH_URL}
- the honest math on what she costs to run is at https://getmira.gg#costs (spoiler: ~$15-65/mo on your own keys, no license fee, ever)

got a question? just reply. a real human reads these.

— mira (disclosed AI) & the humans
https://getmira.gg`;
}

function welcomeHtml(interest: Interest): string {
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf9ff;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;font-size:16px;line-height:1.6;color:#2a2740;">
    <p style="margin:0 0 4px;font-size:28px;">&#128062;</p>
    <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:26px;line-height:1.2;color:#1b1830;">you're on the mira waitlist.</h1>

    <p style="margin:0 0 16px;">hey — it's mira. well, it's the humans behind mira, but she insisted on saying hi.</p>

    <p style="margin:0 0 8px;"><strong>here's how it works from here:</strong></p>
    <ul style="margin:0 0 16px;padding-left:20px;">
      <li style="margin-bottom:6px;">the beta is small on purpose — every streamer we invite gets real support while we harden her</li>
      <li style="margin-bottom:6px;">we invite people in small batches</li>
      <li>you'll get exactly <strong>one more email</strong> from us: the one that says it's your turn</li>
    </ul>
    ${INTEREST_BLOCK[interest].html}
    <p style="margin:0 0 8px;"><strong>while you wait:</strong></p>
    <ul style="margin:0 0 24px;padding-left:20px;">
      <li style="margin-bottom:6px;">she's live most nights — <a href="${TWITCH_URL}" style="color:#7C3AED;">come watch her work a real chat</a></li>
      <li>the honest math on what she costs to run is <a href="https://getmira.gg#costs" style="color:#7C3AED;">on the site</a> (spoiler: ~$15&ndash;65/mo on your own keys, no license fee, ever)</li>
    </ul>

    <p style="margin:0 0 24px;">got a question? just reply. a real human reads these.</p>

    <p style="margin:0;color:#6b6584;">— mira <span style="color:#9A94B8;">(disclosed AI)</span> &amp; the humans<br />
    <a href="https://getmira.gg" style="color:#7C3AED;">getmira.gg</a></p>
  </div>
</body>
</html>`;
}

const SUBJECT = "you're on the mira waitlist 🐾";

// Provider selection: Amazon SES when SES_ACCESS_KEY/SES_SECRET_KEY are set,
// otherwise Resend via RESEND_API_KEY. Secrets: npx supabase secrets set ...
async function sendWelcome(email: string, interest: Interest): Promise<void> {
  const sesKey = Deno.env.get("SES_ACCESS_KEY");
  const sesSecret = Deno.env.get("SES_SECRET_KEY");

  if (sesKey && sesSecret) {
    try {
      const ses = new SESv2Client({
        region: Deno.env.get("SES_REGION") ?? "us-east-1",
        credentials: { accessKeyId: sesKey, secretAccessKey: sesSecret },
      });
      await ses.send(new SendEmailCommand({
        FromEmailAddress: FROM,
        Destination: { ToAddresses: [email] },
        ...(REPLY_TO ? { ReplyToAddresses: [REPLY_TO] } : {}),
        Content: {
          Simple: {
            Subject: { Data: SUBJECT, Charset: "UTF-8" },
            Body: {
              Text: { Data: welcomeText(interest), Charset: "UTF-8" },
              Html: { Data: welcomeHtml(interest), Charset: "UTF-8" },
            },
          },
        },
      }));
      return;
    } catch (e) {
      console.error("ses errored:", e);
      // fall through to Resend if configured
    }
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM,
          to: [email],
          ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
          subject: SUBJECT,
          text: welcomeText(interest),
          html: welcomeHtml(interest),
        }),
      });
      if (!res.ok) console.error("resend failed:", res.status, await res.text());
    } catch (e) {
      console.error("resend errored:", e);
    }
  } else if (!sesKey) {
    console.warn("no email provider configured — signup stored, no welcome email sent");
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const headers = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://getmira.gg",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers });
  }

  let email = "", interest: Interest = "free";
  try {
    const body = await req.json();
    email = String(body.email ?? "").trim().toLowerCase();
    if (["free", "dfy", "pro"].includes(body.interest)) interest = body.interest;
  } catch {
    return new Response(JSON.stringify({ error: "bad json" }), { status: 400, headers });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    return new Response(JSON.stringify({ error: "invalid email" }), { status: 400, headers });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ignoreDuplicates: a repeat signup returns no row — we skip the email so
  // nobody can use the form to spam an inbox with repeat welcomes
  const { data, error } = await supabase
    .from("waitlist")
    .upsert({ email, interest }, { onConflict: "email", ignoreDuplicates: true })
    .select();

  if (error) {
    console.error("waitlist insert failed:", error.message);
    return new Response(JSON.stringify({ error: "storage failed" }), { status: 500, headers });
  }

  const isNew = (data?.length ?? 0) > 0;
  if (isNew) {
    // email failure shouldn't fail the signup — it's stored either way
    await sendWelcome(email, interest);
  }

  return new Response(JSON.stringify({ ok: true, new: isNew }), { status: 200, headers });
});
