const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const templatePath = path.join(__dirname, 'templates', 'CV ALM.docx');
const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

function fixDuplicateBrace(keyword) {
  let index = xml.indexOf(keyword + '</w:t>');
  if (index !== -1) {
    let sub = xml.substring(index);
    let firstBrace = sub.indexOf('}</w:t>');
    if (firstBrace !== -1) {
      let secondBrace = sub.indexOf('}</w:t>', firstBrace + 1);
      // If the second brace is close to the first one, it's a duplicate
      if (secondBrace !== -1 && secondBrace < 300) {
        console.log(`Found duplicate brace for ${keyword}, removing it...`);
        let absoluteSecondBrace = index + secondBrace;
        // The character at absoluteSecondBrace is '}', so we remove it
        xml = xml.substring(0, absoluteSecondBrace) + xml.substring(absoluteSecondBrace + 1);
      }
    }
  }
}

fixDuplicateBrace('facePhoto');
fixDuplicateBrace('fullBodyPhoto');

zip.file('word/document.xml', xml);
const buf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.writeFileSync(templatePath, buf);
console.log('Template successfully patched!');
