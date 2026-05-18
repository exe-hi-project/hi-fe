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

export interface User {
  _id: string;
  name: string;
  email: string;
  role?: 'user' | 'admin';
  gender: 'female' | 'male' | 'other';
  avatar?: string;
  partnerId?: string | null;
  partnerCode?: string;
  birthDate?: string;
  height?: number;
  weight?: number;
  goals?: string[];
  defaultCycleLength?: number;
  defaultPeriodLength?: number;
  aiPersonality?: string;
  aiTone?: string;
  periodReminder?: boolean;
  reminderDaysBefore?: number;
  partnerNotifications?: boolean;
  onboardingCompleted?: boolean;
  createdAt?: string;
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
  type: 'period_coming' | 'period_started' | 'reminder' | 'partner';
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
