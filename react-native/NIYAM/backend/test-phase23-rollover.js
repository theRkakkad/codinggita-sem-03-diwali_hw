const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const { app } = require('./server');
const User = require('./models/User');
const Medicine = require('./models/Medicine');
const DoseEvent = require('./models/DoseEvent');

const TEST_PORT = 5007;
let serverInstance = null;
const results = [];

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    results.push({ pass: false, message });
    throw new Error(message);
  } else {
    console.log(`PASS: ${message}`);
    results.push({ pass: true, message });
  }
}

function httpRequest({ method, path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    let payloadBuffer = null;
    const reqHeaders = { ...headers };

    if (body) {
      if (Buffer.isBuffer(body)) {
        payloadBuffer = body;
        reqHeaders['Content-Length'] = payloadBuffer.length;
      } else if (typeof body === 'object') {
        const jsonStr = JSON.stringify(body);
        payloadBuffer = Buffer.from(jsonStr, 'utf8');
        reqHeaders['Content-Type'] = 'application/json';
        reqHeaders['Content-Length'] = payloadBuffer.length;
      }
    }

    const options = {
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path,
      method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(rawData);
        } catch (e) {
          parsed = rawData;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (payloadBuffer) {
      req.write(payloadBuffer);
    }
    req.end();
  });
}

async function runRolloverTests() {
  console.log('=== Starting NIYAM Phase 23 Day Rollover API Tests ===\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/niyam_test');
  serverInstance = http.createServer(app);
  await new Promise((resolve) => serverInstance.listen(TEST_PORT, resolve));
  console.log(`Phase 23 test server running at http://127.0.0.1:${TEST_PORT}\n`);

  try {
    // 1. Setup User & Medicine
    const userEmail = `eod_user_${Date.now()}@example.com`;
    const regRes = await httpRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: { name: 'EOD Tester', email: userEmail, password: 'Password123!' },
    });
    assert(regRes.statusCode === 201, 'User registered successfully');

    const loginRes = await httpRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: userEmail, password: 'Password123!' },
    });
    assert(loginRes.statusCode === 200, 'User logged in successfully');
    const token = loginRes.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    const medRes = await httpRequest({
      method: 'POST',
      path: '/api/medicines',
      headers: authHeaders,
      body: {
        name: 'Metformin',
        dosage: '500mg',
        type: 'Tablet',
        instructions: 'Take after meal',
        frequency: 'Once daily',
        reminderTimes: ['08:00 AM'],
        startDate: '2026-11-01',
      },
    });
    if (medRes.statusCode !== 201) {
      console.error('medRes failure:', medRes.statusCode, medRes.data);
    }
    assert(medRes.statusCode === 201, 'Medicine created successfully');
    const medId = medRes.data.medicine._id || medRes.data.medicine.id;

    // 2. Create doses: past pending, past taken, today pending
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const today = new Date();

    const d1Res = await httpRequest({
      method: 'POST',
      path: '/api/dose-events',
      headers: authHeaders,
      body: { medicineId: medId, scheduledAt: yesterday.toISOString() },
    });
    assert(d1Res.statusCode === 201, 'Past pending dose 1 created');
    const d1Id = d1Res.data.doseEvent._id || d1Res.data.doseEvent.id;

    const d2Res = await httpRequest({
      method: 'POST',
      path: '/api/dose-events',
      headers: authHeaders,
      body: { medicineId: medId, scheduledAt: new Date(yesterday.getTime() + 4 * 3600000).toISOString(), notes: 'Yesterday evening' },
    });
    assert(d2Res.statusCode === 201, 'Past dose 2 created');
    const d2Id = d2Res.data.doseEvent._id || d2Res.data.doseEvent.id;

    // Mark d2 as taken
    const d2Taken = await httpRequest({
      method: 'PATCH',
      path: `/api/dose-events/${d2Id}/taken`,
      headers: authHeaders,
    });
    assert(d2Taken.statusCode === 200, 'Past dose 2 marked as taken');

    const d3Res = await httpRequest({
      method: 'POST',
      path: '/api/dose-events',
      headers: authHeaders,
      body: { medicineId: medId, scheduledAt: today.toISOString() },
    });
    assert(d3Res.statusCode === 201, 'Today pending dose created');
    const d3Id = d3Res.data.doseEvent._id || d3Res.data.doseEvent.id;

    // 3. Test Rollover Endpoint
    console.log('\n[Day Rollover Execution]');
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const rolloverRes = await httpRequest({
      method: 'POST',
      path: '/api/dose-events/rollover',
      headers: authHeaders,
      body: { beforeDate: startOfToday.toISOString() },
    });

    assert(rolloverRes.statusCode === 200, 'POST /api/dose-events/rollover returns HTTP 200');
    assert(rolloverRes.data.success === true, 'Response contains success: true');
    assert(rolloverRes.data.modifiedCount === 1, 'Exactly 1 past pending dose transitioned');

    // 4. Verify Document States in Database
    const checkD1 = await httpRequest({
      method: 'GET',
      path: `/api/dose-events/${d1Id}`,
      headers: authHeaders,
    });
    assert(checkD1.data.doseEvent.status === 'unconfirmed', 'Past pending dose transitioned to unconfirmed');
    assert(checkD1.data.doseEvent.status !== 'missed', 'Unconfirmed dose is NOT marked as missed');

    const checkD2 = await httpRequest({
      method: 'GET',
      path: `/api/dose-events/${d2Id}`,
      headers: authHeaders,
    });
    assert(checkD2.data.doseEvent.status === 'taken', 'Past taken dose remained strictly taken');

    const checkD3 = await httpRequest({
      method: 'GET',
      path: `/api/dose-events/${d3Id}`,
      headers: authHeaders,
    });
    assert(checkD3.data.doseEvent.status === 'pending', 'Today pending dose remained pending');

    // 5. Test Idempotency
    const rolloverRes2 = await httpRequest({
      method: 'POST',
      path: '/api/dose-events/rollover',
      headers: authHeaders,
      body: { beforeDate: startOfToday.toISOString() },
    });
    assert(rolloverRes2.statusCode === 200, 'Second rollover call returns HTTP 200');
    assert(rolloverRes2.data.modifiedCount === 0, 'Second rollover modifies 0 documents (idempotent)');

    // Clean up
    console.log('\n[Cleaning up test artifacts]');
    await DoseEvent.deleteMany({ userId: regRes.data.user.id });
    await Medicine.deleteMany({ userId: regRes.data.user.id });
    await User.deleteMany({ _id: regRes.data.user.id });

    console.log('\n======================================================');
    console.log(`Phase 23 Day Rollover API Tests Passed! (${results.length} checks)`);
    console.log('======================================================\n');
  } finally {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
    await mongoose.disconnect();
  }
}

runRolloverTests().catch((err) => {
  console.error('Test suite failed:', err.message);
  process.exit(1);
});
