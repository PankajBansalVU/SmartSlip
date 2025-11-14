import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Camera,
  Sparkles,
  TrendingUp,
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
  Scan,
  BarChart3,
  Clock
} from 'lucide-react';
import { useAuth } from '../contexts/auth-context';

const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to scanner page
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app');
    }
  }, [isAuthenticated, navigate]);

  // Don't render landing page for authenticated users
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 text-white py-5 py-lg-5">
        <div className="container">
          <div className="row align-items-center min-vh-75">
            <div className="col-lg-6 text-center text-lg-start mb-4 mb-lg-0">
              <h1 className="display-3 fw-bold mb-4 animate-fade-in">
                Stop Losing Receipts, Start Tracking Spending 💸
              </h1>
              <p className="lead fs-4 mb-4 opacity-90">
                Scan receipts in seconds with AI. Get instant insights into your spending.
                Never lose track of expenses again.
              </p>
              <div className="d-flex gap-3 justify-content-center justify-content-lg-start flex-wrap">
                <Link
                  to="/signup"
                  className="btn btn-light btn-lg px-4 py-3 fw-semibold d-flex align-items-center gap-2 shadow-lg hover-lift"
                >
                  Get Started Free
                  <ArrowRight size={20} />
                </Link>
                <Link
                  to="/login"
                  className="btn btn-outline-light btn-lg px-4 py-3 fw-semibold hover-lift"
                >
                  Sign In
                </Link>
              </div>
              <p className="mt-3 small opacity-75">
                <CheckCircle size={16} className="me-1" style={{ display: 'inline' }} />
                No credit card required • Free forever plan
              </p>
            </div>
            <div className="col-lg-6 text-center">
              <div className="hero-image-container p-4">
                <div className="receipt-mockup bg-white rounded-4 shadow-lg p-4 mx-auto" style={{ maxWidth: '400px' }}>
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div className="bg-primary bg-opacity-10 rounded-circle p-3">
                      <Scan size={32} className="text-primary" />
                    </div>
                    <div className="text-start">
                      <h6 className="mb-0 text-dark fw-bold">Receipt Scanned</h6>
                      <small className="text-muted">Just now</small>
                    </div>
                  </div>
                  <div className="bg-light rounded-3 p-3 text-start">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-dark">Whole Foods Market</span>
                      <span className="fw-bold text-dark">$47.82</span>
                    </div>
                    <div className="small text-muted mb-2">
                      <div>Items: 12 • Category: Groceries</div>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                      <div className="progress-bar bg-success" style={{ width: '100%' }}></div>
                    </div>
                    <small className="text-success d-block mt-2">
                      <CheckCircle size={14} style={{ display: 'inline' }} /> Analyzed by AI
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section py-5 bg-light">
        <div className="container py-4">
          <div className="text-center mb-5">
            <h2 className="display-5 fw-bold mb-3">Everything You Need to Track Expenses</h2>
            <p className="lead text-muted">Powerful features that make expense tracking actually enjoyable</p>
          </div>

          <div className="row g-4">
            <div className="col-md-6 col-lg-3">
              <div className="feature-card card border-0 shadow-sm h-100 hover-lift">
                <div className="card-body text-center p-4">
                  <div className="icon-wrapper bg-primary bg-opacity-10 rounded-circle p-3 d-inline-flex mb-3">
                    <Camera size={32} className="text-primary" />
                  </div>
                  <h5 className="card-title fw-bold mb-2">Instant Scanning</h5>
                  <p className="card-text text-muted">
                    Snap a photo or upload receipts. Works with any receipt format.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-lg-3">
              <div className="feature-card card border-0 shadow-sm h-100 hover-lift">
                <div className="card-body text-center p-4">
                  <div className="icon-wrapper bg-success bg-opacity-10 rounded-circle p-3 d-inline-flex mb-3">
                    <Sparkles size={32} className="text-success" />
                  </div>
                  <h5 className="card-title fw-bold mb-2">AI-Powered Analysis</h5>
                  <p className="card-text text-muted">
                    Auto-categorize items, extract details, and organize everything.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-lg-3">
              <div className="feature-card card border-0 shadow-sm h-100 hover-lift">
                <div className="card-body text-center p-4">
                  <div className="icon-wrapper bg-info bg-opacity-10 rounded-circle p-3 d-inline-flex mb-3">
                    <TrendingUp size={32} className="text-info" />
                  </div>
                  <h5 className="card-title fw-bold mb-2">Smart Analytics</h5>
                  <p className="card-text text-muted">
                    Beautiful charts and insights show where your money goes.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-lg-3">
              <div className="feature-card card border-0 shadow-sm h-100 hover-lift">
                <div className="card-body text-center p-4">
                  <div className="icon-wrapper bg-warning bg-opacity-10 rounded-circle p-3 d-inline-flex mb-3">
                    <Shield size={32} className="text-warning" />
                  </div>
                  <h5 className="card-title fw-bold mb-2">Secure Storage</h5>
                  <p className="card-text text-muted">
                    Your receipts are encrypted and backed up in the cloud.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section py-5">
        <div className="container py-4">
          <div className="text-center mb-5">
            <h2 className="display-5 fw-bold mb-3">How It Works</h2>
            <p className="lead text-muted">Three simple steps to organized finances</p>
          </div>

          <div className="row g-4 align-items-center">
            <div className="col-lg-4">
              <div className="text-center">
                <div className="step-number bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                     style={{ width: '60px', height: '60px', fontSize: '24px', fontWeight: 'bold' }}>
                  1
                </div>
                <div className="step-icon mb-3">
                  <Camera size={48} className="text-primary" />
                </div>
                <h4 className="fw-bold mb-2">Snap or Upload</h4>
                <p className="text-muted">
                  Take a photo of your receipt or upload from your device
                </p>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="text-center">
                <div className="step-number bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                     style={{ width: '60px', height: '60px', fontSize: '24px', fontWeight: 'bold' }}>
                  2
                </div>
                <div className="step-icon mb-3">
                  <Zap size={48} className="text-success" />
                </div>
                <h4 className="fw-bold mb-2">AI Analyzes</h4>
                <p className="text-muted">
                  Our AI extracts items, prices, and categories automatically
                </p>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="text-center">
                <div className="step-number bg-info text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                     style={{ width: '60px', height: '60px', fontSize: '24px', fontWeight: 'bold' }}>
                  3
                </div>
                <div className="step-icon mb-3">
                  <BarChart3 size={48} className="text-info" />
                </div>
                <h4 className="fw-bold mb-2">Track & Organize</h4>
                <p className="text-muted">
                  View insights, search receipts, and export reports anytime
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats/Social Proof Section */}
      <section className="stats-section py-5 bg-dark text-white">
        <div className="container py-4">
          <div className="row g-4 text-center">
            <div className="col-md-4">
              <div className="stat-item">
                <h2 className="display-4 fw-bold mb-2">10K+</h2>
                <p className="lead mb-0">Receipts Scanned</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="stat-item">
                <h2 className="display-4 fw-bold mb-2">98%</h2>
                <p className="lead mb-0">Accuracy Rate</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="stat-item">
                <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                  <Clock size={40} />
                  <h2 className="display-4 fw-bold mb-0">&lt;3s</h2>
                </div>
                <p className="lead mb-0">Average Scan Time</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="pricing-teaser-section py-5 bg-light">
        <div className="container py-4 text-center">
          <h2 className="display-5 fw-bold mb-3">Start Free, Upgrade Anytime</h2>
          <p className="lead text-muted mb-4">
            Get started with our free plan. No credit card required.
          </p>
          <div className="row justify-content-center g-4 mb-4">
            <div className="col-md-4">
              <div className="card border-primary h-100">
                <div className="card-body p-4">
                  <h5 className="card-title fw-bold">Free</h5>
                  <h3 className="display-6 fw-bold mb-3">$0<small className="text-muted fs-6">/mo</small></h3>
                  <ul className="list-unstyled text-start mb-4">
                    <li className="mb-2"><CheckCircle size={18} className="text-success me-2" style={{ display: 'inline' }} />10 scans/month</li>
                    <li className="mb-2"><CheckCircle size={18} className="text-success me-2" style={{ display: 'inline' }} />Spending dashboard</li>
                    <li className="mb-2"><CheckCircle size={18} className="text-success me-2" style={{ display: 'inline' }} />Cloud storage</li>
                  </ul>
                  <Link to="/signup" className="btn btn-outline-primary w-100">Get Started</Link>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-success h-100 shadow-lg position-relative">
                <div className="position-absolute top-0 start-50 translate-middle">
                  <span className="badge bg-success px-3 py-2">Most Popular</span>
                </div>
                <div className="card-body p-4">
                  <h5 className="card-title fw-bold">Premium</h5>
                  <h3 className="display-6 fw-bold mb-3">$5<small className="text-muted fs-6">/mo</small></h3>
                  <ul className="list-unstyled text-start mb-4">
                    <li className="mb-2"><CheckCircle size={18} className="text-success me-2" style={{ display: 'inline' }} />Unlimited scans</li>
                    <li className="mb-2"><CheckCircle size={18} className="text-success me-2" style={{ display: 'inline' }} />Spending dashboard</li>
                    <li className="mb-2"><CheckCircle size={18} className="text-success me-2" style={{ display: 'inline' }} />Export reports</li>
                    <li className="mb-2"><CheckCircle size={18} className="text-success me-2" style={{ display: 'inline' }} />Priority support</li>
                  </ul>
                  <Link to="/signup" className="btn btn-success w-100">Get Started</Link>
                </div>
              </div>
            </div>
          </div>
          <Link to="/pricing" className="btn btn-link text-decoration-none">
            View all pricing plans <ArrowRight size={16} style={{ display: 'inline' }} />
          </Link>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="final-cta-section py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container py-5 text-center">
          <h2 className="display-4 fw-bold mb-3">Ready to Get Organized?</h2>
          <p className="lead mb-4 fs-4">
            Join thousands of users who never lose receipts anymore
          </p>
          <Link
            to="/signup"
            className="btn btn-light btn-lg px-5 py-3 fw-semibold shadow-lg hover-lift"
          >
            Start Free Today
          </Link>
          <p className="mt-3 small opacity-75">
            Already have an account? <Link to="/login" className="text-white fw-bold text-decoration-underline">Sign in here</Link>
          </p>
        </div>
      </section>

      <style>{`
        .min-vh-75 {
          min-height: 75vh;
        }

        .hover-lift {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15) !important;
        }

        .animate-fade-in {
          animation: fadeIn 0.8s ease-in;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .receipt-mockup {
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .feature-card {
          transition: all 0.3s ease;
        }

        .feature-card:hover {
          transform: translateY(-8px);
        }

        .bg-gradient-to-br {
          background: linear-gradient(135deg, #9333ea 0%, #2563eb 50%, #06b6d4 100%);
        }

        .bg-gradient-to-r {
          background: linear-gradient(90deg, #2563eb 0%, #9333ea 100%);
        }

        @media (max-width: 991px) {
          .hero-section {
            padding-top: 3rem !important;
            padding-bottom: 3rem !important;
          }

          .display-3 {
            font-size: 2.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
