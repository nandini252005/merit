const { askGemini } = require('../gemini');

async function runProfileAgent(shop, currentScore = null, ownerContext = null) {
  // We make the history context extremely explicit and unmissable
  const historyContext = currentScore !== null
    ? `\n[CRITICAL] LOAN REPAYMENT HISTORY: This shop has an existing trust score of ${currentScore}/100 derived from actual, proven loan repayment behavior on our platform. THIS IS YOUR PRIMARY SIGNAL.`
    : `\n[CRITICAL] LOAN REPAYMENT HISTORY: None. This shop is applying for the first time. Rely entirely on the shop operating data.`;

  const ownerContextText = ownerContext && ownerContext.shop_ids.length > 1
    ? `\n[ADDITIONAL CONTEXT] PORTFOLIO: This shop's owner operates ${ownerContext.shop_ids.length} shops total, with a blended portfolio trust score of ${ownerContext.blended_score}/100. Use this to slightly adjust confidence.`
    : '';

  const prompt = `
You are a senior credit risk analyst for kirana (small retail) shops in India.
Your task is to analyze the shop's data and output a realistic trust score (0-100).

${historyContext}
${ownerContextText}

Shop operating data:
- Name: ${shop.name}
- Location: ${shop.location}
- Months active on platform: ${shop.months_active}
- Weekly orders: ${JSON.stringify(shop.weekly_orders)}
- Average order value: ₹${shop.avg_order_value}
- Categories ordered: ${shop.categories.join(', ')}
- Order payment history: ${shop.payment_history}
- Growth rate: ${shop.growth_rate}

Strict Evaluation Rules:
1. SCENARIO A: IF AN EXISTING TRUST SCORE IS PROVIDED: 
   - You MUST base your final score on the existing score (return exactly the existing score, or add +1 to +5 if their recent operating data is exceptionally strong).
   - You MUST NOT lower the score just because they have low months_active or low weekly orders. Real repayment history overrides weak platform history.
   - The "trust_reason" MUST explicitly praise their proven loan repayment track record. You are strictly forbidden from saying they have "no transaction history".

2. SCENARIO B: IF NO EXISTING SCORE AND SHOP IS BRAND NEW (0 months active, no orders):
   - Give a low base score (10-25).
   - The "trust_reason" should state they are new and lack operating history.

3. SCENARIO C: IF NO EXISTING SCORE BUT SHOP IS ESTABLISHED:
   - 1-6 months active with average indicators: Score 35-55.
   - 6+ months active with consistent orders/payments: Score 55-75.
   - 10+ months with flawless history and strong growth: Score 76-85.
   - The "trust_reason" should evaluate their order consistency, categories, and growth rate.

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
    const parsed = JSON.parse(cleaned);
    parsed.trust_score = Math.max(0, Math.min(100, Math.round(parsed.trust_score)));
    return parsed;
  } catch (err) {
    console.error('Failed to parse Gemini response:', rawResponse);
    throw new Error('Profile Agent returned invalid JSON');
  }
}

module.exports = { runProfileAgent };