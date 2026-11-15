// v111 Reliable hourly run: time limit per job, client jobs first, budget, alerts on repeated failures, /cron-health.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const src = (await import("node:fs")).readFileSync(W, "utf8");
const grab = (name) => { const i = src.indexOf("function " + name + "("); let d = 0, j = src.indexOf(") {\n", i) + 2; for (let k = j; k < src.length; k++) { if (src[k] === "{") d++; else if (src[k] === "}") { d--; if (!d) return src.slice(i, k + 1); } } };
const store = {}, tgs = [];
const deps = { secGet: async (e, k) => store[k] || null, secPut: async (e, k, v) => { store[k] = v; }, notify: async (e, t) => { tgs.push(t); return { sent: true }; } };
const cronRun = new Function("secGet", "secPut", "notify", "var CRON_STEP_MS = 150000; var CRON_BUDGET_MS = 780000; var CRON_ALERT_STREAK = 3; var CRON_NOT_DUE = Symbol('nd');" + grab("cronRun").replace(/^function/, "async function") + "; return { cronRun, CRON_NOT_DUE };")(deps.secGet, deps.secPut, deps.notify);
const ran = [];
const steps = () => [
  ["Inbox sweep", async () => { ran.push("inbox"); }],
  ["Hung job", () => new Promise(() => {}), { ms: 50 }],
  ["Broken job", async () => { throw new Error("GHL said 500"); }],
  ["Billing desk", async () => { ran.push("billing"); }],
  ["Not due", () => cronRun.CRON_NOT_DUE]
];
let rec = await cronRun.cronRun({}, steps());
assert(ran.join() === "inbox,billing", "A job that hangs or breaks doesn't stop the jobs after it");
assert(rec.steps["Hung job"].s === "fail" && /moved on/.test(rec.steps["Hung job"].err) && rec.steps["Broken job"].err === "GHL said 500" && rec.steps["Not due"].s === "idle", "Each job's result is recorded (ok, failed with the reason, idle)");
await cronRun.cronRun({}, steps());
assert(tgs.length === 0, "No alert for one or two failures");
await cronRun.cronRun({}, steps());
assert(tgs.length === 1 && /3 runs in a row/.test(tgs[0]) && /Broken job: GHL said 500/.test(tgs[0]) && /Hung job/.test(tgs[0]), "Ty gets one Telegram alert when a job fails 3 runs in a row");
await cronRun.cronRun({}, steps());
assert(tgs.length === 1, "…and isn't nagged every hour after that");
await cronRun.cronRun({}, [["Broken job", async () => {}]]);
assert(!store.cron_health.streaks["Broken job"] && store.cron_health.streaks["Hung job"] === 4, "A job that works again is cleared");
let t = 0; ran.length = 0;
rec = await cronRun.cronRun({}, [["Slow", async () => { t += 20; }], ["Later", async () => { ran.push("later"); }], ["Telegram digest", async () => { ran.push("digest"); }, { always: true }]], { budget: 10, now: () => t });
assert(rec.steps.Later.s === "skipped" && rec.skipped.includes("Later") && ran.join() === "digest", "Over the time budget, the rest is skipped but the Telegram digest always runs");
assert(store.cron_health.history.length === 6, "History of recent runs kept");
const ts = src.slice(src.indexOf("async function teamScheduled("), src.indexOf("async function leakReport("));
const pos = (n) => ts.indexOf('["' + n + '"');
assert(["Inbox sweep", "Approved messages", "Client receptionists", "Billing desk", "Review desk"].every((n) => pos(n) > 0 && pos(n) < pos("Team shifts")) && pos("Team shifts") < pos("Telegram digest"), "Client-facing jobs run before the team's AI work");
const names = ["AI job recovery", "Update announcer", "Inbox sweep", "Inbox follow-ups", "Approved messages", "Away mode", "Client receptionists", "Billing desk", "Monthly invoices", "Review desk", "Phone calls", "Demo follow-ups", "Reply watch", "AI budget", "Fair use", "Fleet fair use", "Leak tests", "Leak watch", "Monday report", "DM desk", "Team shifts", "Arena", "No-show rebooker", "Prospect hunts", "Outreach autopilot", "Scout", "Team leader", "Design retro", "Website demos", "Demo screenshots", "Team brain", "Memory index", "Archive index", "Telegram digest"];
assert(names.every((n) => pos(n) > 0), "Every one of the 34 hourly jobs is still in the run");
assert(/seg\[0\] === "cron-health"/.test(src) && /HOURLY RUN: if Ty asks/.test(src) && /v: 111, title: "Reliable hourly run"/.test(src), "/cron-health route, Command knows about it, and the announcer teaches it");
console.log("cron-v111 OK");
