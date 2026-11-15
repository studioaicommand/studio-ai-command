// v108 Monthly Evolve research shift (Replica method) + the research kit in the repo.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const fs = await import("node:fs");
const src = fs.readFileSync(W, "utf8");
const i = src.indexOf('id: "evolve_research"'), block = src.slice(i, src.indexOf("},", i));
assert(i > 0 && /department: "head_of_systems"/.test(block) && /days: \[1\]/.test(block) && /hour: 9/.test(block) && /monthly: true/.test(block), "Head of Systems runs Evolve research on Mondays at 9am, monthly");
assert(/RECON/.test(block) && /WHAT USERS HATE/.test(block) && /NEW TECH/.test(block) && /TOP 5 upgrades/.test(block), "Follows the Replica method: recon, what users hate, new tech, top 5 upgrades");
assert(/Never invent a review/.test(block) && /Never suggest copying a competitor/.test(block), "Never invents reviews and never copies competitors");
assert(/!\(s\.monthly && Number\(String\(t\.date\)\.slice\(8, 10\)\) > 7\)/.test(src), "Monthly shifts only run in the first week, so it fires once a month");
assert(fs.existsSync("/home/claude/w/research/replica-skill/replica-entrepreneur/SKILL.md") && /MIT License/.test(fs.readFileSync("/home/claude/w/research/replica-skill/LICENSE", "utf8")), "Replica skill pack kept in the repo for reference (MIT)");
assert(/v: 108, studio_only: true, title: "Monthly Evolve research/.test(src), "The Update Announcer teaches the team about it");
console.log("evolve-v108 OK");
