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

function createRepaymentSchedule(loan_id, amount, tenure_weeks, weekly_orders) {
  const baseWeekly = Math.round(amount / tenure_weeks);

  const relevantOrders = weekly_orders ? weekly_orders.slice(0, tenure_weeks) : [];
  const avgOrders = relevantOrders.length > 0
    ? relevantOrders.reduce((a, b) => a + b, 0) / relevantOrders.length
    : null;

  const amounts = [];

  for (let week = 1; week <= tenure_weeks; week++) {
    let amountDue = baseWeekly;

    if (avgOrders && relevantOrders[week - 1] !== undefined) {
      const thisWeekOrders = relevantOrders[week - 1];
      const ratio = thisWeekOrders / avgOrders;
      const adjustment = Math.max(-0.2, Math.min(0.2, ratio - 1));
      amountDue = Math.round(baseWeekly * (1 + adjustment));
    }

    amounts.push(amountDue);
  }

  // Reconcile: make sure total exactly equals the loan amount
  const currentTotal = amounts.reduce((a, b) => a + b, 0);
  const difference = amount - currentTotal;
  amounts[amounts.length - 1] += difference; // adjust final week to true up

  const stmt = db.prepare(`
    INSERT INTO repayments (loan_id, week_number, amount_due, status)
    VALUES (@loan_id, @week_number, @amount_due, 'pending')
  `);

  amounts.forEach((amountDue, index) => {
    stmt.run({ loan_id, week_number: index + 1, amount_due: amountDue });
  });
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
  const avgScore = db.prepare(`SELECT AVG(trust_score) as avg FROM analyses`).get().avg;
  const totalDisbursed = db.prepare(`SELECT SUM(amount) as total FROM loans WHERE status IN ('active', 'completed')`).get().total;
  const activeLoans = db.prepare(`SELECT COUNT(*) as count FROM loans WHERE status = 'active'`).get().count;
  const pendingCount = db.prepare(`SELECT COUNT(*) as count FROM loans WHERE status = 'pending'`).get().count;
  const completedLoans = db.prepare(`SELECT COUNT(*) as count FROM loans WHERE status = 'completed'`).get().count;

  // Shops with at least one missed repayment on an active or completed loan
  const flaggedShops = db.prepare(`
    SELECT DISTINCT l.shop_id, l.shop_name
    FROM loans l
    JOIN repayments r ON r.loan_id = l.id
    WHERE r.status = 'missed'
  `).all();

  return {
    total_analyses: totalAnalyses,
    average_trust_score: avgScore ? Math.round(avgScore) : 0,
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
    SELECT * FROM repayments WHERE loan_id = ? AND status = 'pending' ORDER BY week_number ASC LIMIT 1
  `).get(loan_id);
}

module.exports = {
  createLoanApplication,
  getPendingLoans,
  getLoanById,
  getAllLoans,
  updateLoanStatus,
  createRepaymentSchedule,
  getRepaymentsForLoan,
  getCurrentTrustScore,
  logTrustScoreChange,
  getRepaymentById,
  updateRepayment,
  getAnalysisById,
  getTrustScoreHistory,
  getDashboardStats,
  getShopStatus,
  getNextActionableRepayment
};