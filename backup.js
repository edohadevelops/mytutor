/**
 * backup.js
 *
 * Standalone backup script for the My Tutor app's Supabase data.
 * Run it manually any time, or schedule it (cron, Windows Task
 * Scheduler, or a GitHub Action) to run daily.
 *
 * Usage:
 *   node backup.js
 *
 * Writes a timestamped JSON file into ./backups/, e.g.
 *   backups/my-tutor-backup-2026-07-27T02-15-00.json
 *
 * This does NOT modify anything in Supabase — it only reads.
 */

import fetch from "node-fetch";
import fs from "node:fs";
import path from "node:path";

const SUPABASE_URL = "https://shakvgfmpxnyimnhueqr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoYWt2Z2ZtcHhueWltbmh1ZXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwMTk2NzksImV4cCI6MjEwMDU5NTY3OX0.yDyMlmYvH17gjNYZozjFJ1MW63-DmUv5hv9vylRmOxM";
const STUDENT = "Noah";

const HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

async function main() {
  console.log(`Fetching all "${STUDENT}:*" rows from Supabase...`);

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/tutor_state?id=like.${encodeURIComponent(`${STUDENT}:*`)}&select=id,payload,updated_at&order=id`,
    { headers: HEADERS }
  );

  if (!res.ok) {
    console.error(`Fetch failed: ${res.status} ${res.statusText}`);
    const text = await res.text().catch(() => "");
    if (text) console.error(text);
    process.exit(1);
  }

  const rows = await res.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn("No rows found. Either the table is empty, or the 'tutor_state' table / RLS policy isn't set up yet.");
  }

  const snapshot = {
    exportedAt: new Date().toISOString(),
    student: STUDENT,
    rowCount: rows.length,
    data: {},
  };

  for (const row of rows) {
    const shortKey = row.id.replace(`${STUDENT}:`, "");
    snapshot.data[shortKey] = row.payload;
  }

  console.log("Fetching chat messages...");
  const msgRes = await fetch(
    `${SUPABASE_URL}/rest/v1/tutor_messages?select=*&order=created_at.asc`,
    { headers: HEADERS }
  );
  snapshot.messages = msgRes.ok ? await msgRes.json() : [];

  const backupsDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir);

  const stamp = new Date().toISOString().replace(/:/g, "-").split(".")[0];
  const outPath = path.join(backupsDir, `my-tutor-backup-${stamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));

  console.log(`Backup written: ${outPath} (${rows.length} rows)`);

  // Keep only the most recent 30 local backups so this doesn't grow forever.
  const files = fs
    .readdirSync(backupsDir)
    .filter((f) => f.startsWith("my-tutor-backup-") && f.endsWith(".json"))
    .sort();
  const excess = files.length - 30;
  if (excess > 0) {
    for (const f of files.slice(0, excess)) {
      fs.unlinkSync(path.join(backupsDir, f));
    }
    console.log(`Pruned ${excess} old backup file(s), keeping the most recent 30.`);
  }
}

main().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
