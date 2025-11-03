import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "./components/theme-provider"
import { Toaster } from "./components/ui/toaster"
import LandingPage from "./pages/landing"
import HomePage from "./pages/home"
import LoginPage from "./pages/login"
import SignupPage from "./pages/signup"
import HistoryPage from "./pages/history"
import ResetPasswordPage from "./pages/reset-password"
import PricingPage from "./pages/pricing"
import Navbar from "./components/navbar"
import PrivateRoute from "./components/PrivateRoute"
import { AuthProvider } from "./contexts/auth-context"
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './custom.css';
import './index.css';
import SpendingAnalysisPage from "./pages/SpendingAnalysis";
import { SubscriptionProvider } from "./contexts/subscription-context"
import CheckoutPage from "./pages/checkout"
import SubscriptionPage from "./pages/subscription"
import PaymentSuccessPage from "./pages/payment-success"
import PaymentCancelPage from "./pages/payment-cancel"
import ProfilePage from "./pages/profile"

function App() {
  return (
    <Router>
      <AuthProvider>
        <SubscriptionProvider>
          <ThemeProvider defaultTheme="light" storageKey="receipt-scanner-theme">
            <div className="min-h-screen bg-background">
              <Navbar />
              <main>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/checkout" element={<PrivateRoute><CheckoutPage /></PrivateRoute>} />
                  <Route path="/subscription" element={<PrivateRoute><SubscriptionPage /></PrivateRoute>} />
                  <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                  <Route path="/payment/success" element={<PaymentSuccessPage />} />
                  <Route path="/payment/cancel" element={<PaymentCancelPage />} />
                  <Route
                    path="/app"
                    element={
                      <PrivateRoute>
                        <HomePage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/history"
                    element={
                      <PrivateRoute>
                        <HistoryPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/spending-analysis"
                    element={
                      <PrivateRoute>
                        <SpendingAnalysisPage />
                      </PrivateRoute>
                    }
                  />
                </Routes>
              </main>
              <Toaster />
            </div>
          </ThemeProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </Router>
  )
}

export default App