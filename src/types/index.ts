interface FBAuthResponse {
  accessToken: string;
  userID: string;
  expiresIn: number;
  signedRequest: string;
}

interface FBLoginResponse {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse: FBAuthResponse | null;
}

declare global {
  interface Window {
    FB: {
      init: (options: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
      login: (callback: (response: FBLoginResponse) => void, options?: { scope: string }) => void;
      getLoginStatus: (callback: (response: FBLoginResponse) => void) => void;
    };
  }
}

export type UserRole = 'user' | 'admin';
export type Gender = 'female' | 'male' | 'other';
export type AuthProvider = 'local' | 'google' | 'facebook';
export type AiPersonality = 'friendly' | 'professional' | 'caring' | 'playful';
export type AiTone = 'warm' | 'casual' | 'formal';

export interface ApiResponse<TData = unknown> {
  success: boolean;
  message?: string;
  data?: TData;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role?: UserRole;
  gender: Gender;
  avatar?: string;
  authProvider?: AuthProvider;
  googleId?: string;
  facebookId?: string;
  partnerId?: string | null;
  partnerCode?: string;
  birthDate?: string;
  height?: number;
  weight?: number;
  interests?: string[];
  goals?: string[];
  defaultCycleLength?: number;
  defaultPeriodLength?: number;
  lastPeriodDate?: string;
  lastPeriodEndDate?: string;
  irregularCycle?: boolean;
  aiPersonality?: AiPersonality;
  aiTone?: AiTone;
  periodReminder?: boolean;
  reminderDaysBefore?: number;
  partnerNotifications?: boolean;
  onboardingCompleted?: boolean;
  subscription?: UserSubscription;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserSubscription {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: 'free' | 'premium' | 'monthly' | 'yearly' | 'premium_monthly' | 'premium_yearly';
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | null;
  currentPeriodEnd: string | null;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  gender: Gender;
}

export interface AuthPayload {
  token: string;
  user: User;
}

export interface Cycle {
  _id: string;
  userId: string;
  startDate: string;
  endDate?: string;
  periodLength?: number;
  cycleLength: number;
  notes?: string;
  createdAt: string;
}

export interface Symptom {
  _id: string;
  userId: string;
  name: string;
  severity: number;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface Notification {
  _id: string;
  userId: string;
  type: 'period_coming' | 'period_started' | 'reminder' | 'partner' | 'PARTNER_CONNECT' | 'PARTNER_DISCONNECT';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ChatMessage {
  _id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}
