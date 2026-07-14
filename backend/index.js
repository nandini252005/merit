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

  try {
    const profileResult = await runProfileAgent(shop);

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
app.post('/api/repayments/:repaymentId/simulate', (req, res) => {
  const { outcome } = req.body; // expects "paid" or "missed"
  if (!['paid', 'missed'].includes(outcome)) {
    return res.status(400).json({ error: 'outcome must be "paid" or "missed"' });
  }

  const repayment = getRepaymentById(req.params.repaymentId);
  if (!repayment) return res.status(404).json({ error: 'Repayment not found' });

  const loan = getLoanById(repayment.loan_id);
  const analysis = getAnalysisById(loan.analysis_id);
  const isClusterOrigin = analysis && analysis.cluster_used === 1;
  const multiplier = isClusterOrigin ? 1.5 : 1;

  // Base impact per our locked rules
  let baseImpact = outcome === 'paid'
    ? Math.floor(Math.random() * 3) + 2   // +2 to +4
    : -(Math.floor(Math.random() * 8) + 8); // -8 to -15

  const finalImpact = Math.round(baseImpact * multiplier);

  updateRepayment(repayment.id, outcome, finalImpact);

  const currentScore = getCurrentTrustScore(loan.shop_id);
  const newScore = Math.max(0, Math.min(100, currentScore + finalImpact));

  const reason = outcome === 'paid'
    ? `Week ${repayment.week_number} repayment made on time${isClusterOrigin ? ' (cluster-originated loan, weighted higher)' : ''}.`
    : `Week ${repayment.week_number} repayment missed${isClusterOrigin ? ' (cluster-originated loan, weighted higher)' : ''}.`;

  logTrustScoreChange(loan.shop_id, newScore, reason);

  // Check if this was the loan's final week and all weeks are paid — mark loan completed
  const allRepayments = db.prepare(`SELECT status FROM repayments WHERE loan_id = ?`).all(loan.id);
  const allPaid = allRepayments.every(r => r.status === 'paid');
  if (allPaid) {
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
    cluster_weighted: isClusterOrigin
  });
});

// View a shop's trust score history over time
app.get('/api/shops/:shopId/trust-history', (req, res) => {
  res.json(getTrustScoreHistory(req.params.shopId));
});

app.listen(PORT, () => {
  console.log(`Merit backend running on http://localhost:${PORT}`);
});