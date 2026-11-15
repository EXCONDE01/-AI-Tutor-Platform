import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');
const iconsDir = path.join(publicDir, 'icons');

// Ensure directories exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// SVG source for the brand icon
// Rounded square, indigo/violet gradient, bold "AI" monogram with chat-bubble/spark accent
const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e0e7ff;stop-opacity:1" />
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Rounded square background -->
  <rect x="16" y="16" width="480" height="480" rx="96" fill="url(#bgGradient)"/>
  
  <!-- Subtle inner highlight -->
  <rect x="24" y="24" width="464" height="464" rx="88" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>
  
  <!-- AI Monogram -->
  <text x="256" y="310" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
        font-size="200" font-weight="800" fill="url(#textGradient)" text-anchor="middle" dominant-baseline="middle"
        filter="url(#glow)">AI</text>
  
  <!-- Chat bubble / spark accent in bottom right -->
  <g transform="translate(340, 340)">
    <!-- Chat bubble -->
    <path d="M 0 0 L 40 0 L 40 28 L 55 28 L 35 50 L 15 28 L 0 28 Z" 
          fill="rgba(255,255,255,0.9)" opacity="0.9"/>
    <!-- Three dots inside bubble -->
    <circle cx="12" cy="14" r="3" fill="#4f46e5"/>
    <circle cx="22" cy="14" r="3" fill="#4f46e5"/>
    <circle cx="32" cy="14" r="3" fill="#4f46e5"/>
  </g>
  
  <!-- Small spark accent top-left -->
  <g transform="translate(80, 80)" opacity="0.6">
    <polygon points="10,0 12,8 20,8 13,13 15,22 10,16 5,22 7,13 0,8 8,8" 
             fill="#ffffff"/>
  </g>
</svg>
`;

async function generateIcons() {
  console.log('Generating PWA icons...');
  
  const sizes = [
    { name: 'icon-192.png', width: 192, height: 192, dir: iconsDir },
    { name: 'icon-512.png', width: 512, height: 512, dir: iconsDir },
    { name: 'apple-touch-icon.png', width: 180, height: 180, dir: publicDir },
    { name: 'favicon-32x32.png', width: 32, height: 32, dir: publicDir },
    { name: 'favicon-16x16.png', width: 16, height: 16, dir: publicDir },
  ];
  
  // Generate PNG icons
  for (const { name, width, height, dir } of sizes) {
    const outputPath = path.join(dir, name);
    await sharp(Buffer.from(svg))
      .resize(width, height)
      .png()
      .toFile(outputPath);
    console.log(`Created ${outputPath} (${width}x${height})`);
  }
  
  // Generate favicon.ico (ICO container with 32x32 and 16x16)
  const favicon32 = await sharp(Buffer.from(svg))
    .resize(32, 32)
    .png()
    .toBuffer();
  
  const favicon16 = await sharp(Buffer.from(svg))
    .resize(16, 16)
    .png()
    .toBuffer();
  
  // Create ICO file manually (simple ICO format with two PNG images)
  const icoPath = path.join(publicDir, 'favicon.ico');
  
  // ICO header (6 bytes)
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type (1 = ICO)
  icoHeader.writeUInt16LE(2, 4); // Count (2 images)
  
  // Directory entries (16 bytes each)
  const dirEntrySize = 16;
  const headerSize = 6 + 2 * dirEntrySize;
  
  const entry32 = Buffer.alloc(dirEntrySize);
  entry32.writeUInt8(32, 0);  // Width
  entry32.writeUInt8(32, 1);  // Height
  entry32.writeUInt8(0, 2);   // Color count
  entry32.writeUInt8(0, 3);   // Reserved
  entry32.writeUInt16LE(1, 4); // Color planes
  entry32.writeUInt16LE(32, 6); // Bits per pixel
  entry32.writeUInt32LE(favicon32.length, 8); // Image size
  entry32.writeUInt32LE(headerSize, 12); // Offset
  
  const entry16 = Buffer.alloc(dirEntrySize);
  entry16.writeUInt8(16, 0);  // Width
  entry16.writeUInt8(16, 1);  // Height
  entry16.writeUInt8(0, 2);   // Color count
  entry16.writeUInt8(0, 3);   // Reserved
  entry16.writeUInt16LE(1, 4); // Color planes
  entry16.writeUInt16LE(32, 6); // Bits per pixel
  entry16.writeUInt32LE(favicon16.length, 8); // Image size
  entry16.writeUInt32LE(headerSize + favicon32.length, 12); // Offset
  
  const icoBuffer = Buffer.concat([icoHeader, entry32, entry16, favicon32, favicon16]);
  fs.writeFileSync(icoPath, icoBuffer);
  console.log(`Created ${icoPath} (ICO with 32x32 and 16x16)`);
  
  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);