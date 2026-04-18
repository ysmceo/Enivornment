/**
 * Seed / upsert the platform administrator account.
 * Run:  node scripts/seedAdmin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User     = require('../models/User');

const ADMIN = {
  name:     'Administrator',
  email:    'okontaysm@gmail.com',
  password: 'Madridking1@',
  role:     'admin',
  isActive: true,
  isVerified: true,
  state:    'FCT',
};

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  let user = await User.findOne({ email: ADMIN.email }).select('+password');

  if (user) {
    // Update existing record – re-assign password so the pre-save hook re-hashes it
    user.name      = ADMIN.name;
    user.role      = ADMIN.role;
    user.isActive  = ADMIN.isActive;
    user.isVerified = ADMIN.isVerified;
    user.password  = ADMIN.password;          // pre-save hook will hash this
    await user.save();
    console.log('✅  Admin user UPDATED:', ADMIN.email);
  } else {
    await User.create(ADMIN);
    console.log('✅  Admin user CREATED:', ADMIN.email);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});
