import sharp from 'sharp'

// Resize logo to square with padding to avoid distortion
await sharp('public/geniee-logo.png')
  .resize(32, 32, {
    fit: 'contain',
    background: { r: 255, g: 255, b: 255, alpha: 0 }
  })
  .toFile('app/icon.png')

console.log('✅ Logo resized to 32x32 with proper aspect ratio')
