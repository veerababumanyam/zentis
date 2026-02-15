#!/usr/bin/env node
/**
 * Generate all required icon sizes from the Zentis logo
 * Requires: npm install sharp
 */

import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const SOURCE_LOGO = 'public/ZentisLogo.png';
const PUBLIC_DIR = 'public';

// Icon sizes needed for various platforms
const ICON_SIZES = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 48, name: 'favicon-48x48.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'android-chrome-192x192.png' },
  { size: 512, name: 'android-chrome-512x512.png' },
  { size: 144, name: 'ms-icon-144x144.png' },
  { size: 310, name: 'ms-icon-310x310.png' },
];

async function generateIcons() {
  console.log('🎨 Generating Zentis icons...\n');

  try {
    // Read the source image
    const sourceImage = sharp(SOURCE_LOGO);
    const metadata = await sourceImage.metadata();
    console.log(`📷 Source image: ${metadata.width}x${metadata.height} ${metadata.format}\n`);

    // Generate all icon sizes
    for (const { size, name } of ICON_SIZES) {
      const outputPath = join(PUBLIC_DIR, name);
      await sourceImage
        .clone()
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      console.log(`✅ Generated: ${name} (${size}x${size})`);
    }

    // Generate favicon.ico (multi-size ICO file)
    console.log('\n🔧 Generating favicon.ico...');

    // For favicon.ico, we'll create separate 16x16, 32x32, and 48x48 PNGs
    // and then combine them (ICO creation requires additional library)
    const icoSizes = [16, 32, 48];
    const icoBuffers = [];

    for (const size of icoSizes) {
      const buffer = await sourceImage
        .clone()
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toBuffer();
      icoBuffers.push(buffer);
    }

    // Note: For true .ico file, you'd need png-to-ico or similar
    // For now, we'll use the 32x32 as favicon.ico
    await sourceImage
      .clone()
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(join(PUBLIC_DIR, 'favicon.ico'));

    console.log('✅ Generated: favicon.ico');

    // Generate web app manifest
    console.log('\n📱 Generating web app manifest...');
    const manifest = {
      name: "Zentis AI",
      short_name: "Zentis",
      description: "AI-Powered Clinical Intelligence Platform",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#2563eb",
      orientation: "portrait-primary",
      icons: [
        {
          src: "/android-chrome-192x192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: "/android-chrome-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: "/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png"
        }
      ]
    };

    await writeFile(
      join(PUBLIC_DIR, 'site.webmanifest'),
      JSON.stringify(manifest, null, 2)
    );
    console.log('✅ Generated: site.webmanifest');

    // Generate browserconfig.xml for Windows tiles
    console.log('\n🪟 Generating browserconfig.xml...');
    const browserconfig = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square150x150logo src="/ms-icon-144x144.png"/>
      <square310x310logo src="/ms-icon-310x310.png"/>
      <TileColor>#2563eb</TileColor>
    </tile>
  </msapplication>
</browserconfig>`;

    await writeFile(join(PUBLIC_DIR, 'browserconfig.xml'), browserconfig);
    console.log('✅ Generated: browserconfig.xml');

    console.log('\n🎉 All icons generated successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Update index.html with the new favicon links');
    console.log('   2. Test the icons in different browsers and devices');
    console.log('   3. Consider generating an SVG version for better scaling');

  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

// Run the generator
generateIcons();
