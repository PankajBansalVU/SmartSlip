import React, { useState, useEffect } from 'react';
import { Crown, Calendar, CreditCard, Download, Loader } from 'lucide-react';
import { useAuth } from '../contexts/auth-context';
import { useSubscription } from '../contexts/subscription-context';
import { subscriptionService } from '../services/subscriptionService';
import { stripeService } from '../services/stripeService';
import { Invoice } from '../types/subscription.types';
import SubscriptionBadge from '../components/SubscriptionBadge';
import UsageQuota from '../components/UsageQuota';

const SubscriptionPage: React.FC = () => {
  const { token } = useAuth();
  const { subscription, usage, isPremium, refreshSubscription } = useSubscription();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    if (isPremium() && token) {
      fetchInvoices();
    }
  }, [isPremium, token]);

  const fetchInvoices = async () => {
    if (!token) return;
    try {
      const data = await subscriptionService.getInvoices(token);
      setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const handleManageBilling = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await stripeService.redirectToPortal(token);
    } catch (error: any) {
      alert('Failed to open billing portal: ' + error.message);
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    // eslint-disable-next-line no-restricted-globals
    if (!window.confirm('Are you sure you want to cancel your subscription?')) return;
    if (!token) return;

    setCancelLoading(true);
    try {
      await subscriptionService.cancel(token);
      alert('Subscription cancelled. Access continues until end of billing period.');
      await refreshSubscription();
    } catch (error: any) {
      alert('Failed to cancel: ' + error.message);
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <h1 className="display-5 fw-bold mb-4">Subscription Management</h1>

      <div className="row g-4">
        {/* Current Plan */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title fw-bold mb-3">Current Plan</h5>
              <div className="mb-3">
                <SubscriptionBadge tier={subscription?.tier || 'free'} variant="large" />
              </div>
              <p className="text-muted">
                Status: <span className="fw-semibold">{subscription?.status}</span>
              </p>
              {subscription?.endDate && (
                <p className="text-muted">
                  <Calendar size={16} className="me-2" style={{ display: 'inline' }} />
                  Next billing: {new Date(subscription.endDate).toLocaleDateString()}
                </p>
              )}
              {subscription?.cancelAtPeriodEnd && (
                <div className="alert alert-warning">
                  Subscription will cancel at end of current period
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title fw-bold mb-3">Usage</h5>
              <UsageQuota variant="detailed" />
            </div>
          </div>
        </div>

        {/* Actions */}
        {isPremium() && (
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title fw-bold mb-3">Manage Subscription</h5>
                <div className="d-flex gap-3 flex-wrap">
                  <button
                    className="btn btn-primary"
                    onClick={handleManageBilling}
                    disabled={loading}
                  >
                    {loading ? <Loader className="spinner-border spinner-border-sm" /> : <CreditCard size={18} />}
                    <span className="ms-2">Manage Billing</span>
                  </button>
                  <button
                    className="btn btn-outline-danger"
                    onClick={handleCancelSubscription}
                    disabled={cancelLoading}
                  >
                    {cancelLoading && <Loader className="spinner-border spinner-border-sm me-2" />}
                    Cancel Subscription
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Billing History */}
        {isPremium() && invoices.length > 0 && (
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title fw-bold mb-3">Billing History</h5>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map(invoice => (
                        <tr key={invoice.payment_id}>
                          <td>{new Date(invoice.created_at).toLocaleDateString()}</td>
                          <td>{invoice.description}</td>
                          <td>${invoice.amount} {invoice.currency}</td>
                          <td>
                            <span className={`badge bg-${invoice.status === 'completed' ? 'success' : 'warning'}`}>
                              {invoice.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPage;