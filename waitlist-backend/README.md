# getmira.gg waitlist backend

Signup flow: site form → Supabase Edge Function `waitlist` → row in `waitlist`
table + welcome email via Resend. Secrets live in Supabase — nothing sensitive
in this public repo.

## One-time setup (~10 minutes)

### 1. Supabase

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF   # from your project's dashboard URL
```

Then in the Supabase dashboard → **SQL Editor**, paste and run `schema.sql`
(creates the `waitlist` table, locked down so only the function can touch it).

### 2. Resend

1. Resend dashboard → **Domains** → Add `getmira.gg`.
2. Resend shows you 3–4 DNS records (DKIM/SPF) → add them in **Porkbun → getmira.gg → DNS**
   exactly as shown. Wait for Resend to show "Verified" (minutes).
3. **API Keys** → create one with sending access.

### 3. Deploy the function

From the `waitlist-backend/` folder:

```bash
npx supabase secrets set RESEND_API_KEY=re_your_key REPLY_TO=kittyplaystwitch@gmail.com TWITCH_URL=https://twitch.tv/YOUR_CHANNEL
npx supabase functions deploy waitlist --no-verify-jwt
```

`--no-verify-jwt` matters — the form posts anonymously from the browser.

### 4. Point the site at it

In `script.js`, set:

```js
const WAITLIST_ENDPOINT = "https://YOUR_PROJECT_REF.supabase.co/functions/v1/waitlist";
```

bump the `?v=` on the script tag in index.html, commit, push. Done.

## Checking signups

Supabase dashboard → **Table Editor** → `waitlist` (or the `waitlist_summary`
view for counts per tier: free / dfy / pro). DFY rows are warm leads — the
welcome email tells them to reply, so watch the REPLY_TO inbox.

## Email behavior

- Welcome email sends **once per address** — repeat signups are deduped and get no email.
- If Resend is down or unconfigured, the signup is still stored; only the email is skipped.
- The email body lives in `supabase/functions/waitlist/index.ts` (`welcomeText`/`welcomeHtml`)
  — a preview of the rendered email is in `email-preview.html`.
