// Subscription-related TypeScript interfaces and types

export type SubscriptionTier = 'free' | 'premium' | 'team';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial';
export type PlanInterval = 'month' | 'year';

export interface Subscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  startDate?: string | null;
  endDate?: string | null;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
}

export interface UsageStats {
  receiptsThisMonth: number;
  receiptLimit: number | null; // null means unlimited
  canUploadReceipt: boolean;
  receiptsRemaining: number | null; // null means unlimited
}

export interface SubscriptionFeatures {
  receiptLimit: number | null;
  historyDays: number | null;
  canExport: boolean;
  canAdvancedAnalytics: boolean;
  canScheduledReports: boolean;
  canBulkOperations: boolean;
  canCustomTags: boolean;
}

export interface SubscriptionPlan {
  plan_id: number;
  plan_name: string;
  plan_type: SubscriptionTier;
  price: string | number;
  currency: string;
  interval: PlanInterval;
  stripe_price_id?: string;
  features: SubscriptionFeatures;
}

export interface SubscriptionStatusResponse {
  success: boolean;
  subscription: Subscription;
  usage: UsageStats;
  features: SubscriptionFeatures;
}

export interface Invoice {
  payment_id: number;
  amount: string | number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  payment_method: string;
  description: string;
  stripe_invoice_id?: string;
  paid_at?: string;
  created_at: string;
}

export interface CheckoutSessionResponse {
  success: boolean;
  sessionId: string;
  url: string;
}

export interface PortalSessionResponse {
  success: boolean;
  url: string;
}

export interface UsageWarning {
  shouldWarn: boolean;
  level: 'warning' | 'critical';
  message: string;
  receiptsRemaining: number;
}

// Context type
export interface SubscriptionContextType {
  subscription: Subscription | null;
  usage: UsageStats | null;
  features: SubscriptionFeatures | null;
  isLoading: boolean;
  error: string | null;

  // Functions
  refreshSubscription: () => Promise<void>;
  checkFeatureAccess: (feature: keyof SubscriptionFeatures) => boolean;
  canUpload: () => boolean;
  getUsagePercentage: () => number;
  needsUpgrade: () => boolean;
  isPremium: () => boolean;
  isFree: () => boolean;
}

// Props types for components
export interface PaywallProps {
  feature: string;
  featureDescription?: string;
  benefits?: string[];
  isOpen: boolean;
  onClose: () => void;
}

export interface UpgradePromptProps {
  variant?: 'banner' | 'card' | 'inline';
  message?: string;
  features?: string[];
  showDismiss?: boolean;
  onDismiss?: () => void;
}

export interface UsageQuotaProps {
  variant?: 'compact' | 'detailed';
  showUpgradeLink?: boolean;
}

export interface SubscriptionBadgeProps {
  tier: SubscriptionTier;
  variant?: 'default' | 'small' | 'large';
}
