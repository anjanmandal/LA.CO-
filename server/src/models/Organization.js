import mongoose from 'mongoose';

const OrganizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true, index: true }, // <-- add this
  orgType: { type: String, enum: ['operator','regulator','public'], required: true }
}, { timestamps: true });

export default mongoose.model('Organization', OrganizationSchema);
