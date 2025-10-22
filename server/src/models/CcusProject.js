import mongoose from 'mongoose';

const Geo = new mongoose.Schema({
  type: { type: String, enum: ['Point','LineString','Polygon','MultiPolygon'], required: true },
  coordinates: { type: Array, required: true }
}, { _id: false });

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  operator: { type: String, required: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  classType: { type: String, enum: ['VI','II','Other'], default: 'VI' },
  status: { type: String, enum: ['planning','permitting','construction','operational','suspended','closed'], default: 'permitting' },
  location: { type: Geo, index: '2dsphere' },           // general centroid
  boundary: { type: Geo, index: '2dsphere' },           // storage unit outline (optional)
  geologyTags: [{ type: String }],                      // e.g., 'saline','caprock:shale','depth:>3000ft'
  meta: { type: Object }
}, { timestamps: true });

export default mongoose.model('CcusProject', ProjectSchema);
