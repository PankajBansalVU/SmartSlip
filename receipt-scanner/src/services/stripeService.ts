import {
  CheckoutSessionResponse,
  PortalSessionResponse,
} from '../types/subscription.types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const stripeService = {
  // Create a Stripe checkout session for subscription
  async createCheckoutSession(
    token: string,
    priceId: string,
    planType: 'monthly' | 'annual'
  ): Promise<CheckoutSessionResponse> {
    const response = await fetch(`${API_BASE_URL}/api/payment/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priceId, planType }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to create checkout session');
    }

    return data;
  },

  // Create a Stripe customer portal session
  async createPortalSession(token: string): Promise<PortalSessionResponse> {
    const response = await fetch(`${API_BASE_URL}/api/payment/create-portal-session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to create portal session');
    }

    return data;
  },

  // Redirect to checkout
  async redirectToCheckout(
    token: string,
    priceId: string,
    planType: 'monthly' | 'annual'
  ): Promise<void> {
    try {
      const { url } = await this.createCheckoutSession(token, priceId, planType);
      window.location.href = url;
    } catch (error) {
      console.error('Error redirecting to checkout:', error);
      throw error;
    }
  },

  // Redirect to customer portal
  async redirectToPortal(token: string): Promise<void> {
    try {
      const { url } = await this.createPortalSession(token);
      window.location.href = url;
    } catch (error) {
      console.error('Error redirecting to portal:', error);
      throw error;
    }
  },
};
