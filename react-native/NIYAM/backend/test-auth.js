const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const { app } = require('./server');
const User = require('./models/User');

const TEST_PORT = 5001;
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

// Helper to make HTTP requests
function httpRequest({ method, path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      ...headers,
    };
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

async function runAuthTests() {
  console.log('--- Starting NIYAM Phase 15 Authentication HTTP Tests ---');

  // 1. Connect DB and start test server
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/niyam';
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log(`Connected to database: ${mongoose.connection.host}`);

  serverInstance = app.listen(TEST_PORT, () => {
    console.log(`Test server running at http://127.0.0.1:${TEST_PORT}`);
  });

  const testEmail = `rahul.test.${Date.now()}@example.com`;
  const testPassword = 'StrongPassword123!';
  const testName = 'Rahul Sharma';
  let authToken = null;
  let createdUserId = null;

  try {
    // ==========================================
    // 1. REGISTRATION TESTS (POST /api/auth/register)
    // ==========================================
    console.log('\n[1. Registration API Tests]');

    // 1.1 Valid Registration
    const resRegValid = await httpRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: testName,
        email: testEmail,
        password: testPassword,
      },
    });
    assert(resRegValid.statusCode === 201, 'Valid registration returns HTTP 201');
    assert(resRegValid.data.success === true, 'Valid registration returns success: true');
    assert(resRegValid.data.user && resRegValid.data.user.id, 'Registration returns user object with id');
    assert(resRegValid.data.user.email === testEmail.toLowerCase(), 'Registration returns normalized email');
    assert(resRegValid.data.user.passwordHash === undefined, 'Registration response NEVER returns passwordHash');
    assert(resRegValid.data.user.password === undefined, 'Registration response NEVER returns plaintext password');
    createdUserId = resRegValid.data.user.id;

    // 1.2 Verify in MongoDB that password is truly hashed and not plaintext
    const dbUser = await User.findById(createdUserId);
    assert(dbUser !== null, 'User document exists in MongoDB');
    assert(dbUser.password === undefined, 'User document has no plaintext password field in MongoDB');
    assert(
      typeof dbUser.passwordHash === 'string' &&
        dbUser.passwordHash.startsWith('$2') &&
        dbUser.passwordHash !== testPassword,
      'Stored password in MongoDB is properly hashed with bcrypt'
    );

    // 1.3 Missing Name
    const resRegNoName = await httpRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        email: 'noname@example.com',
        password: testPassword,
      },
    });
    assert(resRegNoName.statusCode === 400, 'Registration with missing name returns HTTP 400');
    assert(resRegNoName.data.success === false, 'Missing name returns success: false');

    // 1.4 Invalid Email Format
    const resRegBadEmail = await httpRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Bad Email User',
        email: 'invalid-email-address',
        password: testPassword,
      },
    });
    assert(resRegBadEmail.statusCode === 400, 'Registration with invalid email format returns HTTP 400');

    // 1.5 Missing Password
    const resRegNoPass = await httpRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'No Pass User',
        email: 'nopass@example.com',
      },
    });
    assert(resRegNoPass.statusCode === 400, 'Registration with missing password returns HTTP 400');

    // 1.6 Password shorter than 8 characters
    const resRegShortPass = await httpRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Short Pass User',
        email: 'shortpass@example.com',
        password: '12345',
      },
    });
    assert(resRegShortPass.statusCode === 400, 'Registration with password < 8 characters returns HTTP 400');

    // 1.7 Duplicate Email
    const resRegDup = await httpRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Duplicate Rahul',
        email: testEmail.toUpperCase(), // test case-insensitive duplicate
        password: testPassword,
      },
    });
    assert(resRegDup.statusCode === 409, 'Registration with duplicate email returns HTTP 409');
    assert(resRegDup.data.success === false, 'Duplicate email returns success: false');

    // ==========================================
    // 2. LOGIN TESTS (POST /api/auth/login)
    // ==========================================
    console.log('\n[2. Login API Tests]');

    // 2.1 Correct Credentials
    const resLoginValid = await httpRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: testEmail,
        password: testPassword,
      },
    });
    assert(resLoginValid.statusCode === 200, 'Login with correct credentials returns HTTP 200');
    assert(resLoginValid.data.success === true, 'Login returns success: true');
    assert(typeof resLoginValid.data.token === 'string' && resLoginValid.data.token.length > 20, 'Login returns signed JWT token');
    assert(resLoginValid.data.user && resLoginValid.data.user.id === createdUserId, 'Login returns safe user profile');
    assert(resLoginValid.data.user.passwordHash === undefined, 'Login response NEVER exposes passwordHash');
    authToken = resLoginValid.data.token;

    // 2.2 Verify JWT payload structure
    const decodedToken = jwt.verify(authToken, process.env.JWT_SECRET);
    assert(decodedToken.id === createdUserId, 'JWT payload contains user ID');
    assert(decodedToken.passwordHash === undefined, 'JWT payload NEVER contains passwordHash');

    // 2.3 Incorrect Password
    const resLoginBadPass = await httpRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: testEmail,
        password: 'WrongPassword999!',
      },
    });
    assert(resLoginBadPass.statusCode === 401, 'Login with incorrect password returns HTTP 401');
    assert(resLoginBadPass.data.message === 'Invalid email or password.', 'Generic error message returned on bad password');
    assert(resLoginBadPass.data.token === undefined, 'No token returned on failed password');

    // 2.4 Unknown Email
    const resLoginBadEmail = await httpRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: 'unknown.user@example.com',
        password: testPassword,
      },
    });
    assert(resLoginBadEmail.statusCode === 401, 'Login with unknown email returns HTTP 401');
    assert(resLoginBadEmail.data.message === 'Invalid email or password.', 'Generic error message returned on unknown email');

    // 2.5 Missing Fields
    const resLoginNoEmail = await httpRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        password: testPassword,
      },
    });
    assert(resLoginNoEmail.statusCode === 400, 'Login with missing email returns HTTP 400');

    const resLoginNoPass = await httpRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: testEmail,
      },
    });
    assert(resLoginNoPass.statusCode === 400, 'Login with missing password returns HTTP 400');

    // ==========================================
    // 3. PROTECTED ROUTE TESTS (GET /api/auth/me)
    // ==========================================
    console.log('\n[3. Protected Route Tests (GET /api/auth/me)]');

    // 3.1 Request without Token
    const resMeNoToken = await httpRequest({
      method: 'GET',
      path: '/api/auth/me',
    });
    assert(resMeNoToken.statusCode === 401, 'Request without token returns HTTP 401');
    assert(resMeNoToken.data.success === false, 'Request without token returns success: false');

    // 3.2 Request with Invalid Token
    const resMeBadToken = await httpRequest({
      method: 'GET',
      path: '/api/auth/me',
      headers: {
        Authorization: 'Bearer invalid.jwt.token.string',
      },
    });
    assert(resMeBadToken.statusCode === 401, 'Request with invalid token returns HTTP 401');

    // 3.3 Request with Expired Token
    const expiredToken = jwt.sign({ id: createdUserId }, process.env.JWT_SECRET, { expiresIn: '-1s' });
    const resMeExpired = await httpRequest({
      method: 'GET',
      path: '/api/auth/me',
      headers: {
        Authorization: `Bearer ${expiredToken}`,
      },
    });
    assert(resMeExpired.statusCode === 401, 'Request with expired token returns HTTP 401');

    // 3.4 Request with Valid Token
    const resMeValid = await httpRequest({
      method: 'GET',
      path: '/api/auth/me',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    assert(resMeValid.statusCode === 200, 'Request with valid token returns HTTP 200');
    assert(resMeValid.data.success === true, 'Protected route returns success: true');
    assert(resMeValid.data.user && resMeValid.data.user.id === createdUserId, 'Profile returns authenticated user id');
    assert(resMeValid.data.user.email === testEmail.toLowerCase(), 'Profile returns correct email');
    assert(resMeValid.data.user.name === testName, 'Profile returns correct user name');
    assert(resMeValid.data.user.createdAt !== undefined, 'Profile returns createdAt timestamp');
    assert(resMeValid.data.user.passwordHash === undefined, 'Profile response strictly NEVER includes passwordHash');
    assert(resMeValid.data.user.password === undefined, 'Profile response strictly NEVER includes password');

  } finally {
    // Cleanup test user
    if (createdUserId) {
      await User.deleteOne({ _id: createdUserId });
      console.log('\nCleaned up test user from MongoDB.');
    }

    if (serverInstance) {
      serverInstance.close();
    }
    await mongoose.disconnect();
    console.log('Test database disconnected cleanly.');
  }

  console.log(`\nAll ${results.length} Phase 15 authentication tests passed successfully!`);
}

runAuthTests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Test suite failed:', e.message);
    if (serverInstance) serverInstance.close();
    mongoose.disconnect().finally(() => process.exit(1));
  });
