const http = require('http');

let input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const req = http.request({
      hostname: 'localhost',
      port: 3456,
      path: '/api/hook',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 2000
    }, (res) => { res.resume(); process.exit(0); });
    req.on('error', () => process.exit(0));
    req.on('timeout', () => { req.destroy(); process.exit(0); });
    req.write(input || '{}');
    req.end();
  } catch (e) {
    process.exit(0);
  }
});
