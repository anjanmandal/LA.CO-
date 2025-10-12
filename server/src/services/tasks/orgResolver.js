import mongoose from 'mongoose';
import Organization from '../../models/Organization.js';

export async function resolveOrgId(orgRef) {
  // already an ObjectId?
  if (orgRef && mongoose.isValidObjectId(orgRef)) {
    return new mongoose.Types.ObjectId(orgRef);
  }

  // look up by slug or name
  if (orgRef) {
    const org = await Organization.findOne({ $or: [{ slug: orgRef }, { name: orgRef }] }).lean();
    if (org?._id) return org._id;
  }

  // fallback: ensure a demo org exists
  const demo = await Organization.findOneAndUpdate(
    { slug: 'demo-org' },
    { $setOnInsert: { name: 'Demo Org', slug: 'demo-org', orgType: 'operator' } },
    { upsert: true, new: true }
  ).lean();

  return demo._id;
}
