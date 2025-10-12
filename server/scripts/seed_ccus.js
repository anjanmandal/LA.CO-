// scripts/seed_ccus.js
import 'dotenv/config';
import mongoose from 'mongoose';

// Models (adjust paths if your models live elsewhere)
import CcusProject from '../src/models/CcusProject.js';
import CcusWell from '../src/models/CcusWell.js';
import CcusPermit from '../src/models/CcusPermit.js';
import CcusInjection from '../src/models/CcusInjection.js';
import CcusPipe from '../src/models/CcusPipe.js';
import GeoFence from '../src/models/GeoFence.js';

const RESET = process.env.SEED_RESET === '1';

// ---------- helpers ----------
const rand = (min, max) => Math.round(min + Math.random() * (max - min));
const randFloat = (min, max, digits = 6) =>
  parseFloat((min + Math.random() * (max - min)).toFixed(digits));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const today = () => new Date(new Date().toDateString());

// simple boundary rectangle around [lng,lat]
const rectBoundary = ([lng, lat], dx = 0.06, dy = 0.04) => ({
  type: 'Polygon',
  coordinates: [[
    [lng - dx, lat - dy],
    [lng + dx, lat - dy],
    [lng + dx, lat + dy],
    [lng - dx, lat + dy],
    [lng - dx, lat - dy],
  ]],
});

const lineBetween = ([lng1, lat1], [lng2, lat2]) => ({
  type: 'LineString',
  coordinates: [
    [lng1, lat1],
    [lng2, lat2],
  ],
});

const ensureProject = async ({
  name,
  operator,
  classType = 'VI',
  status = 'operational',
  location,           // { type:'Point', coordinates:[lng,lat] }
  boundary,           // optional GeoJSON
  geologyTags = [],
}) => {
  let p = await CcusProject.findOne({ name }).lean();
  if (p && !RESET) return p;
  if (p && RESET) {
    await Promise.all([
      CcusWell.deleteMany({ projectId: p._id }),
      CcusPermit.deleteMany({ projectId: p._id }),
      CcusInjection.deleteMany({ projectId: p._id }),
      CcusPipe.deleteMany({ projectId: p._id }),
    ]);
    await CcusProject.deleteOne({ _id: p._id });
  }
  p = await CcusProject.create({
    name, operator, classType, status, location, boundary, geologyTags,
  });
  return p.toObject();
};

const createWells = async (project, wellsSpec) => {
  const out = [];
  for (const spec of wellsSpec) {
    const exists = await CcusWell.findOne({ projectId: project._id, name: spec.name }).lean();
    if (exists && !RESET) { out.push(exists); continue; }
    if (exists && RESET) await CcusWell.deleteOne({ _id: exists._id });

    const w = await CcusWell.create({
      projectId: project._id,
      ...spec,
    });
    out.push(w.toObject());
  }
  return out;
};

const ensurePermit = async ({ projectId, wellId, permitNo, status = 'issued', classType = 'VI', issuedAt }) => {
  const exists = await CcusPermit.findOne({ permitNo }).lean();
  if (exists && !RESET) return exists;
  if (exists && RESET) await CcusPermit.deleteOne({ _id: exists._id });
  const p = await CcusPermit.create({ projectId, wellId, permitNo, status, classType, issuedAt });
  return p.toObject();
};

const ensurePipe = async ({ projectId, name, geometry, maxPressure_psi, diameter_in, status }) => {
  const exists = await CcusPipe.findOne({ projectId, name }).lean();
  if (exists && !RESET) return exists;
  if (exists && RESET) await CcusPipe.deleteOne({ _id: exists._id });
  const pipe = await CcusPipe.create({ projectId, name, geometry, maxPressure_psi, diameter_in, status });
  return pipe.toObject();
};

const ensureFence = async ({ name, kind = 'restricted', geometry, threshold, meta }) => {
  const exists = await GeoFence.findOne({ name }).lean();
  if (exists && !RESET) return exists;
  if (exists && RESET) await GeoFence.deleteOne({ _id: exists._id });
  const f = await GeoFence.create({ name, kind, geometry, threshold, meta });
  return f.toObject();
};

const seedInjections = async ({
  projectId,
  wellId,
  days = 180,
  volumeBase = 3200,
  volumeJitter = 700,
  avgTubingBase = 1600,
  avgTubingJitter = 120,
  maxSurfaceBase = 1900,
  maxSurfaceJitter = 150,
  startDate, // optional Date; defaults to days ago
}) => {
  const start = startDate
    ? new Date(startDate)
    : new Date(today().getTime() - (days - 1) * 86400e3);
  for (let i = 0; i < days; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);

    // Idempotency: avoid duplicates (same day)
    const pre = await CcusInjection.findOne({ projectId, wellId, date: d }).lean();
    if (pre && !RESET) continue;
    if (pre && RESET) await CcusInjection.deleteOne({ _id: pre._id });

    await CcusInjection.create({
      projectId,
      wellId,
      date: d,
      volume_tCO2: rand(volumeBase - volumeJitter, volumeBase + volumeJitter),
      avgTubingPressure_psi: rand(avgTubingBase - avgTubingJitter, avgTubingBase + avgTubingJitter),
      maxSurfacePressure_psi: rand(maxSurfaceBase - maxSurfaceJitter, maxSurfaceBase + maxSurfaceJitter),
      source: 'reported',
    });
  }
};

// ---------- main ----------
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  if (RESET) {
    console.log('SEED_RESET=1 → clearing alerts only (others handled per-project)…');
    // Alerts are derived; safe to clear globally
    const { default: CcusAlert } = await import('../src/models/CcusAlert.js');
    await CcusAlert.deleteMany({});
  }

  // 1) River Bend Storage (existing, expand)
  const p1 = await ensureProject({
    name: 'River Bend Storage',
    operator: 'Bayou Carbon LLC',
    classType: 'VI',
    status: 'operational',
    location: { type: 'Point', coordinates: [-91.2, 30.5] },
    boundary: rectBoundary([-91.2, 30.5], 0.08, 0.06),
    geologyTags: ['saline', 'caprock:shale', 'depth:>3000ft'],
  });

  const p1Wells = await createWells(p1, [
    {
      name: 'RB-1', apiNo: '17-001-00001', type: 'injection', status: 'injecting',
      surface: { type: 'Point', coordinates: [-91.199, 30.501] },
      bottomHoleTVD_ft: 9500, formation: 'Tuscaloosa', maxAllowablePressure_psi: 2400,
    },
    {
      name: 'RB-2', apiNo: '17-001-00002', type: 'injection', status: 'injecting',
      surface: { type: 'Point', coordinates: [-91.215, 30.495] },
      bottomHoleTVD_ft: 9450, formation: 'Tuscaloosa', maxAllowablePressure_psi: 2350,
    },
    {
      name: 'RB-M1', apiNo: '17-001-10001', type: 'monitoring', status: 'completed',
      surface: { type: 'Point', coordinates: [-91.205, 30.512] },
      bottomHoleTVD_ft: 9100, formation: 'Tuscaloosa',
    },
  ]);

  // Permits for RB-1/RB-2
  await ensurePermit({
    projectId: p1._id, wellId: p1Wells.find(w => w.name === 'RB-1')._id,
    permitNo: 'VI-0001', status: 'issued', issuedAt: new Date('2024-09-01'),
  });
  await ensurePermit({
    projectId: p1._id, wellId: p1Wells.find(w => w.name === 'RB-2')._id,
    permitNo: 'VI-0002', status: 'issued', issuedAt: new Date('2025-01-15'),
  });

  // Pipes
  await ensurePipe({
    projectId: p1._id,
    name: 'RB-header-A',
    geometry: lineBetween(
      p1Wells.find(w => w.name === 'RB-1').surface.coordinates,
      p1Wells.find(w => w.name === 'RB-2').surface.coordinates
    ),
    maxPressure_psi: 2200,
    diameter_in: 8,
    status: 'operational',
  });

  // Injection 180d
  for (const w of p1Wells.filter(w => w.type === 'injection')) {
    await seedInjections({
      projectId: p1._id,
      wellId: w._id,
      days: 180,
      volumeBase: 3600,
      avgTubingBase: 1650,
      maxSurfaceBase: 1950,
    });
  }

  // Geofences near River Bend
  await ensureFence({
    name: 'RB Restricted Area',
    kind: 'restricted',
    geometry: rectBoundary([-91.205, 30.505], 0.03, 0.02),
  });
  await ensureFence({
    name: 'Bayou Community',
    kind: 'community',
    geometry: rectBoundary([-91.19, 30.49], 0.04, 0.03),
  });

  // 2) Cypress Delta Hub
  const p2 = await ensureProject({
    name: 'Cypress Delta Hub',
    operator: 'Delta Carbon Partners',
    classType: 'VI',
    status: 'permitting',
    location: { type: 'Point', coordinates: [-90.85, 29.95] },
    boundary: rectBoundary([-90.85, 29.95], 0.1, 0.07),
    geologyTags: ['saline', 'fault', 'depth:>4000ft'],
  });

  const p2Wells = await createWells(p2, [
    {
      name: 'CD-1', apiNo: '17-005-00001', type: 'injection', status: 'permitted',
      surface: { type: 'Point', coordinates: [-90.86, 29.955] },
      bottomHoleTVD_ft: 10200, formation: 'Frio', maxAllowablePressure_psi: 2500,
    },
    {
      name: 'CD-M1', apiNo: '17-005-10001', type: 'monitoring', status: 'proposed',
      surface: { type: 'Point', coordinates: [-90.84, 29.948] },
      bottomHoleTVD_ft: 9800, formation: 'Frio',
    },
  ]);

  await ensurePermit({
    projectId: p2._id, wellId: p2Wells.find(w => w.name === 'CD-1')._id,
    permitNo: 'VI-0101', status: 'under_review', issuedAt: null,
  });

  await ensurePipe({
    projectId: p2._id,
    name: 'CD-proposed-line',
    geometry: lineBetween(
      p2Wells.find(w => w.name === 'CD-1').surface.coordinates,
      p2Wells.find(w => w.name === 'CD-M1').surface.coordinates
    ),
    maxPressure_psi: 2300,
    diameter_in: 10,
    status: 'proposed',
  });

  // Seed moderate injections to simulate pre-op testing / placeholder (won’t show in KPI until operational)
  await seedInjections({
    projectId: p2._id,
    wellId: p2Wells.find(w => w.name === 'CD-1')._id,
    days: 90,
    volumeBase: 1800,
    avgTubingBase: 1400,
    maxSurfaceBase: 1750,
  });

  // 3) Prairie Line CCS
  const p3 = await ensureProject({
    name: 'Prairie Line CCS',
    operator: 'Great Plains CO₂',
    classType: 'II',
    status: 'construction',
    location: { type: 'Point', coordinates: [-97.1, 32.95] },
    boundary: rectBoundary([-97.1, 32.95], 0.12, 0.08),
    geologyTags: ['saline', 'caprock:shale', 'depth:>2500ft'],
  });

  const p3Wells = await createWells(p3, [
    {
      name: 'PL-1', apiNo: '48-121-00001', type: 'injection', status: 'drilling',
      surface: { type: 'Point', coordinates: [-97.105, 32.955] },
      bottomHoleTVD_ft: 8200, formation: 'Woodbine', maxAllowablePressure_psi: 2100,
    },
    {
      name: 'PL-2', apiNo: '48-121-00002', type: 'injection', status: 'proposed',
      surface: { type: 'Point', coordinates: [-97.09, 32.945] },
      bottomHoleTVD_ft: 8150, formation: 'Woodbine', maxAllowablePressure_psi: 2050,
    },
    {
      name: 'PL-M1', apiNo: '48-121-10001', type: 'monitoring', status: 'proposed',
      surface: { type: 'Point', coordinates: [-97.095, 32.958] },
      bottomHoleTVD_ft: 7800, formation: 'Woodbine',
    },
  ]);

  await ensurePermit({
    projectId: p3._id, wellId: p3Wells.find(w => w.name === 'PL-1')._id,
    permitNo: 'II-2001', status: 'issued', classType: 'II', issuedAt: new Date('2025-06-01'),
  });

  await ensurePipe({
    projectId: p3._id,
    name: 'PL-gather-A',
    geometry: lineBetween(
      p3Wells.find(w => w.name === 'PL-1').surface.coordinates,
      p3Wells.find(w => w.name === 'PL-2').surface.coordinates
    ),
    maxPressure_psi: 2000,
    diameter_in: 6,
    status: 'under_construction',
  });

  await seedInjections({
    projectId: p3._id,
    wellId: p3Wells.find(w => w.name === 'PL-1')._id,
    days: 60,
    volumeBase: 1200,
    avgTubingBase: 1200,
    maxSurfaceBase: 1500,
  });

  // Some general geofences near p3
  await ensureFence({
    name: 'Prairie Community',
    kind: 'community',
    geometry: rectBoundary([-97.09, 32.94], 0.05, 0.03),
  });

  console.log('Seeded CCUS projects:');
  for (const pn of ['River Bend Storage', 'Cypress Delta Hub', 'Prairie Line CCS']) {
    const p = await CcusProject.findOne({ name: pn }).lean();
    console.log(` - ${pn}: ${p?._id?.toString()}`);
  }

  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
