import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Check, Loader } from 'lucide-react';
import { useAuth } from '../contexts/auth-context';
import { subscriptionService } from '../services/subscriptionService';
import { stripeService } from '../services/stripeService';
import { SubscriptionPlan } from '../types/subscription.types';

const CheckoutPage: React.FC = () => {
  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<number | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);

  // Debug: Check API URL
  console.log('API URL:', process.env.REACT_APP_API_URL);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchPlans();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPlans = async () => {
    try {
      const allPlans = await subscriptionService.getPlans();
      const premiumPlans = allPlans.filter(p => p.plan_type === 'premium');
      setPlans(premiumPlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    if (!token) return;

    setProcessingPlan(plan.plan_id);
    try {
      // Convert interval format: 'month' -> 'monthly', 'year' -> 'annual'
      const planType = plan.interval === 'year' ? 'annual' : 'monthly';
      await stripeService.redirectToCheckout(
        token,
        plan.stripe_price_id || '',
        planType
      );
    } catch (error: any) {
      alert('Failed to start checkout: ' + error.message);
      setProcessingPlan(null);
    }
  };

  const displayedPlans = plans.filter(p =>
    isAnnual ? p.interval === 'year' : p.interval === 'month'
  );

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <Loader className="spinner-border text-primary" />
        <p className="mt-3">Loading plans...</p>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="text-center mb-5">
        <h1 className="display-4 fw-bold mb-3">Upgrade to Premium</h1>
        <p className="lead text-muted">Unlock unlimited receipts and advanced features</p>

        {/* Annual Toggle */}
        <div className="d-flex align-items-center justify-content-center gap-3 mt-4">
          <span className={!isAnnual ? 'fw-bold' : 'text-muted'}>Monthly</span>
          <div className="form-check form-switch">
            <input
              className="form-check-input toggle-switch-lg"
              type="checkbox"
              checked={isAnnual}
              onChange={() => setIsAnnual(!isAnnual)}
              aria-label="Toggle between monthly and annual billing"
            />
          </div>
          <span className={isAnnual ? 'fw-bold' : 'text-muted'}>
            Annual <span className="badge bg-success">Save 20%</span>
          </span>
        </div>
      </div>

      <div className="row justify-content-center">
        {displayedPlans.map(plan => (
          <div key={plan.plan_id} className="col-md-6 col-lg-5 mb-4">
            <div className="card border-primary shadow-lg h-100">
              <div className="card-header bg-primary text-white text-center py-3">
                <Crown size={32} className="mb-2" />
                <h3 className="fw-bold mb-0">{plan.plan_name}</h3>
              </div>
              <div className="card-body p-4">
                <div className="text-center mb-4">
                  <h2 className="display-4 fw-bold">
                    ${plan.interval === 'year' ? '48' : '5'}
                    <small className="text-muted fs-6">/{plan.interval === 'year' ? 'year' : 'month'}</small>
                  </h2>
                  {plan.interval === 'year' && (
                    <p className="text-success small">That's only $4/month!</p>
                  )}
                </div>

                <ul className="list-unstyled mb-4">
                  <li className="mb-3 d-flex align-items-start">
                    <Check size={20} className="text-success flex-shrink-0 me-2 mt-1" />
                    <span>Unlimited receipt uploads</span>
                  </li>
                  <li className="mb-3 d-flex align-items-start">
                    <Check size={20} className="text-success flex-shrink-0 me-2 mt-1" />
                    <span>Unlimited history access</span>
                  </li>
                  <li className="mb-3 d-flex align-items-start">
                    <Check size={20} className="text-success flex-shrink-0 me-2 mt-1" />
                    <span>Export to PDF, CSV, Excel</span>
                  </li>
                  <li className="mb-3 d-flex align-items-start">
                    <Check size={20} className="text-success flex-shrink-0 me-2 mt-1" />
                    <span>Advanced analytics dashboard</span>
                  </li>
                  <li className="mb-3 d-flex align-items-start">
                    <Check size={20} className="text-success flex-shrink-0 me-2 mt-1" />
                    <span>Budget tracking & alerts</span>
                  </li>
                  <li className="mb-3 d-flex align-items-start">
                    <Check size={20} className="text-success flex-shrink-0 me-2 mt-1" />
                    <span>Priority customer support</span>
                  </li>
                </ul>

                <button
                  className="btn btn-primary btn-lg w-100"
                  onClick={() => handleUpgrade(plan)}
                  disabled={processingPlan === plan.plan_id}
                >
                  {processingPlan === plan.plan_id ? (
                    <>
                      <Loader className="spinner-border spinner-border-sm me-2" />
                      Processing...
                    </>
                  ) : (
                    'Subscribe Now'
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-4 text-muted small">
        <p>Secure checkout powered by Stripe</p>
        <p>Cancel anytime. No questions asked.</p>
      </div>
    </div>
  );
};

export default CheckoutPage;