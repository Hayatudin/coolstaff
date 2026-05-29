const path = require('path');
const fs = require('fs');
const sharp = require(path.join(__dirname, '../client/node_modules/sharp'));

async function runBinarizedOcr() {
  console.log('Loading Tesseract...');
  const Tesseract = require(path.join(__dirname, '../client/node_modules/tesseract.js'));

  const imagePath = 'C:\\Users\\ACER\\.gemini\\antigravity-ide\\brain\\a4b09c44-d752-4e9d-a4fe-f80323dba500\\media__1780050822008.jpg';
  console.log(`Reading image from ${imagePath}...`);

  if (!fs.existsSync(imagePath)) {
    console.error('Image file does not exist at path:', imagePath);
    return;
  }

  // Resize image to max 1200 width maintaining aspect ratio
  console.log('Resizing image...');
  const metadata = await sharp(imagePath).metadata();
  const maxDim = 1200;
  let width = metadata.width;
  let height = metadata.height;
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  console.log(`New dimensions: ${width}x${height}`);
  const resizedBuffer = await sharp(imagePath)
    .resize(width, height)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = resizedBuffer;
  const channels = info.channels; // 3 or 4

  console.log('Computing Bradley adaptive thresholding...');
  // Bradley local adaptive thresholding
  const grayscale = new Uint8Array(width * height);
  const integral = new Int32Array(width * height);

  // Compute grayscale and build integral image
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      grayscale[y * width + x] = gray;

      sum += gray;
      if (y === 0) {
        integral[y * width + x] = sum;
      } else {
        integral[y * width + x] = integral[(y - 1) * width + x] + sum;
      }
    }
  }

  const S = Math.floor(width / 8); // Window size
  const s2 = Math.floor(S / 2);
  const t = 0.12; // Soft threshold percentage

  const outputBuffer = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const outIdx = (y * width + x) * 4;
      const x1 = Math.max(0, x - s2);
      const x2 = Math.min(width - 1, x + s2);
      const y1 = Math.max(0, y - s2);
      const y2 = Math.min(height - 1, y + s2);

      const count = (x2 - x1 + 1) * (y2 - y1 + 1);

      let sum = integral[y2 * width + x2];
      if (x1 > 0) sum -= integral[y2 * width + (x1 - 1)];
      if (y1 > 0) sum -= integral[(y1 - 1) * width + x2];
      if (x1 > 0 && y1 > 0) sum += integral[(y1 - 1) * width + (x1 - 1)];

      const gray = grayscale[y * width + x];
      const localAvg = sum / count;

      const diff = localAvg - gray;
      const threshold = localAvg * t;
      let val = 255;
      if (diff > threshold) {
        val = 0; // Solid text
      } else if (diff < -threshold) {
        val = 255; // Solid background
      } else {
        // Smooth transition mapping from dark to light
        val = Math.round(((threshold - diff) / (2 * threshold)) * 255);
      }

      outputBuffer[outIdx] = val;
      outputBuffer[outIdx + 1] = val;
      outputBuffer[outIdx + 2] = val;
      outputBuffer[outIdx + 3] = 255;
    }
  }

  const binarizedImagePath = path.join(__dirname, 'binarized-test.jpg');
  console.log(`Saving binarized image to ${binarizedImagePath}...`);
  await sharp(outputBuffer, { raw: { width, height, channels: 4 } })
    .jpeg()
    .toFile(binarizedImagePath);

  console.log('Recognizing text on binarized image...');
  const result = await Tesseract.recognize(binarizedImagePath, 'eng', {
    logger: m => console.log(m)
  });

  console.log('--- BINARIZED RECOGNIZED TEXT ---');
  console.log(result.data.text);
  console.log('---------------------------------');
}

runBinarizedOcr().catch(err => {
  console.error('Error during binarized OCR test:', err);
});
