const path = require('path');
const fs = require('fs');
const sharp = require(path.join(__dirname, '../client/node_modules/sharp'));

async function runColorResizedOcr() {
  console.log('Loading Tesseract...');
  const Tesseract = require(path.join(__dirname, '../client/node_modules/tesseract.js'));

  const imagePath = 'C:\\Users\\ACER\\.gemini\\antigravity-ide\\brain\\a4b09c44-d752-4e9d-a4fe-f80323dba500\\media__1780050822008.jpg';
  console.log(`Reading image from ${imagePath}...`);

  if (!fs.existsSync(imagePath)) {
    console.error('Image file does not exist at path:', imagePath);
    return;
  }

  // Resize image to max 1600 width maintaining aspect ratio
  console.log('Resizing image to max 1600px (color)...');
  const metadata = await sharp(imagePath).metadata();
  const maxDim = 1600;
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
  const resizedImagePath = path.join(__dirname, 'resized-color-test.jpg');
  await sharp(imagePath)
    .resize(width, height)
    .jpeg({ quality: 90 })
    .toFile(resizedImagePath);

  console.log('Recognizing text on resized color image...');
  const result = await Tesseract.recognize(resizedImagePath, 'eng', {
    logger: m => console.log(m)
  });

  console.log('--- RESIZED COLOR RECOGNIZED TEXT ---');
  console.log(result.data.text);
  console.log('---------------------------------');
}

runColorResizedOcr().catch(err => {
  console.error('Error during resized color OCR test:', err);
});
