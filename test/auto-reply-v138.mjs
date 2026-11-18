// v138 automatic replies (out of office, "we'll get back to you") are never answered and never count as a reply.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const src = (await import("node:fs")).readFileSync(W, "utf8");
const a = src.indexOf("var AUTO_REPLY_RES"), b = src.indexOf("async function checkReplies");
const isAutoReply = new Function(src.slice(a, b) + "; return isAutoReply;")();
const autos = [
  ["Hello, Thank you for taking the time to contact OnePointHealth. Your message is very important to us. We endeavour to get back to you as soon as possible and no longer than 24 hours. For urgent matters, please call us on 02 4732 5188.", ""],
  ["Hi there, Thanks for your email. We are currently out of office, returning Monday 16th November. Kind regards, Brothers in Care", "Out of office Automatic Reply Re: Studio AI Command details for Monday"],
  ["Thanks for reaching out! We've received your message and someone from our team will get back to you within 1 business day.", ""],
  ["I'm currently away on leave and will be back on the 24th. For urgent matters call reception.", ""],
  ["This mailbox is not monitored. Please call us on 07 3000 0000.", ""],
  ["Your request has been received. Ticket number #48213 has been created.", ""]];
for (const [t, s] of autos) assert(isAutoReply(t, s), "Auto-reply spotted: " + (s || t).slice(0, 60));
const real = ["Yes", "Sounds interesting, can you call me tomorrow?", "Thanks for the email Ty. We already have a receptionist, but I'd like to see the demo.", "Not interested, please remove me.", "Thank you Ty, the guide is great"];
for (const t of real) assert(!isAutoReply(t), "Real reply kept: " + t.slice(0, 50));
assert(/isAutoReply\(text, inbound\.subject/.test(src), "The inbox never drafts a reply to an automatic reply");
assert(/autos\.length\) fresh = fresh\.filter/.test(src), "Outreach Reply watch ignores automatic replies (no 'replied' status, follow-ups continue)");
for (const t of ["Thanks for your email Ty, I'll get back to you tomorrow after I talk to my partner.", "We have received your email and we're interested, can you send pricing?", "Thanks for reaching out, I will respond properly next week, want to see the demo"]) assert(!isAutoReply(t), "A real person saying they'll get back is kept: " + t.slice(0, 50));
