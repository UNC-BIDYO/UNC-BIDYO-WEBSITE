# Booking backend setup

The booking system runs as Vercel functions in `api/`, with shared code in `api/_lib/`:

- **`/api/book`** (form submissions):
  1. Checks the request, with the same rules the form uses.
  2. Uploads the formal letter, if there is one, to the private `letters` bucket in Supabase Storage.
  3. Saves the booking in the `bookings` table in Supabase.
  4. Emails the person who booked a summary ("We received your booking request"), from the no-reply address.
  5. Emails Bidyo a copy, with the letter attached and reply-to set to the person who booked.
- **`/api/schedule`** (the "Booked days" section and the date picker): reads Bidyo's Google Calendar and returns **only the dates** that are booked. It never returns titles, times, places or guests.
- **`/api/admin/*`** (the admin panel at `/admin`): lists bookings, approves (adding the event to Google Calendar and emailing the requester), disapproves (emailing the reason), and saves settings. Every call checks the signed-in Supabase user against `ADMIN_EMAILS`.

Without the Supabase keys, the form shows "Booking is temporarily unavailable" with the email address. Without the Google keys, the schedule shows "unavailable", and booking still works.

## 1. Supabase (database and file storage)

1. Sign in at [supabase.com](https://supabase.com) with the Bidyo Google account, then create a **New project**:
   - **Region:** Southeast Asia (Singapore).
   - **Database password:** keep it somewhere safe. The website doesn't use it.
2. Open **SQL Editor → New query**, paste all of [`schema.sql`](schema.sql), and click **Run**.
   - If you set up the project with an earlier version, also run each file in [`migrations/`](migrations/) that you haven't run yet, oldest first. For example, `2026-11-14-split-name.sql` splits `name` into first, middle and last name.
3. Open **Project Settings → API**, and copy two values:
   - **Project URL**: `https://<id>.supabase.co`
   - **service_role** key (or a **secret** key, `sb_secret_…`). It is a server-only key: never put it in the site's code.

New bookings appear in **Table Editor → bookings**. Letters are in **Storage → letters**.

Free projects are paused after about a week with no activity. The GitHub workflow `.github/workflows/supabase-keepalive.yml` prevents that. It needs the two GitHub secrets in step 5.

## 2. Resend (email)

1. Sign up at [resend.com](https://resend.com) **with uncbidyoorg@gmail.com**, then go to **API Keys → Create API key** (permission: Sending access).
2. Add `uncbidyo.org` under **Domains**, add the DNS records it shows, and wait until it says **Verified**. Then set `BOOKING_FROM` to `UNC Bidyo <no-reply@uncbidyo.org>`.
   - Until then, Resend can only send from `onboarding@resend.dev`, and only to the account's own address. In that mode the customer summary is skipped (the log says so), and only Bidyo's copy is sent.

## 3. Google Calendar (booked days)

The site reads the calendar with a **service account**: a robot Google account that the calendar is shared with. It needs no sign-in screen, and no tokens expire.

1. In [Google Cloud Console](https://console.cloud.google.com), create a project (for example "UNC Bidyo website").
2. Go to **APIs & Services → Library**, search **Google Calendar API**, and click **Enable**.
3. Go to **IAM & Admin → Service Accounts → Create service account**.
   - Give it a name, such as `bidyo-calendar`. It needs no roles.
   - Open it, then go to **Keys → Add key → Create new key → JSON**. A `.json` file downloads; keep it private.
4. Share the calendar with the service account:
   1. Open Google Calendar as **uncbidyoorg@gmail.com**.
   2. Go to **Settings → (your calendar) → Share with specific people → Add people**.
   3. Paste the service account's email, which looks like `bidyo-calendar@<project>.iam.gserviceaccount.com`.
   4. Choose **Make changes to events**. Approved bookings will be added to the calendar later.

## 4. Vercel environment variables

In the Vercel project (**uncbidyo**), open **Settings → Environment Variables**. Add each variable below, ticking **Production** and **Preview**. Each value goes on **one line**.

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | the Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | the service_role / secret key |
| `RESEND_API_KEY` | the Resend key (`re_…`) |
| `BOOKING_NOTIFY_TO` | `uncbidyoorg@gmail.com` (separate several addresses with commas) |
| `BOOKING_FROM` | `UNC Bidyo <no-reply@uncbidyo.org>` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` from the JSON key file |
| `GOOGLE_PRIVATE_KEY` | `private_key` from the JSON key file, pasted exactly as it appears there (it starts with `-----BEGIN PRIVATE KEY-----`; the `\n` parts are fine) |
| `GOOGLE_CALENDAR_ID` | `uncbidyoorg@gmail.com` |
| `ADMIN_EMAILS` | `uncbidyoorg@gmail.com` (who can use the admin panel; separate several with commas) |
| `VITE_SUPABASE_URL` | the Project URL again (the admin panel's sign-in uses it) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → **publishable** key (`sb_publishable_…`). Safe to be public. |
| `VITE_TURNSTILE_SITE_KEY` | optional; the Cloudflare Turnstile site key (bot check on the form; see the root README) |
| `TURNSTILE_SECRET_KEY` | optional; the Turnstile secret key (turns the check on) |
| `SITE_URL` | optional; defaults to `https://uncbidyo.org` (used for links and the logo in emails) |

Instead of the two `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY` variables, you can set `GOOGLE_SERVICE_ACCOUNT_JSON` to the whole JSON key file.

Redeploy after adding or changing variables, because they only apply to new deployments. If something is missing, the function log (Vercel → Logs) names the variable and whether it's missing or empty.

## 5. GitHub secrets (keep-alive)

In the repo, open **Settings → Secrets and variables → Actions → New repository secret**, and add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` with the same values as above.

## 6. Admin panel (`/admin`)

1. Run [`migrations/2026-11-15-admin.sql`](migrations/2026-11-15-admin.sql) in the SQL Editor (statuses become pending / approved / declined, and the `settings` table is added).
2. In Supabase, open **Authentication → Sign In / Providers** and turn off **Allow new users to sign up**.
3. Open **Authentication → Users → Add user → Create new user**: email `uncbidyoorg@gmail.com`, a strong password, and tick **Auto Confirm User**.
4. Add `ADMIN_EMAILS`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel (step 4), then redeploy. The `VITE_` variables are built into the admin page, so a redeploy is required after changing them.
5. Open `https://<your site>/admin` and sign in.

Only accounts listed in `ADMIN_EMAILS` can open the panel, even if other users exist in Supabase.

### Automatic overlap check

In the admin panel, **Settings → Automatically decline clashing bookings** controls it:

- **On:** each new request is checked against Bidyo's Google Calendar before it's saved. If any requested day already has an event, the request is saved as **declined** (shown with an **Auto** badge). The requester sees *"That date is already booked"* on the form and gets the **Date unavailable** email, and Bidyo gets an **Auto-declined** copy. Booked days also can't be picked in the website's date picker. That part can take about two minutes to update, because the schedule is cached briefly; the check on submit applies immediately.
- **What counts as busy:** any event on the calendar that day, including approved bookings and events added by hand. Events marked **Free** in Google Calendar don't count. Days are matched whole, since the form has no times.
- **If Google can't be checked:** the request is never declined. It's saved as pending with a **Check date** badge, so an admin can look at it.
- **Off:** every request comes in as pending.
