

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Crown } from "lucide-react";
import { useAuth } from "../contexts/auth-context";
import { useSubscription } from "../contexts/subscription-context";

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { subscription, isPremium } = useSubscription();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/app');
    } else {
      navigate('/signup');
    }
  };

  const handleSubscribe = () => {
    if (isAuthenticated) {
      navigate('/checkout');
    } else {
      navigate('/signup');
    }
  };

  return (
    <div className="container py-5">
      <div className="text-center mb-5">
        <h1 className="display-4 fw-bold mb-3">Simple, Transparent Pricing</h1>
        <p className="lead text-muted mx-auto" style={{ maxWidth: "700px" }}>
          Choose the plan that's right for you. All plans include a 14-day free trial.
        </p>
        
        <div className="d-flex align-items-center justify-content-center mt-4 mb-5">
          <span className={`me-3 fw-medium ${!isAnnual ? 'text-primary' : 'text-muted'}`}>
            Monthly
          </span>
          <div className="form-check form-switch mx-2">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="billingToggle"
              checked={isAnnual}
              onChange={() => setIsAnnual(!isAnnual)}
              style={{ width: "3rem", height: "1.5rem" }}
            />
            <label className="form-check-label visually-hidden" htmlFor="billingToggle">
              Toggle billing frequency
            </label>
          </div>
          <span className={`ms-3 fw-medium ${isAnnual ? 'text-primary' : 'text-muted'}`}>
            Yearly <span className="badge bg-success bg-opacity-10 text-success ms-1">Save 20%</span>
          </span>
        </div>
      </div>

      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 mb-5">
        {/* Free Plan */}
        <div className="col">
          <div className="card h-100 shadow-sm">
            <div className="card-header bg-light py-4">
              <h3 className="card-title fw-bold">Free Plan</h3>
              <div className="mt-3">
                <span className="display-6 fw-bold">$0</span>
                <span className="text-muted ms-1">/month</span>
              </div>
              <p className="text-muted mt-2">Perfect for occasional receipt scanning</p>
            </div>
            <div className="card-body">
              <ul className="list-unstyled">
                <li className="mb-3 d-flex align-items-center">
                  <Check className="text-success me-2" size={20} />
                  <span>Up to 10 receipts per month</span>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <Check className="text-success me-2" size={20} />
                  <span>Basic receipt analysis</span>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <Check className="text-success me-2" size={20} />
                  <span>30-day receipt history</span>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <Check className="text-success me-2" size={20} />
                  <span>Email support</span>
                </li>
              </ul>
            </div>
            <div className="card-footer bg-light py-4">
              <button className="btn btn-outline-primary w-100 py-2" onClick={handleGetStarted}>
                Get Started
              </button>
            </div>
          </div>
        </div>

        {/* Premium Plan */}
        <div className="col">
          <div className="card h-100 shadow border-primary" style={{ transform: "scale(1.02)" }}>
            <div className="card-header bg-primary bg-opacity-10 py-4 position-relative">
              <div className="d-flex justify-content-between align-items-center">
                <h3 className="card-title fw-bold">Premium Plan</h3>
                {isPremium() ? (
                  <span className="badge" style={{ background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)', color: '#000' }}>
                    <Crown size={14} className="me-1" />
                    Current Plan
                  </span>
                ) : (
                  <span className="badge bg-primary">Popular</span>
                )}
              </div>
              <div className="mt-3">
                <span className="display-6 fw-bold">${isAnnual ? '4' : '5'}</span>
                <span className="text-muted ms-1">/month</span>
              </div>
              <p className="text-muted mt-2">For users who need more advanced features</p>
            </div>
            <div className="card-body">
              <ul className="list-unstyled">
                <li className="mb-3 d-flex align-items-center">
                  <Check className="text-success me-2" size={20} />
                  <span>Unlimited receipts</span>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <Check className="text-success me-2" size={20} />
                  <span>Advanced receipt analysis with categories</span>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <Check className="text-success me-2" size={20} />
                  <span>Unlimited receipt history</span>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <Check className="text-success me-2" size={20} />
                  <span>Export data to CSV/PDF</span>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <Check className="text-success me-2" size={20} />
                  <span>Priority support</span>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <Check className="text-success me-2" size={20} />
                  <span>Spending insights and reports</span>
                </li>
              </ul>
            </div>
            <div className="card-footer bg-primary bg-opacity-10 py-4">
              {isPremium() ? (
                <button className="btn btn-success w-100 py-2" onClick={() => navigate('/subscription')}>
                  <Crown size={18} className="me-2" />
                  Manage Subscription
                </button>
              ) : (
                <button className="btn btn-primary w-100 py-2" onClick={handleSubscribe}>
                  Subscribe Now
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Team Plan */}
        <div className="col">
          <div className="card h-100 shadow-sm">
            <div className="card-header bg-light py-4">
              <h3 className="card-title fw-bold">Team Plan</h3>
              <div className="mt-3">
                <span className="display-6 fw-bold">${isAnnual ? '12' : '15'}</span>
                <span className="text-muted ms-1">/month</span>
              </div>
              <p className="text-muted mt-2">For small teams and businesses</p>
            </div>
            <div className="card-body">
              <ul className="list-unstyled">
                <li className="mb-3 d-flex align-items-center">
                  <Check className="text-success me-2" size={20} />
                  <span>Everything in Premium</span>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <Check className="text-success me-2" size={20} />
                  <span>Up to 5 team members</span>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <Check className="text-success me-2" size={20} />
                  <span>Team dashboards and reports</span>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <Check className="text-success me-2" size={20} />
                  <span>Advanced expense tracking</span>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <Check className="text-success me-2" size={20} />
                  <span>Budget management</span>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <Check className="text-success me-2" size={20} />
                  <span>Dedicated account manager</span>
                </li>
              </ul>
            </div>
            <div className="card-footer bg-light py-4">
              <button className="btn btn-outline-primary w-100 py-2">
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-light rounded p-4 p-md-5 mt-5">
        <h2 className="h3 fw-bold mb-4">Frequently Asked Questions</h2>
        <div className="row row-cols-1 row-cols-md-2 g-4">
          <div className="col">
            <h3 className="h5 fw-bold mb-2">Can I upgrade or downgrade my plan?</h3>
            <p className="text-muted">
              Yes, you can upgrade or downgrade your plan at any time. Changes will take effect at the start of your
              next billing cycle.
            </p>
          </div>
          <div className="col">
            <h3 className="h5 fw-bold mb-2">Is there a contract or commitment?</h3>
            <p className="text-muted">
              No, all plans are month-to-month with no long-term contracts. You can cancel anytime.
            </p>
          </div>
          <div className="col">
            <h3 className="h5 fw-bold mb-2">What payment methods do you accept?</h3>
            <p className="text-muted">We accept all major credit cards and PayPal for payment.</p>
          </div>
          <div className="col">
            <h3 className="h5 fw-bold mb-2">Do you offer refunds?</h3>
            <p className="text-muted">
              We offer a 14-day money-back guarantee if you're not satisfied with our premium service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}