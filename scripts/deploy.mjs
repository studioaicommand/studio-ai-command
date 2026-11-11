// Safe deploy of Studio AI Command (the main Cloudflare Worker).
// 1) Downloads the live version as a backup (stops if it can't).
// 2) Uploads ONLY the new code (bindings, secrets, variables, crons and routes stay exactly as they are).
// 3) Checks the live app now serves the new version and the API answers.
// 4) If the check fails, puts the backup straight back.
// Needs: CLOUDFLARE_API_TOKEN (Workers Scripts: Edit), CLOUDFLARE_ACCOUNT_ID.
import fs from "node:fs";
const API = process.env.CF_API || "https://api.cloudflare.com/client/v4";
const TOKEN = process.env.CLOUDFLARE_API_TOKEN, ACC = process.env.CLOUDFLARE_ACCOUNT_ID;
const SCRIPT = process.env.WORKER_NAME || "studio-intelligence-core-cb9c";
const ORIGIN = (process.env.ORIGIN || "https://studioflowandsystems.app").replace(/\/+$/, "");
const FILE = process.argv[2] || "worker.mjs";
const die = (m) => { console.error("\n✖ " + m); process.exit(1); };
if (!TOKEN || !ACC) die("CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are needed (GitHub > Settings > Secrets).");
const code = fs.readFileSync(FILE, "utf8");
const NEWV = (code.match(/var APP = \{ "v": "([0-9a-f]+)"/) || [])[1];
if (!NEWV || !code.trimEnd().endsWith("};")) die("The built worker looks incomplete.");
const H = { Authorization: "Bearer " + TOKEN };
async function upload(src) {
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify({ main_module: "worker.js" })], { type: "application/json" }));
  form.append("worker.js", new Blob([src], { type: "application/javascript+module" }), "worker.js");
  const r = await fetch(`${API}/accounts/${ACC}/workers/scripts/${SCRIPT}/content`, { method: "PUT", headers: H, body: form });
  const j = await r.json().catch(() => ({}));
  if (!j.success) throw new Error("Cloudflare refused it: " + (j.errors || []).map((e) => e.message).join("; ") || r.status);
}
async function liveVersion() {
  const r = await fetch(ORIGIN + "/app/app.js", { headers: { "cache-control": "no-cache" } }).catch(() => null);
  return r ? String(r.headers.get("etag") || "").replace(/^W\//, "").replace(/"/g, "") : "";
}
async function healthy() {
  const [a, b] = await Promise.all([fetch(ORIGIN + "/command-next").catch(() => null), fetch(ORIGIN + "/api/v1/team/health").catch(() => null)]);
  return a?.status === 200 && b && b.status < 500;
}
console.log("Deploying " + SCRIPT + " version " + NEWV);
const was = await liveVersion();
console.log("Live now: " + (was || "unknown"));
if (was === NEWV) { console.log("Already live. Nothing to do."); process.exit(0); }
// 1) backup
const br = await fetch(`${API}/accounts/${ACC}/workers/scripts/${SCRIPT}/content/v2`, { headers: H });
let backup = "";
if ((br.headers.get("content-type") || "").includes("multipart")) { const fd = await br.formData(); for (const [, v] of fd) { if (typeof v !== "string") { backup = await v.text(); break; } } }
else backup = await br.text();
if (!br.ok || backup.length < 500000 || !backup.trimEnd().endsWith("};")) die("Couldn't download a backup of the live version (HTTP " + br.status + "), so nothing was changed.");
fs.mkdirSync("backup", { recursive: true });
fs.writeFileSync("backup/live-before-deploy.js", backup);
console.log("✔ Backup saved (" + Math.round(backup.length / 1024) + " KB)");
// 2) upload code only
await upload(code).catch((e) => die(e.message + " Nothing was changed."));
console.log("✔ Uploaded. Checking it's live and healthy...");
// 3) check
let ok = false;
for (let i = 0; i < 24 && !ok; i++) { await new Promise((r) => setTimeout(r, +(process.env.POLL_MS || 5000))); ok = (await liveVersion()) === NEWV && await healthy(); }
if (ok) { console.log("✔ Live and healthy: " + NEWV); process.exit(0); }
// 4) roll back
console.error("✖ The new version didn't pass its check. Putting the previous version back...");
try { await upload(backup); console.error("✔ Restored the previous version."); } catch (e) { console.error("✖ Restore failed: " + e.message + ". Paste backup/live-before-deploy.js in Cloudflare now."); }
process.exit(1);
