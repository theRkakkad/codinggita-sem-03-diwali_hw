/**
 * Phase 19 Full-Stack Integration Verification Test
 * Tests the complete integration lifecycle between Frontend Services and Backend APIs.
 */
const http = require('http');
const mongoose = require('mongoose');
const { app } = require('./server');
const User = require('./models/User');
const Medicine = require('./models/Medicine');
const DoseEvent = require('./models/DoseEvent');

const TEST_PORT = 5005;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let server;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const payload = body ? JSON.stringify(body) : null;
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = data ? JSON.parse(data) : {};
          } catch (e) {
            json = { raw: data };
          }
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        });
      }
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

async function runTests() {
  console.log('--- Starting NIYAM Phase 19 Frontend & Backend Integration Verification ---');

  // Connect to DB and start HTTP server
  if (mongoose.connection.readyState === 0) {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/niyam';
    await mongoose.connect(MONGODB_URI);
  }

  server = app.listen(TEST_PORT);
  console.log(`Test server running at ${BASE_URL}`);

  const testEmail = `integration.test.${Date.now()}@niyam.health`;
  const testPassword = 'SecurePassword#2026';
  let authToken = null;
  let testUserId = null;
  let testMedicineId = null;
  let testDoseEventId = null;

  try {
    // 1. Health check
    console.log('\n[1. API Connectivity & Health Check]');
    const healthRes = await request('GET', '/api/health');
    assert(healthRes.status === 200, 'Health endpoint responds with HTTP 200');
    assert(healthRes.data.success === true, 'Health check indicates success: true');

    // 2. Authentication Integration: Register
    console.log('\n[2. Authentication: User Registration]');
    const regRes = await request('POST', '/api/auth/register', {
      name: 'Rachit Integration User',
      email: testEmail,
      password: testPassword,
    });
    assert(regRes.status === 201, 'POST /api/auth/register returns HTTP 201 Created');
    assert(regRes.data.success === true, 'Registration returns success: true');
    assert(regRes.data.user.email === testEmail, 'User email properly assigned');
    testUserId = regRes.data.user.id;

    // 3. Authentication Integration: Login
    console.log('\n[3. Authentication: User Login]');
    const loginRes = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: testPassword,
    });
    assert(loginRes.status === 200, 'POST /api/auth/login returns HTTP 200 OK');
    assert(!!loginRes.data.token, 'Login returns valid JWT token');
    authToken = loginRes.data.token;

    // 4. Authentication Integration: Restore Session (GET /api/auth/me)
    console.log('\n[4. Authentication: Session Restore & Profile]');
    const meRes = await request('GET', '/api/auth/me', null, authToken);
    assert(meRes.status === 200, 'GET /api/auth/me returns HTTP 200 OK');
    assert(meRes.data.user.id === testUserId, 'Authenticated user matches registered account');
    assert(meRes.data.user.passwordHash === undefined, 'Password hash is strictly excluded');

    // 5. Protected Route Access Without Token
    console.log('\n[5. Security: Unauthenticated Route Protection]');
    const unauthRes = await request('GET', '/api/medicines');
    assert(unauthRes.status === 401, 'GET /api/medicines without JWT is rejected with HTTP 401');

    // 6. Medication Integration: Create Medicine
    console.log('\n[6. Medicine Management: Create Routine]');
    const today = new Date();
    const createMedRes = await request('POST', '/api/medicines', {
      name: 'Amoxicillin',
      dosage: '500 mg',
      type: 'Capsule',
      frequency: 'Twice daily',
      reminderTimes: ['08:00 AM', '08:00 PM'],
      instructions: 'Take after meals with plenty of water.',
      startDate: today.toISOString(),
      status: 'Active',
    }, authToken);
    assert(createMedRes.status === 201, 'POST /api/medicines returns HTTP 201 Created');
    assert(createMedRes.data.medicine.name === 'Amoxicillin', 'Medicine name matches payload');
    assert(createMedRes.data.medicine.reminderTimes.length === 2, 'Reminder times array matches frequency');
    testMedicineId = createMedRes.data.medicine._id;

    // 7. Medication Integration: Fetch User Medicines
    console.log('\n[7. Medicine Management: Fetch Medicines List]');
    const getMedsRes = await request('GET', '/api/medicines', null, authToken);
    assert(getMedsRes.status === 200, 'GET /api/medicines returns HTTP 200 OK');
    assert(Array.isArray(getMedsRes.data.medicines), 'Medicines is returned as an array');
    assert(getMedsRes.data.medicines.some((m) => m._id === testMedicineId), 'Created medicine is present in user list');

    // 8. Medication Integration: Update Medicine (Pause / Resume)
    console.log('\n[8. Medicine Management: Update & Toggle Status]');
    const pauseRes = await request('PUT', `/api/medicines/${testMedicineId}`, {
      status: 'Paused',
    }, authToken);
    assert(pauseRes.status === 200, 'PUT /api/medicines/:id status: Paused returns HTTP 200');
    assert(pauseRes.data.medicine.status === 'Paused', 'Medicine status updated to Paused in MongoDB');

    const resumeRes = await request('PUT', `/api/medicines/${testMedicineId}`, {
      status: 'Active',
    }, authToken);
    assert(resumeRes.status === 200, 'PUT /api/medicines/:id status: Active returns HTTP 200');
    assert(resumeRes.data.medicine.status === 'Active', 'Medicine status resumed to Active');

    // 9. Dose Event Integration: Create Scheduled Dose Event
    console.log('\n[9. Dose Events: Create Scheduled Event]');
    const scheduledTime = new Date();
    scheduledTime.setUTCHours(9, 0, 0, 0); // 09:00 AM UTC
    const createDoseRes = await request('POST', '/api/dose-events', {
      medicineId: testMedicineId,
      scheduledAt: scheduledTime.toISOString(),
      notes: 'Morning routine dose',
    }, authToken);
    assert(createDoseRes.status === 201, 'POST /api/dose-events returns HTTP 201 Created');
    assert(createDoseRes.data.doseEvent.status === 'pending', 'Initial dose status is pending');
    testDoseEventId = createDoseRes.data.doseEvent._id;

    // 10. Dose Event Integration: Fetch Today's Dose Events
    console.log('\n[10. Dose Events: Fetch Dose Events Query]');
    const dateKey = scheduledTime.toISOString().split('T')[0];
    const getDosesRes = await request('GET', `/api/dose-events?date=${dateKey}`, null, authToken);
    assert(getDosesRes.status === 200, 'GET /api/dose-events?date=YYYY-MM-DD returns HTTP 200 OK');
    assert(getDosesRes.data.doseEvents.length >= 1, 'Today dose event retrieved from MongoDB');
    assert(getDosesRes.data.doseEvents[0].medicineId.name === 'Amoxicillin', 'Associated medicine details populated');

    // 11. Dose Event Integration: Mark Dose as Taken
    console.log('\n[11. Dose Events: Mark Dose as Taken]');
    const takenRes = await request('PATCH', `/api/dose-events/${testDoseEventId}/taken`, {
      takenAt: new Date().toISOString(),
    }, authToken);
    assert(takenRes.status === 200, 'PATCH /api/dose-events/:id/taken returns HTTP 200 OK');
    assert(takenRes.data.doseEvent.status === 'taken', 'Dose status transitioned to taken');
    assert(!!takenRes.data.doseEvent.takenAt, 'takenAt timestamp recorded in MongoDB');

    // 12. Dose Event Integration: Second Dose -> Skipped
    console.log('\n[12. Dose Events: Mark Dose as Skipped]');
    const scheduledTime2 = new Date();
    scheduledTime2.setUTCHours(20, 0, 0, 0); // 08:00 PM UTC
    const createDose2 = await request('POST', '/api/dose-events', {
      medicineId: testMedicineId,
      scheduledAt: scheduledTime2.toISOString(),
    }, authToken);
    assert(createDose2.status === 201, 'Second scheduled dose created');
    const dose2Id = createDose2.data.doseEvent._id;

    const skipRes = await request('PATCH', `/api/dose-events/${dose2Id}/skipped`, {
      reason: 'Fasting for lab test',
    }, authToken);
    assert(skipRes.status === 200, 'PATCH /api/dose-events/:id/skipped returns HTTP 200 OK');
    assert(skipRes.data.doseEvent.status === 'skipped', 'Dose status transitioned to skipped');

    // 13. Dose Event Integration: Third Dose -> Explicitly Confirmed Missed
    console.log('\n[13. Dose Events: Explicitly Confirm Dose as Missed]');
    const scheduledTime3 = new Date(Date.now() + 86400000); // Tomorrow
    scheduledTime3.setUTCHours(9, 0, 0, 0);
    const createDose3 = await request('POST', '/api/dose-events', {
      medicineId: testMedicineId,
      scheduledAt: scheduledTime3.toISOString(),
    }, authToken);
    assert(createDose3.status === 201, 'Third scheduled dose created');
    const dose3Id = createDose3.data.doseEvent._id;

    const missedRes = await request('PATCH', `/api/dose-events/${dose3Id}/missed`, {
      missedReason: 'Forgot medication while traveling',
    }, authToken);
    assert(missedRes.status === 200, 'PATCH /api/dose-events/:id/missed returns HTTP 200 OK');
    assert(missedRes.data.doseEvent.status === 'missed', 'Dose status transitioned to user-confirmed missed');
    assert(missedRes.data.doseEvent.missedReason === 'Forgot medication while traveling', 'Voluntary missedReason recorded');

    // 14. Cleanup
    console.log('\n[14. Clean Up Test Artifacts]');
    await DoseEvent.deleteMany({ userId: testUserId });
    await Medicine.deleteMany({ userId: testUserId });
    await User.findByIdAndDelete(testUserId);
    console.log('Cleaned up test dose events, medicines, and user accounts.');

    console.log('\n======================================================');
    console.log('All 14 Phase 19 Full-Stack Integration Verification Tests Passed!');
    console.log('======================================================\n');
  } catch (error) {
    console.error('Integration test failed with error:', error);
    process.exit(1);
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

runTests();
