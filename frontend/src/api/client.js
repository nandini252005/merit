const BASE_URL = 'http://localhost:5000';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Something went wrong' }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}


export const api = {
  getShops: () => request('/api/shops'),
  analyzeShop: (shopId) => request(`/api/analyze/${shopId}`),
  applyForLoan: (data) => request('/api/loans/apply', { method: 'POST', body: JSON.stringify(data) }),
  getPendingLoans: () => request('/api/loans/pending'),
  getAllLoans: () => request('/api/loans/all'),
  approveLoan: (loanId) => request(`/api/loans/${loanId}/approve`, { method: 'POST' }),
  rejectLoan: (loanId) => request(`/api/loans/${loanId}/reject`, { method: 'POST' }),
  getRepayments: (loanId) => request(`/api/loans/${loanId}/repayments`),
  simulateRepayment: (repaymentId, outcome) =>
    request(`/api/repayments/${repaymentId}/simulate`, { method: 'POST', body: JSON.stringify({ outcome }) }),
  getTrustHistory: (shopId) => request(`/api/shops/${shopId}/trust-history`),
  getDashboardStats: () => request('/api/dashboard/stats'),
  getShopAnalyses: (shopId) => request(`/api/shops/${shopId}/analyses`),
  getShopStatus: (shopId) => request(`/api/shops/${shopId}/status`),
  graceTick: (loanId) => request(`/api/loans/${loanId}/grace-tick`, { method: 'POST' }),
  settleGrace: (loanId) => request(`/api/loans/${loanId}/settle-grace`, { method: 'POST' }),
  getOwnerContext: (ownerId) => request(`/api/owners/${ownerId}/context`),
  enterGraceSmoothing: (loanId) => request(`/api/loans/${loanId}/enter-grace-smoothing`, { method: 'POST' }),
  gracePreview: (loanId) => request(`/api/loans/${loanId}/grace-preview`),
  resetDemoDatabase: () =>
  request('/api/demo/reset', {
    method: 'POST',
  })
};