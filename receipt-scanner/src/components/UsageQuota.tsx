import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, Crown } from 'lucide-react';
import { useSubscription } from '../contexts/subscription-context';
import { UsageQuotaProps } from '../types/subscription.types';

const UsageQuota: React.FC<UsageQuotaProps> = ({
  variant = 'detailed',
  showUpgradeLink = true,
}) => {
  const { usage, subscription, getUsagePercentage, isPremium } = useSubscription();

  if (!usage || isPremium()) {
    return (
      <div className="d-flex align-items-center gap-2 text-success small">
        <Crown size={16} />
        <span className="fw-semibold">Premium • Unlimited</span>
      </div>
    );
  }

  const percentage = getUsagePercentage();
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  let progressColor = 'bg-success';
  if (percentage >= 90) progressColor = 'bg-danger';
  else if (percentage >= 70) progressColor = 'bg-warning';

  if (variant === 'compact') {
    return (
      <div className="d-flex align-items-center gap-2">
        <span className="small">
          {usage.receiptsThisMonth}/{usage.receiptLimit || 0} receipts
        </span>
        {isNearLimit && !isAtLimit && (
          <AlertCircle size={16} className="text-warning" />
        )}
        {isAtLimit && <AlertCircle size={16} className="text-danger" />}
      </div>
    );
  }

  return (
    <div className="usage-quota-card">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="fw-semibold small">Monthly Receipts</span>
        <span className={`badge ${isAtLimit ? 'bg-danger' : isNearLimit ? 'bg-warning' : 'bg-primary'}`}>
          {usage.receiptsThisMonth}/{usage.receiptLimit || 0}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="progress mb-2" style={{ height: '8px' }}>
        <div
          className={`progress-bar ${progressColor}`}
          role="progressbar"
          style={{ width: `${Math.min(percentage, 100)}%` }}
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Status Message */}
      {isAtLimit ? (
        <div className="d-flex align-items-start gap-2 text-danger small">
          <AlertCircle size={16} className="flex-shrink-0 mt-1" />
          <div>
            <div className="fw-semibold">Limit reached</div>
            {showUpgradeLink && (
              <Link to="/checkout" className="text-danger text-decoration-underline">
                Upgrade for unlimited receipts
              </Link>
            )}
          </div>
        </div>
      ) : isNearLimit ? (
        <div className="d-flex align-items-start gap-2 text-warning small">
          <AlertCircle size={16} className="flex-shrink-0 mt-1" />
          <div>
            <div>Only {usage.receiptsRemaining} receipts remaining</div>
            {showUpgradeLink && (
              <Link to="/checkout" className="text-warning text-decoration-underline">
                Upgrade to Premium
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="d-flex align-items-center gap-2 text-success small">
          <CheckCircle size={16} />
          <span>{usage.receiptsRemaining} receipts remaining</span>
        </div>
      )}
    </div>
  );
};

export default UsageQuota;
