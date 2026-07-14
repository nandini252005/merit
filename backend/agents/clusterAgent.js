const { askGemini } = require('../gemini');

async function runClusterAgent(shop, allShops) {
  // Find shops in the same location, excluding the new shop itself, that have real history
  const nearbyShops = allShops.filter(
    s => s.location === shop.location && s.shop_id !== shop.shop_id && s.months_active > 0
  );

  if (nearbyShops.length === 0) {
    return {
      cluster_used: false,
      cluster_explanation: "No comparable shops found nearby to base a cluster trust estimate on."
    };
  }

  const prompt = `
You are a credit risk analyst. A brand new kirana shop has no order history yet, so we want to estimate a fair "starter" trust level based on nearby shops in the same area — this is called cluster-based trust.

New shop: ${shop.name}, located in ${shop.location}.

Nearby shops in the same location with established history:
${nearbyShops.map(s => `- ${s.name}: ${s.months_active} months active, payment history: ${s.payment_history}, growth rate: ${s.growth_rate}`).join('\n')}

Based on how these nearby shops are performing, explain in 2 plain-English sentences why a modest starter trust/credit line is reasonable for the new shop, referencing the nearby shops' performance without guaranteeing anything.

Respond ONLY in this exact JSON format, no markdown, no backticks, no extra text:
{
  "cluster_used": true,
  "cluster_explanation": "<2 sentence explanation>"
}
`;

  const rawResponse = await askGemini(prompt);
  const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse Gemini response:', rawResponse);
    throw new Error('Cluster Agent returned invalid JSON');
  }
}

module.exports = { runClusterAgent };