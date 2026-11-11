// v52: branded email shell, matching the GHL "SF OUTREACH" code-editor templates (dark Studio Flow design).
// Set the EMAIL_STYLE=classic env var to go back to the old light signature-card look.
var SF_EMAIL_LOGO = "https://assets.cdn.filesafe.space/nCIlxry6eg9A3kIxjJFv/media/6ab9f7f35597aeb9d7f2b52b.png";
var SF_EMAIL_KINDS = {
  intro: { badge: "AI &amp; AUTOMATION // BUSINESS OPPORTUNITY", label: "A PERSONALISED INTRODUCTION", pre: "A personalised AI and automation opportunity from Studio Flow &amp; Systems." },
  demo: { badge: "YOUR CUSTOM DEMO // READY TO VIEW", label: "YOUR PERSONALISED DEMO", pre: "Your personalised Studio Flow &amp; Systems demo is ready." },
  followup: { badge: "FOLLOWING UP // STUDIO FLOW", label: "A QUICK FOLLOW-UP", pre: "A quick follow-up from Ty at Studio Flow &amp; Systems." },
  message: { badge: "STUDIO FLOW // BUSINESS SYSTEMS", label: "A NOTE FROM TY", pre: "A message from Ty at Studio Flow &amp; Systems." }
};
function brandedEmail(opts = {}) {
  const style = String((typeof globalThis !== "undefined" && globalThis.__SF_EMAIL_STYLE) || "").toLowerCase();
  if (style === "classic" || opts.style === "classic") return brandedEmailClassic(opts);
  const { body, cold = false, businessName = "", closing = "Cheers," } = opts;
  const kind = SF_EMAIL_KINDS[opts.kind] ? opts.kind : cold ? "intro" : "message";
  const K = SF_EMAIL_KINDS[kind];
  const text = stripSignoff(body);
  const font = "font-family:Arial,Helvetica,sans-serif";
  const linkLight = (s) => s.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" target="_blank" style="color:#69caff;text-decoration:underline">$1</a>');
  const paras = text.split(/\n{2,}/).map((p) => `<p style="margin:0 0 18px 0;${font};color:#d5e4ef;font-size:16px;line-height:1.8">${linkLight(esc3(p)).replace(/\n/g, "<br>")}</p>`).join("");
  const preview = esc3(text.replace(/\s+/g, " ").slice(0, 110)) || K.pre;
  const close = closing ? `<p style="margin:4px 0 0 0;${font};color:#d5e4ef;font-size:16px;line-height:1.8">${esc3(closing)}</p>` : "";
  const why = cold ? `<p style="margin:22px 0 0 0;color:#607b91;font-size:11px;line-height:1.8">You're getting this because ${businessName ? esc3(businessName) + " publishes" : "your business publishes"} this email address on its website. Not for you? Just reply "no thanks" and I won't email again.</p>` : `<p style="margin:22px 0 0 0;color:#607b91;font-size:11px;line-height:1.8">Prefer not to hear from us? Just reply "no thanks" and we'll stop.</p>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Studio Flow &amp; Systems</title><style>@media only screen and (max-width:600px){.email-container{width:100%!important}.mobile-padding{padding-left:22px!important;padding-right:22px!important}.mobile-heading{font-size:29px!important}.mobile-copy p{font-size:15px!important}.mobile-logo{max-width:220px!important}.mobile-button{display:block!important;width:auto!important}}</style></head>
<body style="margin:0;padding:0;background-color:#020711;${font};color:#f5f9ff">
<div style="display:none;font-size:1px;color:#020711;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${preview}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#020711;border-collapse:collapse"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" class="email-container" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:680px;background-color:#061220;border:1px solid #12324d;border-radius:14px;border-collapse:separate;overflow:hidden">
<tr><td class="mobile-padding" style="padding:14px 28px;background-color:#030b15;border-bottom:1px solid #12324d"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="${font};color:#69caff;font-size:10px;line-height:1.5;font-weight:700;letter-spacing:1.6px;text-transform:uppercase">STUDIO FLOW // BUSINESS SYSTEMS</td><td align="right" style="${font};color:#5d7890;font-size:9px;line-height:1.5;font-weight:700;letter-spacing:1px;text-transform:uppercase">SYSTEM STATUS: ONLINE</td></tr></table></td></tr>
<tr><td align="center" style="padding:38px 28px 20px 28px;background-color:#061220"><a href="${SITE}" target="_blank" style="text-decoration:none"><img class="mobile-logo" src="${SF_EMAIL_LOGO}" width="260" alt="Studio Flow &amp; Systems" style="display:block;width:100%;max-width:260px;height:auto;border:0;margin:0 auto;color:#ffffff;font-size:20px;font-weight:700"></a></td></tr>
<tr><td align="center" style="padding:12px 28px 0 28px"><div style="display:inline-block;padding:9px 16px;background-color:#071b2c;border:1px solid #174b70;border-radius:100px;${font};color:#61c8ff;font-size:10px;line-height:1.5;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">&#9679; ${K.badge}</div></td></tr>
<tr><td align="center" class="mobile-padding" style="padding:30px 42px 18px 42px"><div style="${font};color:#69caff;font-size:12px;line-height:1.5;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;margin-bottom:15px">STUDIO FLOW &amp; SYSTEMS</div><h1 class="mobile-heading" style="margin:0;${font};color:#ffffff;font-size:36px;line-height:1.15;font-weight:800;letter-spacing:-1px;text-transform:uppercase">YOUR BUSINESS.<br><span style="color:#39b8ff">LESS COMPLEXITY.</span></h1><p style="margin:18px auto 0 auto;max-width:500px;${font};color:#8caac0;font-size:14px;line-height:1.7">Intelligent systems. Practical AI. More time for what matters.</p></td></tr>
<tr><td style="padding:14px 42px 0 42px"><div style="height:1px;background-color:#17476a;font-size:0;line-height:0">&nbsp;</div></td></tr>
<tr><td class="mobile-padding mobile-copy" style="padding:32px 42px 30px 42px;text-align:left"><div style="${font};color:#5ec8ff;font-size:10px;line-height:1.5;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;margin-bottom:20px">${K.label}</div>${paras}${close}</td></tr>
<tr><td class="mobile-padding" style="padding:0 28px 30px 28px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#04101d;border:1px solid #17476a;border-radius:10px;border-collapse:separate"><tr><td align="center" style="padding:30px 24px">
<div style="${font};color:#5ec8ff;font-size:10px;line-height:1.5;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:13px">LET'S EXPLORE THE OPPORTUNITY</div>
<h2 style="margin:0;${font};color:#ffffff;font-size:25px;line-height:1.3;font-weight:800">What could smarter systems free up for your team?</h2>
<p style="margin:16px auto 24px auto;max-width:480px;${font};color:#9eb4c6;font-size:14px;line-height:1.8">If you'd like to explore whether there's a worthwhile AI or automation opportunity for your business, you're welcome to book a free 30-minute conversation.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" bgcolor="#169ee8" style="background-color:#169ee8;border-radius:7px"><a class="mobile-button" href="${FREE_CALL2}" target="_blank" style="display:inline-block;padding:17px 27px;${font};color:#ffffff;background-color:#169ee8;text-decoration:none;font-size:12px;line-height:1.5;font-weight:800;letter-spacing:1px;text-transform:uppercase;border-radius:7px">BOOK A FREE 30-MINUTE CALL &#8594;</a></td></tr></table>
<p style="margin:18px 0 0 0;${font};color:#7f9bb0;font-size:12px;line-height:1.7">Prefer email? Simply reply and I'll get back to you.</p>
</td></tr></table></td></tr>
<tr><td class="mobile-padding" style="padding:6px 42px 36px 42px"><p style="margin:0;${font};color:#ffffff;font-size:15px;line-height:1.7;font-weight:700">Ty Brazel</p><p style="margin:3px 0 0 0;${font};color:#6dcaff;font-size:12px;line-height:1.7;font-weight:700">Founder | Studio Flow &amp; Systems</p><p style="margin:12px 0 0 0;${font};color:#637d92;font-size:12px;line-height:1.7;font-style:italic">Your magic deserves structure.</p></td></tr>
<tr><td align="center" style="padding:30px 25px;background-color:#030b15;border-top:1px solid #12324d;${font}"><img src="${SF_EMAIL_LOGO}" width="190" alt="Studio Flow &amp; Systems" style="display:block;width:100%;max-width:190px;height:auto;margin:0 auto 19px auto;border:0;color:#9fc7e6;font-size:14px">
<p style="margin:0 0 18px 0;color:#5e788d;font-size:10px;line-height:1.7;letter-spacing:1px;text-transform:uppercase">DIGITAL INFRASTRUCTURE FOR BUSINESSES READY TO SCALE</p>
<p style="margin:0;color:#72cbff;font-size:12px;line-height:2"><a href="https://www.studioflowandsystems.com/" target="_blank" style="color:#72cbff;text-decoration:none">Website</a> &nbsp;&nbsp;&#8226;&nbsp;&nbsp; <a href="https://www.instagram.com/studioflowandsystems/" target="_blank" style="color:#72cbff;text-decoration:none">Instagram</a> &nbsp;&nbsp;&#8226;&nbsp;&nbsp; <a href="https://www.linkedin.com/in/studioflowandsystems/" target="_blank" style="color:#72cbff;text-decoration:none">LinkedIn</a></p>
<p style="margin:22px 0 0 0;color:#607b91;font-size:11px;line-height:1.8">Studio Flow &amp; Systems<br>Business Systems &bull; AI &bull; Automation</p><p style="margin:10px 0 0 0;color:#526b80;font-size:11px;line-height:1.8">Brisbane, Australia</p>
${why}
<p style="margin:16px 0 0 0;color:#425b70;font-size:10px;line-height:1.7">&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Studio Flow &amp; Systems. All rights reserved.</p>
</td></tr></table></td></tr></table></body></html>`;
}
