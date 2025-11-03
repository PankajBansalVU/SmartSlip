import React, { useState } from 'react';
import { User, Mail, Crown, Calendar, CreditCard, Settings } from 'lucide-react';
import { useAuth } from '../contexts/auth-context';
import { useSubscription } from '../contexts/subscription-context';
import { useNavigate } from 'react-router-dom';
import SubscriptionBadge from '../components/SubscriptionBadge';
import UsageQuota from '../components/UsageQuota';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { subscription, usage, isPremium } = useSubscription();
  const navigate = useNavigate();

  return (
    <div className="container py-5">
      <h1 className="display-5 fw-bold mb-4">My Profile</h1>

      <div className="row g-4">
        {/* User Information Card */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title fw-bold mb-4">
                <User size={20} className="me-2" style={{ display: 'inline' }} />
                Account Information
              </h5>

              <div className="mb-3">
                <label className="text-muted small mb-1">Name</label>
                <p className="fw-semibold mb-0">{user?.name || 'N/A'}</p>
              </div>

              <div className="mb-3">
                <label className="text-muted small mb-1">
                  <Mail size={14} className="me-1" style={{ display: 'inline' }} />
                  Email
                </label>
                <p className="fw-semibold mb-0">{user?.email || 'N/A'}</p>
              </div>

              <div className="mb-3">
                <label className="text-muted small mb-1">Account Type</label>
                <div>
                  <SubscriptionBadge tier={subscription?.tier || 'free'} variant="large" />
                </div>
              </div>

              {subscription?.startDate && (
                <div className="mb-3">
                  <label className="text-muted small mb-1">
                    <Calendar size={14} className="me-1" style={{ display: 'inline' }} />
                    Member Since
                  </label>
                  <p className="fw-semibold mb-0">
                    {new Date(subscription.startDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subscription Details Card */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title fw-bold mb-4">
                <Crown size={20} className="me-2" style={{ display: 'inline' }} />
                Subscription Details
              </h5>

              {isPremium() ? (
                <>
                  <div className="mb-3">
                    <label className="text-muted small mb-1">Status</label>
                    <p className="fw-semibold mb-0 text-success">
                      {subscription?.status || 'Active'}
                    </p>
                  </div>

                  {subscription?.endDate && (
                    <div className="mb-3">
                      <label className="text-muted small mb-1">Next Billing Date</label>
                      <p className="fw-semibold mb-0">
                        {new Date(subscription.endDate).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="text-muted small mb-1">Usage This Month</label>
                    <UsageQuota variant="detailed" />
                  </div>

                  <button
                    className="btn btn-outline-primary w-100"
                    onClick={() => navigate('/subscription')}
                  >
                    <CreditCard size={18} className="me-2" />
                    Manage Subscription
                  </button>
                </>
              ) : (
                <>
                  <div className="alert alert-info">
                    <p className="mb-3">You're currently on the Free plan.</p>
                    <p className="mb-3 small">
                      <strong>Current limits:</strong><br />
                      • 10 receipts per month<br />
                      • 30-day history<br />
                      • Basic analytics only
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="text-muted small mb-1">Usage This Month</label>
                    <UsageQuota variant="detailed" />
                  </div>

                  <button
                    className="btn btn-primary w-100"
                    onClick={() => navigate('/checkout')}
                  >
                    <Crown size={18} className="me-2" />
                    Upgrade to Premium
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title fw-bold mb-4">
                <Settings size={20} className="me-2" style={{ display: 'inline' }} />
                Quick Actions
              </h5>

              <div className="row g-3">
                <div className="col-md-3">
                  <button
                    className="btn btn-outline-secondary w-100"
                    onClick={() => navigate('/app')}
                  >
                    Scan Receipt
                  </button>
                </div>
                <div className="col-md-3">
                  <button
                    className="btn btn-outline-secondary w-100"
                    onClick={() => navigate('/history')}
                  >
                    View History
                  </button>
                </div>
                <div className="col-md-3">
                  <button
                    className="btn btn-outline-secondary w-100"
                    onClick={() => navigate('/spending-analysis')}
                  >
                    Spending Analysis
                  </button>
                </div>
                <div className="col-md-3">
                  <button
                    className="btn btn-outline-secondary w-100"
                    onClick={() => navigate('/pricing')}
                  >
                    View Pricing
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
