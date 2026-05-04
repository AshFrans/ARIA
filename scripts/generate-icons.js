const sharp = require('sharp');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');

// Geometric "A" lettermark: indigo on deep navy
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#0f172a"/>
  <polygon points="512,108 72,900 202,900 512,198 822,900 952,900" fill="#818cf8"/>
  <rect x="234" y="522" width="556" height="88" fill="#818cf8"/>
</svg>`;

const icons = [
  { name: 'icon.png',          size: 1024 },
  { name: 'adaptive-icon.png', size: 1024 },
  { name: 'icon-512.png',      size: 512  },
  { name: 'icon-192.png',      size: 192  },
  { name: 'favicon.png',       size: 32   },
];

async function generate() {
  for (const { name, size } of icons) {
    await sharp(Buffer.from(iconSvg))
      .resize(size, size)
      .png()
      .toFile(path.join(assetsDir, name));
    console.log(`✓ ${name} (${size}×${size})`);
  }

  // Splash: dark background with icon centered
  const iconBuffer = await sharp(Buffer.from(iconSvg))
    .resize(320, 320)
    .png()
    .toBuffer();

  await sharp({
    create: { width: 1242, height: 2436, channels: 4, background: { r: 15, g: 23, b: 42, alpha: 1 } },
  })
    .composite([{ input: iconBuffer, gravity: 'center' }])
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));

  console.log('✓ splash.png (1242×2436)');
  console.log('\nAll icons generated in assets/');
}

generate().catch(console.error);
