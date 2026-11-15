# v73 software updates: move off OpenAI models that are switched off or being switched off.
# - gpt-image-1 was shut down on 23 Oct 2026  -> gpt-image-2.6-flare, then gpt-image-2.5-flare
# - gpt-4o-mini-transcribe shuts down 26 Feb 2027 -> gpt-transcribe (override with the TRANSCRIBE_MODEL variable)
# - gpt-4o-mini-tts (Telegram voice notes) shuts down 6 Jan 2027 -> falls back to gpt-audio-1.5 automatically when it fails
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

rep('var WSD_IMG_MODELS = ["gpt-image-2.5-flare", "gpt-image-1"];', 'var WSD_IMG_MODELS = ["gpt-image-2.6-flare", "gpt-image-2.5-flare"];')

n1 = s.count('"gpt-4o-mini-transcribe"'); n2 = s.count("'gpt-4o-mini-transcribe'")
assert n1 + n2 == 5, (n1, n2)
s = s.replace('"gpt-4o-mini-transcribe"', '(globalThis.__SF_TRANSCRIBE || "gpt-transcribe")')
s = s.replace("'gpt-4o-mini-transcribe'", "(globalThis.__SF_TRANSCRIBE||'gpt-transcribe')")
rep('''  async fetch(request, env, ctx) {
    if (await sfRateLimited(request)''', '''  async fetch(request, env, ctx) {
    globalThis.__SF_TRANSCRIBE = env.TRANSCRIBE_MODEL || "";
    if (await sfRateLimited(request)''')

rep('''  if (!r.ok) throw new Error("Voice generation failed (HTTP " + r.status + ").");
  return await r.arrayBuffer();
}''', '''  if (!r.ok) {
    // gpt-4o-mini-tts is switched off on 6 Jan 2027: fall back to gpt-audio-1.5, which speaks through Chat Completions.
    const a = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: "Bearer " + env.OPENAI_API_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ model: env.TTS_FALLBACK_MODEL || "gpt-audio-1.5", modalities: ["text", "audio"], audio: { voice: voice || "marin", format: "opus" }, messages: [{ role: "system", content: "Read the user's text aloud exactly as written, word for word. Add nothing." + (instructions ? " Delivery: " + String(instructions).slice(0, 500) : "") }, { role: "user", content: String(text).slice(0, 4000) }] }), signal: AbortSignal.timeout(6e4) }).catch(() => null);
    const j = a && a.ok ? await a.json().catch(() => null) : null;
    const b64 = j?.choices?.[0]?.message?.audio?.data;
    if (!b64) throw new Error("Voice generation failed (HTTP " + r.status + ").");
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
  }
  return await r.arrayBuffer();
}''')

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v73 applied')
