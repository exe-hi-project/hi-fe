import type { User as SharedUser } from '@hi/shared';

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

export type User = SharedUser;

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
