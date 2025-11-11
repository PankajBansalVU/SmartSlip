import {
  SubscriptionStatusResponse,
  SubscriptionPlan,
  Invoice,
} from '../types/subscription.types';
import { API_BASE_URL } from '../config/api';

export const subscriptionService = {
  // Get current user's subscription status
  async getStatus(token: string): Promise<SubscriptionStatusResponse> {
    const response = await fetch(`${API_BASE_URL}/api/subscription/status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch subscription status');
    }

    return data;
  },

  // Get all available subscription plans
  async getPlans(): Promise<SubscriptionPlan[]> {
    const response = await fetch(`${API_BASE_URL}/api/subscription/plans`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch plans');
    }

    return data.plans;
  },

  // Cancel subscription (at period end)
  async cancel(token: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/subscription/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to cancel subscription');
    }
  },

  // Reactivate a cancelled subscription
  async reactivate(token: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/subscription/reactivate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to reactivate subscription');
    }
  },

  // Get payment history/invoices
  async getInvoices(token: string, limit: number = 10): Promise<Invoice[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/subscription/invoices?limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch invoices');
    }

    return data.invoices;
  },

  // Get usage statistics
  async getUsageStats(token: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/subscription/usage-stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch usage stats');
    }

    return data.stats;
  },
};
