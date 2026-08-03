// netlify/functions/daily-digest.js
//
// Runs automatically every morning (see the schedule in netlify.toml)
// and sends a real push notification with that day's task — this is
// what makes the "every morning, even if he doesn't open the app"
// part actually work, since a scheduled server-side job is the only
// way to notify someone proactively without them opening anything.
//
// It reads the task list straight out of Supabase (the same list the
// app itself generates and shows in the Tasks tab), finds today's
// entry, and pushes it to both the student and tutor if they've each
// enabled notifications.

const webpush = require("web-push");

const SUPABASE_URL = "https://shakvgfmpxnyimnhueqr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoYWt2Z2ZtcHhueWltbmh1ZXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwMTk2NzksImV4cCI6MjEwMDU5NTY3OX0.yDyMlmYvH17gjNYZozjFJ1MW63-DmUv5hv9vylRmOxM";
const VAPID_PUBLIC_KEY = "BCUOgLY9qC1PH4JmsF2r6h9XBuQ6YDTsd6L9vs8iMwtgEycyUBw0TpN4BwUYFW8TU4IRL5YNuhitqeL8Tj2crRI";
const STUDENT = "Noah";

const HEADERS = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };

async function getRow(key) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/tutor_state?id=eq.${encodeURIComponent(`${STUDENT}:${key}`)}&select=payload`,
    { headers: HEADERS }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0]?.payload ?? null;
}

exports.handler = async () => {
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!privateKey) {
    return { statusCode: 200, body: "Skipped — VAPID_PRIVATE_KEY not set yet." };
  }
  webpush.setVapidDetails("mailto:noreply@example.com", VAPID_PUBLIC_KEY, privateKey);

  const tasks = (await getRow("tasks")) || [];
  const today = new Date().toISOString().slice(0, 10);
  const todayTask = tasks.find((t) => t.date === today);

  if (!todayTask) {
    return { statusCode: 200, body: "No task for today — nothing to send." };
  }

  const results = [];
  for (const role of ["student", "tutor"]) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?role=eq.${role}&select=subscription`, { headers: HEADERS });
      const rows = res.ok ? await res.json() : [];
      const sub = rows?.[0]?.subscription;
      if (!sub) {
        results.push({ role, sent: false, reason: "no subscription" });
        continue;
      }
      await webpush.sendNotification(
        sub,
        JSON.stringify({
          title: "Today's plan",
          body: todayTask.text,
        })
      );
      results.push({ role, sent: true });
    } catch (err) {
      results.push({ role, sent: false, error: String(err) });
    }
  }

  return { statusCode: 200, body: JSON.stringify(results) };
};
