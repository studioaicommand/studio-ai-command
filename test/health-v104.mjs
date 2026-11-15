// v104 Health compliance safety net for clinic clients.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const src = (await import("node:fs")).readFileSync(W, "utf8");
const grab = (name, kw = "function ") => { const i = src.indexOf(kw + name); let d = 0, j = src.indexOf("{", src.indexOf(")", i)); for (let k = j; k < src.length; k++) { if (src[k] === "{") d++; else if (src[k] === "}") { d--; if (!d) return src.slice(i, k + 1); } } };
const checks = src.slice(src.indexOf("var HEALTH_CHECKS = ["), src.indexOf("];", src.indexOf("var HEALTH_CHECKS = [")) + 2);
let INST = { custom: true, template: "allied_health", industry: "Chiropractic" };
const { healthFlags, healthMode, healthGate } = new Function("instGet", checks + "\n" + grab("healthFlags") + "\nasync " + grab("healthMode") + "\nasync " + grab("healthGate") + "\nreturn { healthFlags, healthMode, healthGate };")(async () => INST);
const k = (t) => healthFlags(t).map((f) => f.k).join(",");
assert(k("Try some ibuprofen, 400mg every 6 hours") === "dose", "Medication or dose advice is caught");
assert(k("Sounds like a disc injury, we see it all the time") === "diagnosis", "A diagnosis is caught");
assert(k("Our adjustments will fix it, guaranteed") === "outcome", "A guaranteed outcome is caught");
assert(k("“Best decision I ever made, my back pain is gone” — Sarah") === "testimonial", "A patient testimonial is caught (AHPRA)");
assert(k("We're the best chiropractor on the northside") === "superlative", "A \"best chiropractor\" claim is caught (AHPRA)");
assert(k("Can you send your Medicare number and date of birth?") === "health_details", "Asking for health details by message is caught");
for (const ok of ["Hi Jess, we can fit you in tomorrow at 10am or Thursday at 3:30pm. Which suits?", "Our best availability is Monday morning.", "A practitioner will assess that at your first appointment.", "If it's an emergency please call 000.", "Initial consult is 45 minutes and $110."])
  assert(k(ok) === "", "Normal reception message passes: " + ok.slice(0, 50));
let out = await healthGate({}, { reply: "Sounds like a muscle strain, take 400mg ibuprofen and rest.", handoff: false });
assert(out.handoff === true && out.reply === "" && /wasn't sent automatically/.test(out.reason) && /ibuprofen/.test(out.reason), "Clinic: an auto-reply with clinical advice is held and handed to the owner with the suggested words");
out = await healthGate({}, { reply: "We can see you tomorrow at 10am. Would that work?", handoff: false });
assert(out.handoff === false && /10am/.test(out.reply), "Clinic: a normal booking reply still sends automatically");
INST = { custom: true, template: "trades", industry: "Electrician" }; globalThis.__sfHealthMode = null;
out = await healthGate({}, { reply: "That sounds like a tripped breaker, guaranteed fix today.", handoff: false });
assert(out.handoff === false, "Non-health clients are not affected");
assert(/Health check:<\/b> this looks like/.test(src) && /return await healthGate\(env, inboxParse\(raw, channel\)\);/.test(src), "Wired into every approval card and every automatic inbox reply");
console.log("health-v104 OK");
