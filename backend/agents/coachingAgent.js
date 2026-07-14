const { askGemini } = require('../gemini');

async function runCoachingAgent(shop, profileResult, financingResult) {
  const prompt = `
You are a friendly business coach for kirana (small retail) shop owners in India. Your tone is warm, simple, and encouraging — not corporate or technical. The shop owner may not be highly educated, so avoid jargon.

Shop: ${shop.name}, located in ${shop.location}
Months active: ${shop.months_active}
Categories ordered: ${shop.categories.join(', ')}
Trust score: ${profileResult.trust_score}/100 (${profileResult.trust_status})
Trust reason: ${profileResult.trust_reason}
Current loan offer: ₹${financingResult.loan_amount}, ${financingResult.loan_tenure}, ${financingResult.loan_tier} interest tier

Write 2-3 short, plain-language sentences of practical advice on what this shop owner could do to improve their trust score and get a better loan offer next time. Be specific where possible (e.g. mention ordering more consistently, adding new categories, maintaining on-time payments) based on their actual data above. Keep it encouraging, not critical.

Respond ONLY in this exact JSON format, no markdown, no backticks, no extra text:
{
  "coaching_message": "<2-3 sentences>"
}
`;

  const rawResponse = await askGemini(prompt);
  const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse Gemini response:', rawResponse);
    throw new Error('Coaching Agent returned invalid JSON');
  }
}

module.exports = { runCoachingAgent };