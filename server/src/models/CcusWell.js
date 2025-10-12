import mongoose from 'mongoose';
const GeoPoint = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], required: true } // [lon,lat]
}, { _id: false });

const WellSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'CcusProject', index: true },
  name: { type: String, required: true },
  apiNo: { type: String },
  type: { type: String, enum: ['injection','monitoring','strat-test'], default: 'injection' },
  status: { type: String, enum: ['proposed','permitted','drilling','completed','injecting','suspended','plugged'], default: 'proposed' },
  surface: { type: GeoPoint, index: '2dsphere' },
  bottomHoleTVD_ft: { type: Number },
  formation: { type: String },
  maxAllowablePressure_psi: { type: Number },
  meta: { type: Object }
}, { timestamps: true });

export default mongoose.model('CcusWell', WellSchema);
