// netlify/functions/send-push.js
//
// Sends a real push notification to whichever role ("tutor" or "student")
// didn't send the message. The VAPID private key stays server-side —
// it's read from the VAPID_PRIVATE_KEY environment variable you set in
// your Netlify site settings, never from client code.

const webpush = require("web-push");

const SUPABASE_URL = "https://shakvgfmpxnyimnhueqr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoYWt2Z2ZtcHhueWltbmh1ZXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwMTk2NzksImV4cCI6MjEwMDU5NTY3OX0.yDyMlmYvH17gjNYZozjFJ1MW63-DmUv5hv9vylRmOxM";

const VAPID_PUBLIC_KEY = "BCUOgLY9qC1PH4JmsF2r6h9XBuQ6YDTsd6L9vs8iMwtgEycyUBw0TpN4BwUYFW8TU4IRL5YNuhitqeL8Tj2crRI";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!privateKey) {
    return { statusCode: 500, body: "VAPID_PRIVATE_KEY not configured on this Netlify site yet." };
  }

  webpush.setVapidDetails("mailto:noreply@example.com", VAPID_PUBLIC_KEY, privateKey);

  try {
    const { recipientRole, title, body } = JSON.parse(event.body || "{}");
    if (!recipientRole || !["tutor", "student"].includes(recipientRole)) {
      return { statusCode: 400, body: "recipientRole must be 'tutor' or 'student'" };
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?role=eq.${recipientRole}&select=subscription`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const rows = await res.json();
    const sub = rows?.[0]?.subscription;

    if (!sub) {
      return { statusCode: 200, body: JSON.stringify({ sent: false, reason: "No push subscription on file for that role yet." }) };
    }

    await webpush.sendNotification(sub, JSON.stringify({ title: title || "My Tutor", body: body || "New message" }));
    return { statusCode: 200, body: JSON.stringify({ sent: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ sent: false, error: String(err) }) };
  }
};
