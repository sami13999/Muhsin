/**
 * DATABASE CONNECTION TEST
 * Tests connectivity to Supabase Postgres without npm dependencies.
 */

const { URL } = require('url');
const tls = require('tls');
const net = require('net');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const parsed = new URL(dbUrl);
console.log('Target:', `${parsed.hostname}:${parsed.port}`);
console.log('Database:', parsed.pathname.slice(1));
console.log('');

// Test 1: TCP connectivity
console.log('Test 1: TCP connectivity...');
const socket = new net.Socket();
socket.setTimeout(5000);

socket.connect(parseInt(parsed.port) || 5432, parsed.hostname, () => {
  console.log('  ✅ TCP connection established');
  socket.destroy();
  
  // Test 2: Try PostgreSQL startup message (simple auth test)
  console.log('\nTest 2: PostgreSQL protocol handshake...');
  const pgSocket = new net.Socket();
  pgSocket.setTimeout(5000);
  
  pgSocket.connect(parseInt(parsed.port) || 5432, parsed.hostname, () => {
    // Send SSL request
    const sslRequest = Buffer.from([
      0x00, 0x00, 0x00, 0x08, // Length
      0x04, 0xD2, 0x16, 0x2F  // SSL request code
    ]);
    pgSocket.write(sslRequest);
  });
  
  pgSocket.on('data', (data) => {
    const response = data.toString();
    if (response === 'S') {
      console.log('  ✅ PostgreSQL server responded (SSL supported)');
    } else if (response === 'N') {
      console.log('  ⚠️ PostgreSQL server does not support SSL');
    } else {
      console.log('  📨 Server response:', data.toString('hex').substring(0, 20));
    }
    pgSocket.destroy();
    
    // Test 3: Check Supabase REST API
    console.log('\nTest 3: Supabase REST API...');
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) {
      console.log('  ⚠️ SUPABASE_URL not set — skipping REST API test');
      pgSocket.destroy();
      return;
    }
    const anonKey = process.env.SUPABASE_ANON_KEY;
    
    fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
    }).then(res => {
      console.log(`  Status: ${res.status}`);
      return res.text();
    }).then(text => {
      console.log('  Response:', text.substring(0, 200));
      console.log('\n✅ DATABASE CONNECTION: LIVE');
      process.exit(0);
    }).catch(err => {
      console.log(`  ❌ Supabase REST error: ${err.message}`);
      console.log('\n⚠️ TCP OK but Supabase REST unreachable');
      process.exit(0);
    });
  });
  
  pgSocket.on('error', (err) => {
    console.log(`  ❌ PostgreSQL protocol error: ${err.message}`);
    pgSocket.destroy();
    process.exit(1);
  });
  
  pgSocket.on('timeout', () => {
    console.log('  ❌ PostgreSQL protocol timeout');
    pgSocket.destroy();
    process.exit(1);
  });
});

socket.on('error', (err) => {
  console.log(`  ❌ TCP connection failed: ${err.message}`);
  console.log('\n❌ DATABASE CONNECTION: FAILED');
  process.exit(1);
});

socket.on('timeout', () => {
  console.log('  ❌ TCP connection timeout');
  socket.destroy();
  console.log('\n❌ DATABASE CONNECTION: FAILED');
  process.exit(1);
});
