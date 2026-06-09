import { useAuthStore } from '../store/authStore';

// Generate a simple high-entropy UUID-like string
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Get or create session ID in sessionStorage
export const getOrCreateSessionId = (): string => {
  if (typeof window === 'undefined') return '';
  let sessionId = sessionStorage.getItem('hi_analytics_session_id');
  if (!sessionId) {
    sessionId = generateUUID();
    sessionStorage.setItem('hi_analytics_session_id', sessionId);
  }
  return sessionId;
};

// Track event utility
export const trackEvent = async (
  eventType: 'PAGE_VIEW' | 'CLICK' | 'REGISTER' | 'ONBOARDING_COMPLETE',
  target: string,
  elementText?: string,
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    const sessionId = getOrCreateSessionId();
    const user = useAuthStore.getState().user;
    const userId = user?._id || '';

    const payload = {
      sessionId,
      userId: userId || undefined,
      eventType,
      target,
      elementText: elementText || undefined,
      metadata
    };

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // Use native fetch to avoid axios interceptor side-effects
    fetch(`${apiUrl}/analytics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }).catch(err => {
      // Fail silently in production, log in dev
      if (import.meta.env.DEV) {
        console.error('Analytics track error:', err);
      }
    });
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error('Analytics tracking failed:', e);
    }
  }
};
