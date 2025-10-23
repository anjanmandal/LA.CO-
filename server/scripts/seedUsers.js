import { config as loadEnv } from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadEnv({ path: path.join(__dirname, '../.env'), quiet: true });
import User from '../src/models/User.js';
import Organization from '../src/models/Organization.js';
import Facility from '../src/models/Facility.js';

const seeds = [
  {
    email: 'admin@bayoucarbon.io',
    name: 'Bayou Admin',
    role: 'admin',
    password: 'password',
  },
  {
    email: 'regulator@bayoucarbon.io',
    name: 'Riley Regulator',
    role: 'regulator',
    password: 'password',
  },
  {
    email: 'operator@bayoucarbon.io',
    name: 'Olivia Operator',
    role: 'operator',
    password: 'password',
  },
  {
    email: 'public@bayoucarbon.io',
    name: 'Pat Public',
    role: 'public',
    password: 'password',
  },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const richestFacility = await Facility.aggregate([
    {
      $lookup: {
        from: 'emissionsobservations',
        let: { facilityId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$facilityId', '$$facilityId'] } } },
          { $group: { _id: null, count: { $sum: 1 } } },
        ],
        as: 'obsStats',
      },
    },
    {
      $addFields: {
        obsCount: { $ifNull: [{ $first: '$obsStats.count' }, 0] },
      },
    },
    { $match: { obsCount: { $gt: 0 }, organizationId: { $ne: null } } },
    { $sort: { obsCount: -1 } },
    { $limit: 1 },
    { $project: { organizationId: 1 } },
  ]);

  let operatorOrg = null;
  if (richestFacility.length > 0) {
    operatorOrg = await Organization.findById(richestFacility[0].organizationId).select('_id name slug');
  }
  if (!operatorOrg) {
    operatorOrg = await Organization.findOne({ orgType: 'operator' }).select('_id name slug');
  }

  if (operatorOrg) {
  } else {
    console.warn('No operator organization found for seeding users');
  }

  const seedEmails = seeds.map((s) => s.email.toLowerCase());
  const { deletedCount } = await User.deleteMany({ email: { $in: seedEmails } });
  if (deletedCount) {
  }

  for (const seed of seeds) {
    const base = { ...seed };
    if (base.role === 'operator' && operatorOrg) {
      base.orgId = operatorOrg._id;
    }

    const existing = await User.findOne({ email: base.email }).select('+password');
    if (existing) {
      let changed = false;
      if (existing.name !== base.name) {
        existing.name = base.name;
        changed = true;
      }
      if (existing.role !== base.role) {
        existing.role = base.role;
        changed = true;
      }
      if (base.orgId && String(existing.orgId || '') !== String(base.orgId)) {
        existing.orgId = base.orgId;
        changed = true;
      }
      if (base.password) {
        existing.password = base.password;
        changed = true;
      }
      if (changed) {
        await existing.save();
        // updated seed user
      } else {
        // no changes
      }
    } else {
      await User.create(base);
      // created new seed user
    }
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
