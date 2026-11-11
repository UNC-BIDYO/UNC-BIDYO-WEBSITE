# Booking backend setup

The booking form posts to `/api/book` (a Vercel function in `api/book.ts`). That function:

1. Checks the request (the same rules the form uses).
2. Uploads the formal letter, if there is one, to the private `letters` bucket in Supabase Storage.
3. Saves the booking in the `bookings` table in Supabase.
4. Emails the booking to Bidyo through Resend, with the letter attached and reply-to set to the person who booked.

Without the keys below, the form shows "Booking is temporarily unavailable" with the email address.

## 1. Supabase (database and file storage)

1. Sign in at [supabase.com](https://supabase.com) with the Bidyo Google account, then create a **New project**:
   - **Region:** Southeast Asia (Singapore).
   - **Database password:** keep it somewhere safe. The website doesn't use it.
2. Open **SQL Editor → New query**, paste all of [`schema.sql`](schema.sql), and click **Run**.
3. Open **Project Settings → API**, and copy two values:
   - **Project URL**: `https://<id>.supabase.co`
   - **service_role** key (or a **secret** key, `sb_secret_…`). It is a server-only key: never put it in the site's code.

New bookings appear in **Table Editor → bookings**. Change `status` to `confirmed`, `declined` or `done` as you handle them. Letters are in **Storage → letters**.

Free projects are paused after about a week with no activity. The GitHub workflow `.github/workflows/supabase-keepalive.yml` prevents that. It needs the two GitHub secrets in step 4.

## 2. Resend (notification email)

1. Sign up at [resend.com](https://resend.com) **with uncbidyoorg@gmail.com**, then go to **API Keys → Create API key** (permission: Sending access).
2. Until a domain is verified, Resend can only send from `onboarding@resend.dev`, and only to the account's own address. That's why the account should use the Bidyo inbox.
3. Later, add uncbidyo.org under **Domains** and add the DNS records it shows. Then change `BOOKING_FROM` to `UNC Bidyo <bookings@uncbidyo.org>`.

## 3. Vercel environment variables

In the Vercel project, open **Settings → Environment Variables** and add each of these for **Production** and **Preview**:

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | the Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | the service_role / secret key |
| `RESEND_API_KEY` | the Resend key (`re_…`) |
| `BOOKING_NOTIFY_TO` | `uncbidyoorg@gmail.com` (separate several addresses with commas) |
| `BOOKING_FROM` | `UNC Bidyo <onboarding@resend.dev>` |

Redeploy after adding them, because variables only apply to new deployments.

## 4. GitHub secrets (keep-alive)

In the repo, open **Settings → Secrets and variables → Actions → New repository secret**, and add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` with the same values as above.
