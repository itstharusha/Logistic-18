import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Organisation from './src/models/Organisation.js';
import User from './src/models/User.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/logistic18';

async function seed() {
  await mongoose.connect(MONGODB_URI);

  // 1. Create Organisation
  let org = await Organisation.findOne({ name: 'DemoOrg' });
  if (!org) {
    org = await Organisation.create({
      name: 'DemoOrg',
      industry: 'Logistics',
      country: 'US',
      timezone: 'UTC',
      planTier: 'STARTER',
    });
    console.log('Created organisation:', org.name);
  } else {
    console.log('Organisation already exists:', org.name);
  }

  // 2. Create Users with Roles
  const users = [
    {
      name: 'Alice Admin',
      email: 'admin@demo.org',
      password: 'AdminPass123!',
      role: 'ORG_ADMIN',
    },
    {
      name: 'Bob Analyst',
      email: 'analyst@demo.org',
      password: 'AnalystPass123!',
      role: 'RISK_ANALYST',
    },
    {
      name: 'Carol Operator',
      email: 'operator@demo.org',
      password: 'OperatorPass123!',
      role: 'LOGISTICS_OPERATOR',
    },
    {
      name: 'Dave Inventory',
      email: 'inventory@demo.org',
      password: 'InventoryPass123!',
      role: 'INVENTORY_MANAGER',
    },
    {
      name: 'Eve Viewer',
      email: 'viewer@demo.org',
      password: 'ViewerPass123!',
      role: 'VIEWER',
    },
  ];

  for (const user of users) {
    // Delete existing user to ensure clean state with correct hashing
    await User.deleteOne({ email: user.email });

    await User.create({
      orgId: org._id,
      name: user.name,
      email: user.email,
      passwordHash: user.password, // Hook will hash this
      role: user.role,
      isActive: true,
    });
    console.log('Re-seeded user:', user.email, 'role:', user.role);
  }

  await mongoose.disconnect();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
