const { askGemini } = require('../gemini');

async function runFinancingAgent(shop, profileResult, clusterResult, ownerContext) {
  const clusterContext = clusterResult && clusterResult.cluster_used
    ? `This shop is new, but cluster-based trust applies: ${clusterResult.cluster_explanation}`
    : `This shop has its own independent history — no cluster trust needed.`;

   const prompt = `
You are a lending recommendation engine for MPPL (Meesho's lending arm). You do NOT approve loans directly — you generate a recommendation that MPPL's NBFC partner will review and approve.

Shop: ${shop.name}, located in ${shop.location}
Trust score: ${profileResult.trust_score}/100 (${profileResult.trust_status})
Trust reason: ${profileResult.trust_reason}
${clusterContext}

Rules for loan sizing (these are realistic for small Bharat kirana shops — do not exceed these ranges):
- Trust score 0-25 (new/risky): ₹3,000 - ₹8,000, tenure 4 weeks, interest 21-24%
- Trust score 26-50: ₹8,000 - ₹15,000, tenure 5-6 weeks, interest 16-20%
- Trust score 51-75: ₹15,000 - ₹30,000, tenure 6 weeks, interest 12-15%
- Trust score 76-100: ₹30,000 - ₹50,000, tenure 6-8 weeks, interest 12%

CRITICAL RULE: The absolute maximum credit headroom for this shop owner is ₹${ownerContext.exposure_remaining}.
You MUST NOT recommend a loan_amount greater than ₹${ownerContext.exposure_remaining}, even if their trust score puts them in a higher bracket. If their bracket recommends more, you must mathematically cap it at ₹${ownerContext.exposure_remaining}.

Pick a specific realistic number within the correct range based on the score, not just the range boundary.

Respond ONLY in this exact JSON format, no markdown, no backticks, no extra text:
{
  "loan_amount": <number>,
  "loan_tenure": "<e.g. '6 weeks'>",
  "loan_tier": <number representing the APR interest rate>
}
`;

  const rawResponse = await askGemini(prompt);
  const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    
    // Safety check: ensure the AI actually followed the rule
    if (parsed.loan_amount > ownerContext.exposure_remaining) {
       parsed.loan_amount = ownerContext.exposure_remaining;
    }
    
    return parsed;
  } catch (err) {
    console.error('Failed to parse Gemini response:', rawResponse);
    throw new Error('Financing Agent returned invalid JSON');
  }
}

module.exports = { runFinancingAgent };