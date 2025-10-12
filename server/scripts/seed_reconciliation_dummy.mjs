// server/scripts/seed_reconciliation_dummy.mjs
import 'dotenv/config';
import mongoose from 'mongoose';
import EmissionsObservation from '../src/models/EmissionsObservation.js';
import Facility from '../src/models/Facility.js';

const MONGO = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/bayoucarbon';

// ---- config via env / CLI ---------------------------------------------------
const ARG = Object.fromEntries(process.argv.slice(2).map(s => {
  const [k, v] = s.split('=');
  return [k.replace(/^--/, ''), v ?? true];
}));

const TARGET_FACILITY = ARG.facilityId || process.env.FACILITY_ID || process.env.VITE_DEMO_FACILITY_ID || ''; // optional
const FROM = Number(ARG.from ?? process.env.SEED_FROM ?? 2018);
const TO   = Number(ARG.to   ?? process.env.SEED_TO   ?? 2025);

// These shape the "reported vs observed" delta. Example: reported = observed * (1 + bias) + noise
const GLOBAL_BIAS  = Number(ARG.bias  ?? 0.06);  // +6% on average
const GLOBAL_NOISE = Number(ARG.noise ?? 0.03);  // ±3% jitter
// Set to "neg" if you want reported < observed on average
const BIAS_SIGN = (ARG.sign || 'pos') === 'neg' ? -1 : 1;

// ----------------------------------------------------------------------------
function randn() { // simple gaussian-ish
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function observedAnnualIfMissing(facilityId, year) {
  // If an observed annual total exists, keep it. Else synthesize a plausible value.
  const exists = await EmissionsObservation.findOne({ facilityId, year, source: 'observed' }).lean();
  if (exists) return exists.co2eTonnes;

  // pick a sector-y baseline by name heuristics (purely for demo)
  const base = 50_000 + Math.round(Math.random()*80_000);  // 50–130 kt
  const growth = 1 + (year - FROM) * (Math.random()*0.01 - 0.005); // ±0.5%/yr drift
  const value = Math.max(10_000, Math.round(base * growth));

  await EmissionsObservation.create({
    facilityId,
    year,
    co2eTonnes: value,
    scope: 1,
    source: 'observed',
    method: 'instrumented_estimate',
    datasetVersion: `demo_obs_v${year}`,
  });
  return value;
}

async function upsertReported(facilityId, year, observed) {
  const bias = BIAS_SIGN * GLOBAL_BIAS * (0.7 + Math.random()*0.6);    // 70–130% of bias
  const noise = GLOBAL_NOISE * randn();                                // ±noise
  const reported = Math.max(0, Math.round(observed * (1 + bias + noise)));

  const method = pick([
    'operator_inventory_v2024',
    'operator_inventory_v2025',
    'ap42_factor_calc',
    'metered_fuel_calc'
  ]);

  await EmissionsObservation.findOneAndUpdate(
    { facilityId, year, source: 'reported' },
    {
      $set: {
        co2eTonnes: reported,
        scope: 1,
        method,
        datasetVersion: `demo_rep_v${year}`,
      }
    },
    { upsert: true, new: true }
  );

  return reported;
}

async function seedForFacility(f) {
  let insertedObs = 0, upsertedRep = 0;

  for (let y = FROM; y <= TO; y++) {
    const obs = await observedAnnualIfMissing(f._id, y);
    if (obs) insertedObs++;
    const rep = await upsertReported(f._id, y, obs);
    if (rep != null) upsertedRep++;
  }
  return { facility: f.name, insertedObs, upsertedRep };
}

async function main() {
  await mongoose.connect(MONGO);
  console.log('Mongo connected');

  let facilities = [];
  if (TARGET_FACILITY) {
    const f = await Facility.findById(TARGET_FACILITY).lean();
    if (!f) throw new Error(`Facility not found: ${TARGET_FACILITY}`);
    facilities = [f];
  } else {
    // pick every facility that already has at least one observed row, or your demo plants
    const observedFacIds = await EmissionsObservation.distinct('facilityId', { source: 'observed' });
    facilities = await Facility.find({ _id: { $in: observedFacIds } }).lean();
    if (facilities.length === 0) {
      // fallback: the three demo plants if present
      facilities = await Facility.find({ name: { $in: ['Plant A','Plant B','Plant C'] } }).lean();
    }
  }

  if (facilities.length === 0) {
    console.log('No facilities found to seed. Provide --facilityId=<ObjectId> or seed some facilities first.');
    await mongoose.disconnect(); process.exit(0);
  }

  const results = [];
  for (const f of facilities) {
    const r = await seedForFacility(f);
    results.push(r);
    console.log(`Seeded ${f.name}: observed yrs ${r.insertedObs}, reported yrs ${r.upsertedRep}`);
  }

  console.log('Done.\nSummary:', results);
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
