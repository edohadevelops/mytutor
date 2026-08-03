# My Tutor — Calc 2 Final Prep

A personalized study app for Noah, built with React + Vite + Tailwind, KaTeX for math rendering, and Supabase for data persistence.

## 1. Run it locally

Requires [Node.js](https://nodejs.org) 18+ installed.

```bash
npm install
npm run dev
```

Then open the URL it prints (usually `http://localhost:5173`).

To build a production version:

```bash
npm run build
npm run preview   # optional: preview the built version locally
```

## 2. One-time Supabase setup

The app stores progress in `tutor_state`, and now also real-time chat in `tutor_messages` and push notification subscriptions in `push_subscriptions`. Run this once in your Supabase project's SQL editor:

```sql
create table tutor_state (
  id text primary key,
  payload jsonb,
  updated_at timestamptz default now()
);
alter table tutor_state enable row level security;
create policy "anon read/write" on tutor_state for all using (true) with check (true);

create table tutor_messages (
  id bigserial primary key,
  sender text not null,               -- 'tutor' or 'student'
  kind text not null default 'text',  -- 'text' or 'assignment'
  body text not null,
  assignment_ref text,
  assignment_done boolean default false,
  read_by_tutor boolean default false,
  read_by_student boolean default false,
  created_at timestamptz default now()
);
alter table tutor_messages enable row level security;
create policy "anon read/write messages" on tutor_messages for all using (true) with check (true);
-- Required for live/realtime updates (the actual "sockets" part):
alter publication supabase_realtime add table tutor_messages;

create table push_subscriptions (
  role text primary key,   -- 'tutor' or 'student'
  subscription jsonb not null,
  updated_at timestamptz default now()
);
alter table push_subscriptions enable row level security;
create policy "anon read/write subs" on push_subscriptions for all using (true) with check (true);
```

The Supabase URL and anon key are already wired into `src/CalcTutorApp.jsx`. The anon key is meant to be public (it's what Supabase expects in frontend code) — the RLS policies above are intentionally permissive since it's just the two of you using it.

## 2b. Push notifications — one required setup step

Real push notifications (the kind that arrive even when the tab/app is closed) need a private key that must **never** live in the frontend code. A real VAPID key pair was generated for this project:

- **Public key** (already in the code, safe to expose): `BCUOgLY9qC1PH4JmsF2r6h9XBuQ6YDTsd6L9vs8iMwtgEycyUBw0TpN4BwUYFW8TU4IRL5YNuhitqeL8Tj2crRI`
- **Private key** (keep secret — do NOT put this in the repo): `d6ZdGvEbMO9_g4Tso1Otp02cpsqnTBlh1EQDjG45ols`

After deploying to Netlify: go to **Site settings → Environment variables** and add:

| Key | Value |
|---|---|
| `VAPID_PRIVATE_KEY` | `d6ZdGvEbMO9_g4Tso1Otp02cpsqnTBlh1EQDjG45ols` |

Then redeploy. The serverless function at `netlify/functions/send-push.js` reads this at runtime and sends the actual push — this only works once that env var is set. Without it, chat and everything else still works fully; you just won't get notifications when the tab is closed (in-app toasts and foreground browser notifications still work regardless).

Each person turns notifications on individually from **Settings → Enable notifications**, on their own device.

**Testing locally:** `npm run dev` (plain Vite) won't run the Netlify function, so push sends will silently no-op locally — chat itself still works fully via realtime. To test push locally too, install the [Netlify CLI](https://docs.netlify.com/cli/get-started/) and run `netlify dev` instead, which serves the function alongside the app.

## 2d. Daily task reminder (proactive, no app-open required)

`netlify/functions/daily-digest.js` runs automatically every day at 12:00 UTC (configured in `netlify.toml` — adjust the `schedule` cron string if you want a different time; 12:00 UTC is roughly 7-8am US Eastern depending on daylight saving) and sends a real push notification with that day's task to anyone who's enabled notifications. This is what makes the "morning reminder" work even if the app is never opened — a scheduled server-side job is the only way to do that; nothing running only in the browser can notify someone who hasn't opened the page. Same `VAPID_PRIVATE_KEY` env var from section 2b powers this — no extra setup needed once that's in place.

## 2c. Who's using this device

The first time the app opens, it asks "Who's using this device?" (tutor or Noah) and remembers that choice on that browser/device (stored locally, not synced — this replaces the old "notes" feature, which is now a real two-way chat with read receipts, dismissible notifications, and assignment tracking). You can change it any time in Settings.

## 3. Deploy to Netlify

**Option A — drag and drop:**
1. Run `npm install && npm run build` locally.
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag in the generated `dist/` folder.

**Option B — connect a Git repo (recommended, supports auto-deploys):**
1. Push this project to a GitHub repo.
2. In Netlify: "Add a new site" → "Import an existing project" → pick the repo.
3. Netlify will read `netlify.toml` automatically — build command `npm run build`, publish directory `dist`. No manual config needed.

## 4. Backups — three layers, so nothing gets lost

**Layer 1 — every save is already persisted.** Every action in the app (grading a problem, finishing a session, leaving a note, etc.) writes to Supabase immediately, with automatic retry if the connection drops.

**Layer 2 — automatic daily snapshot, from inside the app.** The first time the app is opened each day, it copies everything into a separate dated backup row in Supabase. This protects against a bad overwrite on the "live" data — even if something gets corrupted, previous days are still sitting there.

**Layer 3 — real backup files on your own computer.**

- **Manual, anytime:** open the app → Settings → "Download backup now". This downloads a real `.json` file with everything.
- **Automatic, via script:** `backup.js` in this project does the same thing from the command line:
  ```bash
  npm run backup
  ```
  This writes a timestamped file into `./backups/`. To run it automatically every day without opening the app, either:
  - **Schedule it yourself** with cron (Mac/Linux) or Task Scheduler (Windows) — e.g. a crontab entry like:
    ```
    0 9 * * * cd /path/to/my-tutor-project && /usr/bin/node backup.js
    ```
  - **Or push this project to GitHub** — `.github/workflows/daily-backup.yml` is already set up to run `backup.js` every day at 09:00 UTC via GitHub Actions and commit the result into `backups/`. This only works once the repo is on GitHub; it does nothing for a purely local copy.

**Restoring:** Settings → "Restore from backup file" → pick any of the downloaded `.json` files. It writes everything in that file back into Supabase (you'll want to refresh the page afterward).

## 5. Project structure

```
├── src/
│   ├── CalcTutorApp.jsx   ← the entire app (single file, as built in Claude)
│   ├── main.jsx           ← React entry point
│   └── index.css          ← Tailwind entry
├── public/
│   ├── sw.js               ← service worker (handles incoming push notifications)
│   └── manifest.json       ← makes the app installable
├── netlify/functions/
│   └── send-push.js        ← serverless function that sends real push notifications
├── backup.js               ← standalone backup script (node backup.js)
├── backups/                 ← where backup.js writes JSON files (created on first run)
├── .github/workflows/
│   └── daily-backup.yml    ← optional GitHub Actions daily backup
├── netlify.toml             ← Netlify build config
└── tailwind.config.js
```

## 6. Errors checked before this was packaged

- `CalcTutorApp.jsx` was validated with a real Babel/JSX parser (not just eyeballed) — no syntax errors.
- The full project was installed (`npm install`) and built (`npm run build`) successfully, catching any real compile-time issues.
- No duplicate component/function declarations, single default export.
- `backup.js` was syntax-checked; the live network call to Supabase couldn't be tested from inside the sandboxed environment this was built in (that sandbox blocks unlisted external hosts — Supabase wasn't on its allowlist), but it's a plain `fetch` call and will work normally from your machine or GitHub Actions, both of which have normal internet access.
