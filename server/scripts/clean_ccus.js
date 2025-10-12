// scripts/clean_ccus.js
import 'dotenv/config';
import mongoose from 'mongoose';

import CcusProject from '../src/models/CcusProject.js';
import CcusWell from '../src/models/CcusWell.js';
import CcusPermit from '../src/models/CcusPermit.js';
import CcusInjection from '../src/models/CcusInjection.js';
import CcusPipe from '../src/models/CcusPipe.js';
import GeoFence from '../src/models/GeoFence.js';
import CcusAlert from '../src/models/CcusAlert.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const collections = [
    CcusAlert, GeoFence, CcusPipe, CcusInjection, CcusPermit, CcusWell, CcusProject
  ];

  for (const m of collections) {
    const name = m.collection.collectionName;
    const n = await m.estimatedDocumentCount();
    await m.deleteMany({});
    console.log(`Cleared ${name} (${n} docs)`);
  }

  await mongoose.disconnect();
  console.log('CCUS data cleared.');
}

run().catch((e) => { console.error(e); process.exit(1); });
