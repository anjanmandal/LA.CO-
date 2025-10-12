import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'CcusProject', index: true },
  wellId: { type: mongoose.Schema.Types.ObjectId, ref: 'CcusWell' },
  kind: { type: String, enum: ['pressure','rate','geofence','permit','data_gap','risk'] },
  severity: { type: String, enum: ['low','medium','high'], default: 'low' },
  message: String,
  at: { type: Date, default: Date.now },
  meta: { type: Object },
  acknowledged: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('CcusAlert', AlertSchema);
