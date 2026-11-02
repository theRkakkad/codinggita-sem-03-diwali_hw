const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const { app } = require('./server');
const User = require('./models/User');
const Medicine = require('./models/Medicine');

const TEST_PORT = 5002;
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

// HTTP request helper
function httpRequest({ method, path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const reqHeaders = { ...headers };
    if (dataString) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(dataString);
    }

    const options = {
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path,
      method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(responseBody);
        } catch (e) {
          json = responseBody;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (dataString) {
      req.write(dataString);
    }
    req.end();
  });
}

async function runMedicineTests() {
  console.log('--- Starting NIYAM Phase 16 Medication CRUD & Ownership Tests ---');

  // 1. Connect database & start test server
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/niyam';
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log(`Connected to database: ${mongoose.connection.host}`);

  serverInstance = app.listen(TEST_PORT, () => {
    console.log(`Test server running at http://127.0.0.1:${TEST_PORT}`);
  });

  const createdUserIds = [];
  const createdMedIds = [];

  try {
    // 2. Register User A and User B
    const emailA = `test.user.a.${Date.now()}@example.com`;
    const emailB = `test.user.b.${Date.now()}@example.com`;

    const resRegA = await httpRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: { name: 'User Alpha', email: emailA, password: 'PasswordA123!' },
    });
    assert(resRegA.statusCode === 201, 'User A registered successfully');
    const userAId = resRegA.data.user.id;
    createdUserIds.push(userAId);

    const resLoginA = await httpRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: emailA, password: 'PasswordA123!' },
    });
    const tokenA = resLoginA.data.token;
    assert(typeof tokenA === 'string' && tokenA.length > 20, 'User A received valid JWT');

    const resRegB = await httpRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: { name: 'User Beta', email: emailB, password: 'PasswordB123!' },
    });
    assert(resRegB.statusCode === 201, 'User B registered successfully');
    const userBId = resRegB.data.user.id;
    createdUserIds.push(userBId);

    const resLoginB = await httpRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: emailB, password: 'PasswordB123!' },
    });
    const tokenB = resLoginB.data.token;
    assert(typeof tokenB === 'string' && tokenB.length > 20, 'User B received valid JWT');

    // ==========================================
    // 1. AUTHENTICATION TESTS
    // ==========================================
    console.log('\n[1. Authentication Middleware Tests]');

    const resNoToken = await httpRequest({
      method: 'GET',
      path: '/api/medicines',
    });
    assert(resNoToken.statusCode === 401, 'Request without token returns 401');

    const resBadToken = await httpRequest({
      method: 'GET',
      path: '/api/medicines',
      headers: { Authorization: 'Bearer fake.invalid.jwt.token' },
    });
    assert(resBadToken.statusCode === 401, 'Request with invalid token returns 401');

    const resValidToken = await httpRequest({
      method: 'GET',
      path: '/api/medicines',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resValidToken.statusCode === 200, 'Request with valid token returns 200');

    // ==========================================
    // 2. CREATE MEDICINE TESTS (POST /api/medicines)
    // ==========================================
    console.log('\n[2. Create Medicine Tests]');

    // 2.1 Valid Medicine Creation for User A
    const resCreateMed1 = await httpRequest({
      method: 'POST',
      path: '/api/medicines',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        name: 'Vitamin D3',
        dosage: '1 capsule',
        type: 'Capsule',
        instructions: 'After breakfast',
        frequency: 'Once daily',
        reminderTimes: ['09:00 AM'],
        startDate: '2026-11-01',
        endDate: '2026-12-01',
      },
    });
    assert(resCreateMed1.statusCode === 201, 'Valid medicine creation returns HTTP 201');
    assert(resCreateMed1.data.success === true, 'Valid creation returns success: true');
    assert(resCreateMed1.data.medicine.name === 'Vitamin D3', 'Created medicine has correct name');
    assert(resCreateMed1.data.medicine.userId === userAId, 'Created medicine is assigned to User A');
    assert(resCreateMed1.data.medicine.status === 'Active', 'Default medicine status is Active');
    const medA1Id = resCreateMed1.data.medicine._id;
    createdMedIds.push(medA1Id);

    // 2.2 Client-Supplied userId Spoofing Prevention
    const fakeUserId = new mongoose.Types.ObjectId();
    const resSpoofedUserId = await httpRequest({
      method: 'POST',
      path: '/api/medicines',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        userId: fakeUserId.toString(), // Attempting to assign ownership to another user
        name: 'Metformin',
        dosage: '500mg',
        type: 'Tablet',
        frequency: 'Twice daily',
        reminderTimes: ['08:00 AM', '08:00 PM'],
        startDate: '2026-11-01',
      },
    });
    assert(resSpoofedUserId.statusCode === 201, 'Medicine created successfully');
    assert(
      resSpoofedUserId.data.medicine.userId === userAId,
      'Server strictly binds userId to authenticated user, ignoring client-supplied userId'
    );
    const medA2Id = resSpoofedUserId.data.medicine._id;
    createdMedIds.push(medA2Id);

    // 2.3 Missing Required Name
    const resNoName = await httpRequest({
      method: 'POST',
      path: '/api/medicines',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        dosage: '500mg',
        type: 'Tablet',
        frequency: 'Once daily',
        reminderTimes: ['08:00 AM'],
        startDate: '2026-11-01',
      },
    });
    assert(resNoName.statusCode === 400, 'Missing name returns HTTP 400');

    // 2.4 Missing Dosage
    const resNoDosage = await httpRequest({
      method: 'POST',
      path: '/api/medicines',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        name: 'Aspirin',
        type: 'Tablet',
        frequency: 'Once daily',
        reminderTimes: ['08:00 AM'],
        startDate: '2026-11-01',
      },
    });
    assert(resNoDosage.statusCode === 400, 'Missing dosage returns HTTP 400');

    // 2.5 Invalid Frequency
    const resBadFreq = await httpRequest({
      method: 'POST',
      path: '/api/medicines',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        name: 'Aspirin',
        dosage: '100mg',
        type: 'Tablet',
        frequency: 'Hourly', // Invalid
        reminderTimes: ['08:00 AM'],
        startDate: '2026-11-01',
      },
    });
    assert(resBadFreq.statusCode === 400, 'Unsupported frequency returns HTTP 400');

    // 2.6 Mismatched Reminder Times for Frequency (Three times daily requires 3 times)
    const resBadReminderCount = await httpRequest({
      method: 'POST',
      path: '/api/medicines',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        name: 'Amoxicillin',
        dosage: '250mg',
        type: 'Capsule',
        frequency: 'Three times daily',
        reminderTimes: ['08:00 AM'], // Only 1 provided instead of 3
        startDate: '2026-11-01',
      },
    });
    assert(resBadReminderCount.statusCode === 400, 'Mismatched reminder times count returns HTTP 400');

    // 2.7 End Date Earlier than Start Date
    const resBadDate = await httpRequest({
      method: 'POST',
      path: '/api/medicines',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        name: 'Ibuprofen',
        dosage: '400mg',
        type: 'Tablet',
        frequency: 'Once daily',
        reminderTimes: ['08:00 AM'],
        startDate: '2026-11-10',
        endDate: '2026-11-05',
      },
    });
    assert(resBadDate.statusCode === 400, 'End date earlier than start date returns HTTP 400');

    // 2.8 Invalid Status on Creation
    const resBadStatus = await httpRequest({
      method: 'POST',
      path: '/api/medicines',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        name: 'Paracetamol',
        dosage: '500mg',
        type: 'Tablet',
        frequency: 'Once daily',
        reminderTimes: ['08:00 AM'],
        startDate: '2026-11-01',
        status: 'Archived', // Invalid status
      },
    });
    assert(resBadStatus.statusCode === 400, 'Invalid status returns HTTP 400');

    // 2.9 Create Medicine for User B (for isolation testing)
    const resCreateMedB = await httpRequest({
      method: 'POST',
      path: '/api/medicines',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: {
        name: 'Insulin Glargine',
        dosage: '10 units',
        type: 'Injection',
        frequency: 'Once daily',
        reminderTimes: ['22:00'],
        startDate: '2026-11-01',
        status: 'Active',
      },
    });
    assert(resCreateMedB.statusCode === 201, 'User B created medicine successfully');
    const medB1Id = resCreateMedB.data.medicine._id;
    createdMedIds.push(medB1Id);

    // ==========================================
    // 3. READ MEDICINES TESTS (GET /api/medicines)
    // ==========================================
    console.log('\n[3. Read Medicines & Ownership Isolation Tests]');

    // 3.1 Get All Medicines for User A (Should include Med A1, Med A2; but NOT Med B1)
    const resGetMedsA = await httpRequest({
      method: 'GET',
      path: '/api/medicines',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resGetMedsA.statusCode === 200, 'Get all medicines for User A returns HTTP 200');
    assert(resGetMedsA.data.count >= 2, 'User A receives their medicines');
    const userAIdsInList = resGetMedsA.data.medicines.map((m) => m._id);
    assert(userAIdsInList.includes(medA1Id), 'User A list includes Medicine A1');
    assert(userAIdsInList.includes(medA2Id), 'User A list includes Medicine A2');
    assert(!userAIdsInList.includes(medB1Id), 'User A list strictly EXCLUDES User B medicine');

    // 3.2 Filter by Status
    // Pause Med A2
    await httpRequest({
      method: 'PUT',
      path: `/api/medicines/${medA2Id}`,
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { status: 'Paused' },
    });

    const resFilterActive = await httpRequest({
      method: 'GET',
      path: '/api/medicines?status=Active',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resFilterActive.statusCode === 200, 'Filter by status Active returns HTTP 200');
    assert(
      resFilterActive.data.medicines.every((m) => m.status === 'Active'),
      'All returned medicines have status Active'
    );

    const resFilterPaused = await httpRequest({
      method: 'GET',
      path: '/api/medicines?status=Paused',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resFilterPaused.statusCode === 200, 'Filter by status Paused returns HTTP 200');
    assert(
      resFilterPaused.data.medicines.every((m) => m.status === 'Paused'),
      'All returned medicines have status Paused'
    );

    const resBadFilter = await httpRequest({
      method: 'GET',
      path: '/api/medicines?status=UnknownStatus',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resBadFilter.statusCode === 400, 'Invalid status filter returns HTTP 400');

    // 3.3 Search by Medicine Name
    const resSearch = await httpRequest({
      method: 'GET',
      path: '/api/medicines?search=vitamin',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resSearch.statusCode === 200, 'Search by name returns HTTP 200');
    assert(
      resSearch.data.medicines.some((m) => m.name.toLowerCase().includes('vitamin')),
      'Search results contain matching medicine name'
    );

    // 3.4 Get Medicine by ID
    const resGetById = await httpRequest({
      method: 'GET',
      path: `/api/medicines/${medA1Id}`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resGetById.statusCode === 200, 'Get medicine by valid ID returns HTTP 200');
    assert(resGetById.data.medicine._id === medA1Id, 'Returned medicine matches requested ID');

    // 3.5 Invalid ID Format returns 400
    const resBadIdFormat = await httpRequest({
      method: 'GET',
      path: '/api/medicines/invalid-id-format',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resBadIdFormat.statusCode === 400, 'Invalid ObjectId format returns HTTP 400');

    // 3.6 Unknown ID returns 404
    const nonExistentId = new mongoose.Types.ObjectId();
    const resUnknownId = await httpRequest({
      method: 'GET',
      path: `/api/medicines/${nonExistentId}`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resUnknownId.statusCode === 404, 'Non-existent ID returns HTTP 404');

    // 3.7 Cross-User Isolation: User B cannot view User A's medicine
    const resCrossUserGet = await httpRequest({
      method: 'GET',
      path: `/api/medicines/${medA1Id}`,
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(resCrossUserGet.statusCode === 404, 'User B accessing User A medicine returns HTTP 404');

    // ==========================================
    // 4. UPDATE MEDICINE TESTS (PUT /api/medicines/:id)
    // ==========================================
    console.log('\n[4. Update Medicine & Ownership Enforcement Tests]');

    // 4.1 Valid Update by Owner
    const resUpdateValid = await httpRequest({
      method: 'PUT',
      path: `/api/medicines/${medA1Id}`,
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        dosage: '2 capsules',
        instructions: 'After lunch with water',
        status: 'Completed',
      },
    });
    assert(resUpdateValid.statusCode === 200, 'Valid update returns HTTP 200');
    assert(resUpdateValid.data.medicine.dosage === '2 capsules', 'Dosage updated in response');
    assert(resUpdateValid.data.medicine.status === 'Completed', 'Status updated to Completed');

    // Verify in database
    const dbMedA1 = await Medicine.findById(medA1Id);
    assert(dbMedA1.dosage === '2 capsules', 'Dosage persisted in MongoDB');
    assert(dbMedA1.status === 'Completed', 'Status persisted in MongoDB');

    // 4.2 Disallow Changing Ownership via Update
    const resAttemptUserChange = await httpRequest({
      method: 'PUT',
      path: `/api/medicines/${medA1Id}`,
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        userId: userBId, // Attempting to transfer ownership to User B
      },
    });
    assert(resAttemptUserChange.statusCode === 200, 'Update request completes');
    const dbMedA1Check = await Medicine.findById(medA1Id);
    assert(
      dbMedA1Check.userId.toString() === userAId,
      'Medicine userId cannot be altered through update endpoint'
    );

    // 4.3 Invalid Update Fails Validation (e.g. End date before start date)
    const resUpdateBadDate = await httpRequest({
      method: 'PUT',
      path: `/api/medicines/${medA1Id}`,
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        endDate: '2020-01-01', // Earlier than startDate
      },
    });
    assert(resUpdateBadDate.statusCode === 400, 'Invalid update violating schema returns HTTP 400');

    // 4.4 Cross-User Isolation: User B cannot update User A's medicine
    const resCrossUserUpdate = await httpRequest({
      method: 'PUT',
      path: `/api/medicines/${medA1Id}`,
      headers: { Authorization: `Bearer ${tokenB}` },
      body: {
        name: 'Hacked Medicine Name',
      },
    });
    assert(resCrossUserUpdate.statusCode === 404, 'User B updating User A medicine returns HTTP 404');
    const dbMedA1NotHacked = await Medicine.findById(medA1Id);
    assert(dbMedA1NotHacked.name === 'Vitamin D3', 'Medicine name remained unaltered');

    // ==========================================
    // 5. DELETE MEDICINE TESTS (DELETE /api/medicines/:id)
    // ==========================================
    console.log('\n[5. Delete Medicine & Ownership Enforcement Tests]');

    // 5.1 Cross-User Isolation: User B cannot delete User A's medicine
    const resCrossUserDelete = await httpRequest({
      method: 'DELETE',
      path: `/api/medicines/${medA1Id}`,
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(resCrossUserDelete.statusCode === 404, 'User B deleting User A medicine returns HTTP 404');
    const dbMedA1StillExists = await Medicine.findById(medA1Id);
    assert(dbMedA1StillExists !== null, 'Medicine still exists after unauthorized deletion attempt');

    // 5.2 Owner Deletes Medicine
    const resDeleteValid = await httpRequest({
      method: 'DELETE',
      path: `/api/medicines/${medA1Id}`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resDeleteValid.statusCode === 200, 'Owner deleting medicine returns HTTP 200');
    assert(resDeleteValid.data.success === true, 'Delete returns success: true');

    // 5.3 Subsequent Lookup Returns 404
    const resLookupDeleted = await httpRequest({
      method: 'GET',
      path: `/api/medicines/${medA1Id}`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resLookupDeleted.statusCode === 404, 'Deleted medicine returns 404 on subsequent lookup');

    // ==========================================
    // 6. REGRESSION VERIFICATION
    // ==========================================
    console.log('\n[6. Regression Verification]');

    // 6.1 Health Endpoint
    const resHealth = await httpRequest({
      method: 'GET',
      path: '/api/health',
    });
    assert(resHealth.statusCode === 200, 'Health endpoint returns HTTP 200');
    assert(resHealth.data.database === 'connected', 'Health endpoint reports database: connected');

    // 6.2 Profile /api/auth/me Endpoint
    const resProfile = await httpRequest({
      method: 'GET',
      path: '/api/auth/me',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resProfile.statusCode === 200, 'Profile endpoint returns HTTP 200');
    assert(resProfile.data.user.id === userAId, 'Profile endpoint returns correct user ID');
    assert(resProfile.data.user.passwordHash === undefined, 'Profile response strictly excludes passwordHash');

  } finally {
    // 7. Cleanup Test Data Safely
    console.log('\n[Cleaning up test artifacts]');
    if (createdMedIds.length > 0) {
      await Medicine.deleteMany({ _id: { $in: createdMedIds } });
      console.log(`Cleaned up ${createdMedIds.length} test medicines.`);
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
      console.log(`Cleaned up ${createdUserIds.length} test users.`);
    }

    if (serverInstance) {
      serverInstance.close();
    }
    await mongoose.disconnect();
    console.log('Test database disconnected cleanly.');
  }

  console.log(`\nAll ${results.length} Phase 16 Medication CRUD & Ownership tests passed successfully!`);
}

runMedicineTests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Test suite failed:', e.message);
    if (serverInstance) serverInstance.close();
    mongoose.disconnect().finally(() => process.exit(1));
  });
