require('dotenv').config();
const http = require('http');

const SUPER_SECRET = process.env.SUPER_ADMIN_SECRET;
if (!SUPER_SECRET) {
  console.error('ERROR: SUPER_ADMIN_SECRET environment variable is not defined.');
  process.exit(1);
}

async function request(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 4000,
      path: '/api/super-admin' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-SuperAdmin-Secret': SUPER_SECRET
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data || '{}') }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('--- Testing Super Admin API ---');
  console.log(`Using Super Admin Secret: "${SUPER_SECRET}"`);

  // 1. List Tenants
  const list = await request('/tenants');
  console.log('\nList Tenants Status:', list.status);
  if (list.data.data) {
    console.log('Tenants in system:');
    list.data.data.forEach(t => {
      console.log(`  - [${t.id}] ${t.name} (Subdomain: ${t.subdomain}, Tier: ${t.licenseTier}, MaxUsers: ${t.maxUsers}, ActiveUsers: ${t.activeUserCount})`);
    });
  } else {
    console.log('Response:', list.data);
  }
}

run().catch(console.error);
