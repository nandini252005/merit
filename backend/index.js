require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database');
const shops = require('./shops.json');

// --- Agent Imports ---
const { runProfileAgent } = require('./agents/profileAgent');
const { runClusterAgent } = require('./agents/clusterAgent');
const { runFinancingAgent } = require('./agents/financingAgent');
const { runCoachingAgent } = require('./agents/coachingAgent');
const { runSellThroughAgent } = require('./agents/sellThroughAgent');
const { runCreditOfficerAgent } = require('./agents/creditOfficerAgent');

// --- Helper Imports ---
const {
  createInitialRepayment, generateNextRepaymentWeek, getGraceWeekCount, enterGraceSmoothing,
  createLoanApplication, getPendingLoans, getLoanById, getAllLoans, updateLoanStatus,
  createRepaymentSchedule, getRepaymentsForLoan, getCurrentTrustScore, logTrustScoreChange,
  getRepaymentById, updateRepayment, getAnalysisById, getTrustScoreHistory,
  getNextActionableRepayment, getDashboardStats, getShopStatus, applyGracePenalty,
  settleGraceBalance, getOwnerContext
} = require('./loanHelpers');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => res.json({ message: 'Merit backend is running' }));
app.get('/api/shops', (req, res) => res.json(shops));

// --- Test Routes ---
app.get('/api/test/profile/:shopId', async (req, res) => {
  const shop = shops.find(s => s.shop_id === req.params.shopId);
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  try { res.json({ shop: shop.name, ...(await runProfileAgent(shop)) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/test/cluster/:shopId', async (req, res) => {
  const shop = shops.find(s => s.shop_id === req.params.shopId);
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  try { res.json({ shop: shop.name, ...(await runClusterAgent(shop, shops)) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/test/financing/:shopId', async (req, res) => {
  const shop = shops.find(s => s.shop_id === req.params.shopId);
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  try {
    const profileResult = await runProfileAgent(shop);
    const clusterResult = profileResult.trust_score <= 30 ? await runClusterAgent(shop, shops) : null;
    const financingResult = await runFinancingAgent(shop, profileResult, clusterResult, getOwnerContext(shop.owner_id, shops));
    res.json({ shop: shop.name, profileResult, clusterResult, financingResult });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/test/history', (req, res) => {
  res.json(db.prepare('SELECT * FROM analyses ORDER BY created_at DESC').all());
});

// --- Main Analysis Route ---
app.get('/api/analyze/:shopId', async (req, res) => {
  const shop = shops.find(s => s.shop_id === req.params.shopId);
  if (!shop) return res.status(404).json({ error: 'Shop not found' });

  try {
    const existingScore = getCurrentTrustScore(shop.shop_id);
    const ownerContext = getOwnerContext(shop.owner_id, shops);
    const profileResult = await runProfileAgent(shop, existingScore, ownerContext);
    
    const clusterResult = profileResult.trust_score <= 30
      ? await runClusterAgent(shop, shops)
      : { cluster_used: false, cluster_explanation: null };

    // FIX: Pass ownerContext down to enforce the overall exposure limit!
    const financingResult = await runFinancingAgent(shop, profileResult, clusterResult, ownerContext);
    const coachingResult = await runCoachingAgent(shop, profileResult, financingResult);

    const stmt = db.prepare(`
      INSERT INTO analyses (
        shop_id, shop_name, trust_score, trust_status, trust_reason,
        cluster_used, cluster_explanation, loan_amount, loan_tenure, loan_tier, coaching_message
      ) VALUES (
        @shop_id, @shop_name, @trust_score, @trust_status, @trust_reason,
        @cluster_used, @cluster_explanation, @loan_amount, @loan_tenure, @loan_tier, @coaching_message
      )
    `);

    const info = stmt.run({
      shop_id: shop.shop_id, shop_name: shop.name,
      trust_score: profileResult.trust_score, trust_status: profileResult.trust_status, trust_reason: profileResult.trust_reason,
      cluster_used: clusterResult.cluster_used ? 1 : 0, cluster_explanation: clusterResult.cluster_explanation,
      loan_amount: financingResult.loan_amount, loan_tenure: financingResult.loan_tenure, loan_tier: financingResult.loan_tier,
      coaching_message: coachingResult.coaching_message
    });

    res.json({
      analysis_id: info.lastInsertRowid, shop: shop.name, shop_id: shop.shop_id,
      profile: profileResult, cluster: clusterResult, financing: financingResult, coaching: coachingResult
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/shops/:shopId/analyses', (req, res) => {
  res.json(db.prepare('SELECT * FROM analyses WHERE shop_id = ? ORDER BY created_at DESC').all(req.params.shopId));
});

app.get('/api/shops/:shopId/status', (req, res) => {
  const shopStatus = getShopStatus(req.params.shopId);
  const shop = shops.find(s => s.shop_id === req.params.shopId);
  if (shop?.owner_id && shopStatus.eligibility !== 'DEFAULTED') {
    const ownerContext = getOwnerContext(shop.owner_id, shops);
    if (ownerContext.exposure_remaining <= 0) {
      return res.json({ ...shopStatus, eligibility: 'AT_EXPOSURE_LIMIT', exposure_remaining: ownerContext.exposure_remaining });
    }
  }
  res.json(shopStatus);
});

// --- Loans & Repayments ---
app.post('/api/loans/apply', (req, res) => {
  const { analysis_id, shop_id, shop_name, amount, tenure_weeks, distributor_name } = req.body;
  if (!analysis_id || !shop_id || !amount || !distributor_name) return res.status(400).json({ error: 'Missing required loan fields' });

  const analysis = db.prepare('SELECT trust_score, loan_amount FROM analyses WHERE id = ?').get(analysis_id);
  if (!analysis) return res.status(404).json({ error: 'Analysis not found' });

  const finalAmount = Math.min(amount, analysis.loan_amount);
  const trustScore = analysis.trust_score || 50;

  let calculatedApr = trustScore <= 25 ? 24 : trustScore <= 50 ? 20 : trustScore <= 75 ? 15 : 12;
  const interestAmount = Math.round(finalAmount * (calculatedApr / 100) * (tenure_weeks / 52));
  const totalPayable = finalAmount + interestAmount;

  const loan_id = createLoanApplication({ 
    analysis_id, shop_id, shop_name, amount: totalPayable, 
    tenure_weeks, interest_tier: calculatedApr, distributor_name 
  });
  res.json({ message: 'Loan application submitted', loan_id, status: 'pending' });
});

app.get('/api/loans/pending', (req, res) => res.json(getPendingLoans()));
app.get('/api/loans/all', (req, res) => res.json(getAllLoans()));
app.get('/api/loans/:loanId/repayments', (req, res) => res.json(getRepaymentsForLoan(req.params.loanId)));

app.post('/api/loans/:loanId/reject', (req, res) => {
  const loan = getLoanById(req.params.loanId);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  updateLoanStatus(loan.id, 'rejected');
  res.json({ message: 'Loan rejected', loan_id: loan.id, status: 'rejected' });
});

app.post('/api/loans/:loanId/approve', (req, res) => {
  const loan = getLoanById(req.params.loanId);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  updateLoanStatus(loan.id, 'active');
  createInitialRepayment(loan.id, loan.amount, loan.tenure_weeks);
  res.json({ message: `Loan approved. ₹${loan.amount} disbursed to ${loan.distributor_name}.`, loan_id: loan.id, status: 'active' });
});

// --- Repayment Simulation ---
app.post('/api/repayments/:repaymentId/simulate', async (req, res) => {
  const { outcome, paidAmount } = req.body;
  if (!['paid', 'missed'].includes(outcome)) return res.status(400).json({ error: 'outcome must be "paid" or "missed"' });

  const repayment = getRepaymentById(req.params.repaymentId);
  if (!repayment) return res.status(404).json({ error: 'Repayment not found' });
  const loan = getLoanById(repayment.loan_id);
  const shop = shops.find(s => s.shop_id === loan.shop_id);

  if (!['active', 'overdue', 'defaulted'].includes(loan.status)) return res.status(409).json({ error: `Loan is ${loan.status}` });
  const nextActionable = getNextActionableRepayment(loan.id);
  if (!nextActionable || nextActionable.id !== repayment.id) return res.status(409).json({ error: 'Not actionable yet.' });

  const analysis = getAnalysisById(loan.analysis_id);
  const multiplier = (analysis?.cluster_used === 1) ? 1.5 : 1;
  const allRepaymentsForShop = db.prepare(`SELECT r.status FROM repayments r JOIN loans l ON l.id = r.loan_id WHERE l.shop_id = ? AND r.status IN ('paid', 'missed') ORDER BY r.id ASC`).all(loan.shop_id);

  let baseImpact;
  let newConsecutiveMissed = loan.consecutive_missed || 0;
  let forceDefault = false;

  if (outcome === 'paid') {
    let streak = 1;
    for (let i = allRepaymentsForShop.length - 1; i >= 0; i--) {
      if (allRepaymentsForShop[i].status === 'paid') streak++; else break;
    }
    baseImpact = streak >= 4 ? 2 : 1; 
    newConsecutiveMissed = 0; 
  } else {
    const missedCount = allRepaymentsForShop.filter(r => r.status === 'missed').length + 1;
    baseImpact = missedCount >= 3 ? -15 : missedCount === 2 ? -10 : -5;
    newConsecutiveMissed++;
  }

  const finalImpact = Math.round(baseImpact * multiplier);
  const originalDue = repayment.amount_due;

  if (outcome === 'paid' && paidAmount !== undefined) db.prepare(`UPDATE repayments SET amount_due = ? WHERE id = ?`).run(paidAmount, repayment.id);

  if (repayment.is_grace_week) {
    const remaining = db.prepare(`SELECT * FROM repayments WHERE loan_id = ? AND is_grace_week = 1 AND status = 'pending' AND id != ?`).all(loan.id, repayment.id);
    if (outcome === 'missed') {
      if (remaining.length > 0) {
        const perRow = Math.round(originalDue / remaining.length);
        const remainder = originalDue - (perRow * remaining.length);
        const updateStmt = db.prepare(`UPDATE repayments SET amount_due = amount_due + ? WHERE id = ?`);
        remaining.forEach((r, i) => updateStmt.run(perRow + (i === remaining.length - 1 ? remainder : 0), r.id));
      } else forceDefault = true;
    } else if (outcome === 'paid' && paidAmount !== undefined) {
      const diff = originalDue - paidAmount; 
      if (remaining.length > 0 && diff !== 0) {
        const perRow = Math.round(diff / remaining.length);
        const remainder = diff - (perRow * remaining.length);
        const updateStmt = db.prepare(`UPDATE repayments SET amount_due = MAX(0, amount_due + ?) WHERE id = ?`);
        remaining.forEach((r, i) => updateStmt.run(perRow + (i === remaining.length - 1 ? remainder : 0), r.id));
      }
    }
  }

  updateRepayment(repayment.id, outcome, finalImpact);
  const currentScore = getCurrentTrustScore(loan.shop_id);
  let newScore = Math.max(0, Math.min(100, currentScore + finalImpact));

  let reason = `Week ${repayment.week_number} repayment ${outcome === 'paid' ? 'made on time' : 'missed'}${multiplier === 1.5 ? ' (cluster-originated loan, weighted higher)' : ''}.`;
  const totalMissed = allRepaymentsForShop.filter(r => r.status === 'missed').length + (outcome === 'missed' ? 1 : 0);
  let newLoanStatus = loan.status;

  if (outcome === 'missed') {
    if (forceDefault || newConsecutiveMissed >= 2 || totalMissed >= 3) {
      if (loan.status !== 'defaulted') {
        newScore = Math.max(0, newScore + Math.round(-15 * multiplier));
        reason += ` Loan marked DEFAULTED (${newConsecutiveMissed} consecutive / ${totalMissed} total missed).`;
      }
      newLoanStatus = 'defaulted';
    } else newLoanStatus = 'overdue';
  } else if (loan.status === 'overdue' || loan.status === 'defaulted') newLoanStatus = 'active';

  db.prepare(`UPDATE loans SET status = @status, consecutive_missed = @consecutive_missed WHERE id = @id`).run({ id: loan.id, status: newLoanStatus, consecutive_missed: newConsecutiveMissed });
  logTrustScoreChange(loan.shop_id, newScore, reason);

  const allRowsNow = db.prepare(`SELECT status, amount_due FROM repayments WHERE loan_id = ?`).all(loan.id);
  const fullyPaidOff = allRowsNow.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.amount_due, 0) >= loan.amount;
  if (fullyPaidOff) db.prepare(`DELETE FROM repayments WHERE loan_id = ? AND status IN ('pending', 'decision_pending')`).run(loan.id);

  let nextWeekResult = null;
  if (['active', 'overdue', 'defaulted'].includes(newLoanStatus) && !fullyPaidOff) {
    nextWeekResult = await generateNextRepaymentWeek(loan, shop, newScore, runSellThroughAgent);
  }

  if (outcome === 'paid' && !nextWeekResult) {
    const finalRows = db.prepare(`SELECT status, amount_due FROM repayments WHERE loan_id = ?`).all(loan.id);
    if (!finalRows.some(r => r.status === 'pending' || r.status === 'decision_pending') && fullyPaidOff) {
      updateLoanStatus(loan.id, 'completed');
      const weeksEarly = loan.tenure_weeks - finalRows.filter(r => r.status === 'paid').length; 
      logTrustScoreChange(loan.shop_id, Math.min(100, newScore + (weeksEarly > 0 ? 3 : 5)), weeksEarly > 0 ? `Loan settled ${weeksEarly} week(s) early. (+3 completion bonus)` : `Loan completed perfectly on schedule. (+5 completion bonus)`);
    }
  }
  
  res.json({ repayment_id: repayment.id, outcome, trust_score_impact: finalImpact, previous_score: currentScore, new_score: newScore, loan_status: newLoanStatus, cluster_weighted: multiplier === 1.5, next_week: nextWeekResult });
});

// --- Grace Period & Dashboard ---
app.post('/api/loans/:loanId/enter-grace-smoothing', (req, res) => {
  const result = enterGraceSmoothing(req.params.loanId, getCurrentTrustScore(getLoanById(req.params.loanId)?.shop_id) ?? 50);
  if (!result) return res.status(409).json({ error: 'No pending final-payment decision found.' });
  res.json({ message: 'Entered grace period smoothing.', ...result });
});

app.get('/api/loans/:loanId/grace-preview', (req, res) => {
  const loan = getLoanById(req.params.loanId);
  const decisionRow = db.prepare(
    `SELECT * FROM repayments WHERE loan_id = ? AND status = 'decision_pending'`
  ).get(loan.id);

  if (!decisionRow)
    return res.status(409).json({ error: 'No pending decision.' });

  const graceWeekCount = getGraceWeekCount(
    getCurrentTrustScore(loan.shop_id) ?? 50
  );

  const total = decisionRow.amount_due;

  res.json({
    outstanding_amount: total,
    grace_week_count: graceWeekCount,
    interest_pct: 0,
    total_with_interest: total,
    per_week_amount: Math.round(total / graceWeekCount)
  });
});

app.post('/api/loans/:loanId/grace-tick', (req, res) => {
  const loan = getLoanById(req.params.loanId);
  if (loan?.status !== 'overdue_final') return res.status(409).json({ error: 'Not in grace period.' });

  if (loan.grace_weeks_elapsed >= 3) {
    db.prepare(`UPDATE loans SET status = 'loss_asset', loss_provisioned_amount = loss_provisioned_amount + outstanding_balance, outstanding_balance = 0 WHERE id = ?`).run(loan.id);
    logTrustScoreChange(loan.shop_id, Math.max(0, getCurrentTrustScore(loan.shop_id) - Math.round(25 * (getAnalysisById(loan.analysis_id)?.cluster_used === 1 ? 1.5 : 1))), `Grace period exhausted after 4 weeks — loan marked LOSS ASSET.`);
    return res.json({ status: 'loss_asset', message: 'Grace period exhausted, written off.' });
  }
  const updated = applyGracePenalty(loan.id);
  res.json({ status: 'overdue_final', ...updated, grace_weeks_remaining: 4 - updated.grace_weeks_elapsed });
});

app.post('/api/loans/:loanId/settle-grace', (req, res) => {
  const loan = getLoanById(req.params.loanId);
  if (loan?.status !== 'overdue_final') return res.status(409).json({ error: 'Not in grace period.' });
  settleGraceBalance(loan.id);
  logTrustScoreChange(loan.shop_id, Math.min(100, getCurrentTrustScore(loan.shop_id) + 5), `Outstanding balance of ₹${loan.outstanding_balance} settled during grace period — loan completed.`);
  res.json({ status: 'completed', message: 'Balance settled.' });
});

app.get('/api/shops/:shopId/trust-history', (req, res) => res.json(getTrustScoreHistory(req.params.shopId)));
app.get('/api/dashboard/stats', (req, res) => res.json(getDashboardStats()));
app.get('/api/owners/:ownerId/context', (req, res) => res.json(getOwnerContext(req.params.ownerId, shops)));

app.post('/api/loans/:loanId/credit-analysis', async (req, res) => {
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.loanId);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  const ownerShopIds = shops.filter(s => s.owner_id === shops.find(s => s.shop_id === loan.shop_id).owner_id).map(s => s.shop_id);
  
  const allOwnerHistory = db.prepare(`SELECT score FROM trust_score_history WHERE shop_id IN (${ownerShopIds.map(() => '?').join(',')}) ORDER BY created_at DESC`).all(...ownerShopIds);
  const missedRow = db.prepare(`SELECT COUNT(*) as count FROM repayments r JOIN loans l ON r.loan_id = l.id WHERE l.shop_id IN (${ownerShopIds.map(() => '?').join(',')}) AND r.status = 'missed'`).get(...ownerShopIds);
  
  const ownerContext = { owner_id: shops.find(s => s.shop_id === loan.shop_id).owner_id, shop_ids: ownerShopIds, blended_score: allOwnerHistory.length > 0 ? Math.round(allOwnerHistory.reduce((sum, h) => sum + h.score, 0) / allOwnerHistory.length) : 50, total_missed_payments: missedRow ? missedRow.count : 0 };
  
  try { res.json({ ...(await runCreditOfficerAgent(loan, shops.find(s => s.shop_id === loan.shop_id), ownerContext)), owner_context: ownerContext }); } 
  catch (error) { res.status(500).json({ error: 'Failed to run analysis' }); }
});

app.post('/api/demo/reset', (req, res) => {
  try {
    db.transaction(() => db.exec(`DELETE FROM repayments; DELETE FROM loans; DELETE FROM analyses; DELETE FROM trust_score_history; DELETE FROM sqlite_sequence WHERE name IN ('repayments', 'loans', 'analyses', 'trust_score_history');`))();
    res.json({ success: true, message: 'Demo database reset successfully.' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.listen(PORT, () => console.log(`Merit backend running on http://localhost:${PORT}`));