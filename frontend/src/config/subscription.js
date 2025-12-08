/**
 * Subscription Configuration
 * Defines all subscription tiers, limits, and pricing
 */

// Subscription tier types
export const SUBSCRIPTION_TIERS = {
  GUEST: 'guest',         // Not logged in users
  FREE: 'free',           // Default after signup
  PREMIUM: 'premium',     // ₹49/month
  PREMIUM_PLUS: 'premium_plus',  // ₹99/month
  ENTERPRISE: 'enterprise',      // Custom pricing + API access
};

// Subscription tier display names
export const TIER_DISPLAY_NAMES = {
  [SUBSCRIPTION_TIERS.GUEST]: 'Guest',
  [SUBSCRIPTION_TIERS.FREE]: 'Free',
  [SUBSCRIPTION_TIERS.PREMIUM]: 'Premium',
  [SUBSCRIPTION_TIERS.PREMIUM_PLUS]: 'Premium Plus',
  [SUBSCRIPTION_TIERS.ENTERPRISE]: 'Enterprise',
};

// Subscription tier colors for badges
export const TIER_COLORS = {
  [SUBSCRIPTION_TIERS.GUEST]: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  [SUBSCRIPTION_TIERS.FREE]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  [SUBSCRIPTION_TIERS.PREMIUM]: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  [SUBSCRIPTION_TIERS.PREMIUM_PLUS]: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500/30',
  [SUBSCRIPTION_TIERS.ENTERPRISE]: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

// Playback limits in seconds
export const PLAYBACK_LIMITS = {
  [SUBSCRIPTION_TIERS.GUEST]: 60,           // 1 minute
  [SUBSCRIPTION_TIERS.FREE]: 600,           // 10 minutes per session
  [SUBSCRIPTION_TIERS.PREMIUM]: 18000,      // 5 hours per day (in seconds)
  [SUBSCRIPTION_TIERS.PREMIUM_PLUS]: -1,    // Unlimited (-1 = no limit)
  [SUBSCRIPTION_TIERS.ENTERPRISE]: -1,      // Unlimited
};

// Reset intervals in milliseconds
export const RESET_INTERVALS = {
  [SUBSCRIPTION_TIERS.GUEST]: 0,                      // No reset, must login
  [SUBSCRIPTION_TIERS.FREE]: 2 * 60 * 60 * 1000,     // 2 hours
  [SUBSCRIPTION_TIERS.PREMIUM]: 24 * 60 * 60 * 1000,  // 24 hours (daily)
  [SUBSCRIPTION_TIERS.PREMIUM_PLUS]: 0,               // N/A - unlimited
  [SUBSCRIPTION_TIERS.ENTERPRISE]: 0,                 // N/A - unlimited
};

// Language access per tier
export const LANGUAGE_ACCESS = {
  [SUBSCRIPTION_TIERS.GUEST]: ['en'],       // English only
  [SUBSCRIPTION_TIERS.FREE]: ['en'],        // English only
  [SUBSCRIPTION_TIERS.PREMIUM]: 'all',      // All languages
  [SUBSCRIPTION_TIERS.PREMIUM_PLUS]: 'all', // All languages
  [SUBSCRIPTION_TIERS.ENTERPRISE]: 'all',   // All languages
};

// Pricing in INR
export const PRICING_INR = {
  [SUBSCRIPTION_TIERS.FREE]: 0,
  [SUBSCRIPTION_TIERS.PREMIUM]: 49,
  [SUBSCRIPTION_TIERS.PREMIUM_PLUS]: 99,
  [SUBSCRIPTION_TIERS.ENTERPRISE]: null, // Custom pricing
};

// Feature access matrix
export const TIER_FEATURES = {
  [SUBSCRIPTION_TIERS.GUEST]: {
    playbackLimit: '1 minute',
    languages: 'English only',
    offline: false,
    adFree: false,
    apiAccess: false,
    priority: false,
  },
  [SUBSCRIPTION_TIERS.FREE]: {
    playbackLimit: '10 minutes per session',
    resetTime: 'Resets every 2 hours',
    languages: 'English only',
    offline: false,
    adFree: false,
    apiAccess: false,
    priority: false,
  },
  [SUBSCRIPTION_TIERS.PREMIUM]: {
    playbackLimit: '5 hours per day',
    resetTime: 'Resets daily',
    languages: 'All languages',
    offline: true,
    adFree: true,
    apiAccess: false,
    priority: false,
  },
  [SUBSCRIPTION_TIERS.PREMIUM_PLUS]: {
    playbackLimit: 'Unlimited',
    resetTime: null,
    languages: 'All languages',
    offline: true,
    adFree: true,
    apiAccess: false,
    priority: true,
  },
  [SUBSCRIPTION_TIERS.ENTERPRISE]: {
    playbackLimit: 'Unlimited',
    resetTime: null,
    languages: 'All languages',
    offline: true,
    adFree: true,
    apiAccess: true,
    priority: true,
    apiRateLimit: 'Custom',
  },
};

// Currency conversion rates (base: INR)
// In production, these would come from an API
export const CURRENCY_RATES = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0095,
  AUD: 0.018,
  CAD: 0.016,
  SGD: 0.016,
  AED: 0.044,
  JPY: 1.79,
};

// Currency symbols
export const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  AED: 'د.إ',
  JPY: '¥',
};

/**
 * Get price in user's currency
 * @param {number} priceInr - Price in INR
 * @param {string} currency - Target currency code
 * @returns {string} Formatted price string
 */
export const formatPrice = (priceInr, currency = 'INR') => {
  if (priceInr === null) return 'Contact Sales';
  if (priceInr === 0) return 'Free';
  
  const rate = CURRENCY_RATES[currency] || 1;
  const convertedPrice = priceInr * rate;
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  
  // Format based on currency
  if (currency === 'JPY') {
    return `${symbol}${Math.round(convertedPrice)}`;
  }
  
  return `${symbol}${convertedPrice.toFixed(2)}`;
};

/**
 * Format time remaining in human readable format
 * @param {number} seconds - Seconds remaining
 * @returns {string} Formatted time string
 */
export const formatTimeRemaining = (seconds) => {
  if (seconds < 0) return 'Unlimited';
  if (seconds === 0) return 'No time left';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s remaining`;
  }
  return `${secs}s remaining`;
};

/**
 * Format reset time in human readable format
 * @param {number} resetTimestamp - Unix timestamp when limit resets
 * @returns {string} Formatted time string
 */
export const formatResetTime = (resetTimestamp) => {
  if (!resetTimestamp) return '';
  
  const now = Date.now();
  const diff = resetTimestamp - now;
  
  if (diff <= 0) return 'Available now';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `Resets in ${hours}h ${minutes}m`;
  }
  return `Resets in ${minutes}m`;
};

/**
 * Check if user can access a specific language
 * @param {string} tier - User's subscription tier
 * @param {string} languageCode - Language code to check
 * @returns {boolean}
 */
export const canAccessLanguage = (tier, languageCode) => {
  const access = LANGUAGE_ACCESS[tier] || LANGUAGE_ACCESS[SUBSCRIPTION_TIERS.FREE];
  
  if (access === 'all') return true;
  return access.includes(languageCode);
};

/**
 * Check if user has unlimited playback
 * @param {string} tier - User's subscription tier
 * @returns {boolean}
 */
export const hasUnlimitedPlayback = (tier) => {
  return PLAYBACK_LIMITS[tier] === -1;
};

/**
 * Get subscription tier comparison for upgrade modal
 * @returns {Array} Array of tier objects with features
 */
export const getSubscriptionPlans = () => {
  return [
    {
      tier: SUBSCRIPTION_TIERS.FREE,
      name: TIER_DISPLAY_NAMES[SUBSCRIPTION_TIERS.FREE],
      price: PRICING_INR[SUBSCRIPTION_TIERS.FREE],
      features: TIER_FEATURES[SUBSCRIPTION_TIERS.FREE],
      popular: false,
    },
    {
      tier: SUBSCRIPTION_TIERS.PREMIUM,
      name: TIER_DISPLAY_NAMES[SUBSCRIPTION_TIERS.PREMIUM],
      price: PRICING_INR[SUBSCRIPTION_TIERS.PREMIUM],
      features: TIER_FEATURES[SUBSCRIPTION_TIERS.PREMIUM],
      popular: true,
    },
    {
      tier: SUBSCRIPTION_TIERS.PREMIUM_PLUS,
      name: TIER_DISPLAY_NAMES[SUBSCRIPTION_TIERS.PREMIUM_PLUS],
      price: PRICING_INR[SUBSCRIPTION_TIERS.PREMIUM_PLUS],
      features: TIER_FEATURES[SUBSCRIPTION_TIERS.PREMIUM_PLUS],
      popular: false,
    },
  ];
};
