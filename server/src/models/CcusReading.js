import mongoose from 'mongoose';

const CcusReadingSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'CcusProject', index: true },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' }, // optional if you want per-facility rollups
  date: { type: Date, required: true, index: true }, // daily or monthly resolution OK
  captured_tCO2: { type: Number, default: 0 },
  stored_tCO2: { type: Number, default: 0 },
  source: { type: String, default: 'reported' }, // optional
}, { timestamps: true });

CcusReadingSchema.index({ projectId: 1, date: 1 });

export default mongoose.model('CcusReading', CcusReadingSchema);
