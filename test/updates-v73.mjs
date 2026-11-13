// v73: no OpenAI model that has been or is about to be switched off. Every swap can be overridden from Cloudflare variables.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(!/"gpt-image-1"/.test(src) && /WSD_IMG_MODELS = \["gpt-image-2\.6-flare", "gpt-image-2\.5-flare"\]/.test(src), "Website demo photos use current image models (gpt-image-1 was shut down 23 Oct 2026)");
assert(!/["']gpt-4o-mini-transcribe["']/.test(src) && (src.match(/__SF_TRANSCRIBE/g) || []).length >= 6, "Voice transcription moved to gpt-transcribe, switchable with TRANSCRIBE_MODEL (old model shuts down 26 Feb 2027)");
assert(/gpt-audio-1\.5/.test(src) && /format: "opus"/.test(src), "Telegram voice notes fall back to gpt-audio-1.5 when gpt-4o-mini-tts is switched off (6 Jan 2027)");
assert(!/claude-(3|4|sonnet-4|opus-4|haiku-4)[-.]/.test(src), "No retired Claude models");
const w = (await import(W)).default;
globalThis.fetch = async () => Response.json([]);
await w.fetch(new Request("https://studioflowandsystems.app/health"), { TRANSCRIBE_MODEL: "gpt-live-transcribe" }, { waitUntil() {} });
assert(globalThis.__SF_TRANSCRIBE === "gpt-live-transcribe", "The TRANSCRIBE_MODEL variable switches the transcription model without a new build");
console.log("updates-v73 OK");
