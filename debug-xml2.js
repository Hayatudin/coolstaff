const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const templatePath = path.join(__dirname, 'templates', 'CV ALM.docx');
const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);

const xml = zip.file('word/document.xml').asText();

// Search for 'facePhoto'
let startIndex = 0;
while ((startIndex = xml.indexOf('facePhoto', startIndex)) !== -1) {
  console.log('--- Context around facePhoto ---');
  console.log(xml.substring(Math.max(0, startIndex - 80), startIndex + 200));
  startIndex += 9;
}

// Search for 'fullBodyPhoto'
startIndex = 0;
while ((startIndex = xml.indexOf('fullBodyPhoto', startIndex)) !== -1) {
  console.log('--- Context around fullBodyPhoto ---');
  console.log(xml.substring(Math.max(0, startIndex - 80), startIndex + 200));
  startIndex += 13;
}
