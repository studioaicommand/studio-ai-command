// v120 The calls log and business timeline reflect the Growth Pack approach.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(/Send their Growth Pack while you talk/.test(src) && /Open Growth Pack/.test(src) && /Copy pack link/.test(src) && /Growth Pack ready/.test(src) && !/Open demo<|Draft demo email|Send demo now|demo ready<\/span>/.test(src), "Call cards: Growth Pack buttons, chip and email box (old demo labels gone)");
assert(/url: `\$\{origin\}\/demo\/\$\{d\.token\}\/pack`, desk_url:/.test(src) && /"\/demo\/"\+d\.token\+"\/pack",desk_url:/.test(src), "Call list and business page link the Growth Pack, with the front desk as a second button");
assert(/Pack sent \/ Awaiting decision-maker/.test(src) && !/Demo sent \/ Awaiting decision-maker/.test(src) && /Tried their front desk/.test(src) && !/Demo chat activity/.test(src), "Outcome button and timeline stages use the new words");
assert(/Command is drafting a follow-up email about the call for your OK/.test(src), "Tapping No answer or Voicemail tells Ty the follow-up email is being drafted");
assert(/had a go with the front desk I put together/.test(src) && /"\/demo\/" \+ d\.token \+ "\/pack"/.test(src) && !/checking in on the AI receptionist demo/.test(src), "The agreed follow-up after they try it links the whole pack (no 'just checking in')");
assert(/\\u\{1F4E6\} Growth Packs: /.test(src) && !/AI receptionist demos: /.test(src), "Growth overview counts Growth Packs");
console.log("calls-v120 OK");
