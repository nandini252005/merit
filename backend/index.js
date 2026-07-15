require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Health check route — just to confirm the server is alive
app.get('/', (req, res) => {
  res.json({ message: 'Merit backend is running' });
});

const shops = require('./shops.json');
const { runProfileAgent } = require('./agents/profileAgent');

// Test route: run Agent 1 on a specific shop by ID
app.get('/api/test/profile/:shopId', async (req, res) => {
  const shop = shops.find(s => s.shop_id === req.params.shopId);
  if (!shop) {
    return res.status(404).json({ error: 'Shop not found' });
  }

  try {
    const result = await runProfileAgent(shop);
    res.json({ shop: shop.name, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const { runClusterAgent } = require('./agents/clusterAgent');

app.get('/api/test/cluster/:shopId', async (req, res) => {
  const shop = shops.find(s => s.shop_id === req.params.shopId);
  if (!shop) {
    return res.status(404).json({ error: 'Shop not found' });
  }

  try {
    const result = await runClusterAgent(shop, shops);
    res.json({ shop: shop.name, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const { runFinancingAgent } = require('./agents/financingAgent');

app.get('/api/test/financing/:shopId', async (req, res) => {
  const shop = shops.find(s => s.shop_id === req.params.shopId);
  if (!shop) {
    return res.status(404).json({ error: 'Shop not found' });
  }

  try {
    const profileResult = await runProfileAgent(shop);
    const clusterResult = profileResult.trust_score <= 30
      ? await runClusterAgent(shop, shops)
      : null;
    const financingResult = await runFinancingAgent(shop, profileResult, clusterResult);

    res.json({ shop: shop.name, profileResult, clusterResult, financingResult });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const { runCoachingAgent } = require('./agents/coachingAgent');

app.get('/api/analyze/:shopId', async (req, res) => {
  const shop = shops.find(s => s.shop_id === req.params.shopId);
  if (!shop) {
    return res.status(404).json({ error: 'Shop not found' });
  }
  const { getCurrentTrustScore } = require('./loanHelpers');

  try {
    const existingScore = getCurrentTrustScore(shop.shop_id);
const profileResult = await runProfileAgent(shop, existingScore);

    const clusterResult = profileResult.trust_score <= 30
      ? await runClusterAgent(shop, shops)
      : { cluster_used: false, cluster_explanation: null };

    const financingResult = await runFinancingAgent(shop, profileResult, clusterResult);

    const coachingResult = await runCoachingAgent(shop, profileResult, financingResult);

    // Save this analysis to the database
    const stmt = db.prepare(`
      INSERT INTO analyses (
        shop_id, shop_name, trust_score, trust_status, trust_reason,
        cluster_used, cluster_explanation, loan_amount, loan_tenure,
        loan_tier, coaching_message
      ) VALUES (
        @shop_id, @shop_name, @trust_score, @trust_status, @trust_reason,
        @cluster_used, @cluster_explanation, @loan_amount, @loan_tenure,
        @loan_tier, @coaching_message
      )
    `);

    const info = stmt.run({
      shop_id: shop.shop_id,
      shop_name: shop.name,
      trust_score: profileResult.trust_score,
      trust_status: profileResult.trust_status,
      trust_reason: profileResult.trust_reason,
      cluster_used: clusterResult.cluster_used ? 1 : 0,
      cluster_explanation: clusterResult.cluster_explanation,
      loan_amount: financingResult.loan_amount,
      loan_tenure: financingResult.loan_tenure,
      loan_tier: financingResult.loan_tier,
      coaching_message: coachingResult.coaching_message
    });

    res.json({
      analysis_id: info.lastInsertRowid,
      shop: shop.name,
      shop_id: shop.shop_id,
      profile: profileResult,
      cluster: clusterResult,
      financing: financingResult,
      coaching: coachingResult
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/test/history', (req, res) => {
  const rows = db.prepare('SELECT * FROM analyses ORDER BY created_at DESC').all();
  res.json(rows);
});

const {
  createLoanApplication,
  getPendingLoans,
  getLoanById,
  getAllLoans,
  updateLoanStatus,
  createRepaymentSchedule,
  getRepaymentsForLoan
} = require('./loanHelpers');

// Shop owner applies for the loan Agent 3 recommended
app.post('/api/loans/apply', (req, res) => {
  const { analysis_id, shop_id, shop_name, amount, tenure_weeks, interest_tier, distributor_name } = req.body;

  if (!analysis_id || !shop_id || !amount || !distributor_name) {
    return res.status(400).json({ error: 'Missing required loan fields, including distributor_name' });
  }

  const status = getShopStatus(shop_id);

  if (status.eligibility === 'PENDING_REVIEW') {
    return res.status(409).json({ error: 'You already have a loan application awaiting review.' });
  }
  if (status.eligibility === 'ACTIVE') {
    return res.status(409).json({ error: 'You have an active loan. Complete it before applying again.' });
  }
  if (status.eligibility === 'OVERDUE') {
    return res.status(409).json({ error: 'Your current loan has an overdue payment. Catch up before applying again.' });
  }
  if (status.eligibility === 'DEFAULTED') {
    return res.status(409).json({ error: `Not eligible yet: ${status.recovery_needed}` });
  }

  const loan_id = createLoanApplication({ analysis_id, shop_id, shop_name, amount, tenure_weeks, interest_tier, distributor_name });
  res.json({ message: 'Loan application submitted', loan_id, status: 'pending' });
});

// Credit officer: view all pending applications
app.get('/api/loans/pending', (req, res) => {
  res.json(getPendingLoans());
});

// Credit officer: view all loans (for dashboard table)
app.get('/api/loans/all', (req, res) => {
  res.json(getAllLoans());
});

// Credit officer: approve a loan
app.post('/api/loans/:loanId/approve', (req, res) => {
  const loan = getLoanById(req.params.loanId);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });

  const shop = shops.find(s => s.shop_id === loan.shop_id);

  updateLoanStatus(loan.id, 'active');
  createRepaymentSchedule(loan.id, loan.amount, loan.tenure_weeks, shop ? shop.weekly_orders : []);

  res.json({
    message: `Loan approved. ₹${loan.amount} disbursed to ${loan.distributor_name} on behalf of ${loan.shop_name}.`,
    loan_id: loan.id,
    status: 'active'
  });
});

// Credit officer: reject a loan
app.post('/api/loans/:loanId/reject', (req, res) => {
  const loan = getLoanById(req.params.loanId);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });

  updateLoanStatus(loan.id, 'rejected');
  res.json({ message: 'Loan rejected', loan_id: loan.id, status: 'rejected' });
});

// View repayment schedule for a specific loan
app.get('/api/loans/:loanId/repayments', (req, res) => {
  res.json(getRepaymentsForLoan(req.params.loanId));
});

const {
  getCurrentTrustScore,
  logTrustScoreChange,
  getRepaymentById,
  updateRepayment,
  getAnalysisById,
  getTrustScoreHistory
} = require('./loanHelpers');

// Simulate a weekly repayment — 'paid' or 'missed'
const { getNextActionableRepayment } = require('./loanHelpers');

app.post('/api/repayments/:repaymentId/simulate', (req, res) => {
  const { outcome } = req.body;
  if (!['paid', 'missed'].includes(outcome)) {
    return res.status(400).json({ error: 'outcome must be "paid" or "missed"' });
  }

  const repayment = getRepaymentById(req.params.repaymentId);
  if (!repayment) return res.status(404).json({ error: 'Repayment not found' });

  const loan = getLoanById(repayment.loan_id);

 if (!['active', 'overdue', 'defaulted'].includes(loan.status)) {
  return res.status(409).json({ error: `This loan is ${loan.status}; repayments cannot be modified.` });
}

  // Enforce sequential order — only the current lowest pending week is actionable
  const nextActionable = getNextActionableRepayment(loan.id);
  if (!nextActionable || nextActionable.id !== repayment.id) {
    return res.status(409).json({ error: 'Repayments must be completed in order. This week is not yet actionable.' });
  }

  const analysis = getAnalysisById(loan.analysis_id);
  const isClusterOrigin = analysis && analysis.cluster_used === 1;
  const multiplier = isClusterOrigin ? 1.5 : 1;

  const allRepaymentsForShop = db.prepare(`
    SELECT r.status FROM repayments r
    JOIN loans l ON l.id = r.loan_id
    WHERE l.shop_id = ? AND r.status IN ('paid', 'missed')
    ORDER BY r.id ASC
  `).all(loan.shop_id);

  let baseImpact;
  let newConsecutiveMissed = loan.consecutive_missed || 0;

  if (outcome === 'paid') {
    let streak = 1;
    for (let i = allRepaymentsForShop.length - 1; i >= 0; i--) {
      if (allRepaymentsForShop[i].status === 'paid') streak++;
      else break;
    }
    baseImpact = streak >= 5 ? 4 : streak >= 3 ? 3 : 2;
    newConsecutiveMissed = 0; // paying resets the consecutive-miss counter
  } else {
    const missedCount = allRepaymentsForShop.filter(r => r.status === 'missed').length + 1;
    baseImpact = missedCount >= 3 ? -15 : missedCount === 2 ? -11 : -8;
    newConsecutiveMissed = newConsecutiveMissed + 1;
  }

  const finalImpact = Math.round(baseImpact * multiplier);

  updateRepayment(repayment.id, outcome, finalImpact);

  const currentScore = getCurrentTrustScore(loan.shop_id);
  let newScore = Math.max(0, Math.min(100, currentScore + finalImpact));

  let reason = outcome === 'paid'
    ? `Week ${repayment.week_number} repayment made on time${isClusterOrigin ? ' (cluster-originated loan, weighted higher)' : ''}.`
    : `Week ${repayment.week_number} repayment missed${isClusterOrigin ? ' (cluster-originated loan, weighted higher)' : ''}.`;

  // Determine total missed count across this shop's history (all loans)
  const totalMissed = allRepaymentsForShop.filter(r => r.status === 'missed').length + (outcome === 'missed' ? 1 : 0);

  let newLoanStatus = loan.status;

if (outcome === 'missed') {
  const remainingPending = db.prepare(`
    SELECT * FROM repayments WHERE loan_id = ? AND status = 'pending' ORDER BY week_number ASC
  `).all(loan.id);

  if (remainingPending.length > 0) {
    // Redistribute the missed amount across remaining weeks
    const extraPerWeek = Math.round(repayment.amount_due / remainingPending.length);
    const updateStmt = db.prepare(`UPDATE repayments SET amount_due = amount_due + ? WHERE id = ?`);
    remainingPending.forEach(r => updateStmt.run(extraPerWeek, r.id));

    if (newConsecutiveMissed >= 2 || totalMissed >= 3) {
      // Only apply the default penalty ONCE, on first transition into defaulted
      if (loan.status !== 'defaulted') {
        const defaultPenalty = Math.round(-20 * multiplier);
        newScore = Math.max(0, newScore + defaultPenalty);
        reason += ` Loan marked DEFAULTED (${newConsecutiveMissed} consecutive / ${totalMissed} total missed payments).`;
      }
      newLoanStatus = 'defaulted';
    } else {
      newLoanStatus = 'overdue';
    }
  } else {
    // This was the last remaining week — nothing left to redistribute onto.
    // Real NBFC provisioning: recovery deemed unrealistic, formally write off the balance.
    newLoanStatus = 'loss_asset';
    const lossPenalty = Math.round(-25 * multiplier);
    newScore = Math.max(0, newScore + lossPenalty);
    reason += ` Final unpaid balance of ₹${repayment.amount_due} could not be recovered — loan marked LOSS ASSET (fully provisioned).`;

    db.prepare(`UPDATE loans SET loss_provisioned_amount = loss_provisioned_amount + ? WHERE id = ?`)
      .run(repayment.amount_due, loan.id);
  }
} else if (loan.status === 'overdue' || loan.status === 'defaulted') {
  newLoanStatus = 'active';
}

db.prepare(`UPDATE loans SET status = @status, consecutive_missed = @consecutive_missed WHERE id = @id`).run({
  id: loan.id, status: newLoanStatus, consecutive_missed: newConsecutiveMissed
});

logTrustScoreChange(loan.shop_id, newScore, reason);

  // Check loan completion
  const allRepayments = db.prepare(`SELECT status FROM repayments WHERE loan_id = ?`).all(loan.id);
  const allResolved = allRepayments.every(r => r.status === 'paid');
  if (allResolved) {
    updateLoanStatus(loan.id, 'completed');
    const bonusScore = Math.min(100, newScore + 10);
    logTrustScoreChange(loan.shop_id, bonusScore, `Loan fully repaid on schedule — completion bonus applied.`);
  }

  res.json({
    repayment_id: repayment.id,
    outcome,
    trust_score_impact: finalImpact,
    previous_score: currentScore,
    new_score: newScore,
    loan_status: newLoanStatus,
    cluster_weighted: isClusterOrigin
  });
});

// View a shop's trust score history over time
app.get('/api/shops/:shopId/trust-history', (req, res) => {
  res.json(getTrustScoreHistory(req.params.shopId));
});

const { getDashboardStats } = require('./loanHelpers');

app.get('/api/dashboard/stats', (req, res) => {
  res.json(getDashboardStats());
});

app.get('/api/shops', (req, res) => {
  res.json(shops);
});

app.get('/api/shops/:shopId/analyses', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM analyses WHERE shop_id = ? ORDER BY created_at DESC'
  ).all(req.params.shopId);
  res.json(rows);
});

const { getShopStatus } = require('./loanHelpers');

app.get('/api/shops/:shopId/status', (req, res) => {
  res.json(getShopStatus(req.params.shopId));
});

app.listen(PORT, () => {
  console.log(`Merit backend running on http://localhost:${PORT}`);
});