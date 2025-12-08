// Robust environment detection for email confirmation
const getEmailConfirmationSetting = () => {
  // Method 1: Explicit environment variable (most reliable)
  if (process.env.NEXT_PUBLIC_EMAIL_CONFIRMATION === 'true') return true;
  if (process.env.NEXT_PUBLIC_EMAIL_CONFIRMATION === 'false') return false;
  
  // Method 2: Check for production indicators
  const isProduction = 
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production' ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
    (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1'));
  
  // Method 3: Default to enabled for non-localhost environments
  return isProduction;
};

export const authConfig = {
  providers: {
    email: {
      enabled: true, // Always enabled for email/password auth
      requireEmailConfirmation: getEmailConfirmationSetting(),
    },
    google: {
      enabled: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    microsoft: {
      enabled: process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET,
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    },
    apple: {
      enabled: process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET,
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
    }
  },
  redirectUrls: {
    signin: '/auth/callback',
    signout: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    persistSession: true,
    autoRefreshToken: true,
  }
}