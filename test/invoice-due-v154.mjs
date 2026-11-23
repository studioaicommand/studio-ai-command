// v154 Invoices are due on receipt by default (Ty: "I don't want invoices to be paid in 7 days"). An old stored default of 7
// becomes 0; a value Ty saves himself is kept.
import { readFileSync } from "node:fs";
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const src = readFileSync(W, "utf8");
const m = src.match(/function moneyCfg\(v\) \{[\s\S]*?\n\}/);
const moneyCfg = new Function("return " + m[0])();
assert(moneyCfg({}).due_days === 0, "New Commands: invoices are due on receipt");
assert(moneyCfg({ due_days: 7 }).due_days === 0, "The old default of 7 days becomes due on receipt");
assert(moneyCfg({ due_days: 7, due_days_set: true }).due_days === 7 && moneyCfg({ due_days: 3 }).due_days === 3, "A number Ty chose himself is kept");
assert(/Invoice due in \(days, 0 = on receipt\)/.test(src) && /due_days_set: true,/.test(src), "Money settings explains 0 = on receipt, and saving marks it as Ty's choice");
