// server/scripts/seed_intensity_dummy.mjs
import mongoose from 'mongoose';
import Sector from '../src/models/Sector.js';
import Facility from '../src/models/Facility.js';
import IntensityStat from '../src/models/IntensityStat.js';

const MONGO = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/bayoucarbon';

function rng(min, max) { return Math.round(min + Math.random()*(max-min)); }

await mongoose.connect(MONGO);
console.log('Mongo connected');

const sector = await Sector.findOneAndUpdate(
  { code: 'power' },
  { $setOnInsert: { code: 'power', name: 'Power' } },
  { upsert: true, new: true }
);

// 3 demo power plants
const facs = await Promise.all(
  ['Plant A','Plant B','Plant C'].map(name =>
    Facility.findOneAndUpdate(
      { name },
      { $setOnInsert: { name, sectorId: sector._id } },
      { upsert: true, new: true }
    )
  )
);

const bulk = [];
for (const f of facs) {
  for (let y=2018; y<=2025; y++) {
    const outputQuantity = rng(1_500_000, 2_500_000); // kWh
    const co2eTonnes = rng(30_000, 80_000); // annual tCO2e
    bulk.push({
      updateOne: {
        filter: { facilityId: f._id, year: y, unit: 'kWh' },
        update: { $set: {
          facilityId: f._id,
          sectorCode: 'power',
          year: y,
          unit: 'kWh',
          outputQuantity,
          co2eTonnes
        }},
        upsert: true
      }
    });
  }
}
if (bulk.length) await IntensityStat.bulkWrite(bulk);
console.log(`Intensity dummy seed → upserts: ${bulk.length}`);

await mongoose.disconnect();
process.exit(0);
