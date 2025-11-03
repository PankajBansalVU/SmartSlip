import React from 'react';
import { Crown, User } from 'lucide-react';
import { SubscriptionBadgeProps } from '../types/subscription.types';

const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({
  tier,
  variant = 'default',
}) => {
  if (tier === 'free') {
    if (variant === 'small') {
      return (
        <span className="badge bg-secondary small">Free</span>
      );
    }
    return (
      <span className="badge bg-secondary">
        <User size={14} className="me-1" style={{ display: 'inline' }} />
        Free
      </span>
    );
  }

  if (tier === 'premium') {
    const badgeStyle = {
      background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
      color: '#000',
      fontWeight: 600,
    };

    if (variant === 'small') {
      return (
        <span className="badge small" style={badgeStyle}>
          Premium
        </span>
      );
    }

    if (variant === 'large') {
      return (
        <span className="badge px-3 py-2" style={badgeStyle}>
          <Crown size={18} className="me-2" style={{ display: 'inline' }} />
          Premium
        </span>
      );
    }

    return (
      <span className="badge" style={badgeStyle}>
        <Crown size={14} className="me-1" style={{ display: 'inline' }} />
        Premium
      </span>
    );
  }

  if (tier === 'team') {
    return (
      <span className="badge bg-info">
        <Crown size={14} className="me-1" style={{ display: 'inline' }} />
        Team
      </span>
    );
  }

  return null;
};

export default SubscriptionBadge;
