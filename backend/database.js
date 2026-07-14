const Database = require('better-sqlite3');
const db = new Database('merit.db');

// Table 1: every time the 4-agent pipeline runs on a shop
db.exec(`
  CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id TEXT NOT NULL,
    shop_name TEXT NOT NULL,
    trust_score INTEGER,
    trust_status TEXT,
    trust_reason TEXT,
    cluster_used INTEGER DEFAULT 0,
    cluster_explanation TEXT,
    loan_amount INTEGER,
    loan_tenure TEXT,
    loan_tier TEXT,
    coaching_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Table 2: loan applications and their approval status
db.exec(`
  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id INTEGER,
    shop_id TEXT NOT NULL,
    shop_name TEXT NOT NULL,
    amount INTEGER,
    tenure_weeks INTEGER,
    interest_tier TEXT,
    distributor_name TEXT,
    status TEXT DEFAULT 'pending',
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    FOREIGN KEY (analysis_id) REFERENCES analyses(id)
  )
`);

// Table 3: weekly repayment schedule per loan
db.exec(`
  CREATE TABLE IF NOT EXISTS repayments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id INTEGER NOT NULL,
    week_number INTEGER,
    amount_due INTEGER,
    status TEXT DEFAULT 'pending',
    trust_score_impact INTEGER,
    paid_at DATETIME,
    FOREIGN KEY (loan_id) REFERENCES loans(id)
  )
`);

// Table 4: trust score changes over time, per shop
db.exec(`
  CREATE TABLE IF NOT EXISTS trust_score_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id TEXT NOT NULL,
    score INTEGER,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('Database ready: merit.db with 4 tables created.');

module.exports = db;