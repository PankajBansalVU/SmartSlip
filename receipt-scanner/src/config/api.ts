// API Configuration
// Uses environment variable in production, localhost in development

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const API_ENDPOINTS = {
  // Auth
  login: `${API_BASE_URL}/auth/login`,
  register: `${API_BASE_URL}/auth/register`,

  // Receipts
  receipts: `${API_BASE_URL}/receipts`,
  upload: `${API_BASE_URL}/upload`,
  analyzeReceipt: `${API_BASE_URL}/analyze-receipt`,
  saveReceipt: `${API_BASE_URL}/save-receipt`,

  // Spending
  spending: `${API_BASE_URL}/api/spending`,

  // Subscription
  subscription: `${API_BASE_URL}/api/subscription`,

  // Payment
  payment: `${API_BASE_URL}/api/payment`,
};

// Log API URL on startup (helps with debugging)
console.log('🔗 API Configuration:', {
  baseUrl: API_BASE_URL,
  isProduction: process.env.NODE_ENV === 'production',
  usingEnvVar: !!process.env.REACT_APP_API_URL
});
