const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const { app } = require('./server');
const User = require('./models/User');
const Medicine = require('./models/Medicine');
const DoseEvent = require('./models/DoseEvent');

const TEST_PORT = 5004;
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
      const chunks = [];
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      res.on('end', () => {
        const fullBuffer = Buffer.concat(chunks);
        let parsed = null;
        try {
          parsed = JSON.parse(fullBuffer.toString('utf8'));
        } catch (e) {
          parsed = fullBuffer.toString('utf8');
        }

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (payloadBuffer) {
      req.write(payloadBuffer);
    }
    req.end();
  });
}

async function runDoseEventTests() {
  console.log('--- Starting NIYAM Phase 18 Dose Event API Tests ---');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/niyam';
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log(`Connected to database: ${mongoose.connection.host}`);

  serverInstance = app.listen(TEST_PORT, () => {
    console.log(`Test server running at http://127.0.0.1:${TEST_PORT}`);
  });

  const createdUserIds = [];
  const createdMedIds = [];
  const createdDoseIds = [];

  try {
    // Setup User A and User B
    const emailA = `dose.user.a.${Date.now()}@example.com`;
    const emailB = `dose.user.b.${Date.now()}@example.com`;

    const resRegA = await httpRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: { name: 'Dose User Alpha', email: emailA, password: 'PasswordA123!' },
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

    const resRegB = await httpRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: { name: 'Dose User Beta', email: emailB, password: 'PasswordB123!' },
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

    // Create Active Medicine A1
    const resMedA1 = await httpRequest({
      method: 'POST',
      path: '/api/medicines',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        name: 'Vitamin D3',
        dosage: '1 capsule',
        type: 'Capsule',
        frequency: 'Once daily',
        reminderTimes: ['08:00 AM'],
        startDate: '2026-11-01',
      },
    });
    assert(resMedA1.statusCode === 201, 'Active Medicine A1 created');
    const medA1Id = resMedA1.data.medicine._id;
    createdMedIds.push(medA1Id);

    // Create Paused Medicine A2
    const resMedA2 = await httpRequest({
      method: 'POST',
      path: '/api/medicines',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        name: 'Metformin 500mg',
        dosage: '1 tablet',
        type: 'Tablet',
        frequency: 'Once daily',
        reminderTimes: ['12:00 PM'],
        startDate: '2026-11-01',
        status: 'Paused',
      },
    });
    assert(resMedA2.statusCode === 201, 'Paused Medicine A2 created');
    const medA2Id = resMedA2.data.medicine._id;
    createdMedIds.push(medA2Id);

    // Create Active Medicine B1 (User B)
    const resMedB1 = await httpRequest({
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
      },
    });
    assert(resMedB1.statusCode === 201, 'Medicine B1 created');
    const medB1Id = resMedB1.data.medicine._id;
    createdMedIds.push(medB1Id);

    // ==========================================
    // 1. CREATE DOSE EVENT
    // ==========================================
    console.log('\n[1. Create Dose Event]');
    const schedDate1 = new Date('2026-11-02T08:00:00.000Z');
    const resCreateDose1 = await httpRequest({
      method: 'POST',
      path: '/api/dose-events',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        medicineId: medA1Id,
        scheduledAt: schedDate1.toISOString(),
      },
    });
    assert(resCreateDose1.statusCode === 201, '1. Create valid dose event returns HTTP 201');
    assert(resCreateDose1.data.success === true, 'Response contains success: true');
    assert(resCreateDose1.data.doseEvent.status === 'pending', 'Initial dose status is pending');
    assert(resCreateDose1.data.doseEvent.userId === userAId, 'Dose event bound to User A');
    const dose1Id = resCreateDose1.data.doseEvent._id;
    createdDoseIds.push(dose1Id);

    // ==========================================
    // 2. REJECT INVALID MEDICINE ID
    // ==========================================
    console.log('\n[2. Reject Invalid Medicine ID]');
    const resBadMedId = await httpRequest({
      method: 'POST',
      path: '/api/dose-events',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        medicineId: 'invalid-hex-id',
        scheduledAt: '2026-11-02T08:00:00.000Z',
      },
    });
    assert(resBadMedId.statusCode === 400, '2. Reject invalid medicine ID format with HTTP 400');

    // ==========================================
    // 3. REJECT MEDICINE BELONGING TO ANOTHER USER
    // ==========================================
    console.log('\n[3. Reject Medicine Belonging to Another User]');
    const resOtherUserMed = await httpRequest({
      method: 'POST',
      path: '/api/dose-events',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        medicineId: medB1Id, // User B medicine
        scheduledAt: '2026-11-02T08:00:00.000Z',
      },
    });
    assert(resOtherUserMed.statusCode === 404, '3. Reject medicine belonging to another user with HTTP 404');

    // ==========================================
    // 4. REJECT INACTIVE MEDICINE
    // ==========================================
    console.log('\n[4. Reject Inactive Medicine]');
    const resInactiveMed = await httpRequest({
      method: 'POST',
      path: '/api/dose-events',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        medicineId: medA2Id, // Paused medicine
        scheduledAt: '2026-11-02T12:00:00.000Z',
      },
    });
    assert(resInactiveMed.statusCode === 400, '4. Reject dose creation for inactive medicine with HTTP 400');
    assert(resInactiveMed.data.message.includes('inactive'), 'Error message specifies inactive status');

    // ==========================================
    // 5. REJECT DUPLICATE SCHEDULED EVENT
    // ==========================================
    console.log('\n[5. Reject Duplicate Scheduled Event]');
    const resDup = await httpRequest({
      method: 'POST',
      path: '/api/dose-events',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        medicineId: medA1Id,
        scheduledAt: schedDate1.toISOString(), // exact same scheduled time
      },
    });
    assert(resDup.statusCode === 409, '5. Reject duplicate scheduled dose event with HTTP 409 Conflict');

    // Create dose 2 for date & filter testing
    const schedDate2 = new Date('2026-11-02T18:00:00.000Z');
    const resCreateDose2 = await httpRequest({
      method: 'POST',
      path: '/api/dose-events',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        medicineId: medA1Id,
        scheduledAt: schedDate2.toISOString(),
      },
    });
    assert(resCreateDose2.statusCode === 201, 'Second dose event for User A created');
    const dose2Id = resCreateDose2.data.doseEvent._id;
    createdDoseIds.push(dose2Id);

    // Create dose 3 on a different date (2026-11-03)
    const schedDate3 = new Date('2026-11-03T08:00:00.000Z');
    const resCreateDose3 = await httpRequest({
      method: 'POST',
      path: '/api/dose-events',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        medicineId: medA1Id,
        scheduledAt: schedDate3.toISOString(),
      },
    });
    assert(resCreateDose3.statusCode === 201, 'Third dose event for User A created');
    const dose3Id = resCreateDose3.data.doseEvent._id;
    createdDoseIds.push(dose3Id);

    // Create dose 4 on 2026-11-03 for unconfirmed testing
    const schedDate4 = new Date('2026-11-03T18:00:00.000Z');
    const resCreateDose4 = await httpRequest({
      method: 'POST',
      path: '/api/dose-events',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        medicineId: medA1Id,
        scheduledAt: schedDate4.toISOString(),
      },
    });
    assert(resCreateDose4.statusCode === 201, 'Fourth dose event for User A created');
    const dose4Id = resCreateDose4.data.doseEvent._id;
    createdDoseIds.push(dose4Id);

    // Create Dose Event for User B (for isolation testing)
    const resCreateDoseB = await httpRequest({
      method: 'POST',
      path: '/api/dose-events',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: {
        medicineId: medB1Id,
        scheduledAt: '2026-11-02T22:00:00.000Z',
      },
    });
    assert(resCreateDoseB.statusCode === 201, 'Dose event for User B created');
    const doseBId = resCreateDoseB.data.doseEvent._id;
    createdDoseIds.push(doseBId);

    // ==========================================
    // 6. GET ALL DOSE EVENTS
    // ==========================================
    console.log('\n[6. Get All Dose Events]');
    const resGetAll = await httpRequest({
      method: 'GET',
      path: '/api/dose-events',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resGetAll.statusCode === 200, '6. Get all dose events returns HTTP 200');
    assert(resGetAll.data.count >= 4, 'User A retrieves all created events');
    const userAEventIds = resGetAll.data.doseEvents.map((e) => e._id);
    assert(userAEventIds.includes(dose1Id), 'User A events include Dose 1');
    assert(!userAEventIds.includes(doseBId), 'User A results strictly exclude User B event');
    assert(
      resGetAll.data.doseEvents[0].medicineId && resGetAll.data.doseEvents[0].medicineId.name,
      'Associated medicine details populated on dose event'
    );

    // ==========================================
    // 7. FILTER BY DATE
    // ==========================================
    console.log('\n[7. Filter by Date]');
    const resDateFilter = await httpRequest({
      method: 'GET',
      path: '/api/dose-events?date=2026-11-02',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resDateFilter.statusCode === 200, '7. Filter by date returns HTTP 200');
    assert(
      resDateFilter.data.doseEvents.every((e) => e.scheduledAt.startsWith('2026-11-02')),
      'All filtered doses occur on 2026-11-02'
    );
    assert(resDateFilter.data.doseEvents.some((e) => e._id === dose1Id), 'Includes 2026-11-02 dose');
    assert(!resDateFilter.data.doseEvents.some((e) => e._id === dose3Id), 'Excludes 2026-11-03 dose');

    // ==========================================
    // 8. FILTER BY STATUS
    // ==========================================
    console.log('\n[8. Filter by Status]');
    const resStatusFilter = await httpRequest({
      method: 'GET',
      path: '/api/dose-events?status=pending',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resStatusFilter.statusCode === 200, '8. Filter by status returns HTTP 200');
    assert(
      resStatusFilter.data.doseEvents.every((e) => e.status.toLowerCase() === 'pending'),
      'All filtered doses have status pending'
    );

    // ==========================================
    // 9. FILTER BY MEDICINE
    // ==========================================
    console.log('\n[9. Filter by Medicine]');
    const resMedFilter = await httpRequest({
      method: 'GET',
      path: `/api/dose-events?medicineId=${medA1Id}`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resMedFilter.statusCode === 200, '9. Filter by medicine returns HTTP 200');
    assert(
      resMedFilter.data.doseEvents.every((e) => e.medicineId._id === medA1Id || e.medicineId === medA1Id),
      'All filtered doses belong to Medicine A1'
    );

    // ==========================================
    // 10. GET SINGLE DOSE EVENT
    // ==========================================
    console.log('\n[10. Get Single Dose Event]');
    const resGetSingle = await httpRequest({
      method: 'GET',
      path: `/api/dose-events/${dose1Id}`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resGetSingle.statusCode === 200, '10. Get single dose event returns HTTP 200');
    assert(resGetSingle.data.doseEvent._id === dose1Id, 'Returned dose event matches requested ID');

    // ==========================================
    // 11. MARK DOSE AS TAKEN
    // ==========================================
    console.log('\n[11. Mark Dose as Taken]');
    const resTaken = await httpRequest({
      method: 'PATCH',
      path: `/api/dose-events/${dose1Id}/taken`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resTaken.statusCode === 200, '11. Mark dose as taken returns HTTP 200');
    assert(resTaken.data.doseEvent.status === 'taken', 'Status updated to taken');
    assert(resTaken.data.doseEvent.takenAt !== null, 'takenAt timestamp is populated');

    // Verify in database
    const dbDose1 = await DoseEvent.findById(dose1Id);
    assert(dbDose1.status === 'taken', 'Taken status persisted in MongoDB');
    assert(dbDose1.takenAt instanceof Date, 'takenAt Date object persisted in MongoDB');

    // ==========================================
    // 12. MARK DOSE AS SKIPPED
    // ==========================================
    console.log('\n[12. Mark Dose as Skipped]');
    const resSkipped = await httpRequest({
      method: 'PATCH',
      path: `/api/dose-events/${dose2Id}/skipped`,
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { reason: 'Experienced mild nausea' },
    });
    assert(resSkipped.statusCode === 200, '12. Mark dose as skipped returns HTTP 200');
    assert(resSkipped.data.doseEvent.status === 'skipped', 'Status updated to skipped');
    assert(resSkipped.data.doseEvent.notes === 'Experienced mild nausea', 'Skipped reason recorded in notes');
    assert(resSkipped.data.doseEvent.scheduledAt !== null, 'Original scheduled time is preserved');

    // ==========================================
    // 13. CONFIRM DOSE AS MISSED
    // ==========================================
    console.log('\n[13. Confirm Dose as Missed]');
    const resMissed = await httpRequest({
      method: 'PATCH',
      path: `/api/dose-events/${dose3Id}/missed`,
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { missedReason: 'Forgot medication at workplace' },
    });
    assert(resMissed.statusCode === 200, '13. Confirm dose as missed returns HTTP 200');
    assert(resMissed.data.doseEvent.status === 'missed', 'Status updated to missed');
    assert(
      resMissed.data.doseEvent.missedReason === 'Forgot medication at workplace',
      'missedReason recorded in document'
    );

    // ==========================================
    // 14. MARK DOSE AS UNCONFIRMED
    // ==========================================
    console.log('\n[14. Mark Dose as Unconfirmed]');
    const resUnconfirmed = await httpRequest({
      method: 'PATCH',
      path: `/api/dose-events/${dose4Id}/unconfirmed`,
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { notes: 'Reminder window elapsed with no user response' },
    });
    assert(resUnconfirmed.statusCode === 200, '14. Mark dose as unconfirmed returns HTTP 200');
    assert(resUnconfirmed.data.doseEvent.status === 'unconfirmed', 'Status updated to unconfirmed');
    assert(resUnconfirmed.data.doseEvent.status !== 'missed', 'Unconfirmed is strictly distinct from missed');

    // ==========================================
    // 15. REJECT INVALID STATUS TRANSITIONS
    // ==========================================
    console.log('\n[15. Reject Invalid Status Transitions]');
    // Attempt transitioning a Taken dose to Missed
    const resInvalidTakenToMissed = await httpRequest({
      method: 'PATCH',
      path: `/api/dose-events/${dose1Id}/missed`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resInvalidTakenToMissed.statusCode === 400, '15. Reject transition from taken to missed with HTTP 400');

    // Attempt marking an already Taken dose as Taken again
    const resDupTaken = await httpRequest({
      method: 'PATCH',
      path: `/api/dose-events/${dose1Id}/taken`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resDupTaken.statusCode === 400, '15. Reject duplicate transition (taken to taken) with HTTP 400');

    // Attempt transitioning a confirmed Missed dose to Unconfirmed
    const resInvalidMissedToUnconfirmed = await httpRequest({
      method: 'PATCH',
      path: `/api/dose-events/${dose3Id}/unconfirmed`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resInvalidMissedToUnconfirmed.statusCode === 400, '15. Reject transition from missed to unconfirmed with HTTP 400');

    // Attempt transitioning an intentionally Skipped dose to Missed
    const resInvalidSkippedToMissed = await httpRequest({
      method: 'PATCH',
      path: `/api/dose-events/${dose2Id}/missed`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resInvalidSkippedToMissed.statusCode === 400, '15. Reject transition from skipped to missed with HTTP 400');

    // ==========================================
    // 16. REJECT UNAUTHORIZED REQUESTS
    // ==========================================
    console.log('\n[16. Reject Unauthorized Requests]');
    const resNoTokenGet = await httpRequest({
      method: 'GET',
      path: '/api/dose-events',
    });
    assert(resNoTokenGet.statusCode === 401, '16. Request without token returns HTTP 401');

    const resNoTokenPatch = await httpRequest({
      method: 'PATCH',
      path: `/api/dose-events/${dose1Id}/taken`,
    });
    assert(resNoTokenPatch.statusCode === 401, '16. Patch without token returns HTTP 401');

    // ==========================================
    // 17. REJECT ACCESS TO ANOTHER USER'S DOSE EVENT
    // ==========================================
    console.log('\n[17. Reject Access to Another User Dose Event]');
    // User A trying to view User B's dose
    const resCrossUserGet = await httpRequest({
      method: 'GET',
      path: `/api/dose-events/${doseBId}`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resCrossUserGet.statusCode === 404, '17. Viewing another user dose returns HTTP 404');

    // User A trying to mark User B's dose as taken
    const resCrossUserPatch = await httpRequest({
      method: 'PATCH',
      path: `/api/dose-events/${doseBId}/taken`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resCrossUserPatch.statusCode === 404, '17. Updating another user dose returns HTTP 404');

    // User A trying to delete User B's dose
    const resCrossUserDelete = await httpRequest({
      method: 'DELETE',
      path: `/api/dose-events/${doseBId}`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resCrossUserDelete.statusCode === 404, '17. Deleting another user dose returns HTTP 404');

    // ==========================================
    // 18. DELETE A DOSE EVENT
    // ==========================================
    console.log('\n[18. Delete a Dose Event]');
    const resDelete = await httpRequest({
      method: 'DELETE',
      path: `/api/dose-events/${dose4Id}`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resDelete.statusCode === 200, '18. Delete owned dose event returns HTTP 200');

    // Subsequent lookup returns 404
    const resLookupDeleted = await httpRequest({
      method: 'GET',
      path: `/api/dose-events/${dose4Id}`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resLookupDeleted.statusCode === 404, 'Subsequent lookup of deleted dose returns HTTP 404');

    // ==========================================
    // 19. RETURN 404 FOR NONEXISTENT EVENTS
    // ==========================================
    console.log('\n[19. Return 404 for Nonexistent Events]');
    const fakeId = new mongoose.Types.ObjectId();
    const resFakeGet = await httpRequest({
      method: 'GET',
      path: `/api/dose-events/${fakeId}`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resFakeGet.statusCode === 404, '19. Get nonexistent event returns HTTP 404');

    const resFakePatch = await httpRequest({
      method: 'PATCH',
      path: `/api/dose-events/${fakeId}/taken`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resFakePatch.statusCode === 404, '19. Patch nonexistent event returns HTTP 404');

    const resFakeDelete = await httpRequest({
      method: 'DELETE',
      path: `/api/dose-events/${fakeId}`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resFakeDelete.statusCode === 404, '19. Delete nonexistent event returns HTTP 404');

  } finally {
    // Cleanup test data safely
    console.log('\n[Cleaning up test artifacts]');
    if (createdDoseIds.length > 0) {
      await DoseEvent.deleteMany({ _id: { $in: createdDoseIds } });
      console.log(`Cleaned up ${createdDoseIds.length} test dose events.`);
    }
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

  console.log(`\nAll ${results.length} Phase 18 Dose Event API tests passed successfully!`);
}

runDoseEventTests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Test suite failed:', e.message);
    if (serverInstance) serverInstance.close();
    mongoose.disconnect().finally(() => process.exit(1));
  });
