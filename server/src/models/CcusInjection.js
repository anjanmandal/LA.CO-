import mongoose from 'mongoose';

const InjSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'CcusProject', index: true },
  wellId: { type: mongoose.Schema.Types.ObjectId, ref: 'CcusWell', index: true },
  date: { type: Date, required: true, index: true }, // daily/weekly/monthly record—your choice
  volume_tCO2: { type: Number, required: true },
  avgTubingPressure_psi: { type: Number },
  maxSurfacePressure_psi: { type: Number },
  notes: String,
  source: { type: String, default: 'reported' },      // reported / observed / reconciled
  datasetVersion: String
}, { timestamps: true });

InjSchema.index({ projectId: 1, date: -1 });
export default mongoose.model('CcusInjection', InjSchema);
