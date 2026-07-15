const { askGemini } = require('../gemini');

async function runProfileAgent(shop, currentScore = null) {
  const historyContext = currentScore !== null
    ? `\nIMPORTANT: This shop has an existing trust score of ${currentScore}/100 based on actual loan repayment history (missed/on-time payments). This is the most reliable signal available — weight it heavily. Only adjust slightly (within ±5 points) based on the order data below; do not ignore or override it with a fresh score derived only from order history.`
    : '';

  const prompt = `
You are a credit risk analyst for kirana (small retail) shops in India.

Analyze this shop's data and return a trust score.

Shop data:
- Name: ${shop.name}
- Location: ${shop.location}
- Months active: ${shop.months_active}
- Weekly orders: ${JSON.stringify(shop.weekly_orders)}
- Average order value: ₹${shop.avg_order_value}
- Categories ordered: ${shop.categories.join(', ')}
- Payment history: ${shop.payment_history}
- Growth rate: ${shop.growth_rate}
${historyContext}

Rules:
- If months_active is 0 or weekly_orders is empty AND no existing trust score was given above, this is a brand new shop with no history. Give a low base score (10-20).
- If months_active is 1-6 with decent but not perfect indicators, score in the 35-55 range.
- If months_active is 6+ with consistent orders and on-time payments, score in the 55-75 range.
- Only exceed 75 for shops with 10+ months, perfect payment history, and strong growth — and even then, stay at or below 82.

Respond ONLY in this exact JSON format, no markdown, no backticks, no extra text:
{
  "trust_score": <number 0-100>,
  "trust_status": "<one of: Strong, Average, New, Risky>",
  "trust_reason": "<2 sentence plain-English explanation>"
}
`;

  const rawResponse = await askGemini(prompt);
  const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse Gemini response:', rawResponse);
    throw new Error('Profile Agent returned invalid JSON');
  }
}

module.exports = { runProfileAgent };