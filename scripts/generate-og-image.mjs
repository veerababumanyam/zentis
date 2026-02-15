#!/usr/bin/env node
/**
 * Generate Open Graph (OG) image for social media sharing
 * Standard size: 1200x630 px
 */

import sharp from 'sharp';
import { join } from 'path';

const SOURCE_LOGO = 'public/ZentisLogo.png';
const PUBLIC_DIR = 'public';
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

async function generateOGImage() {
  console.log('🖼️  Generating Open Graph image for social media...\n');

  try {
    // Read the source logo
    const logo = sharp(SOURCE_LOGO);
    const logoMetadata = await logo.metadata();

    // Calculate logo size (centered, taking up about 40% of height)
    const logoHeight = Math.floor(OG_HEIGHT * 0.4);
    const logoWidth = logoHeight; // Keep square aspect ratio

    // Create the logo with proper sizing
    const resizedLogo = await logo
      .resize(logoWidth, logoHeight, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();

    // Define the brand color gradient background
    const brandBlue = '#2563eb';
    const brandDarkBlue = '#1e40af';

    // Create SVG background with gradient and text
    const svgBackground = `
      <svg width="${OG_WIDTH}" height="${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${brandDarkBlue};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${brandBlue};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#bgGradient)"/>
      </svg>
    `;

    // Create text overlay SVG
    const textOverlay = `
      <svg width="${OG_WIDTH}" height="${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <text 
          x="${OG_WIDTH / 2}" 
          y="${OG_HEIGHT * 0.75}" 
          font-family="Arial, sans-serif" 
          font-size="72" 
          font-weight="bold" 
          fill="white" 
          text-anchor="middle">Zentis AI</text>
        <text 
          x="${OG_WIDTH / 2}" 
          y="${OG_HEIGHT * 0.85}" 
          font-family="Arial, sans-serif" 
          font-size="36" 
          fill="rgba(255,255,255,0.9)" 
          text-anchor="middle">AI-Powered Clinical Intelligence</text>
      </svg>
    `;

    // Compose the final image
    const outputPath = join(PUBLIC_DIR, 'og-image.png');

    await sharp(Buffer.from(svgBackground))
      .composite([
        {
          input: resizedLogo,
          top: Math.floor(OG_HEIGHT * 0.15),
          left: Math.floor((OG_WIDTH - logoWidth) / 2),
        },
        {
          input: Buffer.from(textOverlay),
          top: 0,
          left: 0,
        }
      ])
      .png()
      .toFile(outputPath);

    console.log(`✅ Generated: og-image.png (${OG_WIDTH}x${OG_HEIGHT})`);
    console.log('\n📱 Social Media Preview:');
    console.log('   - Facebook, LinkedIn, Twitter will show this image');
    console.log('   - Optimal size for all major social platforms');
    console.log('\n🔗 Update your meta tags to use: /og-image.png');

  } catch (error) {
    console.error('❌ Error generating OG image:', error.message);
    process.exit(1);
  }
}

generateOGImage();
