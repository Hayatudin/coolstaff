const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

try {
  const content = fs.readFileSync(path.join(__dirname, 'templates', 'CV ALM.docx'), 'binary');
  const zip = new PizZip(content);
  
  // Try to compile it
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });
  
  console.log('Template compiled successfully!');
} catch (error) {
  if (error.properties && error.properties.errors instanceof Array) {
    console.error('Docxtemplater MultiError caught:');
    error.properties.errors.forEach(function(e) {
      console.error(`- Error: ${e.name}: ${e.message}`);
      console.error(`  Tag: ${e.properties.id || e.properties.name || 'unknown'}`);
      if (e.properties && e.properties.explanation) {
        console.error(`  Explanation: ${e.properties.explanation}`);
      }
    });
  } else {
    console.error('Other error:', error);
  }
}
