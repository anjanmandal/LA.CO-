import mongoose from 'mongoose';
const DatasetSchema = new mongoose.Schema({
  name: { type: String, required: true },     // e.g., "Operator Q1 2025"
  source: { type: String, required: true },   // 'operator' | 'climate_trace' | 'regulator'
  description: String,
  versionTag: String,
  createdBy: String,
  meta: { type: Object, default: {} }
}, { timestamps: true });
export default mongoose.model('Dataset', DatasetSchema);
