import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../../api/client';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

const STATUS_BADGE = {
  pending: 'neutral',
  paid: 'success',
  missed: 'danger',
};

function formatCurrency(amount) {
  if (amount == null) return '—';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

export default function RepaymentTracker({ shopId }) {
  const [loan, setLoan] = useState(null);
  const [repayments, setRepayments] = useState([]);
  const [trustHistory, setTrustHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actioningId, setActioningId] = useState(null);
  const [lastDelta, setLastDelta] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const allLoans = await api.getAllLoans();
      const activeLoan = (Array.isArray(allLoans) ? allLoans : []).find(
        (l) => l.shop_id === shopId && l.status === 'active'
      );

      if (!activeLoan) {
        setLoan(null);
        setRepayments([]);
        setLoading(false);
        return;
      }

      const [repaymentsRes, historyRes] = await Promise.all([
         api.getRepayments(activeLoan.id),
         api.getTrustHistory(shopId),
      ]);

      setLoan(activeLoan);
      setRepayments(Array.isArray(repaymentsRes) ? repaymentsRes : []);
      setTrustHistory(Array.isArray(historyRes) ? historyRes : []);
    } catch (err) {
      setError('Could not load repayment schedule.');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    load();
  }, [load]);

  const currentTrustScore = useMemo(() => {
    if (!trustHistory.length) return null;
    return trustHistory[trustHistory.length - 1]?.score ?? null;
  }, [trustHistory]);

  const handleSimulate = async (repaymentId, outcome) => {
    setActioningId(repaymentId);
    setLastDelta(null);
    try {
      const scoreBefore = currentTrustScore;
      await api.simulateRepayment(repaymentId, outcome);
      await load();
      setLastDelta({ repaymentId, scoreBefore });
    } catch (err) {
      setError('Could not record that outcome. Please try again.');
    } finally {
      setActioningId(null);
    }
  };

  if (loading) return null;
  if (!loan) return null;

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-ink">Repayment schedule</h3>
          <p className="text-sm text-plum-soft">
            Simulate each week to see the trust score move in real time.
          </p>
        </div>
        {currentTrustScore != null && (
          <div className="flex flex-col items-end">
            <span className="text-xs uppercase tracking-wide text-plum-soft">
              Current trust score
            </span>
            <span className="text-2xl font-bold text-emerald">{currentTrustScore}</span>
          </div>
        )}
      </div>

      {error && <p className="text-sm font-medium text-danger">{error}</p>}

      <div className="flex flex-col gap-2">
        {repayments.map((r) => {
          const isBusy = actioningId === r.id;
          const justUpdated = lastDelta?.repaymentId === r.id;
          return (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-[12px] border border-border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-ink">Week {r.week_number}</span>
                <span className="text-sm text-plum-soft">{formatCurrency(r.amount_due)}</span>
                <Badge variant={STATUS_BADGE[r.status] ?? 'neutral'}>{r.status}</Badge>
                {justUpdated && currentTrustScore != null && lastDelta.scoreBefore != null && (
                  <span className="text-xs font-medium text-emerald">
                    {currentTrustScore > lastDelta.scoreBefore ? '+' : ''}
                    {currentTrustScore - lastDelta.scoreBefore} pts
                  </span>
                )}
              </div>

              {r.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={isBusy}
                    onClick={() => handleSimulate(r.id, 'paid')}
                  >
                    Mark paid
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={isBusy}
                    onClick={() => handleSimulate(r.id, 'missed')}
                  >
                    Mark missed
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}