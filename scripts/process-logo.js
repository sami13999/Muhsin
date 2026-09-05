const { Jimp } = require('jimp');
const path = require('path');

async function main() {
  const sourcePath = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\c145481d-81ac-43f5-9159-dc7b73e70827\\media__1784623972593.jpg';
  const destPath = path.join(__dirname, '..', 'apps', 'web', 'public', 'logo.png');

  console.log('Loading image from:', sourcePath);
  const image = await Jimp.read(sourcePath);

  const width = image.bitmap.width;
  const height = image.bitmap.height;
  console.log(`Original dimensions: ${width}x${height}`);

  // Crop the bottom 28% to remove the "MUSHIN" text entirely
  const cropHeight = Math.floor(height * 0.72);
  
  // Crop syntax in Jimp 1.6.x uses image.crop({ x, y, w, h }) or image.crop(x, y, w, h)
  image.crop({ x: 0, y: 0, w: width, h: cropHeight });
  console.log(`Cropped dimensions: ${width}x${cropHeight}`);

  // Loop through pixels and make the checkerboard transparent
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < cropHeight; y++) {
      const idx = (y * width + x) * 4;
      const r = image.bitmap.data[idx];
      const g = image.bitmap.data[idx + 1];
      const b = image.bitmap.data[idx + 2];

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const diff = max - min;

      // Checkerboard is grey/black.
      // The blue/teal logo has high saturation (diff between R and B/G is large).
      // We filter out pixels with low saturation (diff < 20) and dark-to-medium grey (max < 160).
      const isGrey = diff < 20;
      const isDark = max < 160;

      if (isGrey && isDark) {
        // Set alpha channel to 0
        image.bitmap.data[idx + 3] = 0;
      }
    }
  }

  // Autocrop transparent borders
  image.autocrop();
  console.log(`Autocropped dimensions: ${image.bitmap.width}x${image.bitmap.height}`);

  let minX = width;
  let maxX = 0;
  let minY = cropHeight;
  let maxY = 0;

  for (let x = 0; x < image.bitmap.width; x++) {
    for (let y = 0; y < image.bitmap.height; y++) {
      const idx = (y * image.bitmap.width + x) * 4;
      const alpha = image.bitmap.data[idx + 3];
      if (alpha !== 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  console.log(`Visual bounds: X from ${minX} to ${maxX}, Y from ${minY} to ${maxY}`);

  // Crop the image to the exact visual bounds to remove all transparent padding
  if (maxX > minX && maxY > minY) {
    image.crop({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
    console.log(`Final cropped dimensions: ${image.bitmap.width}x${image.bitmap.height}`);
  }

  // Save to target path
  await image.write(destPath);
  console.log('Successfully saved transparent logo to:', destPath);
}

main().catch(console.error);
