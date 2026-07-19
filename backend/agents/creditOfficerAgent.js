const { askGemini } = require('../gemini');

async function runCreditOfficerAgent(loan, shop, ownerContext) {
  const prompt = `
You are a Senior Credit Officer at MPPL (Meesho's lending arm).
Your job is to evaluate a pending loan application and recommend whether to Approve or Reject it.

Loan Details:
- Amount Requested: ₹${loan.amount}
- Tenure: ${loan.tenure_weeks} weeks
- Interest Tier: ${loan.interest_tier}% APR

Shop Details:
- Name: ${shop.name}
- Months Active: ${shop.months_active}
- Avg Order Value: ₹${shop.avg_order_value}

Owner Portfolio Context:
- Owner ID: ${shop.owner_id}
- Total Shops Owned: ${ownerContext.shop_ids.length}
- Blended Portfolio Trust Score: ${ownerContext.blended_score}/100
- Total Missed Payments Across All Shops: ${ownerContext.total_missed_payments}

Rules:
1. Base your decision heavily on the Owner Portfolio Context. If the owner has a high blended score (>60) and 0 missed payments, confidently recommend Approve.
2. If the owner has a low blended score (<40) or multiple missed payments, heavily lean towards Reject to protect MPPL from systemic risk, unless the loan is very small (<₹5000).
3. If they are somewhere in between, evaluate the shop's individual metrics.

Respond ONLY in this exact JSON format, no markdown, no backticks, no extra text:
{
  "recommendation": "<Approve or Reject>",
  "confidence": "<High, Medium, or Low>",
  "reasoning": "<2-3 sentences explaining your decision, explicitly citing their portfolio health and blended score>"
}
`;

  const rawResponse = await askGemini(prompt);
  const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse Credit Officer Agent response:', rawResponse);
    throw new Error('Credit Officer Agent returned invalid JSON');
  }
}

module.exports = { runCreditOfficerAgent };