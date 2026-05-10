const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const templatePath = path.join(__dirname, 'templates', 'CV ALM.docx');

try {
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  
  // Read document.xml
  let xml = zip.file('word/document.xml').asText();
  
  // Fix the "hoto}}" duplicate close tag typo
  // It could be {%facePhoto}} or {%fullBodyPhoto}}
  const originalLength = xml.length;
  xml = xml.replace(/hoto\}\}/g, 'hoto}');
  
  // Also fix any other accidental double braces like {fullName}}
  xml = xml.replace(/([a-zA-Z])\}\}/g, '$1}');
  
  if (xml.length !== originalLength) {
    console.log('Found and fixed typos in document.xml!');
    zip.file('word/document.xml', xml);
    
    const buf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    fs.writeFileSync(templatePath, buf);
    console.log('Saved fixed template back to CV ALM.docx');
  } else {
    console.log('No typos found to replace.');
  }

  // Verify it works now
  const newZip = new PizZip(fs.readFileSync(templatePath, 'binary'));
  const doc = new Docxtemplater(newZip, {
    paragraphLoop: true,
    linebreaks: true,
  });
  console.log('Template compiled successfully after fix!');

} catch (error) {
  console.error('Still failing:', error);
}
