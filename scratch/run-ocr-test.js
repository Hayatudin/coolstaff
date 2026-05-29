const path = require('path');
const fs = require('fs');

async function testOcr() {
  console.log('Loading Tesseract...');
  // We can load tesseract.js from the client node_modules
  const Tesseract = require(path.join(__dirname, '../client/node_modules/tesseract.js'));

  const imagePath = 'C:\\Users\\ACER\\.gemini\\antigravity-ide\\brain\\a4b09c44-d752-4e9d-a4fe-f80323dba500\\media__1780050822008.jpg';
  console.log(`Reading image from ${imagePath}...`);

  if (!fs.existsSync(imagePath)) {
    console.error('Image file does not exist at path:', imagePath);
    return;
  }

  console.log('Recognizing text...');
  const result = await Tesseract.recognize(imagePath, 'eng', {
    logger: m => console.log(m)
  });

  console.log('--- RECOGNIZED TEXT ---');
  console.log(result.data.text);
  console.log('-----------------------');
}

testOcr().catch(err => {
  console.error('Error during OCR test:', err);
});
