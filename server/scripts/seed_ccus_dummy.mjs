// server/scripts/seed_ccus_dummy.mjs
import mongoose from 'mongoose';
import Organization from '../src/models/Organization.js';
import CcusProject from '../src/models/CcusProject.js';
import CcusReading from '../src/models/CcusReading.js';

const MONGO = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/bayoucarbon';

function rng(min, max) { return Math.round(min + Math.random()*(max-min)); }

await mongoose.connect(MONGO);
console.log('Mongo connected');

const org = await Organization.findOneAndUpdate(
  { name: 'Demo Operator' },
  { $setOnInsert: { name: 'Demo Operator', orgType: 'operator' } },
  { upsert: true, new: true }
);

const project = await CcusProject.findOneAndUpdate(
  { name: 'River Bend Storage' },
  {
    $setOnInsert: {
      name: 'River Bend Storage',
      operator: org._id,          // REQUIRED by your schema
      status: 'operational',      // must match enum
      kpi: { vol30_tCO2: 112663, maxP30_psi: 2070, risk: 66 }
    }
  },
  { upsert: true, new: true }
);

// seed yearly capture & storage
const upserts = [];
for (let y=2018; y<=2025; y++) {
  const captured = y < 2024 ? 0 : rng(420000, 480000);
  const stored   = y < 2024 ? 0 : Math.round(captured * rng(92, 97)/100);
  upserts.push(
    CcusReading.findOneAndUpdate(
      { projectId: project._id, date: new Date(`${y}-06-30`) },
      { $set: { captured_tCO2: captured, stored_tCO2: stored } },
      { upsert: true, new: true }
    )
  );
}
await Promise.all(upserts);

console.log('CCUS dummy seed → done');
await mongoose.disconnect();
process.exit(0);
