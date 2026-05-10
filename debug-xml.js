const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const templatePath = path.join(__dirname, 'templates', 'CV ALM.docx');
const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);

const xml = zip.file('word/document.xml').asText();

let startIndex = 0;
while ((startIndex = xml.indexOf('hoto', startIndex)) !== -1) {
  console.log('--- Context around hoto ---');
  console.log(xml.substring(Math.max(0, startIndex - 50), startIndex + 150));
  startIndex += 4;
}
