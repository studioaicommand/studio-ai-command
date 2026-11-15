// v103 Demo links in Telegram messages to Ty carry his private mark, so opening them never counts as the lead.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const src = (await import("node:fs")).readFileSync(W, "utf8");
const grab = (name) => { const i = src.indexOf("function " + name + "("); let d = 0, j = src.indexOf("{", i); for (let k = j; k < src.length; k++) { if (src[k] === "{") d++; else if (src[k] === "}") { d--; if (!d) return src.slice(i, k + 1); } } };
globalThis.__sfTyMark = "0123456789abcdef";
const { tyLinkify, tyPayload } = new Function(grab("tyLinkify") + "\n" + grab("tyPayload") + "\nreturn { tyLinkify, tyPayload };")();
const T = "0123456789abcdef";
assert(tyLinkify("Open it: https://studioflowandsystems.app/demo/abc123/site.", false) === "Open it: https://studioflowandsystems.app/demo/abc123/site?ty=" + T + ".", "A plain demo link gets Ty's mark (full stop kept outside the link)");
assert(tyLinkify('<a href="https://studioflowandsystems.app/demo/abc/report?preview=1">Report</a>', true).includes("report?preview=1&amp;ty=" + T + '"'), "Links inside Telegram HTML get the mark with an escaped &");
assert(tyLinkify("https://studioflowandsystems.app/demo/abc/site?ty=" + T, false) === "https://studioflowandsystems.app/demo/abc/site?ty=" + T, "Already-marked links are left alone");
assert(tyLinkify("https://acme.studioflowandsystems.app/demo/karinya", false).endsWith("?ty=" + T), "Client Command demo links are marked too");
assert(tyLinkify("See https://studioflowandsystems.app/command and https://google.com/demo/x", false) === "See https://studioflowandsystems.app/command and https://google.com/demo/x", "Other links are untouched");
const p = tyPayload({ text: "https://studioflowandsystems.app/demo/k1/site", parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "Open", url: "https://studioflowandsystems.app/demo/k1/site" }, { text: "Approve", callback_data: "a:1" }]] } });
assert(p.text.endsWith("?ty=" + T) && p.reply_markup.inline_keyboard[0][0].url.endsWith("?ty=" + T) && p.reply_markup.inline_keyboard[0][1].callback_data === "a:1", "Message text and 'Open' buttons are marked; other buttons unchanged");
assert(/payload = tyPayload\(payload\);/.test(src) && /JSON\.stringify\(tyPayload\(payload\) \|\| \{\}\)/.test(src), "Every Telegram send goes through it (main sender and quick sender)");
console.log("tglinks-v103 OK");
