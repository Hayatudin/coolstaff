const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('sample_musaned.pdf');

pdf(dataBuffer).then(function(data) {
    console.log(data.text);
}).catch(function(error) {
    console.error("Error parsing PDF:", error);
});
