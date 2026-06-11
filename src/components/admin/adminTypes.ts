export interface AdminOverviewStats {
  usersTotal: number;
  usersFemale: number;
  usersMale: number;
  adminsTotal: number;
  cyclesTotal: number;
  symptomsTotal: number;
  notificationsTotal: number;
  unreadNotifications: number;
  chatMessagesTotal: number;
}

export interface AdminFinancialReport {
  estimatedPaidUsers: number;
  estimatedMrrUsd: number;
  estimatedAiCostMonthlyUsd: number;
  infraCostUsd: number;
  estimatedGrossProfitUsd: number;
  estimatedGrossMarginPct: number;
  arpuUsd: number;
  monthlyChurnRatePct: number;
  estimatedLtvUsd: number;
  assumptions: {
    paidUserRate: number;
    avgMessagesPerConversation: number;
    avgTokensPerConversation: number;
    aiCostPer1kTokens: number;
  };
}

export interface AffiliateReport {
  orders: number;
  totalCommissionVnd: number;
  settledCommissionVnd: number;
  totalRevenueVnd: number;
}

export interface MonthlyFinancialItem {
  month: string;
  newUsers: number;
  chatMessages: number;
  revenueUsd: number;
  aiCostUsd: number;
  netUsd: number;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  gender: 'female' | 'male' | 'other';
  role: 'user' | 'admin';
  accountStatus?: 'ACTIVE' | 'LOCKED' | 'DELETED';
  accountStatusReason?: string | null;
  onboardingCompleted?: boolean;
  createdAt: string;
}

export interface PayOSTransaction {
  _id: string;
  userId: string;
  userEmail: string;
  orderCode: number;
  amount: number;
  plan: string;
  status: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayOSReport {
  totalRevenueVnd: number;
  completedOrdersCount: number;
  totalOrdersCount: number;
  statusBreakdown: {
    completed: number;
    pending: number;
    canceled: number;
  };
  transactions: PayOSTransaction[];
}

export interface AdminOverviewResponse {
  success: boolean;
  overview: AdminOverviewStats;
  financialReport: AdminFinancialReport;
  monthlyFinancials: MonthlyFinancialItem[];
  recentUsers: AdminUser[];
  payosReport: PayOSReport;
  affiliateReport?: AffiliateReport;
}

export type AdminTab =
  | 'overview'
  | 'analytics'
  | 'revenue'
  | 'users'
  | 'videos'
  | 'affiliate'
  | 'notifications'
  | 'system';
