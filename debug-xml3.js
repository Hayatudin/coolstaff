const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const templatePath = path.join(__dirname, 'templates', 'CV ALM.docx');
const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);

const xml = zip.file('word/document.xml').asText();

let startIndex = xml.indexOf('facePhoto');
if (startIndex !== -1) {
  console.log(xml.substring(startIndex - 200, startIndex + 300));
}
