import mongoose from 'mongoose';

const PermitSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'CcusProject', index: true },
  wellId: { type: mongoose.Schema.Types.ObjectId, ref: 'CcusWell' },
  permitNo: { type: String, required: true },
  classType: { type: String, enum: ['VI','II','Other'], default: 'VI' },
  status: { type: String, enum: ['applied','under_review','issued','denied','suspended','expired'], default: 'applied' },
  issuedAt: { type: Date },
  expiresAt: { type: Date },
  documents: [{ label: String, url: String }]
}, { timestamps: true });

export default mongoose.model('CcusPermit', PermitSchema);
