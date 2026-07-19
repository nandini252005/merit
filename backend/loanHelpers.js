const db = require('./database');

function createLoanApplication({ analysis_id, shop_id, shop_name, amount, tenure_weeks, interest_tier, distributor_name }) {
  const stmt = db.prepare(`
    INSERT INTO loans (analysis_id, shop_id, shop_name, amount, tenure_weeks, interest_tier, distributor_name, status)
    VALUES (@analysis_id, @shop_id, @shop_name, @amount, @tenure_weeks, @interest_tier, @distributor_name, 'pending')
  `);
  const info = stmt.run({ analysis_id, shop_id, shop_name, amount, tenure_weeks, interest_tier, distributor_name });
  return info.lastInsertRowid;
}

function getPendingLoans() {
  return db.prepare(`SELECT * FROM loans WHERE status = 'pending' ORDER BY applied_at DESC`).all();
}

function getLoanById(loan_id) {
  return db.prepare(`SELECT * FROM loans WHERE id = ?`).get(loan_id);
}

function getAllLoans() {
  return db.prepare(`SELECT * FROM loans ORDER BY applied_at DESC`).all();
}

function updateLoanStatus(loan_id, status) {
  const stmt = db.prepare(`
    UPDATE loans SET status = @status, approved_at = CASE WHEN @status = 'active' THEN CURRENT_TIMESTAMP ELSE approved_at END
    WHERE id = @loan_id
  `);
  return stmt.run({ loan_id, status });
}

// Called once at approval — only creates the FIRST week, which is always fixed.
function createInitialRepayment(loan_id, amount, tenure_weeks) {
  const week1Amount = Math.round(amount / tenure_weeks);
  db.prepare(`
    INSERT INTO repayments (loan_id, week_number, amount_due, sell_through_pct, is_grace_week, status)
    VALUES (?, 1, ?, NULL, 0, 'pending')
  `).run(loan_id, week1Amount);
}

// Called after each week resolves (paid/missed) — generates the NEXT week live,
// using a fresh Sell-Through Agent call for just that one week. Ideal baseline 60%, cap ±20%.
async function generateNextRepaymentWeek(loan, shop, trustScore, runSellThroughAgentFn) {
  const existingRows = db.prepare(`SELECT * FROM repayments WHERE loan_id = ? ORDER BY week_number ASC`).all(loan.id);
  
  // FIX: If we have already entered the grace phase, do not generate any more tenure weeks!
  const hasGraceWeeks = existingRows.some(r => r.is_grace_week);
  if (hasGraceWeeks) return null; 

  const tenureRows = existingRows.filter(r => !r.is_grace_week);
  const lastWeekNumber = tenureRows.length > 0 ? tenureRows[tenureRows.length - 1].week_number : 0;
  const nextWeekNumber = lastWeekNumber + 1;

  if (nextWeekNumber > loan.tenure_weeks) return null; // tenure phase already complete

  const spentSoFar = tenureRows.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.amount_due, 0);
  const remainingBalance = loan.amount - spentSoFar;
  const remainingWeeks = loan.tenure_weeks - lastWeekNumber;

  const isFinalWeek = nextWeekNumber === loan.tenure_weeks;
  
  if (isFinalWeek) {
    // Final week: ALWAYS create a decision row instead of a regular pending one
    const finalAmount = remainingBalance;
    
    db.prepare(`
      INSERT INTO repayments (loan_id, week_number, amount_due, sell_through_pct, is_grace_week, status)
      VALUES (?, ?, ?, NULL, 0, 'decision_pending')
    `).run(loan.id, nextWeekNumber, finalAmount);
    return { type: 'decision_pending', amount: finalAmount };
  }

  // Regular incremental week — get ONE live sell-through % and adjust against a 60% ideal, ±20% cap.
  const sellThroughResult = await runSellThroughAgentFn(shop, trustScore, 1);
  const pct = sellThroughResult.weekly_sell_through[0];

  const base = remainingBalance / remainingWeeks;
  const deviation = (pct - 60) / 100;
  const adjustment = Math.max(-0.2, Math.min(0.2, deviation));
  const amountDue = Math.round(base * (1 + adjustment));

  db.prepare(`
    INSERT INTO repayments (loan_id, week_number, amount_due, sell_through_pct, is_grace_week, status)
    VALUES (?, ?, ?, ?, 0, 'pending')
  `).run(loan.id, nextWeekNumber, amountDue, pct);

  return { type: 'regular_week', amount: amountDue, sell_through_pct: pct };
}

function getGraceWeekCount(trustScore) {
  if (trustScore >= 76) return 1;
  if (trustScore >= 51) return 2;
  if (trustScore >= 26) return 3;
  return 4;
}

// Merchant chooses to smooth the disproportionate final payment across grace weeks instead.
function enterGraceSmoothing(loan_id, trustScore) {
  const decisionRow = db.prepare(`SELECT * FROM repayments WHERE loan_id = ? AND status = 'decision_pending'`).get(loan_id);
  if (!decisionRow) return null;

  const graceWeekCount = getGraceWeekCount(trustScore);
  const interestPct = 0.01; // FLAT 1% interest applied as requested
  const totalWithInterest = Math.round(decisionRow.amount_due * (1 + interestPct));
  const evenAmount = Math.round(totalWithInterest / graceWeekCount);

  db.prepare(`DELETE FROM repayments WHERE id = ?`).run(decisionRow.id);

  const amounts = Array(graceWeekCount).fill(evenAmount);
  const currentTotal = amounts.reduce((a, b) => a + b, 0);
  amounts[amounts.length - 1] += (totalWithInterest - currentTotal); // rounding remainder

  const stmt = db.prepare(`
    INSERT INTO repayments (loan_id, week_number, amount_due, sell_through_pct, is_grace_week, status)
    VALUES (?, ?, ?, NULL, 1, 'pending')
  `);
  amounts.forEach((amt, i) => stmt.run(loan_id, decisionRow.week_number + i, amt));

  db.prepare(`UPDATE loans SET grace_smoothing_interest_pct = ? WHERE id = ?`).run(interestPct * 100, loan_id);

  return { grace_week_count: graceWeekCount, total_with_interest: totalWithInterest, interest_pct: interestPct * 100 };
}

function getRepaymentsForLoan(loan_id) {
  return db.prepare(`SELECT * FROM repayments WHERE loan_id = ? ORDER BY week_number ASC`).all(loan_id);
}

function getCurrentTrustScore(shop_id) {
  // Check trust_score_history first — this reflects the most up-to-date score
  const latestHistory = db.prepare(`
    SELECT score FROM trust_score_history WHERE shop_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(shop_id);

  if (latestHistory) return latestHistory.score;

  // Fall back to the most recent analysis if no repayment history exists yet
  const latestAnalysis = db.prepare(`
    SELECT trust_score FROM analyses WHERE shop_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(shop_id);

  return latestAnalysis ? latestAnalysis.trust_score : null;
}

function logTrustScoreChange(shop_id, newScore, reason) {
  const stmt = db.prepare(`
    INSERT INTO trust_score_history (shop_id, score, reason) VALUES (@shop_id, @score, @reason)
  `);
  stmt.run({ shop_id, score: newScore, reason });
}

function getRepaymentById(repayment_id) {
  return db.prepare(`SELECT * FROM repayments WHERE id = ?`).get(repayment_id);
}

function updateRepayment(repayment_id, status, trust_score_impact) {
  const stmt = db.prepare(`
    UPDATE repayments SET status = @status, trust_score_impact = @trust_score_impact, paid_at = CURRENT_TIMESTAMP
    WHERE id = @repayment_id
  `);
  stmt.run({ repayment_id, status, trust_score_impact });
}

function getAnalysisById(analysis_id) {
  return db.prepare(`SELECT * FROM analyses WHERE id = ?`).get(analysis_id);
}

function getTrustScoreHistory(shop_id) {
  return db.prepare(`SELECT * FROM trust_score_history WHERE shop_id = ? ORDER BY created_at ASC`).all(shop_id);
}

function getDashboardStats() {
  const totalAnalyses = db.prepare(`SELECT COUNT(*) as count FROM analyses`).get().count;

  // Use CURRENT scores per unique shop, not stale original analysis scores
  const uniqueShopIds = db.prepare(`SELECT DISTINCT shop_id FROM analyses`).all().map(r => r.shop_id);
  const currentScores = uniqueShopIds.map(id => getCurrentTrustScore(id) ?? 0);
  const avgScore = currentScores.length > 0
    ? Math.round(currentScores.reduce((a, b) => a + b, 0) / currentScores.length)
    : 0;

  const totalDisbursed = db.prepare(`SELECT SUM(amount) as total FROM loans WHERE status IN ('active', 'completed', 'overdue', 'overdue_final', 'defaulted')`).get().total;
  const activeLoans = db.prepare(`SELECT COUNT(*) as count FROM loans WHERE status = 'active'`).get().count;
  const pendingCount = db.prepare(`SELECT COUNT(*) as count FROM loans WHERE status = 'pending'`).get().count;
  const completedLoans = db.prepare(`SELECT COUNT(*) as count FROM loans WHERE status = 'completed'`).get().count;

  const flaggedShops = db.prepare(`
    SELECT DISTINCT l.shop_id, l.shop_name
    FROM loans l
    JOIN repayments r ON r.loan_id = l.id
    WHERE r.status = 'missed'
  `).all();

  return {
    total_analyses: totalAnalyses,
    average_trust_score: avgScore,
    total_disbursed: totalDisbursed || 0,
    active_loans: activeLoans,
    pending_applications: pendingCount,
    completed_loans: completedLoans,
    flagged_shops: flaggedShops
  };
}

function getShopStatus(shop_id) {
  // Get the most recent loan for this shop (any status)
  const latestLoan = db.prepare(`
    SELECT * FROM loans WHERE shop_id = ? ORDER BY applied_at DESC LIMIT 1
  `).get(shop_id);

  const currentScore = getCurrentTrustScore(shop_id) ?? 0;

  if (!latestLoan) {
    return { eligibility: 'NO_LOAN', current_loan: null, current_score: currentScore };
  }

  if (latestLoan.status === 'pending') {
    return { eligibility: 'PENDING_REVIEW', current_loan: latestLoan, current_score: currentScore };
  }

  if (latestLoan.status === 'rejected') {
    return { eligibility: 'NO_LOAN', current_loan: null, current_score: currentScore };
  }

  if (latestLoan.status === 'active') {
    return { eligibility: 'ACTIVE', current_loan: latestLoan, current_score: currentScore };
  }

  if (latestLoan.status === 'overdue') {
    return { eligibility: 'OVERDUE', current_loan: latestLoan, current_score: currentScore };
  }
  if (latestLoan.status === 'overdue_final') {
  return { eligibility: 'OVERDUE', current_loan: latestLoan, current_score: currentScore };
}

  if (latestLoan.status === 'defaulted') {
    const eligible = currentScore >= 40;
    return {
      eligibility: eligible ? 'COMPLETED_ELIGIBLE' : 'DEFAULTED',
      current_loan: latestLoan,
      current_score: currentScore,
      recovery_needed: eligible ? null : `Trust score must reach 40 (currently ${currentScore})`
    };
  }
  if (latestLoan.status === 'loss_asset') {
  const eligible = currentScore >= 40;
  return {
    eligibility: eligible ? 'COMPLETED_ELIGIBLE' : 'DEFAULTED',
    current_loan: latestLoan,
    current_score: currentScore,
    recovery_needed: eligible ? null : `Trust score must reach 40 (currently ${currentScore})`
  };
}

  if (latestLoan.status === 'completed') {
    return { eligibility: 'COMPLETED_ELIGIBLE', current_loan: latestLoan, current_score: currentScore };
  }

  return { eligibility: 'NO_LOAN', current_loan: null, current_score: currentScore };
}

function getNextActionableRepayment(loan_id) {
  return db.prepare(`
    SELECT * FROM repayments WHERE loan_id = ? AND status IN ('pending', 'decision_pending') ORDER BY week_number ASC LIMIT 1
  `).get(loan_id);
}

function applyGracePenalty(loan_id) {
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loan_id);
  const penalty = Math.ceil(loan.outstanding_balance * 0.025); // 2.5% weekly penalty interest
  db.prepare(`
    UPDATE loans SET outstanding_balance = outstanding_balance + ?, grace_weeks_elapsed = grace_weeks_elapsed + 1
    WHERE id = ?
  `).run(penalty, loan_id);
  return db.prepare('SELECT * FROM loans WHERE id = ?').get(loan_id);
}

function settleGraceBalance(loan_id) {
  db.prepare(`UPDATE loans SET status = 'completed', outstanding_balance = 0 WHERE id = ?`).run(loan_id);
}

function getOwnerContext(owner_id, allShops) {
  const ownerShops = allShops.filter(s => s.owner_id === owner_id);
  const shopIds = ownerShops.map(s => s.shop_id);

  const shopSummaries = shopIds.map(shopId => {
    const score = getCurrentTrustScore(shopId) ?? 0;
    const loanCount = db.prepare(`SELECT COUNT(*) as c FROM loans WHERE shop_id = ?`).get(shopId).c;
    const completedCount = db.prepare(`SELECT COUNT(*) as c FROM loans WHERE shop_id = ? AND status = 'completed'`).get(shopId).c;
    // Shops with real loan history count more heavily than untested shops
    const weight = loanCount > 0 ? (1 + completedCount * 0.5) : 0.5;
    return { shop_id: shopId, score, weight };
  });

  const totalWeight = shopSummaries.reduce((sum, s) => sum + s.weight, 0);
  const blendedScore = totalWeight > 0
    ? Math.round(shopSummaries.reduce((sum, s) => sum + s.score * s.weight, 0) / totalWeight)
    : 0;

  // Total current exposure across all this owner's shops (active + pending + overdue states)
  const exposureRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM loans
    WHERE shop_id IN (${shopIds.map(() => '?').join(',')})
    AND status IN ('pending', 'active', 'overdue', 'overdue_final', 'defaulted')
  `).get(...shopIds);

  const maxExposure = getOwnerExposureCap(blendedScore);

  return {
    owner_id,
    shop_ids: shopIds,
    blended_score: blendedScore,
    per_shop: shopSummaries,
    current_exposure: exposureRow.total,
    max_exposure: maxExposure,
    exposure_remaining: Math.max(0, maxExposure - exposureRow.total),
  };
}

function getOwnerExposureCap(blendedScore) {
  if (blendedScore >= 76) return 150000;
  if (blendedScore >= 51) return 90000;
  if (blendedScore >= 26) return 40000;
  return 15000;
}
// Lower trust score → more grace weeks (more relief for weaker merchants),
// higher trust score → fewer, since they're more likely to handle a bigger single catch-up.

module.exports = {
  createLoanApplication,
  getPendingLoans,
  getLoanById,
  getAllLoans,
  updateLoanStatus,
  getRepaymentsForLoan,
  getCurrentTrustScore,
  logTrustScoreChange,
  getRepaymentById,
  updateRepayment,
  getAnalysisById,
  getTrustScoreHistory,
  getDashboardStats,
  getShopStatus,
  getNextActionableRepayment,
  applyGracePenalty,
  settleGraceBalance,
  getOwnerContext,
  getOwnerExposureCap,
  createInitialRepayment,
  generateNextRepaymentWeek,
  getGraceWeekCount,
  enterGraceSmoothing
};