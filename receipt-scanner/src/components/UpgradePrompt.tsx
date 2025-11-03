import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, X, ArrowRight } from 'lucide-react';
import { UpgradePromptProps } from '../types/subscription.types';

const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  variant = 'banner',
  message = 'Upgrade to Premium for unlimited access',
  features,
  showDismiss = false,
  onDismiss,
}) => {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  if (dismissed) return null;

  if (variant === 'banner') {
    return (
      <div className="alert alert-primary d-flex align-items-center justify-content-between mb-3 shadow-sm border-0" style={{
        background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)'
      }}>
        <div className="d-flex align-items-center gap-3 flex-grow-1">
          <Crown size={24} className="text-primary" />
          <div>
            <strong>{message}</strong>
            {features && features.length > 0 && (
              <div className="small text-muted mt-1">
                {features.join(' • ')}
              </div>
            )}
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link to="/checkout" className="btn btn-primary btn-sm">
            Upgrade Now
            <ArrowRight size={16} className="ms-1" style={{ display: 'inline' }} />
          </Link>
          {showDismiss && (
            <button
              className="btn btn-link text-muted p-1"
              onClick={handleDismiss}
              aria-label="Dismiss"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="card border-primary shadow-sm mb-3">
        <div className="card-body">
          {showDismiss && (
            <button
              className="btn btn-link text-muted p-0 float-end"
              onClick={handleDismiss}
              aria-label="Dismiss"
            >
              <X size={20} />
            </button>
          )}
          <div className="d-flex align-items-start gap-3">
            <div className="p-2 bg-primary bg-opacity-10 rounded-circle">
              <Crown size={24} className="text-primary" />
            </div>
            <div className="flex-grow-1">
              <h6 className="fw-bold mb-2">Upgrade to Premium</h6>
              <p className="text-muted mb-3">{message}</p>
              {features && features.length > 0 && (
                <ul className="list-unstyled small mb-3">
                  {features.map((feature, index) => (
                    <li key={index} className="mb-1">✓ {feature}</li>
                  ))}
                </ul>
              )}
              <Link to="/checkout" className="btn btn-primary btn-sm">
                Get Premium
                <ArrowRight size={16} className="ms-1" style={{ display: 'inline' }} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // variant === 'inline'
  return (
    <div className="d-inline-flex align-items-center gap-2 text-primary small">
      <Crown size={16} />
      <span>{message}</span>
      <Link to="/checkout" className="text-decoration-underline">
        Upgrade
      </Link>
    </div>
  );
};

export default UpgradePrompt;
