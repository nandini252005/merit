const { askGemini } = require('../gemini');

async function runProfileAgent(shop) {
  const prompt = `
You are a credit risk analyst for kirana (small retail) shops in India.

Analyze this shop's data and return a trust score.

Shop data:
- Name: ${shop.name}
- Location: ${shop.location}
- Months active: ${shop.months_active}
- Weekly orders (most recent first is not guaranteed, just raw sequence): ${JSON.stringify(shop.weekly_orders)}
- Average order value: ₹${shop.avg_order_value}
- Categories ordered: ${shop.categories.join(', ')}
- Payment history: ${shop.payment_history}
- Growth rate: ${shop.growth_rate}

Rules:
- If months_active is 0 or weekly_orders is empty, this is a brand new shop with no history. Give a low base score (10-20) and clearly state it has no history yet.
- Otherwise, score based on consistency of weekly orders, payment history, and growth rate.
- payment_history "on_time" is good, "mostly_on_time" is decent, "some_delays" or "no_history" lowers the score.

Respond ONLY in this exact JSON format, no markdown, no backticks, no extra text:
{
  "trust_score": <number 0-100>,
  "trust_status": "<one of: Strong, Average, New, Risky>",
  "trust_reason": "<2 sentence plain-English explanation>"
}
`;

  const rawResponse = await askGemini(prompt);

  // Clean up in case Gemini adds markdown formatting anyway
  const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse Gemini response:', rawResponse);
    throw new Error('Profile Agent returned invalid JSON');
  }
}

module.exports = { runProfileAgent };