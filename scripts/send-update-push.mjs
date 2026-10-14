/**
 * Sends a "new update available" push notification to users.
 *
 * Usage:
 *   node scripts/send-update-push.mjs [staff|commuter|all] ["Custom message"]
 *
 * Required env vars (keep these OFF the app, server/local only):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Install once:  npm i -D @supabase/supabase-js
 * Requires Node 18+ (built-in fetch).
 */
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const target = process.argv[2] ?? "all";
const body =
  process.argv[3] ??
  "A new version of SmartQs is ready. Open the app to update.";

const STAFF_ROLES = ["driver", "dispatcher", "admin"];

// Remove accidental whitespace and wrapping quotes from .env values.
const clean = (value) =>
  (value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();

const supabaseUrl = clean(
  process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
);
const serviceKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

// ─── KEY DIAGNOSTICS (never prints the secret itself) ───────────────
function describeKey(url, key) {
  if (!key) return;

  const urlRef = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1];

  console.log(`Project URL ref : ${urlRef ?? "unknown"}`);
  console.log(`Key length      : ${key.length}`);

  if (key.startsWith("sb_secret_")) {
    console.log("Key type        : new secret key (sb_secret_...)");
    return;
  }

  if (key.startsWith("sb_publishable_")) {
    console.error(
      "This is a PUBLISHABLE key. You need the SECRET / service_role key.",
    );
    process.exit(1);
  }

  if (key.startsWith("eyJ")) {
    const parts = key.split(".").length;

    if (parts !== 3) {
      console.error(
        `This JWT has ${parts} part(s) but needs 3 separated by dots (header.payload.signature). The dots were lost when copying. Re-copy the key, or use a new sb_secret_ key instead.`,
      );
      process.exit(1);
    }

    try {
      const payload = JSON.parse(
        Buffer.from(key.split(".")[1], "base64url").toString("utf8"),
      );
      console.log(`Key type        : legacy JWT, role = ${payload.role}`);
      console.log(`Key project ref : ${payload.ref}`);

      if (payload.role !== "service_role") {
        console.error("This JWT is not the service_role key (it is anon).");
        process.exit(1);
      }
      if (urlRef && payload.ref !== urlRef) {
        console.error("This key belongs to a DIFFERENT project than the URL.");
        process.exit(1);
      }
    } catch {
      console.error(
        "The key looks like a JWT but is malformed. It was likely truncated when pasting.",
      );
      process.exit(1);
    }
    return;
  }

  console.error(
    "Unrecognised key format. Re-copy it from the Supabase dashboard.",
  );
  process.exit(1);
}

describeKey(supabaseUrl, serviceKey);

if (!supabaseUrl) {
  console.error(
    "Missing Supabase URL. Add SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) to your .env in the project root.",
  );
  process.exit(1);
}

if (!serviceKey) {
  console.error(
    "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to your .env (do NOT prefix it with EXPO_PUBLIC_).",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function getTokens() {
  let query = supabase
    .from("users")
    .select("expo_push_token, role")
    .not("expo_push_token", "is", null);

  if (target === "staff") {
    query = query.in("role", STAFF_ROLES);
  } else if (target === "commuter") {
    query = query.not("role", "in", `(${STAFF_ROLES.join(",")})`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const tokens = (data ?? [])
    .map((row) => row.expo_push_token)
    .filter((t) => typeof t === "string" && t.startsWith("ExponentPushToken"));

  return [...new Set(tokens)];
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function main() {
  const tokens = await getTokens();

  if (tokens.length === 0) {
    console.log("No push tokens found. Nothing to send.");
    return;
  }

  console.log(`Sending to ${tokens.length} device(s) [target: ${target}]`);

  let sent = 0;
  let failed = 0;

  // Expo accepts up to 100 messages per request.
  for (const batch of chunk(tokens, 100)) {
    const messages = batch.map((to) => ({
      to,
      title: "Update available",
      body,
      sound: "default",
      channelId: "jeepq_default",
      data: { type: "app_update" },
    }));

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const json = await res.json();

    if (!res.ok || json.errors || !Array.isArray(json.data)) {
      console.warn(
        `Batch rejected (HTTP ${res.status}):`,
        JSON.stringify(json.errors ?? json, null, 2),
      );
      console.warn("Retrying each device individually...");

      for (const message of messages) {
        const single = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify([message]),
        });

        const singleJson = await single.json();
        const ticket = singleJson.data?.[0];

        if (ticket?.status === "ok") {
          sent++;
        } else {
          failed++;
          console.warn(
            `Failed for ${message.to.slice(0, 24)}...:`,
            ticket?.message ?? JSON.stringify(singleJson.errors ?? singleJson),
            ticket?.details ?? "",
          );
        }
      }

      continue;
    }

    for (const ticket of json.data) {
      if (ticket.status === "ok") {
        sent++;
      } else {
        failed++;
        console.warn("Ticket error:", ticket.message, ticket.details);
      }
    }
  }

  console.log(`Done. Accepted by Expo: ${sent}, failed: ${failed}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
