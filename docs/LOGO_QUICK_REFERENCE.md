# Zentis AI Logo Quick Reference

## 📦 Import Options

```tsx
// SVG Icon (scalable, styleable)
import { LogoIcon } from './components/icons/LogoIcon';

// PNG Logo Components
import { Logo, LogoImage } from './components/LogoImage';

// Brand Constants
import { LOGO_PATHS, BRAND_COLORS, BRAND_NAME } from './constants/branding';
```

## 🎨 When to Use What

### Use `<LogoIcon />` when:
- ✅ You need a scalable vector logo
- ✅ You want to change colors with CSS (`text-blue-600`)
- ✅ You need inline SVG (better performance)
- ✅ Size needs to be responsive

```tsx
<LogoIcon className="w-12 h-12 text-blue-600" />
```

### Use `<Logo.* />` or `<LogoImage />` when:
- ✅ You need a raster (PNG) version
- ✅ You want automatically optimized sizes
- ✅ Your use case requires specific pixel dimensions
- ✅ You're using it in emails or external contexts

```tsx
<Logo.Small />      // Headers, tight spaces
<Logo.Medium />     // Navigation bars
<Logo.Large />      // Hero sections, landing pages
```

## 🚀 Common Patterns

### Navigation Bar
```tsx
import { LogoIcon } from './components/icons/LogoIcon';
import { BRAND_NAME } from './constants/branding';

<nav className="flex items-center gap-2">
  <LogoIcon className="w-10 h-10 text-blue-600" />
  <span className="text-xl font-bold">{BRAND_NAME}</span>
</nav>
```

### Landing Page Hero
```tsx
import { Logo } from './components/LogoImage';

<div className="text-center">
  <Logo.Large className="mx-auto mb-8" />
  <h1>Welcome to Zentis AI</h1>
</div>
```

### Loading State
```tsx
import { LogoIcon } from './components/icons/LogoIcon';

<div className="flex items-center justify-center">
  <LogoIcon className="w-16 h-16 text-blue-600 animate-pulse" />
</div>
```

### Avatar/Profile Picture
```tsx
import { Logo } from './components/LogoImage';

<Logo.Small className="rounded-full" />
```

### Email Template
```tsx
import { LOGO_PATHS } from './constants/branding';

<img 
  src={`https://yourdomain.com${LOGO_PATHS.appleTouchIcon}`}
  width="60"
  height="60"
  alt="Zentis AI"
/>
```

## 🎨 Brand Colors

```tsx
import { BRAND_COLORS } from './constants/branding';

// In JavaScript/React
style={{ backgroundColor: BRAND_COLORS.primary }}
style={{ color: BRAND_COLORS.primaryDark }}

// In Tailwind (use these values)
bg-[#2563eb]  // Primary
bg-[#1e40af]  // Primary Dark  
bg-[#3b82f6]  // Primary Light
```

## 📱 All Available Logo Paths

```tsx
LOGO_PATHS.original           // /ZentisLogo.png (600×600)
LOGO_PATHS.favicon16          // /favicon-16x16.png
LOGO_PATHS.favicon32          // /favicon-32x32.png
LOGO_PATHS.favicon48          // /favicon-48x48.png
LOGO_PATHS.appleTouchIcon     // /apple-touch-icon.png (180×180)
LOGO_PATHS.androidChrome192   // /android-chrome-192x192.png
LOGO_PATHS.androidChrome512   // /android-chrome-512x512.png
LOGO_PATHS.msIcon144          // /ms-icon-144x144.png
LOGO_PATHS.msIcon310          // /ms-icon-310x310.png
```

## 🔧 Regenerate Icons

```bash
# Regenerate all sizes from source
npm run generate:icons

# Regenerate social media image
npm run generate:og-image

# Regenerate everything
npm run generate:all-icons
```

## 📚 Full Documentation

See `/docs/LOGO_IMPLEMENTATION.md` for complete details.
See `/public/README-LOGOS.md` for branding guidelines.

## ✨ Pro Tips

1. **Always use type-safe imports** from constants
2. **Prefer SVG (`LogoIcon`)** for UI elements
3. **Use PNG variants** for specific pixel requirements
4. **Test on multiple devices** after changes
5. **Run build** before committing logo changes

## 🎯 Size Guidelines

| Component | Use Case | Recommended Size |
|-----------|----------|------------------|
| `<LogoIcon />` | Inline text/buttons | `w-4 h-4` to `w-6 h-6` |
| `<LogoIcon />` | Navigation | `w-8 h-8` to `w-12 h-12` |
| `<Logo.Small />` | Avatars, badges | 48px |
| `<Logo.Medium />` | Headers, cards | 180px |
| `<Logo.Large />` | Hero, landing | 512px |
