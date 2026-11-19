const SYSTEM_PROMPT = `You are AstroFriend AI, a focused astrology and numerology assistant.
Only answer questions about Vedic astrology, kundli, birth charts, planets, houses, nakshatras, rashifal, transits, compatibility, numerology, and traditional spiritual/astrological future guidance.
If a request is unrelated to these topics, politely say you can only help with astrology, kundli, numerology, horoscope, and related future guidance.
Do not claim predictions are certain or scientifically proven. Explain that readings are traditional interpretations and should be treated as guidance/entertainment, not guarantees.
Never invent a complete kundli calculation when required birth date, exact birth time, and birth place are missing. Ask for missing birth details when needed.
Do not give medical diagnosis or treatment, legal advice, investment instructions, or guaranteed outcomes. If the user asks about health, money, or legal matters through astrology, give a brief safety-minded boundary and redirect to an appropriate professional.
Respond in the language used by the user; if they write Hindi/Hinglish, respond in Hindi/Hinglish. Be respectful and concise.`;

export default async (request) => {
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "AI setup pending: Netlify environment variable OPENAI_API_KEY add karni hogi." }), { status: 503, headers: { "Content-Type": "application/json" } });
  try {
    const body = await request.json();
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    if (!messages.length || messages.some(m => !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || m.content.length > 3000)) {
      return new Response(JSON.stringify({ error: "Invalid chat messages." }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.5,
        max_tokens: 700,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages]
      })
    });
    const result = await upstream.json();
    if (!upstream.ok) throw new Error(result.error?.message || "AI provider request failed.");
    const reply = result.choices?.[0]?.message?.content;
    if (!reply) throw new Error("AI returned an empty response.");
    return new Response(JSON.stringify({ reply }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "AI service error." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
