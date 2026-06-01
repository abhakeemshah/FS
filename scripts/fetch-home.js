const http = require('http');

const url = 'http://localhost:3000';
const req = http.get(url, (res) => {
  console.log('STATUS:' + res.statusCode);
  let body = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log(body.slice(0, 1200));
    process.exit(0);
  });
});

req.on('error', (err) => {
  console.error('ERROR:' + err.message);
  process.exit(2);
});
