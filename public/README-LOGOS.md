# Zentis AI Brand Assets

This directory contains all logo variations, favicons, and brand assets for Zentis AI.

## 📁 Logo Files

### Main Logo
- **ZentisLogo.png** (600×600) - Original high-resolution logo

### Favicons
- **favicon.ico** - Multi-size ICO file for browsers
- **favicon-16x16.png** - Small favicon (16×16)
- **favicon-32x32.png** - Standard favicon (32×32)
- **favicon-48x48.png** - Large favicon (48×48)

### Apple/iOS Icons
- **apple-touch-icon.png** (180×180) - iOS home screen icon

### Android/PWA Icons
- **android-chrome-192x192.png** (192×192) - Android app icon (small)
- **android-chrome-512x512.png** (512×512) - Android app icon (large)

### Microsoft/Windows Tiles
- **ms-icon-144x144.png** (144×144) - Windows tile (small)
- **ms-icon-310x310.png** (310×310) - Windows tile (large)

### Social Media
- **og-image.png** (1200×630) - Open Graph image for Facebook, LinkedIn, Twitter cards

### Configuration Files
- **site.webmanifest** - PWA manifest for Android/Chrome
- **browserconfig.xml** - Microsoft browser configuration

## 🎨 Brand Colors

```typescript
Primary Blue: #2563eb
Primary Dark: #1e40af
Primary Light: #3b82f6
Background:   #ffffff
```

## 🚀 Usage in React

### Using the SVG Icon Component
```tsx
import { LogoIcon } from './components/icons/LogoIcon';

<LogoIcon className="w-8 h-8 text-blue-600" />
```

### Using the PNG Logo Component
```tsx
import { Logo, LogoImage } from './components/LogoImage';

// Preset sizes
<Logo.Small />        // 48px - for tight spaces
<Logo.Medium />       // 180px - for headers
<Logo.Large />        // 512px - for landing pages

// Custom size
<LogoImage 
  size="medium" 
  width={200} 
  className="rounded-lg shadow-lg" 
/>
```

### Using Logo Paths
```tsx
import { LOGO_PATHS } from './constants/branding';

<img src={LOGO_PATHS.original} alt="Zentis AI" />
```

## 🔄 Regenerating Icons

To regenerate all icon sizes from the source logo:

```bash
npm run generate:icons
```

To regenerate the Open Graph social media image:

```bash
npm run generate:og-image
```

To regenerate everything:

```bash
npm run generate:all-icons
```

## 📱 Platform Requirements Met

### ✅ Web Browsers
- Chrome, Firefox, Safari, Edge
- Multi-size ICO favicon
- PNG fallbacks

### ✅ iOS/Safari
- Apple Touch Icon (180×180)
- High-resolution display support

### ✅ Android/Chrome
- 192×192 and 512×512 icons
- PWA manifest configured
- Maskable icon support

### ✅ Progressive Web App (PWA)
- Complete manifest file
- All required icon sizes
- Theme color configuration

### ✅ Microsoft/Windows
- Browser configuration XML
- Tile icons (144×144, 310×310)
- TileColor configured

### ✅ Social Media
- Open Graph image (1200×630)
- Twitter Card support
- Optimal preview for all platforms

## 🔍 SEO & Metadata

All icon sizes and metadata are properly configured in `index.html`:
- Favicon links for all platforms
- Web app manifest
- Theme color meta tags
- Apple touch icon
- Android Chrome icons
- Microsoft tile configuration

## 📊 File Sizes

| File | Size |
|------|------|
| ZentisLogo.png | ~473 KB |
| android-chrome-512x512.png | ~445 KB |
| og-image.png | ~XXX KB |
| android-chrome-192x192.png | ~69 KB |
| apple-touch-icon.png | ~61 KB |
| ms-icon-310x310.png | ~170 KB |
| ms-icon-144x144.png | ~40 KB |
| favicon-48x48.png | ~5.4 KB |
| favicon-32x32.png | ~2.6 KB |
| favicon-16x16.png | ~838 B |

## 🎯 Best Practices

1. **Always use optimized sizes** - Don't use the 600×600 original when a smaller size will do
2. **Use LogoIcon for inline SVG** - Better performance and styling control
3. **Use LogoImage for raster images** - Automatically selects optimal size
4. **Maintain aspect ratio** - Logo is square, keep it that way
5. **Test on all platforms** - Verify icons appear correctly everywhere

## 🛠️ Maintenance

When updating the logo:
1. Replace `public/ZentisLogo.png` with the new 600×600 version
2. Run `npm run generate:all-icons` to regenerate all sizes
3. Test the application on multiple devices
4. Verify social media previews on Facebook, Twitter, LinkedIn

## 📝 Notes

- All icons are generated from `ZentisLogo.png` to ensure consistency
- Icons use transparent backgrounds for flexibility
- PWA manifest enables "Add to Home Screen" functionality
- OG image uses brand colors and includes logo + text for maximum impact
