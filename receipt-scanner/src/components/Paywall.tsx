import React from 'react';
import { Link } from 'react-router-dom';
import { X, Crown, Check } from 'lucide-react';
import { PaywallProps } from '../types/subscription.types';

const Paywall: React.FC<PaywallProps> = ({
  feature,
  featureDescription,
  benefits = [
    'Unlimited receipts',
    'Unlimited history',
    'Export to PDF, CSV, Excel',
    'Advanced analytics',
    'Budget tracking',
  ],
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop fade show"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="modal fade show d-block" tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
            {/* Header */}
            <div className="modal-header border-0 bg-gradient text-white" style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}>
              <div className="d-flex align-items-center gap-2">
                <Crown size={24} />
                <h5 className="modal-title mb-0 fw-bold">Premium Feature</h5>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
                aria-label="Close"
              />
            </div>

            {/* Body */}
            <div className="modal-body p-4">
              <div className="text-center mb-4">
                <h4 className="fw-bold mb-2">{feature}</h4>
                {featureDescription && (
                  <p className="text-muted">{featureDescription}</p>
                )}
              </div>

              <div className="mb-4">
                <p className="fw-semibold mb-3">Unlock with Premium:</p>
                <ul className="list-unstyled">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="d-flex align-items-start gap-2 mb-2">
                      <Check size={20} className="text-success flex-shrink-0 mt-1" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="alert alert-info mb-4">
                <strong>Only $5/month</strong> or save 20% with annual billing
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer border-0 pt-0">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onClose}
              >
                Not now
              </button>
              <Link
                to="/checkout"
                className="btn btn-primary px-4"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none'
                }}
              >
                <Crown size={18} className="me-2" style={{ display: 'inline' }} />
                Upgrade to Premium
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Paywall;
