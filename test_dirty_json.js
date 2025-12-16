
const http = require('http');

const payload = `{
    "traceId": "test-123",
    "requestId": "req-123",
    "invoiceOrigin": "TEST",
    "status": "PENDING",
    "xmlReceived": "<root>\\t<node>Value</node>\\n</root>"
}`;

// Intentionally create a "dirty" payload with real tabs and newlines if possible, 
// or rely on the previous error: "Bad control character".
// The previous error happened because a real tab character (ascii 9) was inside a string "SV\t<DE>".
// Let's try to simulate that.
const dirtyPayload = `
{
    "traceId": "test-123",
    "requestId": "req-123",
    "invoiceOrigin": "TEST",
    "status": "PENDING",
    "xmlReceived": "<rDE>\t<DE>Content with tab</DE></rDE>"
}
`;

const options = {
  hostname: 'localhost',
  port: 9500,
  path: '/invoices',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(dirtyPayload)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('BODY:', data);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
  process.exit(1);
});

req.write(dirtyPayload);
req.end();
