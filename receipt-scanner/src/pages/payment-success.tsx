import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Crown } from 'lucide-react';
import { useSubscription } from '../contexts/subscription-context';

const PaymentSuccessPage: React.FC = () => {
  const { refreshSubscription } = useSubscription();

  useEffect(() => {
    // Refresh subscription data after successful payment
    setTimeout(() => {
      refreshSubscription();
    }, 2000);
  }, []);

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 text-center">
          <div className="mb-4">
            <CheckCircle size={80} className="text-success" />
          </div>
          <h1 className="display-4 fw-bold mb-3">Welcome to Premium!</h1>
          <p className="lead mb-4">
            Your subscription is now active. You have unlimited access to all premium features.
          </p>

          <div className="card border-0 bg-light mb-4">
            <div className="card-body p-4">
              <Crown size={32} className="text-warning mb-3" />
              <h5 className="fw-bold mb-3">You now have access to:</h5>
              <ul className="list-unstyled">
                <li className="mb-2">✓ Unlimited receipt uploads</li>
                <li className="mb-2">✓ Complete history access</li>
                <li className="mb-2">✓ Export functionality</li>
                <li className="mb-2">✓ Advanced analytics</li>
              </ul>
            </div>
          </div>

          <Link to="/app" className="btn btn-primary btn-lg px-5">
            Start Using Premium Features
          </Link>

          <div className="mt-4">
            <Link to="/subscription" className="text-muted text-decoration-underline">
              Manage your subscription
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;