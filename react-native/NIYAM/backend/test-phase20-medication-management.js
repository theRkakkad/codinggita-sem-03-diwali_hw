/**
 * Phase 20 Full Medication Management Integration & Verification Test Suite
 * Tests all 19 required operations against the live backend, MongoDB, and authenticated APIs.
 */
const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const { app } = require('./server');
const User = require('./models/User');
const Medicine = require('./models/Medicine');
const DoseEvent = require('./models/DoseEvent');

const TEST_PORT = 5006;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let server;
let passCount = 0;
let failCount = 0;

function request(method, path, body = null, token = null, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = { ...customHeaders };

    if (!headers['Accept']) {
      headers['Accept'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let payload = null;
    if (body) {
      if (Buffer.isBuffer(body)) {
        payload = body;
        headers['Content-Length'] = payload.length;
      } else if (typeof body === 'object') {
        payload = JSON.stringify(body);
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(payload);
      }
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let rawData = [];
        res.on('data', (chunk) => rawData.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(rawData);
          let json = null;
          try {
            json = JSON.parse(buffer.toString('utf8'));
          } catch (e) {
            json = { raw: buffer.toString('utf8') };
          }
          resolve({
            status: res.statusCode,
            data: json,
            headers: res.headers,
            rawBuffer: buffer,
          });
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

function createMultipartPayload(fieldName, fileName, mimeType, fileBuffer) {
  const boundary = `----WebKitFormBoundary${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;

  const payload = Buffer.concat([
    Buffer.from(header, 'utf8'),
    fileBuffer,
    Buffer.from(footer, 'utf8'),
  ]);

  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: payload,
  };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failCount++;
    throw new Error(message);
  }
  console.log(`PASS: ${message}`);
  passCount++;
}

async function runTests() {
  console.log('=== Starting NIYAM Phase 20 Medication Management Integration Tests ===\n');

  if (mongoose.connection.readyState === 0) {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/niyam';
    await mongoose.connect(MONGODB_URI);
  }

  server = app.listen(TEST_PORT);
  console.log(`Phase 20 test server running at ${BASE_URL}\n`);

  const testEmailUserA = `med.manager.a.${Date.now()}@niyam.health`;
  const testEmailUserB = `med.manager.b.${Date.now()}@niyam.health`;
  const password = 'StrongPassword#2026';

  let tokenA = null;
  let tokenB = null;
  let userIdA = null;
  let userIdB = null;
  let medicineA1Id = null;
  let medicineA2Id = null;

  try {
    // 0. Setup: Register User A and User B
    console.log('[Setup: User Accounts]');
    const regResA = await request('POST', '/api/auth/register', {
      name: 'Rachit User A',
      email: testEmailUserA,
      password,
    });
    assert(regResA.status === 201, 'User A registered successfully');
    userIdA = regResA.data.user.id;

    const loginResA = await request('POST', '/api/auth/login', {
      email: testEmailUserA,
      password,
    });
    tokenA = loginResA.data.token;
    assert(!!tokenA, 'User A received valid auth token');

    const regResB = await request('POST', '/api/auth/register', {
      name: 'Pooja User B',
      email: testEmailUserB,
      password,
    });
    userIdB = regResB.data.user.id;
    const loginResB = await request('POST', '/api/auth/login', {
      email: testEmailUserB,
      password,
    });
    tokenB = loginResB.data.token;
    assert(!!tokenB, 'User B received valid auth token');

    // 1. Add Medicine
    console.log('\n[1. Add Medicine]');
    const createRes = await request(
      'POST',
      '/api/medicines',
      {
        name: 'Metformin Hydrochloride',
        dosage: '500 mg',
        type: 'Tablet',
        frequency: 'Twice daily',
        reminderTimes: ['08:00 AM', '08:00 PM'],
        instructions: 'Take with or after breakfast and dinner.',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        status: 'Active',
      },
      tokenA
    );
    assert(createRes.status === 201, '1. Add medicine returns HTTP 201 Created');
    assert(createRes.data.success === true, '1. Add medicine returns success: true');
    assert(createRes.data.medicine.name === 'Metformin Hydrochloride', '1. Medicine name matches');
    assert(createRes.data.medicine.reminderTimes.length === 2, '1. Reminder times matched frequency');
    medicineA1Id = createRes.data.medicine._id;

    // Second medicine for list and filter tests
    const createRes2 = await request(
      'POST',
      '/api/medicines',
      {
        name: 'Vitamin D3 Cholecalciferol',
        dosage: '60000 IU',
        type: 'Capsule',
        frequency: 'Once daily',
        reminderTimes: ['10:00 AM'],
        instructions: 'Take once weekly with milk after breakfast.',
        startDate: new Date().toISOString(),
        status: 'Active',
      },
      tokenA
    );
    assert(createRes2.status === 201, '1b. Second medicine created for filtering');
    medicineA2Id = createRes2.data.medicine._id;

    // Validate required fields rejection
    const invalidCreate = await request(
      'POST',
      '/api/medicines',
      {
        name: '',
        dosage: '',
      },
      tokenA
    );
    assert(invalidCreate.status === 400, '1c. Missing required fields rejected with HTTP 400');

    // Validate reminder times mismatch according to frequency
    const invalidTimes = await request(
      'POST',
      '/api/medicines',
      {
        name: 'Aspirin',
        dosage: '75 mg',
        type: 'Tablet',
        frequency: 'Three times daily',
        reminderTimes: ['08:00 AM'], // 1 instead of 3
        startDate: new Date().toISOString(),
      },
      tokenA
    );
    assert(invalidTimes.status === 400, '1d. Mismatched reminder times count rejected with HTTP 400');

    // 2. View Medicine List
    console.log('\n[2. View Medicine List]');
    const listRes = await request('GET', '/api/medicines', null, tokenA);
    assert(listRes.status === 200, '2. GET /api/medicines returns HTTP 200 OK');
    assert(Array.isArray(listRes.data.medicines), '2. Medicines returned as array');
    assert(listRes.data.medicines.length >= 2, '2. Contains all created medicines');
    assert(listRes.data.medicines.some((m) => m._id === medicineA1Id), '2. Includes Metformin');

    // 3. Search Medicines
    console.log('\n[3. Search Medicines]');
    const searchRes = await request('GET', '/api/medicines?search=Metformin', null, tokenA);
    assert(searchRes.status === 200, '3. Search returns HTTP 200 OK');
    assert(searchRes.data.medicines.length === 1, '3. Exact search term returns matching medicine');
    assert(searchRes.data.medicines[0]._id === medicineA1Id, '3. Matches requested medication');

    const searchEmpty = await request('GET', '/api/medicines?search=NonExistentMed', null, tokenA);
    assert(searchEmpty.status === 200, '3b. Non-matching search returns HTTP 200 OK');
    assert(searchEmpty.data.medicines.length === 0, '3b. Empty array for no search matches');

    // 4. Filter Medicines by Status
    console.log('\n[4. Filter Medicines by Status]');
    const filterActiveRes = await request('GET', '/api/medicines?status=Active', null, tokenA);
    assert(filterActiveRes.status === 200, '4. Filter by Active returns HTTP 200 OK');
    assert(
      filterActiveRes.data.medicines.every((m) => m.status === 'Active'),
      '4. All returned items have status: Active'
    );

    // 5. Open Medicine Details
    console.log('\n[5. Open Medicine Details]');
    const detailsRes = await request('GET', `/api/medicines/${medicineA1Id}`, null, tokenA);
    assert(detailsRes.status === 200, '5. GET /api/medicines/:id returns HTTP 200 OK');
    assert(detailsRes.data.medicine._id === medicineA1Id, '5. Retrieved correct medicine record');
    assert(detailsRes.data.medicine.dosage === '500 mg', '5. Complete details populated');

    // 6. Edit Medicine
    console.log('\n[6. Edit Medicine]');
    const editRes = await request(
      'PUT',
      `/api/medicines/${medicineA1Id}`,
      {
        dosage: '850 mg',
        instructions: 'Take 850 mg after dinner with water.',
      },
      tokenA
    );
    assert(editRes.status === 200, '6. Update medicine returns HTTP 200 OK');
    assert(editRes.data.medicine.dosage === '850 mg', '6. Dosage successfully updated');
    assert(editRes.data.medicine._id === medicineA1Id, '6. Medicine ID preserved strictly');

    // Verify persistence in MongoDB
    const freshMed = await Medicine.findById(medicineA1Id);
    assert(freshMed.dosage === '850 mg', '6. Dosage updated in MongoDB document');

    // 7. Pause Medicine
    console.log('\n[7. Pause Medicine]');
    // Create a scheduled dose event first to verify history retention
    const doseEvent = new DoseEvent({
      userId: userIdA,
      medicineId: medicineA1Id,
      scheduledAt: new Date(),
      status: 'pending',
    });
    await doseEvent.save();

    const pauseRes = await request(
      'PUT',
      `/api/medicines/${medicineA1Id}`,
      {
        status: 'Paused',
      },
      tokenA
    );
    assert(pauseRes.status === 200, '7. Status update to Paused returns HTTP 200 OK');
    assert(pauseRes.data.medicine.status === 'Paused', '7. Medicine status is Paused');

    // Verify historical dose event was NOT deleted
    const eventStillExists = await DoseEvent.findById(doseEvent._id);
    assert(!!eventStillExists, '7. Historical DoseEvent retained when medicine paused');

    // 8. Resume Medicine
    console.log('\n[8. Resume Medicine]');
    const resumeRes = await request(
      'PUT',
      `/api/medicines/${medicineA1Id}`,
      {
        status: 'Active',
      },
      tokenA
    );
    assert(resumeRes.status === 200, '8. Status update to Active returns HTTP 200 OK');
    assert(resumeRes.data.medicine.status === 'Active', '8. Medicine status resumed to Active');

    // 9. Upload JPG Prescription
    console.log('\n[9. Upload JPG Prescription]');
    const validJpgBuffer = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.from('JFIF-sample-prescription-data'),
    ]);
    const jpgPayload = createMultipartPayload(
      'prescription',
      'prescription_rx.jpg',
      'image/jpeg',
      validJpgBuffer
    );
    const uploadJpgRes = await request(
      'POST',
      `/api/medicines/${medicineA1Id}/prescription`,
      jpgPayload.body,
      tokenA,
      { 'Content-Type': jpgPayload.contentType }
    );
    assert(uploadJpgRes.status === 200, '9. Upload JPG prescription returns HTTP 200 OK');
    assert(uploadJpgRes.data.success === true, '9. Upload JPG returns success: true');
    assert(uploadJpgRes.data.prescription.mimeType === 'image/jpeg', '9. MIME type is image/jpeg');
    assert(uploadJpgRes.data.prescription.fileType === 'image', '9. File type is image');

    // 10. Upload PNG Prescription
    console.log('\n[10. Upload PNG Prescription]');
    const validPngBuffer = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from('IHDR-sample-prescription-data'),
    ]);
    const pngPayload = createMultipartPayload(
      'prescription',
      'prescription_rx.png',
      'image/png',
      validPngBuffer
    );
    const uploadPngRes = await request(
      'POST',
      `/api/medicines/${medicineA1Id}/prescription`,
      pngPayload.body,
      tokenA,
      { 'Content-Type': pngPayload.contentType }
    );
    assert(uploadPngRes.status === 200, '10. Upload PNG prescription returns HTTP 200 OK');
    assert(uploadPngRes.data.prescription.mimeType === 'image/png', '10. MIME type is image/png');

    // 11. Upload PDF Prescription
    console.log('\n[11. Upload PDF Prescription]');
    const validPdfBuffer = Buffer.concat([
      Buffer.from('%PDF-1.4\n'),
      Buffer.from('1 0 obj << /Type /Catalog >> endobj\nxref\ntrailer\n%%EOF'),
    ]);
    const pdfPayload = createMultipartPayload(
      'prescription',
      'clinical_prescription.pdf',
      'application/pdf',
      validPdfBuffer
    );
    const uploadPdfRes = await request(
      'POST',
      `/api/medicines/${medicineA1Id}/prescription`,
      pdfPayload.body,
      tokenA,
      { 'Content-Type': pdfPayload.contentType }
    );
    assert(uploadPdfRes.status === 200, '11. Upload PDF prescription returns HTTP 200 OK');
    assert(uploadPdfRes.data.prescription.mimeType === 'application/pdf', '11. MIME type is application/pdf');
    assert(uploadPdfRes.data.prescription.fileType === 'pdf', '11. File type is pdf');

    // 12. View / Download Prescription through Authenticated API
    console.log('\n[12. View / Download Prescription]');
    // 12a: With Bearer Header
    const viewHeaderRes = await request(
      'GET',
      `/api/medicines/${medicineA1Id}/prescription`,
      null,
      tokenA
    );
    assert(viewHeaderRes.status === 200, '12a. View via Authorization header returns HTTP 200 OK');
    assert(viewHeaderRes.headers['content-type'] === 'application/pdf', '12a. Header content-type is application/pdf');
    assert(viewHeaderRes.headers['x-content-type-options'] === 'nosniff', '12a. nosniff header present');
    assert(viewHeaderRes.headers['content-disposition'].includes('inline'), '12a. Default disposition is inline');

    // 12b: With Download query param
    const downloadRes = await request(
      'GET',
      `/api/medicines/${medicineA1Id}/prescription?download=true`,
      null,
      tokenA
    );
    assert(downloadRes.status === 200, '12b. Download request returns HTTP 200 OK');
    assert(downloadRes.headers['content-disposition'].includes('attachment'), '12b. Attachment disposition set');

    // 12c: With ?token= query parameter (for direct browser/download links)
    const viewQueryTokenRes = await request(
      'GET',
      `/api/medicines/${medicineA1Id}/prescription?token=${tokenA}`,
      null,
      null
    );
    assert(viewQueryTokenRes.status === 200, '12c. View via query token returns HTTP 200 OK');
    assert(viewQueryTokenRes.headers['content-type'] === 'application/pdf', '12c. Content type verified for query token');

    // 13. Reject Unsupported Files
    console.log('\n[13. Reject Unsupported Files]');
    const unsupportedBuffer = Buffer.from('MZ-this-is-an-executable-file');
    const unsupportedPayload = createMultipartPayload(
      'prescription',
      'malware.exe',
      'application/octet-stream',
      unsupportedBuffer
    );
    const unsuppRes = await request(
      'POST',
      `/api/medicines/${medicineA1Id}/prescription`,
      unsupportedPayload.body,
      tokenA,
      { 'Content-Type': unsupportedPayload.contentType }
    );
    assert(unsuppRes.status === 400, '13. Unsupported file rejected with HTTP 400');

    // 14. Reject Oversized Files
    console.log('\n[14. Reject Oversized Files (> 5MB)]');
    const oversizedBuffer = Buffer.alloc(5.5 * 1024 * 1024); // 5.5 MB
    const oversizedPayload = createMultipartPayload(
      'prescription',
      'oversized_scan.jpg',
      'image/jpeg',
      oversizedBuffer
    );
    const overRes = await request(
      'POST',
      `/api/medicines/${medicineA1Id}/prescription`,
      oversizedPayload.body,
      tokenA,
      { 'Content-Type': oversizedPayload.contentType }
    );
    assert(overRes.status === 400, '14. File larger than 5MB rejected with HTTP 400');
    assert(overRes.data.message.includes('5 MB'), '14. Error message specifies 5 MB limit');

    // 15. Replace Prescription
    console.log('\n[15. Replace Prescription]');
    const replacementPdf = Buffer.concat([
      Buffer.from('%PDF-1.4\n'),
      Buffer.from('Replacement Prescription Document 2026'),
    ]);
    const replacePayload = createMultipartPayload(
      'prescription',
      'updated_prescription_v2.pdf',
      'application/pdf',
      replacementPdf
    );
    const replaceRes = await request(
      'POST',
      `/api/medicines/${medicineA1Id}/prescription`,
      replacePayload.body,
      tokenA,
      { 'Content-Type': replacePayload.contentType }
    );
    assert(replaceRes.status === 200, '15. Replace prescription returns HTTP 200 OK');
    assert(
      replaceRes.data.prescription.fileName === 'updated_prescription_v2.pdf',
      '15. Prescription fileName updated in metadata'
    );

    // 16. Remove Prescription
    console.log('\n[16. Remove Prescription]');
    const deleteRxRes = await request(
      'DELETE',
      `/api/medicines/${medicineA1Id}/prescription`,
      null,
      tokenA
    );
    assert(deleteRxRes.status === 200, '16. Delete prescription returns HTTP 200 OK');
    assert(deleteRxRes.data.success === true, '16. Delete returns success: true');

    const medAfterRxDelete = await Medicine.findById(medicineA1Id);
    assert(!medAfterRxDelete.prescription?.storageKey, '16. Prescription metadata cleared in MongoDB');

    const viewAfterDelete = await request(
      'GET',
      `/api/medicines/${medicineA1Id}/prescription`,
      null,
      tokenA
    );
    assert(viewAfterDelete.status === 404, '16. GET prescription after removal returns HTTP 404');

    // 17. Reject Access to Another User's Medicine (Isolation)
    console.log('\n[17. Reject Access to Another User Medicine]');
    const crossUserGet = await request('GET', `/api/medicines/${medicineA1Id}`, null, tokenB);
    assert(crossUserGet.status === 404, '17. User B viewing User A medicine returns HTTP 404');

    const crossUserPut = await request(
      'PUT',
      `/api/medicines/${medicineA1Id}`,
      { name: 'Hacked Name' },
      tokenB
    );
    assert(crossUserPut.status === 404, '17. User B editing User A medicine returns HTTP 404');

    const crossUserDel = await request('DELETE', `/api/medicines/${medicineA1Id}`, null, tokenB);
    assert(crossUserDel.status === 404, '17. User B deleting User A medicine returns HTTP 404');

    // 18. Handle Network / Unauthenticated Failure
    console.log('\n[18. Reject Unauthenticated Requests]');
    const unauthGet = await request('GET', `/api/medicines/${medicineA1Id}`);
    assert(unauthGet.status === 401, '18. Unauthenticated request rejected with HTTP 401');

    // 19. Handle Expired / Invalid Authentication
    console.log('\n[19. Reject Expired or Invalid Token]');
    const invalidTokenRes = await request(
      'GET',
      `/api/medicines/${medicineA1Id}`,
      null,
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'
    );
    assert(invalidTokenRes.status === 401, '19. Request with invalid JWT rejected with HTTP 401');

    // 20. Delete Medicine
    console.log('\n[20. Delete Medicine]');
    const delRes = await request('DELETE', `/api/medicines/${medicineA1Id}`, null, tokenA);
    assert(delRes.status === 200, '20. Delete medicine returns HTTP 200 OK');

    const verifyDeleted = await request('GET', `/api/medicines/${medicineA1Id}`, null, tokenA);
    assert(verifyDeleted.status === 404, '20. Subsequent lookup of deleted medicine returns HTTP 404');

    // Verify other medicines (Medicine A2) was NOT deleted
    const medA2 = await Medicine.findById(medicineA2Id);
    assert(!!medA2, '20. Unrelated medicines for User A were NOT deleted');

    // Clean up
    console.log('\n[Cleaning up test artifacts]');
    await DoseEvent.deleteMany({ userId: { $in: [userIdA, userIdB] } });
    await Medicine.deleteMany({ userId: { $in: [userIdA, userIdB] } });
    await User.deleteMany({ _id: { $in: [userIdA, userIdB] } });
    console.log('Cleaned up test dose events, medicines, and user accounts.');

    console.log('\n======================================================');
    console.log(`Phase 20 Full-Stack Integration Verification Passed!`);
    console.log(`Passed: ${passCount} | Failed: ${failCount}`);
    console.log('======================================================\n');
  } catch (error) {
    console.error('Integration test failure:', error);
    process.exit(1);
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

runTests();

