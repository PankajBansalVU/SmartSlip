import React from 'react';
import { Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';

const PaymentCancelPage: React.FC = () => {
  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 text-center">
          <div className="mb-4">
            <XCircle size={80} className="text-warning" />
          </div>
          <h1 className="display-4 fw-bold mb-3">Payment Cancelled</h1>
          <p className="lead mb-4">
            No worries! Your payment was cancelled and you haven't been charged.
          </p>

          <div className="d-flex gap-3 justify-content-center flex-wrap">
            <Link to="/checkout" className="btn btn-primary px-4">
              Try Again
            </Link>
            <Link to="/" className="btn btn-outline-secondary px-4">
              Return Home
            </Link>
          </div>

          <div className="mt-5 text-muted">
            <p>Have questions? <Link to="/pricing">View our pricing</Link> or contact support.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelPage;