const { askGemini } = require('../gemini');

async function runSellThroughAgent(shop, trustScore, tenureWeeks) {
  const prompt = `
You are simulating realistic weekly sell-through data for a kirana shop in India, for use in a loan repayment model. Sell-through % means what portion of restocked inventory the shop actually sold that week.

Shop: ${shop.name}, trust score ${trustScore}/100, ${shop.months_active} months active, categories: ${shop.categories.join(', ')}.

Generate exactly ${tenureWeeks} weekly sell-through percentages (each a whole number between 30 and 100).

Rules:
- Higher trust score shops should show higher, steadier sell-through (mostly 70-95%), reflecting reliable real-world sales.
- Lower trust score shops should show more volatile, sometimes lower sell-through (30-80%), reflecting inconsistent real-world sales.
- Include natural week-to-week variation — no two consecutive weeks should be identical.
- This must feel like plausible real retail data, not a smooth pattern.

Respond ONLY in this exact JSON format, no markdown, no backticks, no extra text:
{
  "weekly_sell_through": [<exactly ${tenureWeeks} whole numbers>]
}
`;

  const rawResponse = await askGemini(prompt);
  const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    // Safety: clamp every value and enforce correct array length regardless of what Gemini returns
    let values = Array.isArray(parsed.weekly_sell_through) ? parsed.weekly_sell_through : [];
    values = values.map(v => Math.max(20, Math.min(100, Math.round(v))));
    while (values.length < tenureWeeks) values.push(70); // pad if short
    values = values.slice(0, tenureWeeks); // trim if long
    return { weekly_sell_through: values };
  } catch (err) {
    console.error('Failed to parse Sell-Through Agent response:', rawResponse);
    // Safe fallback so approval never breaks even if Gemini output is malformed
    return { weekly_sell_through: Array(tenureWeeks).fill(70) };
  }
}

module.exports = { runSellThroughAgent };