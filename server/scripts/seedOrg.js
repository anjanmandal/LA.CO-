import 'dotenv/config';
import mongoose from 'mongoose';
import Organization from '../src/models/Organization.js';

await mongoose.connect(process.env.MONGODB_URI);
await Organization.findOneAndUpdate(
  { slug: 'demo-org' },
  { $setOnInsert: { name: 'Demo Org', slug: 'demo-org', orgType: 'operator' } },
  { upsert: true, new: true }
);
console.log('Seeded demo-org');
await mongoose.disconnect();
