import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';

async function seed() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kidsfest';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const NAME = 'Super Admin';
  const EMAIL = 'admin@kidsfest.com';
  const PASSWORD = 'password123'; // change in production!
  const ROLE = 'superadmin';

  const existing = await User.findOne({ email: EMAIL });
  if (existing) {
    existing.password = PASSWORD; // pre-save hook will re-hash
    existing.role = ROLE;
    existing.name = NAME;
    await existing.save();
    console.log('Admin updated:', existing.email);
  } else {
    const user = await User.create({
      name: NAME,
      email: EMAIL,
      password: PASSWORD,
      role: ROLE,
    });
    console.log('Admin created:', user.email);
  }

  const all = await User.find({});
  console.log(
    'All users in DB:',
    all.map((u) => ({ name: u.name, email: u.email, role: u.role }))
  );
  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
