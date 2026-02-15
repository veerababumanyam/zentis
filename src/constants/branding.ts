/**
 * Logo and brand asset paths for Zentis AI
 * All sizes are generated from /public/ZentisLogo.png
 */

export const LOGO_PATHS = {
  // Main logo
  original: '/logo.png',

  // Favicons
  favicon16: '/logo.png',
  favicon32: '/logo.png',
  favicon48: '/logo.png',
  faviconIco: '/logo.png',

  // Apple/iOS
  appleTouchIcon: '/logo.png',

  // Android/PWA
  androidChrome192: '/logo.png',
  androidChrome512: '/logo.png',

  // Microsoft/Windows
  msIcon144: '/logo.png',
  msIcon310: '/logo.png',

  // Manifest
  webManifest: '/site.webmanifest',
  browserConfig: '/browserconfig.xml',
} as const;

export const BRAND_COLORS = {
  primary: '#2563eb',
  primaryDark: '#1e40af',
  primaryLight: '#3b82f6',
  background: '#ffffff',
} as const;

export const BRAND_NAME = 'Zentis';
export const BRAND_TAGLINE = 'Medical AI Assistant';
