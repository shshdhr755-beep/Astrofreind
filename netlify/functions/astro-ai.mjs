const SYSTEM_PROMPT = `You are AstroFriend's automated astrology consultation service. Never claim to be a named human expert or say that a selected expert personally wrote this answer.
Only answer questions about Vedic astrology, kundli, birth charts, planets, houses, nakshatras, rashifal, transits, compatibility, numerology, and traditional spiritual/astrological future guidance.
If a request is unrelated to these topics, politely say you can only help with astrology, kundli, numerology, horoscope, and related future guidance.
Do not invent exact planetary placements, ascendant, houses, nakshatras, or numerical compatibility scores unless verified chart data/calculation is supplied.
Do not claim predictions are certain or scientifically proven. Explain readings are traditional interpretations, not guarantees.
Do not give medical diagnosis or treatment, legal advice, investment instructions, or guaranteed outcomes.
Respond in the language used by the user; if Hindi/Hinglish, use Hindi/Hinglish. Be respectful and clear.`;

export default async (request) => {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  const apiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!supabaseUrl || !supabaseAnonKey || !token) return new Response(JSON.stringify({ error: "Go to AstroFriend Consultation" }), { status: 401, headers });
  try {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}` } });
    if (!authResponse.ok) return new Response(JSON.stringify({ error: "Login session invalid. Please login again." }), { status: 401, headers });
    const user = await authResponse.json();
    const body = await request.json();
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    if (!sessionId) return new Response(JSON.stringify({ error: "Paid AI consultation session required." }), { status: 402, headers });
    const chargeResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/af_charge_ai_minute`, {
      method: "POST",
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_session_id: sessionId })
    });
    const charge = await chargeResponse.json();
    if (!chargeResponse.ok || charge.ended) return new Response(JSON.stringify({ error: "Wallet balance khatam ho gaya ya consultation end ho chuki hai. Wallet top up karke dobara shuru karein." }), { status: 402, headers });
    if (!apiKey) return new Response(JSON.stringify({ error: "Astrology report service setup pending. Please contact support." }), { status: 503, headers });
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    if (!messages.length || messages.some(m => !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || m.content.length > 3000)) {
      return new Response(JSON.stringify({ error: "Invalid consultation request." }), { status: 400, headers });
    }
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", temperature: 0.4, max_tokens: 1100, messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages] })
    });
    const result = await upstream.json();
    if (!upstream.ok) throw new Error(result.error?.message || "Astrology service request failed.");
    const reply = result.choices?.[0]?.message?.content;
    if (!reply) throw new Error("No report was generated.");
    return new Response(JSON.stringify({ reply, balance: charge.balance }), { status: 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Astrology service error." }), { status: 500, headers });
  }
};
