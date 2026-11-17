// v105 No main niche: every switched-on industry gets equal weight.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const src = (await import("node:fs")).readFileSync(W, "utf8");
const ideal = src.slice(src.indexOf("var IDEAL_CLIENT = `"), src.indexOf("`.trim();", src.indexOf("var IDEAL_CLIENT = `")));
assert(/NO MAIN NICHE/.test(ideal) && !/Focus areas: health clinics/.test(ideal) && !/Secondary:/.test(ideal), "Ideal-client brief has no main niche (no primary/secondary)");
assert(/trades and home services, salons, coaches and consultants, agencies/.test(ideal) && /AHPRA/.test(ideal), "Trades and coaches listed alongside clinics; clinics keep their AHPRA note");
assert(/const order = on\.map\(\(v\) => \(\{ v, n: have\[v\] \|\| 0 \}\)\)\.sort\(\(a, b\) => a\.n - b\.n\)/.test(src), "Hunts rotate evenly: the industry with the fewest prospects goes next");
assert(/targets: \{ allied: 20, dental: 20, aesthetics: 20, psychology: 20, medical: 20, property: 20, trades: 20, coaching: 20, multi: 20 \}/.test(src), "Default targets are equal");
assert(!/not a core clinic type/.test(src) && /industry not switched on in Growth/.test(src), "Automatic enrolment works for every switched-on industry, not only clinics");
assert(/Prospect hunt \\u2192 leak scan/.test(src) && !/Clinic hunt \\u2192/.test(src), "Shift renamed 'Prospect hunt'");
assert(!/skip non-clinics/.test(src) && !/web_search for real clinics/.test(src), "Sales playbook no longer clinic-only");
assert(/NICHE: there is NO main niche/.test(src) && /overrides any older rule or memory/.test(src), "Command is told this overrides older memory rules about allied health");
console.log("niche-v105 OK");
