const SYSTEM_PROMPT = `You are AstroFriend's automated astrology consultation service. Never claim to be a named human expert or say that a selected expert personally wrote this answer.
Only answer questions about Vedic astrology, kundli, birth charts, planets, houses, nakshatras, rashifal, transits, compatibility, numerology, and traditional spiritual/astrological future guidance.
If a request is unrelated to these topics, politely say you can only help with astrology, kundli, numerology, horoscope, and related future guidance.
For Basic Kundli, prepare a concise structured traditional reading. For Detailed Kundli, provide a fuller structured reading. For Kundli Matching, compare both supplied people's birth details and discuss traditional compatibility themes. For Daily Horoscope, use supplied birth details or ask for the zodiac sign if missing.
Do not invent exact planetary placements, ascendant, houses, nakshatras, or numerical compatibility scores unless verified chart data/calculation is supplied. If exact calculations are unavailable, clearly describe the response as a general traditional interpretation and do not fabricate placements.
Do not claim predictions are certain or scientifically proven. Explain readings are traditional interpretations, not guarantees.
Do not give medical diagnosis or treatment, legal advice, investment instructions, or guaranteed outcomes.
Respond in the language used by the user; if Hindi/Hinglish, use Hindi/Hinglish. Be respectful and clear.`;

export default async (request) => {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "Astrology report service setup pending. Please contact support." }), { status: 503, headers });
  try {
    const body = await request.json();
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    if (!messages.length || messages.some(m => !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || m.content.length > 3000)) {
      return new Response(JSON.stringify({ error: "Invalid consultation request." }), { status: 400, headers });
    }
    const service = typeof body.service === "string" ? body.service.slice(0, 100) : "Astrology Consultation";
    const expertName = typeof body.expertName === "string" ? body.expertName.slice(0, 100) : "";
    const birthDetails = body.birthDetails && typeof body.birthDetails === "object" ? JSON.stringify(body.birthDetails).slice(0, 2000) : "Not supplied";
    const context = `Selected service: ${service}. Selected profile for booking context only: ${expertName || "Not specified"}. Do not impersonate this person. Customer birth details: ${birthDetails}.`;
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 1100,
        messages: [{ role: "system", content: SYSTEM_PROMPT + "\n\n" + context }, ...messages]
      })
    });
    const result = await upstream.json();
    if (!upstream.ok) throw new Error(result.error?.message || "Astrology service request failed.");
    const reply = result.choices?.[0]?.message?.content;
    if (!reply) throw new Error("No report was generated.");
    return new Response(JSON.stringify({ reply }), { status: 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Astrology service error." }), { status: 500, headers });
  }
};
