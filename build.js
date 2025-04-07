const fs = require('fs');
const path = require('path');

const env = {
  GOOGLE_CLIENT_ID: "892883759524-crgr5ag4eu4o21c1ginihfbsouhm9u1v.apps.googleusercontent.com",
  GITHUB_CLIENT_ID: "Ov23li6FLQ78HLhxZa0y",
  BACKEND_URL: process.env.BACKEND_URL
};

const content = `window.env = ${JSON.stringify(env, null, 2)};`;
fs.writeFileSync(path.join(__dirname, 'js', 'env.js'), content);
console.log('Generated env.js');