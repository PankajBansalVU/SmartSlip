import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './auth-context';
import {
  Subscription,
  UsageStats,
  SubscriptionFeatures,
  SubscriptionContextType,
} from '../types/subscription.types';

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const { isAuthenticated, token } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [features, setFeatures] = useState<SubscriptionFeatures | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  // Fetch subscription status from backend
  const fetchSubscriptionStatus = async () => {
    if (!isAuthenticated || !token) {
      // Reset to default free values for non-authenticated users
      setSubscription({ tier: 'free', status: 'active' });
      setUsage({
        receiptsThisMonth: 0,
        receiptLimit: 10,
        canUploadReceipt: true,
        receiptsRemaining: 10,
      });
      setFeatures({
        receiptLimit: 10,
        historyDays: 30,
        canExport: false,
        canAdvancedAnalytics: false,
        canScheduledReports: false,
        canBulkOperations: false,
        canCustomTags: false,
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/subscription/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setSubscription(data.subscription);
        setUsage(data.usage);
        setFeatures(data.features);
      } else {
        throw new Error(data.message || 'Failed to fetch subscription status');
      }
    } catch (err: any) {
      console.error('Error fetching subscription:', err);
      setError(err.message || 'Failed to load subscription data');

      // Set default free tier on error
      setSubscription({ tier: 'free', status: 'active' });
      setUsage({
        receiptsThisMonth: 0,
        receiptLimit: 10,
        canUploadReceipt: true,
        receiptsRemaining: 10,
      });
      setFeatures({
        receiptLimit: 10,
        historyDays: 30,
        canExport: false,
        canAdvancedAnalytics: false,
        canScheduledReports: false,
        canBulkOperations: false,
        canCustomTags: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh subscription data
  const refreshSubscription = async () => {
    await fetchSubscriptionStatus();
  };

  // Check if user has access to a specific feature
  const checkFeatureAccess = (feature: keyof SubscriptionFeatures): boolean => {
    if (!features) return false;
    return Boolean(features[feature]);
  };

  // Check if user can upload receipts
  const canUpload = (): boolean => {
    return usage?.canUploadReceipt ?? false;
  };

  // Get usage percentage (for progress bars)
  const getUsagePercentage = (): number => {
    if (!usage || usage.receiptLimit === null) return 0; // Unlimited
    if (usage.receiptLimit === 0) return 100;
    return Math.round((usage.receiptsThisMonth / usage.receiptLimit) * 100);
  };

  // Check if user needs to upgrade
  const needsUpgrade = (): boolean => {
    return subscription?.tier === 'free';
  };

  // Check if user is premium
  const isPremium = (): boolean => {
    return subscription?.tier === 'premium';
  };

  // Check if user is free
  const isFree = (): boolean => {
    return subscription?.tier === 'free';
  };

  // Fetch subscription status when authenticated state changes
  useEffect(() => {
    fetchSubscriptionStatus();
  }, [isAuthenticated, token]);

  const value: SubscriptionContextType = {
    subscription,
    usage,
    features,
    isLoading,
    error,
    refreshSubscription,
    checkFeatureAccess,
    canUpload,
    getUsagePercentage,
    needsUpgrade,
    isPremium,
    isFree,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
