import mongoose from 'mongoose';
const GeoLine = new mongoose.Schema({
  type: { type: String, enum: ['LineString'], default: 'LineString' },
  coordinates: { type: [[Number]], required: true }
}, { _id: false });

const PipeSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'CcusProject', index: true },
  name: String,
  geometry: { type: GeoLine, index: '2dsphere' },
  maxPressure_psi: Number,
  diameter_in: Number,
  status: { type: String, enum: ['proposed','under_construction','operational'], default: 'proposed' }
}, { timestamps: true });

export default mongoose.model('CcusPipe', PipeSchema);
