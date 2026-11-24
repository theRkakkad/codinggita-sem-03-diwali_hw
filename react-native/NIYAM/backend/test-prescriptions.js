const http = require('http');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const { app } = require('./server');
const User = require('./models/User');
const Medicine = require('./models/Medicine');
const { getUploadDirectory } = require('./middleware/uploadMiddleware');
const { resolveSafeStoragePath } = require('./controllers/prescriptionController');

const TEST_PORT = 5003;
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

// Multipart helper
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

// HTTP request helper
function httpRequest({ method, path: reqPath, headers = {}, body = null }) {
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
      path: reqPath,
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
          parsed = fullBuffer;
        }

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed,
          rawBuffer: fullBuffer,
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

// Valid magic byte buffers
const createValidJpgBuffer = () =>
  Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]),
    Buffer.from('Sample JPEG Image Content For Testing NIYAM Prescription'),
  ]);

const createValidPngBuffer = () =>
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from('Sample PNG Image Content For Testing NIYAM Prescription'),
  ]);

const createValidPdfBuffer = () =>
  Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Title (NIYAM Prescription Document) >>\nendobj\nxref\n0 1\n0000000000 65535 f \ntrailer\n<< /Size 1 >>\nstartxref\n50\n%%EOF'
  );

async function runPrescriptionTests() {
  console.log('--- Starting NIYAM Phase 17 Prescription Upload & Security Tests ---');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/niyam';
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log(`Connected to database: ${mongoose.connection.host}`);

  serverInstance = app.listen(TEST_PORT, () => {
    console.log(`Test server running at http://127.0.0.1:${TEST_PORT}`);
  });

  const createdUserIds = [];
  const createdMedIds = [];
  const filesToCleanup = [];

  try {
    // 1. Setup User A and User B
    const emailA = `rx.user.a.${Date.now()}@example.com`;
    const emailB = `rx.user.b.${Date.now()}@example.com`;

    const resRegA = await httpRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: { name: 'Rx User Alpha', email: emailA, password: 'PasswordA123!' },
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
      body: { name: 'Rx User Beta', email: emailB, password: 'PasswordB123!' },
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

    // 2. Create sample medicines for User A and User B
    const resMedA = await httpRequest({
      method: 'POST',
      path: '/api/medicines',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        name: 'Amoxicillin 500mg',
        dosage: '1 capsule',
        type: 'Capsule',
        frequency: 'Three times daily',
        reminderTimes: ['08:00 AM', '02:00 PM', '08:00 PM'],
        startDate: '2026-11-02',
      },
    });
    assert(resMedA.statusCode === 201, 'Sample medicine for User A created');
    const medAId = resMedA.data.medicine._id;
    createdMedIds.push(medAId);

    const resMedB = await httpRequest({
      method: 'POST',
      path: '/api/medicines',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: {
        name: 'Insulin Glargine',
        dosage: '10 units',
        type: 'Injection',
        frequency: 'Once daily',
        reminderTimes: ['22:00'],
        startDate: '2026-11-02',
      },
    });
    assert(resMedB.statusCode === 201, 'Sample medicine for User B created');
    const medBId = resMedB.data.medicine._id;
    createdMedIds.push(medBId);

    // ==========================================
    // TEST 1: Valid JPG Upload
    // ==========================================
    console.log('\n[Test 1: Valid JPG Upload]');
    const jpgBuffer = createValidJpgBuffer();
    const multipartJpg = createMultipartPayload('prescription', 'rx_amoxicillin.jpg', 'image/jpeg', jpgBuffer);

    const resUploadJpg = await httpRequest({
      method: 'POST',
      path: `/api/medicines/${medAId}/prescription`,
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': multipartJpg.contentType,
      },
      body: multipartJpg.body,
    });

    assert(resUploadJpg.statusCode === 200, 'Valid JPG upload returns HTTP 200');
    assert(resUploadJpg.data.success === true, 'JPG upload returns success: true');
    assert(resUploadJpg.data.prescription.mimeType === 'image/jpeg', 'Prescription mimeType is image/jpeg');
    assert(resUploadJpg.data.prescription.fileType === 'image', 'Prescription fileType is image');
    assert(resUploadJpg.data.prescription.storageKey !== undefined, 'Storage key is generated');
    assert(resUploadJpg.data.prescription.fileName === 'rx_amoxicillin.jpg', 'Prescription original fileName stored');
    filesToCleanup.push(resUploadJpg.data.prescription.storageKey);

    // ==========================================
    // TEST 2: Valid PNG Upload (Replacement)
    // ==========================================
    console.log('\n[Test 2: Valid PNG Upload]');
    const pngBuffer = createValidPngBuffer();
    const multipartPng = createMultipartPayload('prescription', 'rx_amoxicillin.png', 'image/png', pngBuffer);

    const resUploadPng = await httpRequest({
      method: 'POST',
      path: `/api/medicines/${medAId}/prescription`,
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': multipartPng.contentType,
      },
      body: multipartPng.body,
    });

    assert(resUploadPng.statusCode === 200, 'Valid PNG upload returns HTTP 200');
    assert(resUploadPng.data.prescription.mimeType === 'image/png', 'Prescription mimeType updated to image/png');
    assert(resUploadPng.data.prescription.fileType === 'image', 'Prescription fileType is image');
    filesToCleanup.push(resUploadPng.data.prescription.storageKey);

    // ==========================================
    // TEST 3: Valid PDF Upload
    // ==========================================
    console.log('\n[Test 3: Valid PDF Upload]');
    const pdfBuffer = createValidPdfBuffer();
    const multipartPdf = createMultipartPayload('prescription', 'rx_dr_report.pdf', 'application/pdf', pdfBuffer);

    const resUploadPdf = await httpRequest({
      method: 'POST',
      path: `/api/medicines/${medAId}/prescription`,
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': multipartPdf.contentType,
      },
      body: multipartPdf.body,
    });

    assert(resUploadPdf.statusCode === 200, 'Valid PDF upload returns HTTP 200');
    assert(resUploadPdf.data.prescription.mimeType === 'application/pdf', 'Prescription mimeType updated to application/pdf');
    assert(resUploadPdf.data.prescription.fileType === 'pdf', 'Prescription fileType is pdf');
    filesToCleanup.push(resUploadPdf.data.prescription.storageKey);

    // ==========================================
    // TEST 4: Missing File Rejection
    // ==========================================
    console.log('\n[Test 4: Missing File Rejection]');
    const resNoFile = await httpRequest({
      method: 'POST',
      path: `/api/medicines/${medAId}/prescription`,
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
      body: {},
    });
    assert(resNoFile.statusCode === 400, 'Missing prescription file returns HTTP 400');

    // ==========================================
    // TEST 5: Unsupported Extension Rejection
    // ==========================================
    console.log('\n[Test 5: Unsupported Extension Rejection]');
    const exeBuffer = Buffer.from('MZExecutableFakeContent');
    const multipartExe = createMultipartPayload('prescription', 'malicious.exe', 'application/octet-stream', exeBuffer);

    const resExe = await httpRequest({
      method: 'POST',
      path: `/api/medicines/${medAId}/prescription`,
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': multipartExe.contentType,
      },
      body: multipartExe.body,
    });
    assert(resExe.statusCode === 400, 'Executable file extension returns HTTP 400');

    // ==========================================
    // TEST 6: Incorrect MIME / Signature Rejection
    // ==========================================
    console.log('\n[Test 6: Incorrect MIME / Signature Rejection]');
    // Plain text masquerading as PNG
    const fakePngBuffer = Buffer.from('Plain text fake content masquerading as png image');
    const multipartFakePng = createMultipartPayload('prescription', 'fake_image.png', 'image/png', fakePngBuffer);

    const resFakePng = await httpRequest({
      method: 'POST',
      path: `/api/medicines/${medAId}/prescription`,
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': multipartFakePng.contentType,
      },
      body: multipartFakePng.body,
    });
    assert(resFakePng.statusCode === 400, 'Masquerading file with invalid signature returns HTTP 400');

    // ==========================================
    // TEST 7: File Larger than 5 MB Rejection
    // ==========================================
    console.log('\n[Test 7: File Larger than 5 MB Rejection]');
    const bigBuffer = Buffer.alloc(5.2 * 1024 * 1024, 0x41); // 5.2 MB
    const multipartBig = createMultipartPayload('prescription', 'huge.pdf', 'application/pdf', bigBuffer);

    const resBig = await httpRequest({
      method: 'POST',
      path: `/api/medicines/${medAId}/prescription`,
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': multipartBig.contentType,
      },
      body: multipartBig.body,
    });
    assert(resBig.statusCode === 400, 'File larger than 5 MB returns HTTP 400');
    assert(resBig.data.message.includes('5 MB'), 'Error message specifies 5 MB limit');

    // ==========================================
    // TEST 8: Upload Without Token Returns 401
    // ==========================================
    console.log('\n[Test 8: Upload Without Token]');
    const resNoToken = await httpRequest({
      method: 'POST',
      path: `/api/medicines/${medAId}/prescription`,
      headers: { 'Content-Type': multipartPdf.contentType },
      body: multipartPdf.body,
    });
    assert(resNoToken.statusCode === 401, 'Upload without token returns HTTP 401');

    // ==========================================
    // TEST 9: Invalid Medicine ID Returns 400
    // ==========================================
    console.log('\n[Test 9: Invalid Medicine ID]');
    const resInvalidId = await httpRequest({
      method: 'POST',
      path: '/api/medicines/invalid-hex-id/prescription',
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': multipartPdf.contentType,
      },
      body: multipartPdf.body,
    });
    assert(resInvalidId.statusCode === 400, 'Invalid medicine ID returns HTTP 400');

    // ==========================================
    // TEST 10: Non-Owner Upload Attempt Returns 404
    // ==========================================
    console.log('\n[Test 10: Non-Owner Upload Attempt]');
    const resNonOwnerUpload = await httpRequest({
      method: 'POST',
      path: `/api/medicines/${medAId}/prescription`,
      headers: {
        Authorization: `Bearer ${tokenB}`, // User B attempting upload to User A's medicine
        'Content-Type': multipartPdf.contentType,
      },
      body: multipartPdf.body,
    });
    assert(resNonOwnerUpload.statusCode === 404, 'Non-owner upload attempt returns HTTP 404');

    // ==========================================
    // TEST 11: Authorized File Viewing Works
    // ==========================================
    console.log('\n[Test 11: Authorized File Viewing]');
    const resView = await httpRequest({
      method: 'GET',
      path: `/api/medicines/${medAId}/prescription`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resView.statusCode === 200, 'Authorized viewing returns HTTP 200');
    assert(resView.headers['content-type'].includes('application/pdf'), 'Viewing Content-Type matches application/pdf');
    assert(resView.headers['x-content-type-options'] === 'nosniff', 'Headers include X-Content-Type-Options: nosniff');
    assert(resView.headers['content-disposition'].includes('inline'), 'Default disposition is inline');
    assert(resView.rawBuffer.toString().startsWith('%PDF-1.4'), 'Returned file payload matches original PDF');

    // ==========================================
    // TEST 12: Non-Owner File Viewing Returns 404
    // ==========================================
    console.log('\n[Test 12: Non-Owner File Viewing]');
    const resNonOwnerView = await httpRequest({
      method: 'GET',
      path: `/api/medicines/${medAId}/prescription`,
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(resNonOwnerView.statusCode === 404, 'Non-owner viewing attempt returns HTTP 404');

    // ==========================================
    // TEST 13 & 14: Authorized Deletion & Metadata Cleared
    // ==========================================
    console.log('\n[Test 13 & 14: Authorized Deletion & Metadata Cleared]');
    const resDelete = await httpRequest({
      method: 'DELETE',
      path: `/api/medicines/${medAId}/prescription`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resDelete.statusCode === 200, 'Authorized prescription deletion returns HTTP 200');

    // Verify metadata cleared in MongoDB
    const medAfterDelete = await Medicine.findById(medAId);
    assert(
      !medAfterDelete.prescription || !medAfterDelete.prescription.storageKey,
      'Prescription metadata cleared from MongoDB'
    );

    // Subsequent GET returns 404
    const resGetAfterDelete = await httpRequest({
      method: 'GET',
      path: `/api/medicines/${medAId}/prescription`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resGetAfterDelete.statusCode === 404, 'Viewing after deletion returns HTTP 404');

    // ==========================================
    // TEST 15: Replacement Failure Preserves Existing Attachment
    // ==========================================
    console.log('\n[Test 15: Replacement Failure Preserves Existing Attachment]');
    // Upload a valid file first
    const freshPdf = createValidPdfBuffer();
    const mpFresh = createMultipartPayload('prescription', 'original.pdf', 'application/pdf', freshPdf);
    const resFresh = await httpRequest({
      method: 'POST',
      path: `/api/medicines/${medAId}/prescription`,
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': mpFresh.contentType,
      },
      body: mpFresh.body,
    });
    assert(resFresh.statusCode === 200, 'Original PDF uploaded for replacement test');
    const preservedStorageKey = resFresh.data.prescription.storageKey;
    filesToCleanup.push(preservedStorageKey);

    // Attempt replacing with an invalid file signature
    const corruptBuffer = Buffer.from('CORRUPT_NOT_A_REAL_IMAGE');
    const mpCorrupt = createMultipartPayload('prescription', 'corrupt.jpg', 'image/jpeg', corruptBuffer);
    const resCorrupt = await httpRequest({
      method: 'POST',
      path: `/api/medicines/${medAId}/prescription`,
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': mpCorrupt.contentType,
      },
      body: mpCorrupt.body,
    });
    assert(resCorrupt.statusCode === 400, 'Corrupt replacement rejected with HTTP 400');

    // Confirm original attachment remained untouched
    const medCheckPreserved = await Medicine.findById(medAId);
    assert(
      medCheckPreserved.prescription && medCheckPreserved.prescription.storageKey === preservedStorageKey,
      'Original prescription metadata preserved when replacement fails'
    );
    const preservedPath = resolveSafeStoragePath(preservedStorageKey);
    assert(fs.existsSync(preservedPath), 'Original physical file preserved on storage');

    // ==========================================
    // TEST 16: Missing Physical File Handled Gracefully
    // ==========================================
    console.log('\n[Test 16: Missing Physical File Handled Gracefully]');
    // Manually delete the physical file on disk
    if (fs.existsSync(preservedPath)) {
      fs.unlinkSync(preservedPath);
    }
    // Attempt viewing missing physical file
    const resViewMissing = await httpRequest({
      method: 'GET',
      path: `/api/medicines/${medAId}/prescription`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resViewMissing.statusCode === 404, 'Viewing missing physical file returns HTTP 404');

    // Attempt deletion with missing physical file -> should gracefully clear metadata
    const resDeleteMissing = await httpRequest({
      method: 'DELETE',
      path: `/api/medicines/${medAId}/prescription`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resDeleteMissing.statusCode === 200, 'Deleting with missing physical file succeeds and clears metadata');

    const medCleanedAfterMissing = await Medicine.findById(medAId);
    assert(
      !medCleanedAfterMissing.prescription || !medCleanedAfterMissing.prescription.storageKey,
      'Metadata cleared even when physical file was already missing'
    );

  } finally {
    // Cleanup files and database records
    console.log('\n[Cleaning up test artifacts]');
    const uploadDir = getUploadDirectory();
    for (const key of filesToCleanup) {
      try {
        const p = path.resolve(uploadDir, path.basename(key));
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch (e) {}
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

  console.log(`\nAll ${results.length} Phase 17 Prescription Upload & Security tests passed successfully!`);
}

runPrescriptionTests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Test suite failed:', e.message);
    if (serverInstance) serverInstance.close();
    mongoose.disconnect().finally(() => process.exit(1));
  });
