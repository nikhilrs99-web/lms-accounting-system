import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const rows = await req.json();
    if (!rows || rows.length === 0) return NextResponse.json({ errors: [] });

    const errors: Record<string, string> = {};

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // If no API key is provided, safely return empty errors rather than mocking hardcoded logic.
      return NextResponse.json({ errors });
    }

    // --- GEMINI API INTEGRATION ---
    const requestUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const prompt = `You are a strict Core Banking System expert. Analyze this JSON array of accounting entries. Find ANY entries violating these rules: 
    1. Total Debits (Dr_Cr='D') and Credits (Dr_Cr='C') for the same ActivityID must equal exactly 0. If they don't, ALL rows for that ActivityID are invalid.
    2. 'Amount' must never be negative.
    3. 'GLMnemonic' must not be empty.
    4. Flag illogical 'AcctgDate' or 'ValueDate' timelines for Accruals (e.g., month-end schedule -1 rules).
    Return ONLY a raw JSON object mapping "PopulateID" to "Reason String". Ensure property names are strictly JSON compatible. If no errors, output exactly {}. Do not use Markdown format.`;

    const payload = {
      contents: [{ parts: [{ text: prompt + "\n\nPayload:\n" + JSON.stringify(rows) }] }]
    };

    const response = await fetch(requestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      text = text.trim();
      if (text.startsWith("```json")) text = text.substring(7);
      if (text.startsWith("```")) text = text.substring(3);
      if (text.endsWith("```")) text = text.substring(0, text.length - 3);

      const aiErrors = JSON.parse(text);
      return NextResponse.json({ errors: aiErrors });
    }

    // Fallback on HTTP error
    return NextResponse.json({ errors });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
