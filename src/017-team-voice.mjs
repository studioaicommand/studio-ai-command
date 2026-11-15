// src/team/voice.js
function realtimeInput(env, extra = {}) {
  const interrupt = String(env.VOICE_INTERRUPT || "on").toLowerCase() !== "off";
  const turn = String(env.VOICE_TURN || "semantic").toLowerCase() === "server" ? { type: "server_vad", threshold: 0.75, prefix_padding_ms: 400, silence_duration_ms: 800, create_response: true, interrupt_response: interrupt } : { type: "semantic_vad", eagerness: ["low", "medium", "high", "auto"].includes(env.VOICE_EAGERNESS) ? env.VOICE_EAGERNESS : "low", create_response: true, interrupt_response: interrupt };
  const noise = String(env.VOICE_NOISE || "far_field").toLowerCase();
  return { ...extra, turn_detection: turn, ...noise === "off" ? {} : { noise_reduction: { type: noise === "near_field" ? "near_field" : "far_field" } } };
}

