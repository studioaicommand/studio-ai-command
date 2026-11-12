# Studio AI Intelligence: build status (11 Nov 2026)

## Where we are (12 Nov 2026)
- **v58: designer 2.** In the repo, tests pass; Ty deploys it with Deploy Command.
  - **Photos always show.** Prospect photos are served through `/demo/img/p/<token>/<hash>`, fetched with their site as the referrer, and cached at the edge. Only photos in that demo are served. This fixes the blank gradient boxes caused by sites blocking hotlinking.
  - **AI images.** `wsdImagesFix` runs on every build. It drops photos that are blocked or tiny (under 14KB), then generates up to 4 on-brand photos with OpenAI `gpt-image-2.5-flare` (env `WSD_IMAGE_MODEL` overrides; falls back to `gpt-image-1`). Settings: 1536x1024, medium quality, webp. They're stored as team_settings `wsdimg:<id>` and served from `/demo/img/<id>.webp`. Usage is logged as `demo_images`. The demo banner says some photos are AI concept images. The designer can ask for specific shots with `gen_images`.
  - **Design DNA.** `spec.dna` sets corners, cards, image shape, section bands, headings, buttons and texture. It's picked so it never matches the last 4 demos.
  - **7 new moments.** Zoom-through hero, big-type list, panels, flip cards, circle reveal, expand and compare (before/after). These are added to the signature rotation.
  - **Spacing.** Section padding is roughly halved, and pinned sections are shorter.
  - **getSettings** now skips `wsd*:*` keys (demo pages and images), with a fallback to the full query.
- **v57: instant approvals and a single daily email number.** It's in the repo and the tests pass. Ty deploys it with Deploy Command.
  - **Telegram Approve/Reject:**
    - The button answers straight away.
    - The buttons are removed so they can't be tapped twice, and the card shows "Approving…".
    - The approval runs straight away instead of waiting in the queue. The atomic job claim means the queue can't run it twice.
  - **Campaign enrolment limit:** it's the higher of the outreach warm-up capacity and the campaign daily_cap. The cap is now editable as "Minimum emails per day" in Outreach settings (5 to 200, default 25).
  - **Held approvals:** emails Ty approved that the limit held back keep `result.approved` and send themselves between 7am and 7pm (every 15 minutes, up to 12 per tick). Approvals shows "Approved. Waiting for room…".
  - Code: `v57-team.js` and `patch-v57.py`. Test: `test/approvals-v57.mjs`.
- **v56 (email tracking) is in the repo.** The GHL workflow "SF | Command | Email Events -> Command" posts opened/clicked/bounced/unsubscribed/complained events to the inbox webhook with `event=email_*`. They're counted in team_settings `email_stats` (unique per person per day). Bounces are tagged `email-bounced` + `hold-do-not-send`, and unsubscribes and complaints get `outreach-opted-out`. The counts appear in the snapshot and the morning brief. Code: `v56-team.js`, `patch-v56.py`. Test: `test/email-events-v56.mjs`. GHL has no "delivered" event.
- **Tests now really run in CI.** `schema/strict.mjs` needs `/tmp/claude-0/cols.txt`, and CI never created it, so every test crashed and was counted as a pass. `scripts/schema-cols.py` now builds it from `schema/*.sql`, and `test-all.sh` counts any non-zero exit as a failure. All 34 tests pass. The browser test was skipped locally and runs in CI.
- **Worker v55 (browser tasks)** is ready in 1 Deploy Now. It includes v40 to v54, and v54 has moved to Previous Versions.
- **v55: Command works Chrome on Ty's Mac.**
  - Command Link agent v2 is a Node + playwright-core@1.49.1 LaunchAgent. It runs a separate "Command Chrome" window with its own profile under ~/Library/Application Support/StudioCommandLink.
  - Each step:
    - The helper sends a screenshot, the numbered elements and the page text to `/api/v1/link/step`.
    - Claude (smart model) picks one `browser_action`.
    - The worker runs safety checks, then hands the action back.
  - **Safety:**
    - Pages are treated as untrusted data.
    - Passwords, codes and card or ID fields are never typed. Those, logins and CAPTCHAs go to Ty as "needs you", with a Continue button.
    - Clicks that send, submit, pay, book or delete, a bare Enter, and any action the model flags become a `browser_step` team_action. That sends an Approve card to Telegram and the Inbox, showing what was filled in on the page.
    - Limits: one task at a time, 40 actions, a 60-minute approval wait and a 20-minute "needs you" wait.
  - **Tools:**
    - `browser_task` and `browser_task_status` (stop / continue) are owner-only.
    - Settings has a Browser tasks card.
    - The UI and the app runtime use the routes `/browser`, `/browser/stop` and `/browser/continue`.
  - Test: `test/browser-v55.mjs`. It runs end to end: the real agent drives headless Chromium on a test site.
- **GitHub (live since 12 Nov 2026):**
  - Private repo: github.com/studioaicommand/studio-ai-command.
  - The **Test** workflow runs every test on every push, including the real-browser test of browser tasks.
  - To deploy: Actions › **Deploy Command** › Run workflow › type DEPLOY. It builds and tests, backs up the live worker, uploads the code only (bindings and secrets stay), checks the live APP etag (weak `W/` etags are handled) and health, and rolls back automatically.
  - The first deploy was a false alarm on the weak etag. It rolled back safely and the check is now fixed. The second run was green.
  - The secrets CLOUDFLARE_API_TOKEN (Edit Workers template, expires about Nov 2027) and CLOUDFLARE_ACCOUNT_ID are in the repo.
  - Workflow from now on: Claude pushes each version, and Ty clicks Deploy Command. No more pasting into Cloudflare.
- **v54 (Jarvis + Command Link)** is included in v55.
- **v54:**
  - The Cedar voice is listed as "Jarvis (Cedar)". Picking Jarvis style switches the Command voice to it.
  - **Command Link:** Settings › Brand & features. Ty pastes a one-time Terminal line (expires after 15 minutes).
    - It installs a LaunchAgent (`app.studioflowandsystems.link`) that checks `/api/v1/link/next` every 4 seconds with its own token.
    - It opens http/https pages in Chrome. It can't do anything else.
  - Command opens pages there with `show_on_screen` + `open_in_chrome`, from voice, chat or Telegram.
  - Queued pages expire after 2 minutes. The Mac counts as offline 90 seconds after its last check-in. Unlinking stops the helper.
  - Command chat now has `web_search` (max 3 per message) and handles pause_turn.
  - Code: `w/v54-*`, `w/patch-v54.py`. Test: `test/mac-link-v54.mjs`.
  - Not yet built: full Chrome control (click, type, fill) on Ty's Mac.
- v53 (Jarvis voice) is included in v54.
  - v52 (branded emails) is now in 4 Previous Versions › "v52 branded emails (included in v53)", along with its source, previews and deploy note.
  - v52 is part of the build (`w/patch-v52.py` wraps `patch-v52-email-src.py` + `email-brand-v52.js`). Rebuilding v52 reproduces the delivered file byte for byte.
- **v53: voice and personality, spoken briefings, Away mode** (studied from Luke Builds AI's "Azaris"/Jarvis-style assistant).
  - **Settings › Brand & features › Voice & personality:**
    - Pick one of 4 personalities: Jarvis style (calm, witty, British), Warm & friendly, High-energy coach, Calm executive.
    - Pick the Command voice and the default AI receptionist voice from 10 OpenAI voices. Cedar is recommended for Jarvis.
    - Turn on the morning briefing as a Telegram voice note.
    - Send yourself a test voice note.
  - **Where the personality applies:** Studio AI voice (realtime), Command chat and Telegram chat.
  - **Receptionist voices:** client and demo receptionists use the chosen voice, with optional per-client voices (`client_voices`).
  - **Spoken morning briefing:** a fast model turns the briefing into a script of 90–160 words. It's voiced with gpt-4o-mini-tts and sent with Telegram sendVoice (OGG/Opus).
  - **Away mode** (set a return time and a note):
    - Non-urgent Telegram messages are held in `away_digest`, and the morning voice note is skipped. Urgent messages still come through.
    - Command knows Ty is away and keeps client-facing and money actions in the approval queue.
    - After the return time (7am–9pm Brisbane), or when Ty taps "I'm back now", Command sends a welcome-back voice note. It covers booked calls vs the goal, jobs finished, approvals waiting and held messages, with a text fallback.
    - Today shows an Away banner.
  - The film's Jarvis voice can't be copied. This is a "Jarvis-style" persona on OpenAI voices. Voices on the 0495 phone line are set in GHL Voice AI.
  - Code: `w/v52-team.js`, `w/v52-ui.*`, `w/patch-v53.py`. Test: `test/voice-v52.mjs`.
- **v52: branded outreach emails.**
  - Every direct send now uses the dark SF OUTREACH design. It sits in `brandedEmail()`, and the old design is kept as `brandedEmailClassic`.
  - The env var `EMAIL_STYLE=classic` switches back.
- **Money plan:** the Claude Doc "Studio Flow: Fastest Path to Revenue" (https://claude.ai/artifact/QpzikGSAgiBDNMCYtyVU9m).
- **v51: Outreach design team**, in Growth › Website demos › Web Design Director.
  - 7 specialists: Creative Director, Brand Researcher, Conversion Strategist, Copy Chief, Mobile & Type QA, Local Proof Editor, Results Analyst.
  - Every concept goes through a critique panel on the fast model. It scores 5 areas out of 10 and makes up to 8 word-only fixes.
  - The team learns through peer lessons (max 20) and a weekly results retro (Monday 8am Brisbane).
- **v50:**
  - Full Company tier: 8 heads + 36 specialists = 44 agents.
  - Demo watcher.
  - No-show rebooker.
  - AI budget that grows with revenue.
  - Inbox filters hide when they're empty.
- **v49:**
  - Performance contracts.
  - Team Leader.
  - Today › Performance.
  - Core / Full Company plan switch.
  - Sharper lead gen.
- **v48.1 / v48:**
  - Designer type and spacing.
  - Streamlined Command.
  - 20-calls mission.
  - Scout.
  - Variety engine.
- **Website v18 (smooth scrolling):** live since 11 Nov.
- **Phone AI:** live on 0495 105 377.

## GHL sub-account upgrade (11 Nov 2026)
- **"SF: Front Desk + Sales Engine (v2)" folder:** 4 workflows, all in Draft. Ty publishes them.
  - **Missed-Call Text-Back:** texts back missed calls on 0495 105 377.
  - **No-Show Recovery:** overlaps with the v50 Command no-show rebooker, so run only one of them.
  - **Free Call -> Audit Follow-Up:** follows up after the free call with the $350 audit.
  - **Pipeline Auto-Stage + Values.**
- **Links:**
  - Free call: https://api.leadconnectorhq.com/widget/bookings/studioflowandsystemsfreebizcall
  - Audit: https://api.leadconnectorhq.com/widget/bookings/studio-flow-2-hour-business-audit
- **Open audit findings:**
  - 2 Google reviews averaging 3★, no review link set up and no review requests sent.
  - Outreach and client email share mail.studioflowandsystems.com.
  - 32+ tags have no category.
  - The free-call invite title is just {{contact.name}}.
  - The calendar "Follow-up" notification is off.
  - The SF OUTREACH | 01 button still says "15-minute call".

## Ty to do
1. Deploy worker v55 (it includes v54, v53 and v52). Then set up Command Link (Unlink and set up again if you linked on v54), log in to your tools in the Command Chrome window, and try a browser task.
2. Set up and test v53:
   - Settings › Brand & features › Voice & personality: choose Jarvis style + Cedar, then tap "Send me a voice test on Telegram".
   - Send yourself a test email from Command.
3. Publish the 4 GHL workflows, and choose GHL or Command for no-shows.
4. **Cash this week:**
   - Matty's receptionist (already paid $150).
   - Katia's demo.
   - School demos.
   - Past clients.
   - Referrals.
5. **Outreach:**
   - Buy the outreach domain, then warm it up in GHL.
   - Turn on Outreach today.
   - 40 cold calls a day.
6. Paste the 12 Web Design Director lessons.
7. GHL: add the Voice AI scopes and the post-call webhook.
8. Optional: add ANTHROPIC_ADMIN_KEY, then set the AI budget to about US$100.
9. Delete the SEAL_KEY text file from the Desktop.

## Next
- **One-click Command deploy** (started), "Deploy Command.command":
  - Backs up the live script.
  - Uploads the content only, so bindings and secrets are kept.
  - Health-checks the APP version, and rolls back if it fails.
- **Optimisations:**
  - Move data out of team_settings blobs.
  - Job queue.
  - App as static assets.
  - Workers AI cost router.
  - Telegram error alerts.
- **GHL:**
  - Review link and review requests.
  - Tag categories.
  - Invite titles.
  - "30-minute" wording.
- Stripe usage wallet.
- Concept video previews.
- Cloudflare for SaaS.

## Price book (AUD)
- **Receptionists:**
  - Chat: $497 pilot, then $297/mo.
  - Front Desk: $697 pilot, then $497/mo.
  - Phone AI: from about $697/mo.
- **Websites** (founding / normal, paid 50/50):
  - Launch: $3.5k / $4.9k.
  - Growth: $6.9k / $9.5k.
  - Signature: from $12k / $18k.
- **Care:** $149 / $249.
- **SEO:** from $690 / $990.
- **Audit:** $350.
- **Command:**
  - Core Team: $997–$1,497/mo.
  - Full Company: $2,497–$3,997+/mo.
  - Setup: $4.9k / $9.5k / $18k.
  - White-label: $7.5k.
- No prices in cold emails or demos.

## Infrastructure
- **Worker:** `studio-intelligence-core-cb9c` on https://studioflowandsystems.app.
  - Paste the file, check the last line is `};`, deploy, then Cmd+Shift+R.
- **Build:** `w/build-worker.py` (patches v21 to v55; run `bash scripts/test-all.sh`).
- **Tests:** 34 files, all passing (exclude local-backend.mjs). Use `--import /tmp/claude-0/noon.mjs` at night.
- **team_settings:** watch, coach, growth_goal, scout, voice_style, away_digest, mac_link, mac_link_queue, browser_task, outreach_daily, members, instance, fleet, support, wsd_*.
- **Website:** Pages project `studioflowandsystemswebsite`; source in `site-v14`.
