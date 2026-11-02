const mongoose = require('mongoose');
const User = require('./models/User');
const Medicine = require('./models/Medicine');
const DoseEvent = require('./models/DoseEvent');

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

async function validateDoc(doc) {
  try {
    await doc.validate();
    return null;
  } catch (err) {
    return err;
  }
}

async function runTests() {
  console.log('--- Starting NIYAM Phase 14 Model Validation Tests ---');

  // ==========================================
  // 1. USER MODEL TESTS
  // ==========================================
  console.log('\n[1. User Model Tests]');

  // 1.1 Valid User
  const validUser = new User({
    name: 'Rachit Kakkad',
    email: 'rachit@example.com',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
  });
  const errValidUser = await validateDoc(validUser);
  assert(!errValidUser, 'Valid user passes validation');

  // 1.2 Missing Name
  const userNoName = new User({
    email: 'test@example.com',
    passwordHash: 'hash123',
  });
  const errNoName = await validateDoc(userNoName);
  assert(errNoName && errNoName.errors['name'], 'Missing name fails validation');

  // 1.3 Missing Email
  const userNoEmail = new User({
    name: 'Test User',
    passwordHash: 'hash123',
  });
  const errNoEmail = await validateDoc(userNoEmail);
  assert(errNoEmail && errNoEmail.errors['email'], 'Missing email fails validation');

  // 1.4 Invalid Email Format
  const userBadEmail = new User({
    name: 'Test User',
    email: 'not-an-email',
    passwordHash: 'hash123',
  });
  const errBadEmail = await validateDoc(userBadEmail);
  assert(errBadEmail && errBadEmail.errors['email'], 'Invalid email format fails validation');

  // 1.5 Missing passwordHash
  const userNoPassword = new User({
    name: 'Test User',
    email: 'valid@example.com',
  });
  const errNoPass = await validateDoc(userNoPassword);
  assert(errNoPass && errNoPass.errors['passwordHash'], 'Missing passwordHash fails validation');

  // 1.6 Email Normalization (trim & lowercase)
  const userNormalized = new User({
    name: 'Normalize User',
    email: '  Rachit.Kakkad@EXAMPLE.COM  ',
    passwordHash: 'hash123',
  });
  assert(
    userNormalized.email === 'rachit.kakkad@example.com',
    'Email normalization converts to lowercase and trims whitespace'
  );

  // ==========================================
  // 2. MEDICINE MODEL TESTS
  // ==========================================
  console.log('\n[2. Medicine Model Tests]');

  const dummyUserId = new mongoose.Types.ObjectId();

  // 2.1 Valid Medicine (Once daily)
  const validMed = new Medicine({
    userId: dummyUserId,
    name: 'Amoxicillin',
    dosage: '500mg',
    type: 'Capsule',
    frequency: 'Once daily',
    reminderTimes: ['09:00 AM'],
    startDate: new Date('2026-11-01'),
    endDate: new Date('2026-11-15'),
    status: 'Active',
  });
  const errValidMed = await validateDoc(validMed);
  assert(!errValidMed, 'Valid scheduled medicine passes validation');

  // 2.2 Missing Name and Missing Dosage
  const medNoName = new Medicine({
    userId: dummyUserId,
    dosage: '1 tablet',
    type: 'Tablet',
    frequency: 'Once daily',
    reminderTimes: ['08:00 AM'],
    startDate: new Date(),
  });
  const errMedNoName = await validateDoc(medNoName);
  assert(errMedNoName && errMedNoName.errors['name'], 'Missing medicine name fails validation');

  const medNoDosage = new Medicine({
    userId: dummyUserId,
    name: 'Paracetamol',
    type: 'Tablet',
    frequency: 'Once daily',
    reminderTimes: ['08:00 AM'],
    startDate: new Date(),
  });
  const errMedNoDosage = await validateDoc(medNoDosage);
  assert(errMedNoDosage && errMedNoDosage.errors['dosage'], 'Missing dosage fails validation');

  // 2.3 Unsupported Medicine Type
  const medBadType = new Medicine({
    userId: dummyUserId,
    name: 'Vitamin Gum',
    dosage: '1 gummy',
    type: 'Gummy', // Unsupported
    frequency: 'Once daily',
    reminderTimes: ['09:00 AM'],
    startDate: new Date(),
  });
  const errBadType = await validateDoc(medBadType);
  assert(errBadType && errBadType.errors['type'], 'Unsupported medicine type fails validation');

  // 2.4 Unsupported Frequency
  const medBadFreq = new Medicine({
    userId: dummyUserId,
    name: 'Metformin',
    dosage: '500mg',
    type: 'Tablet',
    frequency: 'Hourly', // Unsupported
    startDate: new Date(),
  });
  const errBadFreq = await validateDoc(medBadFreq);
  assert(errBadFreq && errBadFreq.errors['frequency'], 'Unsupported frequency fails validation');

  // 2.5 End Date Earlier than Start Date
  const medBadDate = new Medicine({
    userId: dummyUserId,
    name: 'Ibuprofen',
    dosage: '400mg',
    type: 'Tablet',
    frequency: 'Once daily',
    reminderTimes: ['08:00 AM'],
    startDate: new Date('2026-11-10'),
    endDate: new Date('2026-11-05'), // earlier than startDate
  });
  const errBadDate = await validateDoc(medBadDate);
  assert(errBadDate && errBadDate.errors['endDate'], 'End date earlier than start date fails validation');

  // 2.6 As-Needed Medicine (No reminder times required)
  const medPrn = new Medicine({
    userId: dummyUserId,
    name: 'Paracetamol',
    dosage: '1 tablet',
    type: 'Tablet',
    frequency: 'As needed',
    reminderTimes: [], // Empty reminder times
    startDate: new Date('2026-11-01'),
  });
  const errMedPrn = await validateDoc(medPrn);
  assert(!errMedPrn, 'As-needed medicine with no reminder times passes validation');

  // 2.7 Scheduled Frequency Requires Correct Number of Reminder Times
  const medOnceDailyBadTimes = new Medicine({
    userId: dummyUserId,
    name: 'Vitamin D3',
    dosage: '1 capsule',
    type: 'Capsule',
    frequency: 'Once daily',
    reminderTimes: ['08:00 AM', '08:00 PM'], // 2 times instead of 1
    startDate: new Date('2026-11-01'),
  });
  const errOnceDailyBad = await validateDoc(medOnceDailyBadTimes);
  assert(
    errOnceDailyBad && errOnceDailyBad.errors['reminderTimes'],
    'Once daily with wrong count of reminder times fails validation'
  );

  const medTwiceDailyValid = new Medicine({
    userId: dummyUserId,
    name: 'Metformin',
    dosage: '500mg',
    type: 'Tablet',
    frequency: 'Twice daily',
    reminderTimes: ['08:00 AM', '08:00 PM'], // exactly 2
    startDate: new Date('2026-11-01'),
  });
  assert(!(await validateDoc(medTwiceDailyValid)), 'Twice daily with 2 reminder times passes validation');

  const medThreeTimesDailyValid = new Medicine({
    userId: dummyUserId,
    name: 'Amoxicillin',
    dosage: '250mg',
    type: 'Capsule',
    frequency: 'Three times daily',
    reminderTimes: ['08:00 AM', '02:00 PM', '08:00 PM'], // exactly 3
    startDate: new Date('2026-11-01'),
  });
  assert(!(await validateDoc(medThreeTimesDailyValid)), 'Three times daily with 3 reminder times passes validation');

  // 2.8 Invalid Medicine Status
  const medBadStatus = new Medicine({
    userId: dummyUserId,
    name: 'Aspirin',
    dosage: '100mg',
    type: 'Tablet',
    frequency: 'Once daily',
    reminderTimes: ['09:00 AM'],
    startDate: new Date(),
    status: 'Archived', // Unsupported
  });
  const errBadStatus = await validateDoc(medBadStatus);
  assert(errBadStatus && errBadStatus.errors['status'], 'Invalid medicine status fails validation');

  // ==========================================
  // 3. DOSE EVENT MODEL TESTS
  // ==========================================
  console.log('\n[3. DoseEvent Model Tests]');

  const dummyMedId = new mongoose.Types.ObjectId();

  // 3.1 Valid DoseEvent
  const validDose = new DoseEvent({
    userId: dummyUserId,
    medicineId: dummyMedId,
    scheduledAt: new Date('2026-11-02T09:00:00.000Z'),
    status: 'Pending',
  });
  assert(!(await validateDoc(validDose)), 'Valid Pending dose event passes validation');

  // 3.2 Missing userId or medicineId
  const doseNoUser = new DoseEvent({
    medicineId: dummyMedId,
    scheduledAt: new Date(),
    status: 'Pending',
  });
  const errDoseNoUser = await validateDoc(doseNoUser);
  assert(errDoseNoUser && errDoseNoUser.errors['userId'], 'Missing userId fails validation');

  const doseNoMed = new DoseEvent({
    userId: dummyUserId,
    scheduledAt: new Date(),
    status: 'Pending',
  });
  const errDoseNoMed = await validateDoc(doseNoMed);
  assert(errDoseNoMed && errDoseNoMed.errors['medicineId'], 'Missing medicineId fails validation');

  // 3.3 Invalid Dose Status
  const doseBadStatus = new DoseEvent({
    userId: dummyUserId,
    medicineId: dummyMedId,
    scheduledAt: new Date(),
    status: 'Ignored', // Invalid
  });
  const errDoseBadStatus = await validateDoc(doseBadStatus);
  assert(errDoseBadStatus && errDoseBadStatus.errors['status'], 'Invalid dose status fails validation');

  // 3.4 Taken Dose can store takenAt
  const takenDose = new DoseEvent({
    userId: dummyUserId,
    medicineId: dummyMedId,
    scheduledAt: new Date('2026-11-02T09:00:00.000Z'),
    status: 'Taken',
    takenAt: new Date('2026-11-02T09:14:22.000Z'),
  });
  assert(!(await validateDoc(takenDose)), 'Taken dose can store takenAt timestamp');

  // 3.5 Unconfirmed dose remains distinct from Missed
  const unconfirmedDose = new DoseEvent({
    userId: dummyUserId,
    medicineId: dummyMedId,
    scheduledAt: new Date('2026-11-02T14:00:00.000Z'),
    status: 'Unconfirmed',
    notes: 'User did not respond to reminder',
  });
  assert(!(await validateDoc(unconfirmedDose)), 'Unconfirmed dose validates cleanly with status Unconfirmed');
  assert(unconfirmedDose.status !== 'Missed', 'Unconfirmed dose is strictly distinct from Missed');

  // 3.6 Missed dose with optional missedReason
  const missedDose = new DoseEvent({
    userId: dummyUserId,
    medicineId: dummyMedId,
    scheduledAt: new Date('2026-11-02T20:00:00.000Z'),
    status: 'Missed',
    missedReason: 'Medication refill pending',
  });
  assert(!(await validateDoc(missedDose)), 'Missed dose validates cleanly with status Missed and missedReason');

  // ==========================================
  // 4. DATABASE & INDEX VERIFICATION
  // ==========================================
  console.log('\n[4. Database Connection & Index Verification]');

  require('dotenv').config();
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/niyam';

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log(`Connected to test database: ${mongoose.connection.host}`);

    // Ensure indexes are built in MongoDB
    await User.init();
    await Medicine.init();
    await DoseEvent.init();

    // Inspect User indexes
    const userIndexes = await User.collection.indexes();
    const hasEmailUnique = userIndexes.some((idx) => idx.key.email === 1 && idx.unique === true);
    assert(hasEmailUnique, 'User index: email unique index verified in MongoDB');

    // Inspect Medicine indexes
    const medIndexes = await Medicine.collection.indexes();
    const hasMedCompound = medIndexes.some((idx) => idx.key.userId === 1 && idx.key.status === 1);
    assert(hasMedCompound, 'Medicine index: { userId: 1, status: 1 } verified in MongoDB');

    // Inspect DoseEvent indexes
    const doseIndexes = await DoseEvent.collection.indexes();
    const hasUserSched = doseIndexes.some((idx) => idx.key.userId === 1 && idx.key.scheduledAt === 1);
    assert(hasUserSched, 'DoseEvent index: { userId: 1, scheduledAt: 1 } verified in MongoDB');

    const hasMedSched = doseIndexes.some((idx) => idx.key.medicineId === 1 && idx.key.scheduledAt === 1);
    assert(hasMedSched, 'DoseEvent index: { medicineId: 1, scheduledAt: 1 } verified in MongoDB');

    const hasCompoundUnique = doseIndexes.some(
      (idx) =>
        idx.key.userId === 1 &&
        idx.key.medicineId === 1 &&
        idx.key.scheduledAt === 1 &&
        idx.unique === true
    );
    assert(
      hasCompoundUnique,
      'DoseEvent index: { userId: 1, medicineId: 1, scheduledAt: 1 } UNIQUE verified in MongoDB'
    );

    // Test compound unique constraint by inserting and catching duplicate
    const testUserId = new mongoose.Types.ObjectId();
    const testMedId = new mongoose.Types.ObjectId();
    const testDate = new Date('2026-11-02T12:00:00.000Z');

    const dose1 = await DoseEvent.create({
      userId: testUserId,
      medicineId: testMedId,
      scheduledAt: testDate,
      status: 'Pending',
    });

    let duplicateCaught = false;
    try {
      await DoseEvent.create({
        userId: testUserId,
        medicineId: testMedId,
        scheduledAt: testDate,
        status: 'Pending',
      });
    } catch (dupErr) {
      if (dupErr.code === 11000) {
        duplicateCaught = true;
      }
    }
    assert(duplicateCaught, 'DoseEvent duplicate prevention: duplicate insert rejected with E11000');

    // Cleanup test event
    await DoseEvent.deleteOne({ _id: dose1._id });

    await mongoose.disconnect();
    console.log('Test database disconnected cleanly.');
  } catch (dbErr) {
    console.error('Database index verification error:', dbErr.message);
    throw dbErr;
  }

  console.log(`\nAll ${results.length} tests passed successfully!`);
}

runTests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Tests failed:', e.message);
    process.exit(1);
  });
